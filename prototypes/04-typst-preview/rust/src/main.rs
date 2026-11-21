//! Prototype 4 benchmark: Typst used as a library (as SciDesk's Rust core would use it).
//!
//! typstbench <file.typ> [--edits N] [--out dir]
//!
//! Measures the first compile, then recompiles after small edits in the middle and at the
//! start of the document, reusing the same `World`: Typst's memoisation (comemo) only
//! redoes what the edit touched. Also times the PDF export and the rendering of the page
//! that contains the edit (what a live preview would show), and asks the introspector on
//! which page each paragraph marker (`#metadata("p-N") <p-N>`) landed.
use std::path::PathBuf;
use std::time::Instant;

use typst::diag::{FileError, FileResult};
use typst::foundations::{Bytes, Datetime, Duration, Label};
use typst::introspection::Introspector;
use typst_layout::{PagedDocument, PagedIntrospector};
use typst_utils::{PicoStr, Scalar};
use typst::syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World};
use typst_kit::fonts::FontStore;

struct Doc {
    library: LazyHash<Library>,
    fonts: FontStore,
    main: Source,
}

impl World for Doc {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }
    fn book(&self) -> &LazyHash<FontBook> {
        self.fonts.book()
    }
    fn main(&self) -> FileId {
        self.main.id()
    }
    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.main.id() {
            Ok(self.main.clone())
        } else {
            Err(FileError::NotFound(PathBuf::from("?")))
        }
    }
    fn file(&self, _id: FileId) -> FileResult<Bytes> {
        Err(FileError::NotFound(PathBuf::from("?")))
    }
    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.font(index)
    }
    fn today(&self, _offset: Option<Duration>) -> Option<Datetime> {
        Datetime::from_ymd(2026, 11, 21)
    }
}

fn ms(t: Instant) -> f64 {
    t.elapsed().as_secs_f64() * 1e3
}

fn compile(world: &Doc) -> PagedDocument {
    let result = typst::compile::<PagedDocument>(world);
    for w in &result.warnings {
        eprintln!("warning: {}", w.message);
    }
    match result.output {
        Ok(doc) => doc,
        Err(errors) => {
            for e in errors.iter() {
                eprintln!("error: {} ({:?})", e.message, e.span);
            }
            std::process::exit(1);
        }
    }
}

/// Page (1-based) on which a `<label>` marker landed.
fn page_of(intro: &PagedIntrospector, label: &str) -> Option<usize> {
    let content = intro.query_label(Label::new(PicoStr::intern(label))?).ok()?;
    let loc = content.location()?;
    PagedIntrospector::position(intro, loc).map(|p| p.page.get())
}

