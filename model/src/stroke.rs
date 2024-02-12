#[derive(Debug, Clone)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl From<(f64, f64)> for Point {
    fn from((x, y): (f64, f64)) -> Self {
        Self { x, y }
    }
}

#[derive(Debug, Clone)]
pub struct Stroke(pub Vec<Point>);

impl Stroke {
    pub fn summary_points(&self) -> (Point, Point, Point) {
        let start = self.0.first().unwrap();
        let end = self.0.last().unwrap();

        let distance_from_line = {
            let a = start.y - end.y;
            let b = -(start.x - end.x);
            let c = start.x * end.y - start.y * end.x;
            let z = a * a + b * b;
            move |p: &Point| {
                if z == 0.0 {
                    let dx = p.x - start.x;
                    let dy = p.y - start.y;
                    dx.hypot(dy)
                } else {
                    (a * p.x + b * p.y + c).abs() / z
                }
            }
        };

        let (mid, mid_distance) = self
            .0
            .iter()
            .map(|p| (p, distance_from_line(p)))
            .max_by(|(_, d1), (_, d2)| d1.partial_cmp(d2).unwrap())
            .unwrap();

        let mid = if mid_distance > 7.0 {
            mid.clone()
        } else {
            Point {
                x: (start.x + end.x) / 2.0,
                y: (start.y + end.y) / 2.0,
            }
        };

        (start.clone(), mid, end.clone())
    }
}
