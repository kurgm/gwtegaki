use gwtegaki_model::{Point, Stroke};

use crate::dump_reader::Dump;

pub fn kage_is_alias(data: &str) -> bool {
    !data.contains('$') && data.starts_with("99:0:0:0:0:200:200:")
}

pub struct BuhinRecurser {
    stack: Vec<String>,
}

impl BuhinRecurser {
    pub fn new() -> Self {
        Self { stack: vec![] }
    }

    fn enter(&mut self, part_name: &str) -> Result<(), String> {
        if self.stack.contains(&part_name.to_string()) {
            return Err(format!("Recursion detected: {}", part_name));
        }
        self.stack.push(part_name.to_string());
        Ok(())
    }

    fn exit(&mut self) {
        self.stack.pop();
    }

    fn kage_line_to_strokes(&mut self, line: &str, dump: &Dump) -> Vec<Stroke> {
        let numeric_data: Vec<f64> = line
            .split(':')
            .map(|s| parse_cell(s))
            .chain(std::iter::repeat(0.0))
            .take(11)
            .collect();

        match line
            .split(':')
            .nth(0)
            .and_then(|s| s.parse::<i32>().ok())
            .unwrap_or(0)
        {
            1 => vec![line_stroke(
                (numeric_data[3], numeric_data[4]),
                (numeric_data[5], numeric_data[6]),
            )],
            2 => vec![quadratic_bezier_stroke(
                (numeric_data[3], numeric_data[4]),
                (numeric_data[5], numeric_data[6]),
                (numeric_data[7], numeric_data[8]),
            )],
            3 | 4 => vec![bend_stroke(
                (numeric_data[3], numeric_data[4]),
                (numeric_data[5], numeric_data[6]),
                (numeric_data[7], numeric_data[8]),
            )],
            6 => vec![cubic_bezier_stroke(
                (numeric_data[3], numeric_data[4]),
                (numeric_data[5], numeric_data[6]),
                (numeric_data[7], numeric_data[8]),
                (numeric_data[9], numeric_data[10]),
            )],
            7 => vec![slash_stroke(
                (numeric_data[3], numeric_data[4]),
                (numeric_data[5], numeric_data[6]),
                (numeric_data[7], numeric_data[8]),
                (numeric_data[9], numeric_data[10]),
            )],
            99 => {
                let strokes = {
                    let Some(part_name) = line.split(':').nth(7) else {
                        return vec![];
                    };
                    let part_name = part_name.split('@').next().unwrap();
                    let Some(part_data) = dump.get(part_name) else {
                        return vec![];
                    };
                    if self.enter(part_name).is_err() {
                        return vec![];
                    }
                    let strokes = self.kage_data_to_strokes(part_data, dump);
                    self.exit();
                    strokes
                };
                let point_s = (numeric_data[1], numeric_data[2]);
                let point_0 = (numeric_data[3], numeric_data[4]);
                let point_1 = (numeric_data[5], numeric_data[6]);
                let point_t = (numeric_data[9], numeric_data[10]);
                transform_buhin_strokes(strokes, point_s, point_0, point_1, point_t)
            }
            _ => vec![],
        }
    }

    pub fn kage_data_to_strokes(&mut self, data: &str, dump: &Dump) -> Vec<Stroke> {
        data.split('$')
            .flat_map(|line| self.kage_line_to_strokes(line, dump))
            .collect()
    }
}

fn parse_cell(s: &str) -> f64 {
    // parse as f64, if failed, return 0
    s.parse::<f64>().unwrap_or(0.0)
}

fn line_stroke(start: (f64, f64), end: (f64, f64)) -> Stroke {
    Stroke(vec![start.into(), end.into()])
}

fn quadratic_bezier_stroke(start: (f64, f64), control: (f64, f64), end: (f64, f64)) -> Stroke {
    const N_SAMPLES: i32 = 4;
    let mut points: Vec<Point> = vec![start.into()];
    let (sx, sy) = start;
    let (cx, cy) = control;
    let (ex, ey) = end;
    for i in 1..=N_SAMPLES {
        let t = i as f64 / (N_SAMPLES + 1) as f64;
        let s = 1.0 - t;
        let x = s * s * sx + 2.0 * s * t * cx + t * t * ex;
        let y = s * s * sy + 2.0 * s * t * cy + t * t * ey;
        points.push((x, y).into());
    }
    points.push(end.into());
    Stroke(points)
}

