mod dump_reader;
mod glyph_name;
mod kage;

use std::io::{self, Write};
use std::os::unix::fs::MetadataExt;
use std::path::PathBuf;

use gwtegaki_model::{strokes_to_feature_array, FEATURE_COLSIZE, MODEL_VERSION};
use indicatif::ProgressBar;
use itertools::Itertools;

use crate::dump_reader::Dump;
use crate::glyph_name::is_target_glyph_name;
use crate::kage::{kage_is_alias, BuhinRecurser};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: {} <dumpfilepath>", args[0]);
        std::process::exit(1);
    }
    let dumpfilepath = PathBuf::from(&args[1]);
    if !dumpfilepath.exists() {
        eprintln!("Error: file not found: {}", dumpfilepath.display());
        std::process::exit(1);
    }

    if let Err(err) = run(dumpfilepath) {
        eprintln!("Application error: {}", err);
        std::process::exit(1);
    }
}

fn run(dumpfilepath: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let dump = Dump::read_from_file(&dumpfilepath)?;

    let mut writer = FeatureWriter::new();
    {
        let metadata = dumpfilepath.metadata()?;
        writer.write_metadata(metadata.mtime() * 1000, MODEL_VERSION, FEATURE_COLSIZE, dump.len())?;
    }

    let pb = ProgressBar::new(dump.len().try_into().unwrap());

    for (name, data) in dump.iter() {
        pb.inc(1);

        if kage_is_alias(data) {
            continue;
        }
        if !is_target_glyph_name(name) {
            continue;
        }
        let mut recurser = BuhinRecurser::new();
        let strokes = recurser.kage_data_to_strokes(data, &dump);
        if strokes.is_empty() {
            continue;
        }
        let feature = strokes_to_feature_array(&strokes);
        writer.write_feature(name, &feature)?;
    }
    writer.flush()?;
    pb.finish();

    Ok(())
}

struct FeatureWriter {
    inner: io::BufWriter<io::Stdout>,
}

impl FeatureWriter {
    fn new() -> Self {
        let inner = io::BufWriter::new(io::stdout());
        Self { inner }
    }

    fn write_metadata(
        &mut self,
        timestamp: i64,
        v: &str,
        dimen: usize,
        len_hint: usize,
    ) -> Result<(), Box<dyn std::error::Error>> {
        writeln!(&mut self.inner, "{} {} {} {}", timestamp, v, dimen, len_hint)?;
        Ok(())
    }

    fn write_feature(
        &mut self,
        name: &str,
        feature: &[f64],
    ) -> Result<(), Box<dyn std::error::Error>> {
        writeln!(&mut self.inner, "{} {}", name, feature.iter().join(","))?;
        Ok(())
    }

    fn flush(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.inner.flush()?;
        Ok(())
    }
}
