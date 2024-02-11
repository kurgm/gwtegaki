use wasm_bindgen::prelude::*;

mod model;

#[wasm_bindgen]
pub fn model_version() -> String {
    model::MODEL_VERSION.to_string()
}

#[wasm_bindgen]
pub fn feature_colsize() -> usize {
    model::FEATURE_COLSIZE
}