fn cubic_bezier_stroke(
    start: (f64, f64),
    control1: (f64, f64),
    control2: (f64, f64),
    end: (f64, f64),
) -> Stroke {
    const N_SAMPLES: i32 = 4;
    let mut points: Vec<Point> = vec![start.into()];
    let (sx, sy) = start;
    let (c1x, c1y) = control1;
    let (c2x, c2y) = control2;
    let (ex, ey) = end;
    for i in 1..=N_SAMPLES {
        let t = i as f64 / (N_SAMPLES + 1) as f64;
        let s = 1.0 - t;
        let x = s * s * s * sx + 3.0 * s * s * t * c1x + 3.0 * s * t * t * c2x + t * t * t * ex;
        let y = s * s * s * sy + 3.0 * s * s * t * c1y + 3.0 * s * t * t * c2y + t * t * t * ey;
        points.push((x, y).into());
    }
    points.push(end.into());
    Stroke(points)
}

fn bend_stroke(start: (f64, f64), mid: (f64, f64), end: (f64, f64)) -> Stroke {
    Stroke(vec![start.into(), mid.into(), end.into()])
}

fn slash_stroke(
    start: (f64, f64),
    mid: (f64, f64),
    control: (f64, f64),
    end: (f64, f64),
) -> Stroke {
    let Stroke(points0) = line_stroke(start, mid);
    let Stroke(points1) = quadratic_bezier_stroke(mid, control, end);
    Stroke(
        points0
            .into_iter()
            .chain(points1.into_iter().skip(1))
            .collect(),
    )
}

fn strokes_bbx(strokes: &[Stroke]) -> (f64, f64, f64, f64) {
    let mut min_x = std::f64::MAX;
    let mut max_x = std::f64::MIN;
    let mut min_y = std::f64::MAX;
    let mut max_y = std::f64::MIN;
    for stroke in strokes {
        for point in &stroke.0 {
            min_x = min_x.min(point.x);
            max_x = max_x.max(point.x);
            min_y = min_y.min(point.y);
            max_y = max_y.max(point.y);
        }
    }
    (min_x, max_x, min_y, max_y)
}

fn transform_buhin_strokes(
    strokes: Vec<Stroke>,
    point_s: (f64, f64),
    (x0, y0): (f64, f64),
    (x1, y1): (f64, f64),
    point_t: (f64, f64),
) -> Vec<Stroke> {
    let place_rect = move |Point { x, y }| Point {
        x: x * (x1 - x0) / 200.0 + x0,
        y: y * (y1 - y0) / 200.0 + y0,
    };

    let stretch = {
        let (sx, sy, tx, ty) = {
            let (sx, sy) = point_s;
            let (tx, ty) = point_t;
            if sx <= 100.0 {
                (sx + 200.0, sy, 0.0, 0.0)
            } else {
                (sx, sy, tx, ty)
            }
        };
        ((sx - 200.0, sy) != (tx, ty)).then(|| {
            let (min_x, max_x, min_y, max_y) = strokes_bbx(&strokes);
            move |Point { x, y }| {
                let x = stretch(sx - 200.0, tx, x, min_x, max_x);
                let y = stretch(sy - 200.0, ty, y, min_y, max_y);
                Point { x, y }
            }
        })
    };
    strokes
        .into_iter()
        .map(|stroke| {
            Stroke(
                stroke
                    .0
                    .into_iter()
                    .map(|point| {
                        let mut p = point;
                        if let Some(stretch) = stretch {
                            p = stretch(p);
                        }
                        place_rect(p)
                    })
                    .collect(),
            )
        })
        .collect()
}

fn stretch(dp: f64, sp: f64, p: f64, min: f64, max: f64) -> f64 {
    let (p1, p2, p3, p4) = if p < sp + 100.0 {
        (min, min, sp + 100.0, dp + 100.0)
    } else {
        (sp + 100.0, dp + 100.0, max, max)
    };
    if p1 != p2 {
        ((p - p1) / (p2 - p1)) * (p4 - p3) + p3
    } else {
        p3
    }
}
