// @ts-check

const fs = require('fs');
const events = require('events');
const readline = require('readline');

const Annoy = require('annoy');

const { getDataset } = require('./dataset');

// TODO: replace magic number
const dimension = 900;
const currentModelVersion = '1';

const annoyIndex = new Annoy(dimension, 'euclidean');

/** @type {string[]} */
let glyphNames;

let loaded = false;
const loadDataset = async () => {
  if (!loaded) {
    const dataset = await getDataset();

    /**
     * @param {string} path
     * @return {Promise<string[]>}
     */
    const loadGlyphNames = async (path) => {
      const inputStream = fs.createReadStream(path);
      const inputRL = readline.createInterface({
        input: inputStream,
        crlfDelay: Infinity,
      });
      const result = [];
      inputRL.on('line', (input) => {
        result.push(input.trim());
      });
      await events.once(inputRL, 'close');
      return result;
    };

    try {
      console.debug('load namelist start');
      glyphNames = await loadGlyphNames(dataset.getEphemeralPath('names.txt'));
      console.debug('load namelist complete');

      console.debug('load annoy index start');
      if (!annoyIndex.load(dataset.getEphemeralPath('features.ann'))) {
        throw new Error('annoyIndex.load() failed');
      }
      console.debug('load annoy index complete');
    } finally {
      dataset.cleanup();
    }

    loaded = true;
  }
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
  const searchK = numNeighbors * 10;
  /** @type {{ neighbors: number[]; distances: number[]; }} */
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

  if (req.query.warmup) {
    try {
      await loadDataset();
    } catch (e) {
      console.error(e);
      res.status(500).send('failed to load index');
      return;
    }
    res.status(204).send('');
    return;
  }

  const { query: queryStr, v = '1' } = req.body;
  console.debug(`query:`, queryStr);
  const query = parseQuery(queryStr);
  if (!query) {
    res.status(400).send("invalid parameter 'query'");
    return;
  }
  if (v !== currentModelVersion) {
    res.status(404).send("invalid parameter 'v'");
    return;
  }
  let result;
  try {
    await loadDataset();
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
  if (query.length < dimension) {
    query.push(...Array(dimension - query.length).fill(0));
  }
  return query.slice(0, dimension);
}
