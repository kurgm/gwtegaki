#!/usr/bin/env node

// @ts-check

import { createWriteStream, writeFileSync } from 'fs';
import { createInterface } from 'readline';

import Annoy from 'annoy';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers'

const { namesfilepath, featurefilepath, metadatafilepath } = yargs(hideBin(process.argv))
  .command(
    '* <namesfilepath> <featurefilepath> <metadatafilepath>',
    'Build feature index and name list file from dump',
    (yargs) => yargs
      .positional('namesfilepath', {
        type: 'string',
        demandOption: true,
      })
      .positional('featurefilepath', {
        type: 'string',
        demandOption: true,
      })
      .positional('metadatafilepath', {
        type: 'string',
        demandOption: true,
      })
  )
  .parseSync();

const namesStream = createWriteStream(namesfilepath);
namesStream.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

const modelMetric = 'Euclidean';
/** @type {Annoy} */
let annoyIndex;

let outputLineCount = 0;
/**
 * @param {string} name
 * @param {number[]} feature
 */
function outputFeature(name, feature) {
  const outputLineNumber = outputLineCount++;

  const namesLine = `${name}\n`;
  namesStream.write(namesLine);
  annoyIndex.addItem(outputLineNumber, feature);
}

async function finishOutput() {
  await new Promise((resolve) => {
    namesStream.end(resolve);
  });
  annoyIndex.build(10);
  annoyIndex.save(featurefilepath);
  writeFileSync(metadatafilepath, JSON.stringify(getMetadata()), { encoding: 'utf-8' });
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
    const [timestamp_str, v, dimen_str] = line.split(' ');
    const dimen = +dimen_str;
    metadata = {
      dumpTime: +timestamp_str,
      v,
      dimen,
    };
    annoyIndex = new Annoy(dimen, modelMetric);
    continue;
  }
  const [name, feature_str] = line.split(' ');
  const feature = feature_str.split(',').map((s) => +s);
  outputFeature(name, feature);
}

await finishOutput();
