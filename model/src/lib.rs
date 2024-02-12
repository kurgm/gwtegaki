use wasm_bindgen::prelude::*;

use crate::stroke::{Point, Stroke};

mod indexed_feature;
mod model;
mod stroke;

#[wasm_bindgen]
pub fn model_version() -> String {
    model::MODEL_VERSION.to_string()
}

#[wasm_bindgen]
pub fn feature_colsize() -> usize {
    model::FEATURE_COLSIZE
}

#[wasm_bindgen]
pub fn strokes_flattened_to_feature_array(strokes_flattened: &[i32]) -> Box<[f64]> {
    // `strokes_flattened` is a flattened array of strokes, where each stroke is a sequence of
    // (x, y) coordinates preceded by the number of points in the stroke. The first element of
    // `strokes_flattened` is the number of strokes.

    let mut strokes = Vec::new();
    let mut i = 1;
    for _ in 0..strokes_flattened[0] {
        let n_points = strokes_flattened[i] as usize;
        let mut points = Vec::new();
        for j in 0..n_points {
            points.push(Point {
                x: strokes_flattened[i + 1 + 2 * j],
                y: strokes_flattened[i + 1 + 2 * j + 1],
            });
        }
        strokes.push(Stroke(points));
        i += 1 + 2 * n_points;
    }

    model::strokes_to_feature_array(&strokes).into()
}
