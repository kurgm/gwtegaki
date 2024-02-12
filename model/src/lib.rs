use wasm_bindgen::prelude::*;

pub use crate::model::{strokes_to_feature_array, FEATURE_COLSIZE, MODEL_VERSION};
pub use crate::stroke::{Point, Stroke};

mod indexed_feature;
mod model;
mod stroke;

#[wasm_bindgen]
pub fn model_version() -> String {
    MODEL_VERSION.to_string()
}

#[wasm_bindgen]
pub fn feature_colsize() -> usize {
    FEATURE_COLSIZE
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
                x: strokes_flattened[i + 1 + 2 * j] as f64,
                y: strokes_flattened[i + 1 + 2 * j + 1] as f64,
            });
        }
        strokes.push(Stroke(points));
        i += 1 + 2 * n_points;
    }

    strokes_to_feature_array(&strokes).into()
}
