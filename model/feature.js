// @ts-check

const modelVersion = "2";

/**
 * @template T
 * @param {T[]} arr
 * @param {(x: T) => number} valfun
 */
function maxBy(arr, valfun) {
  /** @type {T} */
  let maxElem;
  /** @type {number} */
  let maxVal = -Infinity;
  for (const elem of arr) {
    const val = valfun(elem);
    if (val > maxVal) {
      maxElem = elem;
      maxVal = val;
    }
  }
  return maxElem;
}

/**
 * 
 * @param {number} v 
 * @param {number} min 
 * @param {number} max 
 */
function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** @typedef {[number, number]} Point */

/**
 * @param {Point} stt
 * @param {Point} end
 */
function distance_from_line([sttx, stty], [endx, endy]) {
  const a = stty - endy;
  const b = -(sttx - endx);
  const c = sttx * endy - stty * endx;
  const z = Math.hypot(a, b);

  /** @type {(p: Point) => number} */
  const dist = (z === 0.0)
    ? ([px, py]) => Math.hypot(sttx - px, stty - py)
    : ([px, py]) => Math.abs(a * px + b * py + c) / z;

  return dist
}

/** @typedef {Point[]} Stroke */

/** @param {Stroke} stroke */
function pick_points(stroke) {
  const stt = stroke[0];
  const end = stroke[stroke.length - 1];
  let mid = maxBy(stroke, distance_from_line(stt, end));
  if (distance_from_line(stt, end)(mid) <= 7) {
    mid = [(stt[0] + end[0]) / 2, (stt[1] + end[1]) / 2];
  }
  return [stt, mid, end];
}

/**
 * @param {number[]} size
 * @return {any[]}
 */
function create_md_array(size) {
  if (size.length === 1) {
    return Array(size[0]).fill(0);
  }
  const subsize = size.slice(1);
  return Array.from({ length: size[0] }, () => create_md_array(subsize));
}

/**
 * @param {any[]} arr
 * @param {number[]} indices
 * @param {number} value 
 * @return {void}
 */
function add_md_array_fracidx(arr, indices, value) {
  const fracindex0 = clamp(indices[0], 0, arr.length - 1);
  const intindex = fracindex0 | 0;
  const frac = fracindex0 - intindex;
  /** @type {[number, number][]} */
  const index0s = [
    [intindex, 1 - frac],
    [intindex + 1, frac],
  ];
  const subindices = indices.slice(1);
  for (const [index0, k] of index0s) {
    if (index0 < 0 || index0 >= arr.length || k == 0) {
      continue;
    }
    if (subindices.length === 0) {
      arr[index0] += k * value;
    } else {
      add_md_array_fracidx(arr[index0], subindices, k * value);
    }
  }
}

const PARAM_N_PT_X = 4;
const PARAM_N_PT_Y = 4;
const PARAM_N_SEG_X = 2;
const PARAM_N_SEG_Y = 2;
const PARAM_N_SEG_MAG = 6;
const PARAM_N_SEG_ANGLE = 7;

/** @typedef {number[][][][]} AbsoluteFeature */
/** @typedef {number[][][][]} RelativeFeature */
/**
 * @typedef RawFeature
 * @property {AbsoluteFeature} abs
 * @property {RelativeFeature} rel
 */

/** @return {RawFeature} */
function create_new_raw_feature() {
  return {
    abs: create_md_array([PARAM_N_PT_X, PARAM_N_PT_Y, PARAM_N_PT_X, PARAM_N_PT_Y]),
    rel: create_md_array([PARAM_N_SEG_X, PARAM_N_SEG_Y, PARAM_N_SEG_MAG, PARAM_N_SEG_ANGLE]),
  };
}

/**
 * @param {RawFeature} feature
 * @param {Point} p
 * @param {Point} q
 * @param {number} k
 * @return {void}
 */
function add_feature_segment(feature, [px, py], [qx, qy], k) {
  const pxIdx = px / 200 * (PARAM_N_PT_X - 1);
  const pyIdx = py / 200 * (PARAM_N_PT_Y - 1);
  const qxIdx = qx / 200 * (PARAM_N_PT_X - 1);
  const qyIdx = qy / 200 * (PARAM_N_PT_Y - 1);

  add_md_array_fracidx(feature.abs, [pxIdx, pyIdx, qxIdx, qyIdx], k);

  const dx = qx - px;
  const dy = qy - py;
  const mag = Math.hypot(dx, dy);
  const angle = Math.atan2(dx, dy);  // upward segments have angle = pi or -pi

  const mxIdx = (px + qx) / 400 * (PARAM_N_SEG_X - 1);
  const myIdx = (py + qy) / 400 * (PARAM_N_SEG_Y - 1);
  const magIdx = mag / 250 * (PARAM_N_SEG_MAG - 1);
  const angleIdx = (angle / Math.PI + 0.5) / 1.5 * (PARAM_N_SEG_ANGLE - 1);

  const k2 = k * (0.5 + mag / 400) * 1.3;
  add_md_array_fracidx(feature.rel, [mxIdx, myIdx, magIdx, angleIdx], k2);
}

/**
 * @param {Stroke[]} strokes
 * @returns {RawFeature}
 */
function get_raw_feature_of_strokes(strokes) {
  const feature = create_new_raw_feature();
  for (const stroke of strokes) {
    const points = pick_points(stroke)

    add_feature_segment(feature, points[0], points[2], 1);
    add_feature_segment(feature, points[0], points[1], 0.4);
    add_feature_segment(feature, points[1], points[2], 0.4);
  }
  return feature;
}

const _abs_feature_size = PARAM_N_PT_X * PARAM_N_PT_Y * PARAM_N_PT_X * PARAM_N_PT_Y;
const _rel_feature_size = PARAM_N_SEG_X * PARAM_N_SEG_Y * PARAM_N_SEG_MAG * PARAM_N_SEG_ANGLE;
const FEATURE_COLSIZE = _abs_feature_size + _rel_feature_size;

/**
 * @param {RawFeature} feature 
 */
function raw_feature_to_array(feature) {
  return feature.abs.flat(3).concat(feature.rel.flat(3));
}

/** @param {Stroke[]} strokes */
function strokes_to_feature_array(strokes) {
  return raw_feature_to_array(get_raw_feature_of_strokes(strokes));
}

module.exports = {
  get_raw_feature_of_strokes,
  raw_feature_to_array,
  strokes_to_feature_array,
  FEATURE_COLSIZE,
  modelVersion,
};
