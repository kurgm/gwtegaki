// @ts-check

import { datasetMeta, glyphNames, hnsw } from './dataset/index.js';

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

export const warmup = async () => {
  return {
    dumpTime: datasetMeta.dumpTime,
    numItems: datasetMeta.numItems,
    v: datasetMeta.v,
  };
};

/**
 *
 * @param {unknown} v
 * @param {number[]} query
 * @returns {Promise<SearchResult[]>}
 */
export const hwrSearch = async (v, query) => {
  if (v !== datasetMeta.v) {
    throw new InvalidVError();
  }
  return performSearch(query);
};

export class InvalidVError extends Error {
  constructor() {
    super('invalid parameter \'v\'');
  }
}

/**
 * @param {unknown} queryStr
 * @return {number[] | null}
 */
export const parseQuery = (queryStr) => {
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
