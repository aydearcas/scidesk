//! Prototype 9 benchmark: spellbook (Rust, MPL-2.0) with LibreOffice's Hunspell dictionaries.
//!
//! spellbench <aff> <dic> <text> [--unknown <out>] [--words <out>]
//!
//! Reports dictionary load time, time to check every word of the text, and time to get
//! suggestions for misspellings made from correct words. `--unknown` writes the words
//! the dictionary rejects (to look for false positives) and `--words` writes every
//! distinct word with spellbook's verdict, so the same list can be checked with Hunspell.
use std::collections::BTreeMap;
use std::time::Instant;

/// Words as a spell checker sees them: runs of letters, apostrophes inside a word kept,
/// hyphenated words split, tokens with digits and single letters skipped.
pub fn words(text: &str) -> Vec<&str> {
    text.split(|c: char| !(c.is_alphabetic() || c == '\'' || c == '’' || c.is_ascii_digit()))
        .map(|w| w.trim_matches(|c| c == '\'' || c == '’'))
        .filter(|w| w.chars().count() > 1 && !w.chars().any(|c| c.is_ascii_digit()))
        .collect()
}

/// Typical typos made from a correct word: a missing accent, a dropped letter, two
/// letters swapped. Returns (typo, original).
fn typos(words: &[&str], n: usize) -> Vec<(String, String)> {
    let mut out = Vec::new();
    for (i, w) in words.iter().enumerate() {
        if out.len() >= n {
            break;
        }
        let chars: Vec<char> = w.chars().collect();
        if chars.len() < 5 {
            continue;
        }
        let deaccented: String = chars.iter().map(|c| match c { 'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', c => *c }).collect();
        let typo = if deaccented != *w {
            deaccented
        } else if i % 2 == 0 {
            chars.iter().enumerate().filter(|(j, _)| *j != chars.len() / 2).map(|(_, c)| c).collect()
        } else {
            let mut c = chars.clone();
            c.swap(1, 2);
            c.into_iter().collect()
        };
        if typo != *w {
            out.push((typo, w.to_string()));
        }
    }
    out
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let (aff_path, dic_path, text_path) = (&args[1], &args[2], &args[3]);
    let opt = |name: &str| args.iter().position(|a| a == name).map(|i| args[i + 1].clone());

    let t = Instant::now();
    let aff = std::fs::read_to_string(aff_path).unwrap();
    let dic = std::fs::read_to_string(dic_path).unwrap();
    let read_ms = t.elapsed().as_secs_f64() * 1e3;
    let t = Instant::now();
    let dict = spellbook::Dictionary::new(&aff, &dic).expect("dictionary parses");
    let load_ms = t.elapsed().as_secs_f64() * 1e3;

    let text = std::fs::read_to_string(text_path).unwrap();
    let all = words(&text);
    let t = Instant::now();
    let mut verdict: BTreeMap<&str, bool> = BTreeMap::new();
    let mut wrong = 0usize;
    for w in &all {
        let ok = dict.check(w);
        if !ok {
            wrong += 1;
        }
        verdict.insert(w, ok);
    }
    let check_ms = t.elapsed().as_secs_f64() * 1e3;

    // suggestions for typos made from words the dictionary accepts
    let good: Vec<&str> = all.iter().copied().filter(|w| verdict[w]).collect();
    let cases = typos(&good, 200);
    let mut suggest_times = Vec::new();
    let mut top1 = 0;
    let mut top5 = 0;
    let mut flagged = 0;
    let mut out = Vec::new();
    for (typo, original) in &cases {
        if dict.check(typo) {
            continue; // the typo is itself a valid word
        }
        flagged += 1;
        out.clear();
        let t = Instant::now();
        dict.suggest(typo, &mut out);
        suggest_times.push(t.elapsed().as_secs_f64() * 1e3);
        if out.first() == Some(original) {
            top1 += 1;
        }
        if out.iter().take(5).any(|s| s == original) {
            top5 += 1;
        }
    }
    suggest_times.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let pct = |p: f64| suggest_times.get(((suggest_times.len() as f64 - 1.0) * p) as usize).copied().unwrap_or(0.0);

    println!(
        "{{\"engine\":\"spellbook-native\",\"dictionary\":\"{}\",\"readMs\":{:.1},\"loadMs\":{:.1},\"words\":{},\"distinct\":{},\"rejected\":{},\"rejectedDistinct\":{},\"checkMs\":{:.2},\"typos\":{},\"suggestMedianMs\":{:.2},\"suggestP95Ms\":{:.2},\"suggestMaxMs\":{:.2},\"top1\":{},\"top5\":{}}}",
        dic_path.rsplit(['/', '\\']).next().unwrap(),
        read_ms, load_ms, all.len(), verdict.len(), wrong, verdict.values().filter(|v| !**v).count(), check_ms,
        flagged, pct(0.5), pct(0.95), pct(1.0), top1, top5
    );
    if let Some(path) = opt("--unknown") {
        let list: Vec<&str> = verdict.iter().filter(|(_, ok)| !**ok).map(|(w, _)| *w).collect();
        std::fs::write(path, list.join("\n")).unwrap();
    }
    if let Some(path) = opt("--words") {
        let list: Vec<String> = verdict.iter().map(|(w, ok)| format!("{}\t{}", w, if *ok { 1 } else { 0 })).collect();
        std::fs::write(path, list.join("\n")).unwrap();
    }
}
