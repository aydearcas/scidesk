//! The paginated preview (records 0024 and 0058): the same Typst source as the journal's PDF,
//! compiled in a World that lives for the session. Each update replaces the text of its one
//! source file (`Source::replace`), so Typst only lays out again what changed. Pages are drawn
//! as PNG when the window asks for them, and the invisible mark of each block (`<b-…>`) gives
//! the page and height where it falls, to go from the preview to the text and back.
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

use typst::foundations::Bytes;
use typst::syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt};
use typst_layout::PagedDocument;

use crate::pdf::{fonts, render_png, Bundle};

/// The live preview of the article on screen, if there is one.
#[derive(Default)]
pub struct PreviewState(pub Mutex<Option<Live>>);

pub struct Live {
    world: Bundle<'static>,
    document: Option<PagedDocument>,
}

#[derive(serde::Serialize, Debug)]
pub struct PreviewOut {
    pages: usize,
    /// Width and height of each page, in points.
    sizes: Vec<(f64, f64)>,
    /// Each block's id with the page (from 1) and the height (points from the top) where it starts.
    blocks: Vec<(String, usize, f64)>,
    warnings: Vec<String>,
    ms: f64,
}

fn main_id() -> FileId {
    RootedPath::new(VirtualRoot::Project, VirtualPath::new("main.typ").expect("a fixed, valid path")).intern()
}

/// A block id as SciDesk writes them (`b-…`, `t-…`, `n-…`): only those marks are reported.
fn is_block_id(s: &str) -> bool {
    let mut parts = s.splitn(2, '-');
    matches!((parts.next(), parts.next()), (Some(a), Some(b)) if !a.is_empty() && a.bytes().all(|c| c.is_ascii_lowercase()) && !b.is_empty() && b.bytes().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit()))
}

/// Compiles the new source; `files` replaces the files only when given (images change rarely).
pub fn update(state: &mut Option<Live>, source: String, files: Option<HashMap<String, Vec<u8>>>) -> Result<PreviewOut, Vec<String>> {
    let t = Instant::now();
    let live = state.get_or_insert_with(|| Live {
        world: Bundle { library: LazyHash::new(Library::default()), fonts: fonts(), main: Source::new(main_id(), String::new()), files: HashMap::new() },
        document: None,
    });
    live.world.main.replace(&source);
    if let Some(files) = files {
        live.world.files = files.into_iter().map(|(k, v)| (k, Bytes::new(v))).collect();
    }
    let result = typst::compile::<PagedDocument>(&live.world);
    let mut warnings = crate::pdf::messages(&live.world.main, &result.warnings);
    warnings.dedup();
    // a source that does not compile keeps the last pages on screen
    let doc = result.output.map_err(|e| crate::pdf::messages(&live.world.main, &e))?;
    let intro = doc.introspector();
    let mut blocks = Vec::new();
    for c in intro.elements().query_labelled() {
        let (Some(label), Some(loc)) = (c.label(), c.location()) else { continue };
        let name = label.resolve().as_str().to_string();
        if !is_block_id(&name) {
            continue;
        }
        if let Some(pos) = intro.position(loc) {
            blocks.push((name, pos.page.get(), pos.point.y.to_pt()));
        }
    }
    let sizes = doc.pages().iter().map(|p| (p.frame.width().to_pt(), p.frame.height().to_pt())).collect();
    let out = PreviewOut { pages: doc.pages().len(), sizes, blocks, warnings, ms: t.elapsed().as_secs_f64() * 1000.0 };
    live.document = Some(doc);
    Ok(out)
}

/// A page of the last compiled document as a PNG, `pixel_per_pt` pixels per point.
pub fn page(state: &Option<Live>, page: usize, pixel_per_pt: f32) -> Option<Vec<u8>> {
    let doc = state.as_ref()?.document.as_ref()?;
    render_png(doc, page, pixel_per_pt.clamp(0.25, 8.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SRC: &str = "#set document(date: datetime(year: 2026, month: 11, day: 22))\n#set page(paper: \"a4\")\n#metadata(\"b-uno1\") <b-uno1>\nPrimer párrafo.\n#pagebreak()\n#metadata(\"b-dos2\") <b-dos2>\nSegundo párrafo.\n#metadata(\"otra\") <otra>\n";

    #[test]
    fn reports_pages_sizes_and_where_each_block_falls() {
        let mut state = None;
        let out = update(&mut state, SRC.to_string(), Some(HashMap::new())).unwrap();
        assert_eq!(out.pages, 2);
        assert!((out.sizes[0].0 - 595.28).abs() < 0.5 && (out.sizes[0].1 - 841.89).abs() < 0.5);
        let ids: Vec<_> = out.blocks.iter().map(|b| (b.0.as_str(), b.1)).collect();
        assert_eq!(ids, vec![("b-uno1", 1), ("b-dos2", 2)]);
        assert!(page(&state, 1, 0.5).unwrap().starts_with(&[0x89, 0x50]));
        assert!(page(&state, 5, 0.5).is_none());
    }

    #[test]
    fn a_broken_source_keeps_the_last_pages_and_the_next_one_recompiles() {
        let mut state = None;
        update(&mut state, SRC.to_string(), None).unwrap();
        assert!(update(&mut state, "#let x = ".to_string(), None).is_err());
        assert!(page(&state, 1, 0.5).is_some());
        let again = update(&mut state, SRC.replace("Segundo", "Otro"), None).unwrap();
        assert_eq!(again.pages, 2);
    }

    /// Timing with a real source (optimised build): PREVIEW_BENCH=<main.typ> cargo test --release --lib preview::tests::timing -- --ignored --nocapture
    #[test]
    #[ignore]
    fn timing() {
        let Ok(path) = std::env::var("PREVIEW_BENCH") else { return };
        let src = std::fs::read_to_string(path).unwrap();
        let mut state = None;
        let first = update(&mut state, src.clone(), Some(HashMap::new())).unwrap();
        println!("first compilation: {} pages, {:.1} ms", first.pages, first.ms);
        // typing in the middle of the text: words added before a block mark
        let at = src[src.len() / 2..].find("#metadata(").map(|i| i + src.len() / 2).unwrap();
        let mut text = src.clone();
        for i in 0..8 {
            text.insert_str(at, "palabra ");
            let out = update(&mut state, text.clone(), None).unwrap();
            println!("after typing {}: {:.1} ms ({} pages)", i + 1, out.ms, out.pages);
        }
        let t = Instant::now();
        let png = page(&state, 0, 2.0).unwrap();
        println!("one page as PNG at 2 px/pt: {:.1} ms, {} KB", t.elapsed().as_secs_f64() * 1000.0, png.len() / 1024);
    }

    #[test]
    fn block_ids_only() {
        assert!(is_block_id("b-uno1") && is_block_id("t-abc0123456"));
        assert!(!is_block_id("otra") && !is_block_id("B-x") && !is_block_id("b-") && !is_block_id("-x") && !is_block_id("b-x_y"));
    }
}
