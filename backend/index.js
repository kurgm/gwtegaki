// @ts-check

const fs = require('fs');
const events = require('events');
const readline = require('readline');

const Annoy = require('annoy');

const { getDataset } = require('./dataset');

/**
 * @typedef DatasetMeta
 * @property {number} dumpTime
 * @property {number} numItems
 * @property {string} v
 * @property {number} dimen
 * @property {string} metric
 */

/** @type {DatasetMeta} */
let datasetMeta;
/** @type {Annoy} */
let annoyIndex;
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
      return JSON.parse(await fs.promises.readFile(path, "utf-8"));
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

      console.debug('load annoy index start');
      annoyIndex = new Annoy(datasetMeta.dimen, datasetMeta.metric);
      if (!annoyIndex.load(dataset.getEphemeralPath('features.ann'))) {
        throw new Error('annoyIndex.load() failed');
      }
      console.debug('load annoy index complete');
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
  const searchK = numNeighbors * 20;
  query = resizeQuery(query, datasetMeta.dimen);
  const annoyResult = annoyIndex.getNNsByVector(query, numNeighbors, searchK, true);
  if (!annoyResult) {
    throw new Error('annoyIndex.getNNsByVector() failed');
  }
  const { neighbors, distances } = annoyResult;
  if (neighbors.length !== distances.length) {
    throw new Error('neighbors and distances have different length');
  }
  /** @type {SearchResult[]} */
  const result = neighbors.map((glyphIndex, index) => ({
    name: glyphNames[glyphIndex],
    distance: distances[index],
  }));
  if (result.some(({ name }) => !name)) {
    throw new Error('unexpected glyph index returned from annoy');
  }
  return result;
};

/**
 * @param {import('express').RequestHandler} func
 * @return {import('express').RequestHandler}
 */
const enableCORS = (func) => (req, res, next) => {
  // Set CORS headers for preflight requests
  // Allows GETs from any origin with the Content-Type header
  // and caches preflight response for 3600s

  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  func(req, res, next);
};

exports.hwrSearch = enableCORS(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('');
    return;
  }

  if (req.path === '/warmup') {
    try {
      await loadDataset();
    } catch (e) {
      console.error(e);
      res.status(500).send('failed to load index');
      return;
    }
    res.status(200).json({
      dumpTime: datasetMeta.dumpTime,
      numItems: datasetMeta.numItems,
      v: datasetMeta.v,
    });
    return;
  }

  if (req.path !== '/') {
    res.status(404).send('');
    return;
  }

  const { query: queryStr, v = '1' } = req.body;
  console.debug(`query:`, queryStr);
  const query = parseQuery(queryStr);
  if (!query) {
    res.status(400).send("invalid parameter 'query'");
    return;
  }
  let result;
  try {
    await loadDataset();
    if (v !== datasetMeta.v) {
      res.status(404).send("invalid parameter 'v'");
      return;
    }
    result = performSearch(query);
  } catch (e) {
    console.error(e);
    res.status(500).send('search error');
    return;
  }
  res.status(200).json(result);
});

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
