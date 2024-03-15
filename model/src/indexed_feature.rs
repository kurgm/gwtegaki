use itertools::Itertools;

pub trait IndexedFeatureDim<const N: usize> {
    const DIM: [usize; N];
}

#[derive(Debug, Clone)]
pub struct IndexedFeatureElement<const N: usize> {
    pub index: [f64; N],
    pub value: f64,
}

pub trait Feature<const N: usize> {
    const COLSIZE: usize;

    fn generate_feature_array(features: &[IndexedFeatureElement<N>]) -> Vec<f64>;
}

impl<T: IndexedFeatureDim<N>, const N: usize> Feature<N> for T {
    // const COLSIZE: usize = T::DIM.iter().product();
    const COLSIZE: usize = {
        let len = T::DIM.len();
        let mut size = 1;
        let mut i = 0;
        while i < len {
            size *= T::DIM[i];
            i += 1;
        }
        size
    };

    fn generate_feature_array(features: &[IndexedFeatureElement<N>]) -> Vec<f64> {
        struct MagnifiedFeatureElement {
            index: Vec<f64>,
            value: f64,
        }

        let features_magnified: Vec<_> = features
            .iter()
            .map(|f| MagnifiedFeatureElement {
                index: f
                    .index
                    .iter()
                    .zip(T::DIM.iter())
                    .map(|(i, d)| i.clamp(0.0, 1.0) * (*d - 1) as f64)
                    .collect(),
                value: f.value,
            })
            .collect();

        T::DIM
            .into_iter()
            .map(|d| (0..d).map(|i| i as f64))
            .multi_cartesian_product()
            .map(|index| {
                features_magnified
                    .iter()
                    .map(|f| {
                        f.value
                            * f.index
                                .iter()
                                .zip(index.iter())
                                .map(|(i, j)| (-(i - j).powi(2)).exp())
                                .product::<f64>()
                    })
                    .sum()
            })
            .collect()
    }
}
