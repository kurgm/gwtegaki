use std::collections::BTreeMap;
use std::fs::File;
use std::io::{self, BufRead};
use std::path::Path;

pub struct Dump {
    data: BTreeMap<String, String>,
}

impl Dump {
    pub fn read_from_file<P>(dump_file_path: P) -> Result<Self, io::Error>
    where
        P: AsRef<Path>,
    {
        let file = File::open(dump_file_path)?;
        let mut lines = io::BufReader::new(file).lines();
        // skip header (two lines)
        lines.next().expect("too less header")?;
        lines.next().expect("too less header")?;

        let mut data = BTreeMap::new();
        for line in lines {
            let line = line?;
            let parts: Vec<_> = line.split('|').collect();
            if parts.len() != 3 {
                // ignore footer
                continue;
            }
            // name, kanrenji, data
            let key = parts[0].trim();
            let value = parts[2].trim();
            data.insert(key.to_string(), value.to_string());
        }
        Ok(Self { data })
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.data.get(key).map(|s| s.as_str())
    }

    pub fn iter(&self) -> impl Iterator<Item = (&str, &str)> {
        self.data.iter().map(|(k, v)| (k.as_str(), v.as_str()))
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }
}
