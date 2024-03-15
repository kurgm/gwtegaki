// @ts-check

const fs = require('fs');
const events = require('events');
const readline = require('readline');

const { HierarchicalNSW } = require('hnswlib-node');

const { getDataset } = require('./dataset');

/**
 * @typedef DatasetMeta
 * @property {number} dumpTime
 * @property {number} numItems
 * @property {string} v
 * @property {number} dimen
 * @property {import('hnswlib-node').SpaceName} metric
 */

/** @type {DatasetMeta} */
let datasetMeta;
/** @type {import('hnswlib-node').HierarchicalNSW} */
let hnsw;
/** @type {string[]} */
let glyphNames;

/** @type {Promise<void> | null} */
let loadPromise = null;
/** @return {Promise<void>} */
const loadDataset = () => {
  if (loadPromise) {
    return loadPromise;
  }
  return loadPromise = (async () => {
    const dataset = await getDataset();

    /**
     * @param {string} path
     * @return {Promise<DatasetMeta>}
     */
    const loadMetadata = async (path) => {
      return JSON.parse(await fs.promises.readFile(path, 'utf-8'));
    };
    /**
     * @param {string} path
     * @param {number} size
     * @return {Promise<string[]>}
     */
    const loadGlyphNames = async (path, size) => {
      const inputStream = fs.createReadStream(path);
      const inputRL = readline.createInterface({
        input: inputStream,
        crlfDelay: Infinity,
      });
      /** @type {string[]} */
      const result = Array(size);
      let index = 0;
      inputRL.on('line', (input) => {
        result[index++] = input;
      });
      await events.once(inputRL, 'close');
      return result;
    };

    try {
      console.debug('load metadata start');
      datasetMeta = await loadMetadata(dataset.getEphemeralPath('metadata.json'));
      console.debug('load metadata complete');

      console.debug('load namelist start');
      glyphNames = await loadGlyphNames(dataset.getEphemeralPath('names.txt'), datasetMeta.numItems);
      console.debug('load namelist complete');

      console.debug('load hnsw index start');
      hnsw = new HierarchicalNSW(datasetMeta.metric, datasetMeta.dimen);
      await hnsw.readIndex(dataset.getEphemeralPath('features.ann'));
      console.debug('load hnsw index complete');
    } finally {
      dataset?.cleanup();
    }
  })();
};

/**
 * @typedef SearchResult
 * @property {string} name
 * @property {number} distance
 */

/**
 * @param {number[]} query
 * @return {SearchResult[]}
 */
const performSearch = (query) => {
  const numNeighbors = 20;
  query = resizeQuery(query, datasetMeta.dimen);
  const { neighbors, distances } = hnsw.searchKnn(query, numNeighbors);
  if (neighbors.length !== distances.length) {
    throw new Error('neighbors and distances have different length');
  }
  /** @type {SearchResult[]} */
  const result = neighbors.map((glyphIndex, index) => ({
    name: glyphNames[glyphIndex],
    distance: distances[index],
  }));
  if (result.some(({ name }) => !name)) {
    throw new Error('unexpected glyph index returned from hnsw');
  }
  return result;
};

/** @type {import('fastify').RouteHandlerMethod} */
exports.hwrSearch = async (request, reply) => {
  if (request.url === '/warmup') {
    try {
      await loadDataset();
    } catch (e) {
      console.error(e);
      reply.status(500).send('failed to load index');
      return;
    }
    reply.status(200).send({
      dumpTime: datasetMeta.dumpTime,
      numItems: datasetMeta.numItems,
      v: datasetMeta.v,
    });
    return;
  }

  if (request.url !== '/') {
    reply.status(404).send('');
    return;
  }

  if (typeof request.body !== 'object' || request.body === null) {
    reply.status(400).send('invalid request');
    return;
  }
  const { query: queryStr, v = '1' } =
    /** @type {Record<string | number | symbol, unknown>} */(request.body);
  console.debug(`query:`, queryStr);
  const query = parseQuery(queryStr);
  if (!query) {
    reply.status(400).send("invalid parameter 'query'");
    return;
  }
  let result;
  try {
    await loadDataset();
    if (v !== datasetMeta.v) {
      reply.status(404).send("invalid parameter 'v'");
      return;
    }
    result = performSearch(query);
  } catch (e) {
    console.error(e);
    reply.status(500).send('search error');
    return;
  }
  reply.status(200).send(result);
};

/**
 * @param {unknown} queryStr
 * @return {number[] | null}
 */
const parseQuery = (queryStr) => {
  if (typeof queryStr !== 'string' || !queryStr) {
    return null;
  }
  const query = queryStr.split(/\s+/).map((itemstr) => Number(itemstr));
  if (query.some((item) => isNaN(item) || !Number.isFinite(item))) {
    return null;
  }
  return query;
};

/**
 * @param {number[]} query
 * @param {number} size
 * @return {number[]}
 */
const resizeQuery = (query, size) => {
  if (query.length < size) {
    query = query.concat(Array(size - query.length).fill(0));
  }
  return query.slice(0, size);
};
