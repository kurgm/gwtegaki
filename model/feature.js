// @ts-check

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
 * @typedef {object} PointFeature
 * @property {number} x
 * @property {number} y
 * @property {number} mag
 * @property {number} deg
 */
/**
 * @typedef {object} SegmentFeature
 * @property {number} mag
 * @property {number} deg
 */
/**
 * @typedef {object} StrokeFeature
 * @property {PointFeature[]} points
 * @property {SegmentFeature[]} segments
 */
/**
 * @typedef {StrokeFeature[]} RawFeature
 */

/**
 * @param {Point} point
 * @returns {PointFeature}
 */
function point_to_feature([x, y]) {
  const dx = x - 100;
  const dy = y - 100;
  const mag = Math.hypot(dx, dy);
  const deg = Math.atan2(dy, dx);
  return { x, y, mag, deg };
}

/**
 * @param {Point} point1
 * @param {Point} point2
 * @returns {SegmentFeature}
 */
function segment_feature([p1x, p1y], [p2x, p2y]) {
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const mag = Math.hypot(dx, dy);
  const deg = Math.atan2(dx, dy);  // upward segment has deg = pi or -pi
  return { mag, deg };
}

/** 
 * @param {Stroke[]} strokes
 * @returns {RawFeature}
 */
function get_raw_feature_of_strokes(strokes) {
  /** @type {RawFeature} */
  const feature = [];
  for (const stroke of strokes) {
    const points = pick_points(stroke)

    const pointf = points.map(point_to_feature);
    const segmentf = [
      segment_feature(points[0], points[2]),
      segment_feature(points[0], points[1]),
      segment_feature(points[1], points[2]),
    ];
    feature.push({ points: pointf, segments: segmentf });
  }
  return feature;
}

const _segment_feature_size = 2;
const _point_feature_size = 4;
const _stroke_feature_size = _point_feature_size * 3 + _segment_feature_size * 3;
const _max_stroke_num = 50;
const FEATURE_COLSIZE = _stroke_feature_size * _max_stroke_num;

/**
 * @param {RawFeature} feature 
 */
function raw_feature_to_array(feature) {

  /**
   * 
   * @param {SegmentFeature} sf
   * @param {number} k
   */
  function segment_feature_values(sf, k = 1.0) {
    return [
      k * sf.mag / 200,
      k * sf.deg / Math.PI,
    ];
  }

  /**
   * 
   * @param {PointFeature} pf
   * @param {number} k
   */
  function point_feature_values(pf, k = 1.0) {
    return [
      k * pf.x / 200,
      k * pf.y / 200,
      k * pf.mag / 200,
      k * pf.deg / (2 * Math.PI),
    ];
  }
  /** @type {number[]} */
  const values = Array(FEATURE_COLSIZE).fill(0);

  const numStroke = Math.min(feature.length, _max_stroke_num);
  for (let i = 0; i < numStroke; i++) {
    const stroke = feature[i];
    const strokeval = [
      ...point_feature_values(stroke.points[0]),
      ...point_feature_values(stroke.points[1], 0.3),
      ...point_feature_values(stroke.points[2]),
      ...segment_feature_values(stroke.segments[0]),
      ...segment_feature_values(stroke.segments[1], 0.4),
      ...segment_feature_values(stroke.segments[2], 0.4),
    ];
    for (let j = 0; j < strokeval.length; j++) {
      values[i * _stroke_feature_size + j] = strokeval[j];
    }
  }

  return values;
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
};
