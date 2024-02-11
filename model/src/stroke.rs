#[derive(Debug, Clone)]
pub struct Point {
    pub x: i32,
    pub y: i32,
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
                if z == 0 {
                    let dx = p.x - start.x;
                    let dy = p.y - start.y;
                    ((dx * dx + dy * dy) as f64).sqrt() as i32
                } else {
                    (a * p.x + b * p.y + c).abs() / z
                }
            }
        };

        let (mid, mid_distance) = self
            .0
            .iter()
            .map(|p| (p, distance_from_line(p)))
            .max_by_key(|(_, d)| *d)
            .unwrap();

        let mid = if mid_distance > 7 {
            mid.clone()
        } else {
            Point {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2,
            }
        };

        (start.clone(), mid, end.clone())
    }
}
