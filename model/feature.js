// @ts-check

const modelVersion = '2';

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

/** @typedef {[idx: [px: number, py: number, qx: number, qy: number], coeff: number][]} AbsoluteFeature */
/** @typedef {[idx: [mx: number, my: number, mag: number, angle: number], coeff: number][]} RelativeFeature */
/**
 * @typedef RawFeature
 * @property {AbsoluteFeature} abs
 * @property {RelativeFeature} rel
 */

/** @return {RawFeature} */
function create_new_raw_feature() {
  return {
    abs: [],
    rel: [],
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
  const pxR = px / 200;
  const pyR = py / 200;
  const qxR = qx / 200;
  const qyR = qy / 200;

  feature.abs.push([[pxR, pyR, qxR, qyR], k]);

  const dx = qx - px;
  const dy = qy - py;
  const mag = Math.hypot(dx, dy);
  const angle = Math.atan2(dx, dy);  // upward segments have angle = pi or -pi

  const mxR = (px + qx) / 400;
  const myR = (py + qy) / 400;
  const magR = mag / 250;
  const angleR = (angle / Math.PI + 0.5) / 1.5;

  const k2 = k * (0.5 + mag / 400) * 1.3;
  feature.rel.push([[mxR, myR, magR, angleR], k2]);
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

const PARAM_N_PT_X = 2;
const PARAM_N_PT_Y = 2;
const PARAM_N_SEG_X = 3;
const PARAM_N_SEG_Y = 3;
const PARAM_N_SEG_MAG = 6;
const PARAM_N_SEG_ANGLE = 7;

const _abs_feature_size = PARAM_N_PT_X * PARAM_N_PT_Y * PARAM_N_PT_X * PARAM_N_PT_Y;
const _rel_feature_size = PARAM_N_SEG_X * PARAM_N_SEG_Y * PARAM_N_SEG_MAG * PARAM_N_SEG_ANGLE;
const FEATURE_COLSIZE = _abs_feature_size + _rel_feature_size;

/**
 * @param {number[]} size
 * @param {[plocf: number[], coeff: number][]} features
 * @return {number[]}
 */
function generate_feature_array(size, features) {
  const resultsize = size.reduce((x, y) => x * y);
  const dimen = size.length;
  const loc = size.slice().fill(0);
  const result = Array(resultsize);
  /** @type {[ploc: number[], coeff: number][]} */
  const features_index = features.map(([plocf, coeff]) => [plocf.map((f, didx) => (
    clamp(f, 0, 1) * (size[didx] - 1)
  )), coeff]);
  for (let index = 0; index < resultsize; index++) {
    let val = 0.0;
    for (const [findex, coeff] of features_index) {
      let k = coeff;
      for (let didx = 0; didx < dimen; didx++) {
        k *= Math.exp(-((loc[didx] - findex[didx]) ** 2));
      }
      val += k;
    }
    result[index] = val;
    for (let didx = dimen - 1; didx >= 0 && ++loc[didx] >= size[didx]; didx--) {
      loc[didx] = 0;
    }
  }
  return result;
}

/**
 * @param {RawFeature} feature 
 * @return {number[]}
 */
function raw_feature_to_array(feature) {
  const absMap = generate_feature_array([PARAM_N_PT_X, PARAM_N_PT_Y, PARAM_N_PT_X, PARAM_N_PT_Y], feature.abs);
  const relMap = generate_feature_array([PARAM_N_SEG_X, PARAM_N_SEG_Y, PARAM_N_SEG_MAG, PARAM_N_SEG_ANGLE], feature.rel);
  return absMap.concat(relMap);
}

/** @param {Stroke[]} strokes */
function strokes_to_feature_array(strokes) {
  return raw_feature_to_array(get_raw_feature_of_strokes(strokes));
}

export {
  get_raw_feature_of_strokes,
  raw_feature_to_array,
  strokes_to_feature_array,
  FEATURE_COLSIZE,
  modelVersion,
};
