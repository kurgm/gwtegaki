// @ts-check

import {
  model_version,
  feature_colsize,
  strokes_flattened_to_feature_array,
} from "./pkg/gwtegaki_model.js";

const modelVersion = model_version();

const FEATURE_COLSIZE = feature_colsize();

/** @typedef {[number, number]} Point */
/** @typedef {Point[]} Stroke */

/** @param {Stroke[]} strokes */
function strokes_to_feature_array(strokes) {
  const strokes_flattened_length =
    1 + strokes.reduce((acc, stroke) => acc + 1 + stroke.length * 2, 0);
  const strokes_flattened = new Int32Array(strokes_flattened_length);
  let idx = 0;
  strokes_flattened[idx++] = strokes.length;
  for (const stroke of strokes) {
    strokes_flattened[idx++] = stroke.length;
    for (const [x, y] of stroke) {
      strokes_flattened[idx++] = x;
      strokes_flattened[idx++] = y;
    }
  }
  const feature_array_f64 =
    strokes_flattened_to_feature_array(strokes_flattened);
  return Array.from(feature_array_f64);
}

export { strokes_to_feature_array, FEATURE_COLSIZE, modelVersion };
