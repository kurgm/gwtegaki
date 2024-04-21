// @ts-check

import { promises, createReadStream } from "fs";
import { once } from "events";
import { createInterface } from "readline";

import hnswlib from "hnswlib-node";

import { getDataset } from "./files.js";

const { HierarchicalNSW } = hnswlib;

/**
 * @typedef DatasetMeta
 * @property {number} dumpTime
 * @property {number} numItems
 * @property {string} v
 * @property {number} dimen
 * @property {import('hnswlib-node').SpaceName} metric
 */

/**
 * @param {string} path
 * @return {Promise<DatasetMeta>}
 */
const loadMetadata = async (path) => {
  return JSON.parse(await promises.readFile(path, "utf-8"));
};
/**
 * @param {string} path
 * @param {number} size
 * @return {Promise<string[]>}
 */
const loadGlyphNames = async (path, size) => {
  const inputStream = createReadStream(path);
  const inputRL = createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });
  /** @type {string[]} */
  const result = Array(size);
  let index = 0;
  inputRL.on("line", (input) => {
    result[index++] = input;
  });
  await once(inputRL, "close");
  return result;
};

export const {
  /** @type {DatasetMeta} */
  datasetMeta,
  /** @type {import('hnswlib-node').HierarchicalNSW} */
  hnsw,
  /** @type {string[]} */
  glyphNames,
} = await (async () => {
  const dataset = await getDataset();

  try {
    console.debug("load metadata start");
    const datasetMeta = await loadMetadata(
      dataset.getEphemeralPath("metadata.json")
    );
    console.debug("load metadata complete");

    console.debug("load namelist start");
    const glyphNames = await loadGlyphNames(
      dataset.getEphemeralPath("names.txt"),
      datasetMeta.numItems
    );
    console.debug("load namelist complete");

    console.debug("load hnsw index start");
    const hnsw = new HierarchicalNSW(datasetMeta.metric, datasetMeta.dimen);
    await hnsw.readIndex(dataset.getEphemeralPath("features.ann"));
    console.debug("load hnsw index complete");

    return {
      datasetMeta,
      glyphNames,
      hnsw,
    };
  } finally {
    await dataset?.cleanup();
  }
})();
