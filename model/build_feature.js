#!/usr/bin/env node

// @ts-check

const fs = require('fs');
const readline = require('readline');

const ProgressBar = require('progress');

const { _: [dumpfilepath, namesfilepath, featurefilepath] } = require('yargs')
  .check((argv) => argv._.length === 3)
  .argv;

const { strokes_to_feature_array } = require('./feature');

/** @param {string} path */
async function* readDump(path) {
  const inputStream = fs.createReadStream(path);

  const inputRL = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  let count = 0;
  for await (const line of inputRL) {
    count++;
    if (count <= 2) {
      continue; // skip header
    }
    const columns = (line.match(/[^|]+/g) || []).map((cell) => cell.trim());
    if (columns.length !== 3) {
      continue; // ignore footer
    }

    const [name, related, data] = columns;
    yield { name, related, data };
  }
}

/** @typedef {[number, number][]} Stroke */

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {Stroke}
 */
function lineStroke(x1, y1, x2, y2) {
  // const nSamples = 5;
  // return Array.from({ length: nSamples + 1 }, (_, i) => {
  //   const t = i / nSamples;
  //   const s = 1 - t;
  //   return [
  //     x1 * s + x2 * t,
  //     y1 * s + y2 * t,
  //   ];
  // });
  return [
    [x1, y1],
    [x2, y2],
  ];
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @returns {Stroke}
 */
function quadBezierStroke(x1, y1, x2, y2, x3, y3) {
  const nSamples = 5;
  return Array.from({ length: nSamples + 1 }, (_, i) => {
    const t = i / nSamples;
    const s = 1 - t;
    return [
      x1 * s * s + 2 * x2 * s * t + x3 * t * t,
      y1 * s * s + 2 * y2 * s * t + y3 * t * t,
    ];
  });
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @param {number} x4
 * @param {number} y4
 * @returns {Stroke}
 */
function cubicBezierStroke(x1, y1, x2, y2, x3, y3, x4, y4) {
  const nSamples = 5;
  return Array.from({ length: nSamples + 1 }, (_, i) => {
    const t = i / nSamples;
    const s = 1 - t;
    return [
      x1 * s * s * s + 3 * x2 * s * s * t + 3 * x3 * s * t * t + x4 * t * t * t,
      y1 * s * s * s + 3 * y2 * s * s * t + 3 * y3 * s * t * t + y4 * t * t * t,
    ];
  });
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @returns {Stroke}
 */
function bendStroke(x1, y1, x2, y2, x3, y3) {
  return lineStroke(x1, y1, x2, y2).concat(lineStroke(x2, y2, x3, y3).slice(1));
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @param {number} x4
 * @param {number} y4
 * @returns {Stroke}
 */
function slashStroke(x1, y1, x2, y2, x3, y3, x4, y4) {
  return lineStroke(x1, y1, x2, y2).concat(quadBezierStroke(x2, y2, x3, y3, x4, y4).slice(1));
}

const getStrokes_stack = [];

/**
 * @param {Map<string, string>} glyphMap
 * @param {string} data
 */
function getStrokes(glyphMap, data) {
  /** @type {Stroke[]} */
  const result = [];
  const lines = data.split('$');
  for (const line of lines) {
    const kdata = line.split(':');
    const ndata = Array.from({ length: 11 }, (_, i) => +kdata[i] || 0);
    switch (ndata[0]) {
      case 1:
        result.push(lineStroke(
          ndata[3], ndata[4], ndata[5], ndata[6]));
        break;
      case 2:
        result.push(quadBezierStroke(
          ndata[3], ndata[4], ndata[5], ndata[6], ndata[7], ndata[8]));
        break;
      case 3:
      case 4:
        result.push(bendStroke(
          ndata[3], ndata[4], ndata[5], ndata[6], ndata[7], ndata[8]));
        break;
      case 6:
        result.push(cubicBezierStroke(
          ndata[3], ndata[4], ndata[5], ndata[6], ndata[7], ndata[8], ndata[9], ndata[10]));
        break;
      case 7:
        result.push(slashStroke(
          ndata[3], ndata[4], ndata[5], ndata[6], ndata[7], ndata[8], ndata[9], ndata[10]));
        break;
      case 99: {
        const partName = kdata[7].split('@')[0];
        const partData = glyphMap.get(partName);
        if (!partData) {
          break;
        }
        if (getStrokes_stack.includes(partName)) {
          console.warn(`detected quote loop: ${partName}`);
          break;
        }
        getStrokes_stack.push(partName);
        const strokes = getStrokes(glyphMap, partData);
        getStrokes_stack.pop();
        if (strokes.length === 0) {
          break;
        }

        /**
         * @param {[number, number]} point
         * @returns {[number, number]}
         */
        let trans = ([x, y]) => [
          x * (ndata[5] - ndata[3]) / 200 + ndata[3],
          y * (ndata[6] - ndata[4]) / 200 + ndata[4],
        ];

        // stretch
        let sx = ndata[1];
        let sy = ndata[2];
        let tx = ndata[9];
        let ty = ndata[10];
        if (sx <= 100) {
          sx += 200;
          tx = ty = 0;
        }
        if (!(sx - 200 === tx && sy === ty)) {
          const points = strokes.reduce((a, b) => a.concat(b));
          const xs = points.map(([x]) => x);
          const ys = points.map(([, y]) => y);
          const minx = Math.min(...xs);
          const maxx = Math.max(...xs);
          const miny = Math.min(...ys);
          const maxy = Math.max(...ys);

          /**
           * @param {number} dp
           * @param {number} sp
           * @param {number} p
           * @param {number} min
           * @param {number} max
           */
          function stretch(dp, sp, p, min, max) {
            let p1;
            let p2;
            let p3;
            let p4;
            if (p < sp + 100) {
              p1 = min;
              p3 = min;
              p2 = sp + 100;
              p4 = dp + 100;
            } else {
              p1 = sp + 100;
              p3 = dp + 100;
              p2 = max;
              p4 = max;
            }
            return ((p - p1) / (p2 - p1) || 0) * (p4 - p3) + p3;
          }
          const trans_ = trans;
          trans = ([x, y]) => trans_([
            stretch(sx - 200, tx, x, minx, maxx),
            stretch(sy - 200, ty, y, miny, maxy),
          ]);
        }

        for (const stroke of strokes) {
          result.push(stroke.map(trans));
        }
        break;
      }
    }
  }
  return result;
}

/** @param {string} data */
function isAlias(data) {
  return !data.includes('$') && data.startsWith('99:0:0:0:0:200:200:');
}

const kanjiRanges = [
  [0x3400, 0x4dbf],
  [0x4e00, 0x9ffc],
  [0x20000, 0x2a6dd],
  [0x2a700, 0x2b734],
  [0x2b740, 0x2b81d],
  [0x2b820, 0x2cea1],
  [0x2ceb0, 0x2ebe0],
  [0x30000, 0x3134a],
  [0xf900, 0xfa6d],
  [0xfa70, 0xfad9],
  [0x2f800, 0x2fa1d],
];

/** @param {string} name */
function isKanjiGlyph(name) {
  {
    const m = /^u([0-9a-f]{4,})(?:-|$)/.exec(name)
    if (m) {
      const cp = parseInt(m[1], 16);
      if (0x2FF0 <= cp && cp <= 0x2FFB) {
        return true;
      }
      return kanjiRanges.some(([stt, end]) => stt <= cp && cp <= end);
    }
  }
  return true;
}

/** @param {string} name */
function isTargetGlyph(name) {
  if (name.includes('_')) {
    return false;
  }
  if (!isKanjiGlyph(name)) {
    return false;
  }
  if (name.startsWith('hitsujun-')) {
    return false;
  }
  return true;
}

const namesStream = fs.createWriteStream(namesfilepath);
namesStream.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
const featureStream = fs.createWriteStream(featurefilepath);
featureStream.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

/**
 * @param {string} name
 * @param {number[]} feature
 */
function outputFeature(name, feature) {
  const namesLine = `${name}\n`
  const featureLine = `${feature.map((value) => +value.toPrecision(7)).join(' ')}\n`;
  namesStream.write(namesLine);
  featureStream.write(featureLine);
}

async function finishOutput() {
  await Promise.all([
    new Promise((resolve) => {
      namesStream.end(resolve);
    }),
    new Promise((resolve) => {
      featureStream.end(resolve);
    }),
  ]);
}

(async () => {

  /** @type {Map<string, string>} */
  const glyphDB = new Map();

  for await (const { name, data } of readDump(dumpfilepath)) {
    glyphDB.set(name, data);
  }

  const bar = new ProgressBar('[:bar] :percent :etas', glyphDB.size);

  for (const [name, data] of glyphDB) {
    bar.tick();

    if (isAlias(data)) {
      continue;
    }
    if (!isTargetGlyph(name)) {
      continue;
    }
    const strokes = getStrokes(glyphDB, data);
    if (!strokes) {
      continue;
    }
    const feature = strokes_to_feature_array(strokes);
    outputFeature(name, feature);
  }

  await finishOutput();
})();
