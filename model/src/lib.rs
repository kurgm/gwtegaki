use wasm_bindgen::prelude::*;

const MODEL_VERSION: &str = "2";

#[wasm_bindgen]
pub fn model_version() -> String {
    MODEL_VERSION.to_string()
}
