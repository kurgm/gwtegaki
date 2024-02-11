use crate::{
    indexed_feature::{Feature, IndexedFeatureDim, IndexedFeatureElement},
    stroke::{Point, Stroke},
};

pub const MODEL_VERSION: &str = "2";

const PARAM_N_PT_X: usize = 2;
const PARAM_N_PT_Y: usize = 2;
const PARAM_N_SEG_X: usize = 3;
const PARAM_N_SEG_Y: usize = 3;
const PARAM_N_SEG_MAG: usize = 6;
const PARAM_N_SEG_ANGLE: usize = 7;

const ABS_FEATURE_DIM: usize = 4;
struct AbsFeatureDim {}
impl IndexedFeatureDim<ABS_FEATURE_DIM> for AbsFeatureDim {
    const DIM: [usize; ABS_FEATURE_DIM] = [PARAM_N_PT_X, PARAM_N_PT_Y, PARAM_N_PT_X, PARAM_N_PT_Y];
}
type AbsFeatureElement = IndexedFeatureElement<ABS_FEATURE_DIM>;

fn calc_abs_index((p, q): (&Point, &Point), k: f64) -> AbsFeatureElement {
    let index = [
        p.x as f64 / 200.0,
        p.y as f64 / 200.0,
        q.x as f64 / 200.0,
        q.y as f64 / 200.0,
    ];
    let value = k;
    AbsFeatureElement { index, value }
}

const REL_FEATURE_DIM: usize = 4;
struct RelFeatureDim {}
impl IndexedFeatureDim<REL_FEATURE_DIM> for RelFeatureDim {
    const DIM: [usize; REL_FEATURE_DIM] = [
        PARAM_N_SEG_X,
        PARAM_N_SEG_Y,
        PARAM_N_SEG_MAG,
        PARAM_N_SEG_ANGLE,
    ];
}
type RelFeatureElement = IndexedFeatureElement<REL_FEATURE_DIM>;

fn calc_rel_index((p, q): (&Point, &Point), k: f64) -> RelFeatureElement {
    let dx = q.x - p.x;
    let dy = q.y - p.y;
    let mag = ((dx * dx + dy * dy) as f64).sqrt();
    let angle = (dx as f64).atan2(dy as f64); // upward segments have angle = pi or -pi

    let index = [
        (p.x + q.x) as f64 / 400.0,
        (p.y + q.y) as f64 / 400.0,
        mag / 250.0,
        (angle / std::f64::consts::PI + 0.5) / 1.5,
    ];
    let value = k * (0.5 + mag / 400.0) * 1.3;
    RelFeatureElement { index, value }
}

pub const FEATURE_COLSIZE: usize = AbsFeatureDim::COLSIZE + RelFeatureDim::COLSIZE;

pub fn strokes_to_feature_array(strokes: &Vec<Stroke>) -> Vec<f64> {
    let mut raw_feature = RawFeature::new();
    for stroke in strokes {
        let (start, mid, end) = stroke.summary_points();

        raw_feature.add_feature_segment((&start, &end), 1.0);
        raw_feature.add_feature_segment((&start, &mid), 0.4);
        raw_feature.add_feature_segment((&mid, &end), 0.4);
    }
    raw_feature.to_feature_array()
}

#[derive(Debug, Clone)]
struct RawFeature {
    abs: Vec<AbsFeatureElement>,
    rel: Vec<RelFeatureElement>,
}

impl RawFeature {
    fn new() -> Self {
        let abs = Vec::new();
        let rel = Vec::new();
        RawFeature { abs, rel }
    }

    fn add_feature_segment(&mut self, segment: (&Point, &Point), k: f64) {
        self.abs.push(calc_abs_index(segment, k));
        self.rel.push(calc_rel_index(segment, k));
    }

    fn to_feature_array(&self) -> Vec<f64> {
        AbsFeatureDim::generate_feature_array(&self.abs)
            .into_iter()
            .chain(RelFeatureDim::generate_feature_array(&self.rel))
            .collect()
    }
}