fn median(v: &mut [f64]) -> f64 {
    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
    v[v.len() / 2]
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let path = &args[1];
    let opt = |name: &str| args.iter().position(|a| a == name).map(|i| args[i + 1].clone());
    let edits: usize = opt("--edits").map(|s| s.parse().unwrap()).unwrap_or(20);
    let out_dir = opt("--out").unwrap_or_else(|| "out".into());

    // fonts: those installed on the system (Calibri on Windows) plus Typst's embedded ones
    let t = Instant::now();
    let mut fonts = FontStore::new();
    fonts.extend(typst_kit::fonts::system());
    fonts.extend(typst_kit::fonts::embedded());
    let fonts_ms = ms(t);

    let text = std::fs::read_to_string(path).unwrap();
    let id = RootedPath::new(VirtualRoot::Project, VirtualPath::new("main.typ").unwrap()).intern();
    let mut world = Doc { library: LazyHash::new(Library::default()), fonts, main: Source::new(id, text) };

    let t = Instant::now();
    let doc = compile(&world);
    let first_ms = ms(t);
    let pages = doc.pages().len();

    // edits: type one character at a time in the middle paragraph, then at the start
    let middle_marker = format!("<p-{}>", {
        let n = world.main.text().matches("#metadata(\"p-").count();
        n / 2
    });
    let mid = world.main.text().find(&middle_marker).unwrap() + middle_marker.len() + 20;
    let start_marker = "<p-7>";
    let start = world.main.text().find(start_marker).unwrap() + start_marker.len() + 20;
    let mut run = |at: usize, world: &mut Doc| {
        let mut times = Vec::new();
        let mut last = None;
        for i in 0..edits {
            let ch = if i % 5 == 4 { " " } else { "x" };
            world.main.edit(at + i..at + i, ch);
            let t = Instant::now();
            let d = compile(world);
            times.push(ms(t));
            last = Some(d);
        }
        (times, last.unwrap())
    };
    let (mut mid_times, doc_mid) = run(mid, &mut world);
    let (mut start_times, doc_start) = run(start, &mut world);

    // where things landed
    let intro = doc_mid.introspector();
    let mid_label = middle_marker.trim_matches(['<', '>']);
    let mid_page = page_of(intro, mid_label).unwrap_or(0);
    let markers = world.main.text().matches("#metadata(\"p-").count();
    let t = Instant::now();
    let located = (1..=markers).filter(|i| page_of(intro, &format!("p-{i}")).is_some()).count();
    let locate_ms = ms(t);

    // the page a live preview would show, as an image, and the PDF
    let t = Instant::now();
    let pixmap = typst_render::render(&doc_mid.pages()[mid_page.max(1) - 1], &typst_render::RenderOptions { pixel_per_pt: Scalar::new(2.0), ..Default::default() });
    let render_ms = ms(t);
    let png = pixmap.encode_png().unwrap();
    let t = Instant::now();
    let pdf = typst_pdf::pdf(&doc_mid, &typst_pdf::PdfOptions::default()).unwrap();
    let pdf_ms = ms(t);
    std::fs::create_dir_all(&out_dir).unwrap();
    let stem = std::path::Path::new(path).file_stem().unwrap().to_string_lossy().to_string();
    std::fs::write(format!("{out_dir}/{stem}.pdf"), &pdf).unwrap();
    std::fs::write(format!("{out_dir}/{stem}-page{mid_page}.png"), &png).unwrap();
    // the page with the first table, to look at the table, its notes and the line numbers
    if let Some(p) = page_of(intro, "tab-0-1") {
        let img = typst_render::render(&doc_mid.pages()[p - 1], &typst_render::RenderOptions { pixel_per_pt: Scalar::new(2.0), ..Default::default() });
        std::fs::write(format!("{out_dir}/{stem}-table1-page{p}.png"), img.encode_png().unwrap()).unwrap();
    }
    // SciDesk will regenerate the whole Typst source from the document and hand it over:
    // `Source::replace` diffs it with the previous text and reparses only what changed.
    let mut replace_times = Vec::new();
    for i in 0..edits.min(10) {
        let mut text = world.main.text().to_string();
        text.insert_str(mid + 200 + i, "y");
        let t = Instant::now();
        world.main.replace(&text);
        let _ = compile(&world);
        replace_times.push(ms(t));
    }
    // accessible and archival PDF
    let mut standards = Vec::new();
    for (name, list) in [("tagged", vec![]), ("PDF/UA-1", vec![typst_pdf::PdfStandard::Ua_1]), ("PDF/A-2a", vec![typst_pdf::PdfStandard::A_2a]), ("PDF/A-4", vec![typst_pdf::PdfStandard::A_4])] {
        let opts = typst_pdf::PdfOptions { standards: typst_pdf::PdfStandards::new(&list).unwrap(), ..Default::default() };
        let t = Instant::now();
        let r = typst_pdf::pdf(&doc_mid, &opts);
        let took = ms(t);
        standards.push(match r {
            Ok(bytes) => {
                std::fs::write(format!("{out_dir}/{stem}-{}.pdf", name.replace('/', "")), &bytes).unwrap();
                format!("\"{name}\":\"ok {took:.0} ms\"")
            }
            Err(errs) => format!("\"{name}\":\"error: {}\"", errs.iter().map(|e| e.message.to_string().replace('"', "'")).collect::<Vec<_>>().join("; ")),
        });
    }
    eprintln!("{{\"replaceWholeSource\":{{\"medianMs\":{:.1}}},{}}}", median(&mut replace_times), standards.join(","));
    // the last page, with the bibliography formatted by citeproc-js
    let last = doc_mid.pages().len();
    let img = typst_render::render(&doc_mid.pages()[last - 1], &typst_render::RenderOptions { pixel_per_pt: Scalar::new(2.0), ..Default::default() });
    std::fs::write(format!("{out_dir}/{stem}-last-page{last}.png"), img.encode_png().unwrap()).unwrap();
    let _ = (doc, doc_start);

    println!(
        "{{\"file\":\"{}\",\"pages\":{},\"fontsMs\":{:.0},\"firstCompileMs\":{:.0},\"editMiddle\":{{\"medianMs\":{:.1},\"maxMs\":{:.1}}},\"editStart\":{{\"medianMs\":{:.1},\"maxMs\":{:.1}}},\"editedParagraphPage\":{},\"paragraphsLocated\":\"{}/{}\",\"locateAllMs\":{:.1},\"renderPageMs\":{:.0},\"pdfMs\":{:.0},\"pdfKB\":{}}}",
        stem, pages, fonts_ms, first_ms,
        median(&mut mid_times), mid_times.last().copied().unwrap_or(0.0).max(*mid_times.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap()),
        median(&mut start_times), *start_times.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap(),
        mid_page, located, markers, locate_ms, render_ms, pdf_ms, pdf.len() / 1024
    );
}
