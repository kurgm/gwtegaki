#!/usr/bin/env node

// @ts-check

import { createWriteStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

import hnswlib from "hnswlib-node";
const { HierarchicalNSW } = hnswlib;

const { positionals } = parseArgs({
  strict: true,
  allowPositionals: true,
});
const [namesfilepath, featurefilepath, metadatafilepath] = positionals;
if (!namesfilepath || !featurefilepath || !metadatafilepath) {
  console.error(
    `Usage: ${process.argv[1]} <namesfilepath> <featurefilepath> <metadatafilepath>`
  );
  process.exit(1);
}

const namesStream = createWriteStream(namesfilepath);
namesStream.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

const modelMetric = "l2";
/** @type {import("hnswlib-node").HierarchicalNSW} */
let hnsw;

let outputLineCount = 0;
/**
 * @param {string} name
 * @param {number[]} feature
 */
function outputFeature(name, feature) {
  const outputLineNumber = outputLineCount++;

  const namesLine = `${name}\n`;
  namesStream.write(namesLine);
  hnsw.addPoint(feature, outputLineNumber);
}

async function finishOutput() {
  await new Promise((resolve) => {
    namesStream.end(resolve);
  });
  hnsw.resizeIndex(outputLineCount);
  await hnsw.writeIndex(featurefilepath);
  writeFileSync(metadatafilepath, JSON.stringify(getMetadata()), {
    encoding: "utf-8",
  });
}

let metadata;
function getMetadata() {
  return {
    ...metadata,
    numItems: outputLineCount,
    metric: modelMetric,
  };
}

const inputRL = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});
for await (const line of inputRL) {
  if (!metadata) {
    const [timestamp_str, v, dimen_str, len_hint_str] = line.split(" ");
    const dimen = +dimen_str;
    metadata = {
      dumpTime: +timestamp_str,
      v,
      dimen,
    };
    hnsw = new HierarchicalNSW(modelMetric, dimen);
    hnsw.initIndex(+len_hint_str);
    continue;
  }
  const [name, feature_str] = line.split(" ");
  const feature = feature_str.split(",").map((s) => +s);
  outputFeature(name, feature);
}

await finishOutput();
