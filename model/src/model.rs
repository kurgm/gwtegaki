pub const MODEL_VERSION: &str = "2";

const PARAM_N_PT_X: usize = 2;
const PARAM_N_PT_Y: usize = 2;
const PARAM_N_SEG_X: usize = 3;
const PARAM_N_SEG_Y: usize = 3;
const PARAM_N_SEG_MAG: usize = 6;
const PARAM_N_SEG_ANGLE: usize = 7;

const _ABS_FEATURE_SIZE: usize = PARAM_N_PT_X * PARAM_N_PT_Y * PARAM_N_PT_X * PARAM_N_PT_Y;
const _REL_FEATURE_SIZE: usize =
    PARAM_N_SEG_X * PARAM_N_SEG_Y * PARAM_N_SEG_MAG * PARAM_N_SEG_ANGLE;
pub const FEATURE_COLSIZE: usize = _ABS_FEATURE_SIZE + _REL_FEATURE_SIZE;
