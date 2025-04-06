use once_cell::sync::Lazy;
use regex::Regex;

fn is_kanji_ucs(codepoint: u32) -> bool {
    matches!(codepoint,
        0x3400..=0x4dbf
        | 0x4e00..=0x9fff
        | 0x20000..=0x2a6df
        | 0x2a700..=0x2b73f
        | 0x2b740..=0x2b81f
        | 0x2b820..=0x2ceaf
        | 0x2ceb0..=0x2ebef
        | 0x2ebf0..=0x2ee5f
        | 0x30000..=0x3134f
        | 0x31350..=0x323af
        | 0xf900..=0xfa6d
        | 0xfa70..=0xfad9
        | 0x2f800..=0x2fa1d
        | 0x2e80..=0x2eff
        | 0x2f00..=0x2fdf
        | 0x31c0..=0x31ef
    )
}

fn is_idc_ucs(codepoint: u32) -> bool {
    matches!(codepoint, 0x2ff0..=0x2fff | 0x31ef)
}

fn is_kanji_aj1(cid: u32) -> bool {
    matches!(cid,
        656..=656
        | 1125..=7477
        | 7633..=7886
        | 7961..=8004
        | 8266..=8267
        | 8284..=8285
        | 8359..=8717
        | 13320..=15443
        | 16779..=20316
        | 21071..=23057
    )
}

fn is_kanji_glyph_name(name: &str) -> bool {
    static UCS_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^u([0-9a-f]{4,})(?:-|$)").unwrap());
    if let Some(captures) = UCS_RE.captures(name) {
        let codepoint = u32::from_str_radix(captures.get(1).unwrap().as_str(), 16).unwrap();
        if is_idc_ucs(codepoint) && name.contains('-') {
            return true;
        }
        return is_kanji_ucs(codepoint);
    }

    static AJ1_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^aj1-(\d{5})(?:-|$)").unwrap());
    if let Some(captures) = AJ1_RE.captures(name) {
        let cid = captures.get(1).unwrap().as_str().parse::<u32>().unwrap();
        return is_kanji_aj1(cid);
    }

    static HIKANJI_RE: Lazy<Regex> = Lazy::new(|| {
        Regex::new(r"^parts-|^pinyin-|^koseki-9|^juki-([0-2][0-9a-f]|3[0-2]|ac|ff)").unwrap()
    });
    if HIKANJI_RE.is_match(name) {
        return false;
    }

    true
}

pub fn is_target_glyph_name(name: &str) -> bool {
    if name.contains('_') {
        return false;
    }
    if !is_kanji_glyph_name(name) {
        return false;
    }
    if name.starts_with("hitsujun-") {
        return false;
    }
    true
}
