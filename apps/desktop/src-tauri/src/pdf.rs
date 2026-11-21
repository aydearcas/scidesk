//! PDF with Typst as a library (record 0024, record 0040). The core (TypeScript) writes the
//! Typst source of the manuscript, with citations already formatted by citeproc-js, and
//! hands it over with the files it uses (figure images); this compiles it to a PDF. Fonts:
//! those installed on the system plus Typst's embedded ones, loaded once. Nothing is read
//! from the disk while compiling: the source can only reach the files it was given.
use std::collections::HashMap;
use std::sync::OnceLock;

use typst::diag::{FileError, FileResult, SourceDiagnostic};
use typst::foundations::{Bytes, Datetime, Duration};
use typst::syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World};
use typst_kit::fonts::FontStore;
use typst_layout::PagedDocument;

static FONTS: OnceLock<FontStore> = OnceLock::new();

/// System fonts and Typst's embedded ones, scanned the first time (120 ms, prototype 4).
pub fn fonts() -> &'static FontStore {
    FONTS.get_or_init(|| {
        let mut fonts = FontStore::new();
        fonts.extend(typst_kit::fonts::system());
        fonts.extend(typst_kit::fonts::embedded());
        fonts
    })
}

struct Bundle<'a> {
    library: LazyHash<Library>,
    fonts: &'a FontStore,
    main: Source,
    files: HashMap<String, Bytes>,
}

impl World for Bundle<'_> {
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
            Err(FileError::NotFound(id.vpath().get_without_slash().into()))
        }
    }
    fn file(&self, id: FileId) -> FileResult<Bytes> {
        let path = id.vpath().get_without_slash();
        self.files.get(path).cloned().ok_or_else(|| FileError::NotFound(path.into()))
    }
    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.font(index)
    }
    fn today(&self, _offset: Option<Duration>) -> Option<Datetime> {
        None // the source sets the document's date itself
    }
}

/// The PDF standards offered (record 0024): plain tagged PDF by default.
pub fn standards(name: Option<&str>) -> Result<typst_pdf::PdfStandards, String> {
    let list = match name.unwrap_or("") {
        "" | "tagged" => vec![],
        "ua-1" => vec![typst_pdf::PdfStandard::Ua_1],
        "a-2a" => vec![typst_pdf::PdfStandard::A_2a],
        "a-4" => vec![typst_pdf::PdfStandard::A_4],
        other => return Err(format!("unknown PDF standard {other}")),
    };
    typst_pdf::PdfStandards::new(&list).map_err(|e| format!("{e:?}"))
}

fn messages(diags: &[SourceDiagnostic]) -> Vec<String> {
    diags.iter().map(|d| d.message.to_string()).collect()
}

pub struct Compiled {
    pub pdf: Vec<u8>,
    pub pages: usize,
    pub warnings: Vec<String>,
    pub document: PagedDocument,
}

/// Compiles a Typst source and its files to a PDF. Errors are Typst's messages.
pub fn compile(source: &str, files: HashMap<String, Vec<u8>>, standard: Option<&str>) -> Result<Compiled, Vec<String>> {
    let id = RootedPath::new(VirtualRoot::Project, VirtualPath::new("main.typ").map_err(|e| vec![e.to_string()])?).intern();
    let world = Bundle {
        library: LazyHash::new(Library::default()),
        fonts: fonts(),
        main: Source::new(id, source.to_string()),
        files: files.into_iter().map(|(k, v)| (k, Bytes::new(v))).collect(),
    };
    let result = typst::compile::<PagedDocument>(&world);
    let mut warnings = messages(&result.warnings);
    let document = result.output.map_err(|e| messages(&e))?;
    let options = typst_pdf::PdfOptions { standards: standards(standard).map_err(|e| vec![e])?, ..Default::default() };
    let pdf = typst_pdf::pdf(&document, &options).map_err(|e| messages(&e))?;
    warnings.dedup();
    Ok(Compiled { pdf, pages: document.pages().len(), warnings, document })
}

/// A page as a PNG, to look at the result (tests, the command line).
pub fn render_png(doc: &PagedDocument, page: usize, pixel_per_pt: f32) -> Option<Vec<u8>> {
    let p = doc.pages().get(page)?;
    typst_render::render(p, &typst_render::RenderOptions { pixel_per_pt: typst_utils::Scalar::new(pixel_per_pt as f64), ..Default::default() }).encode_png().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    // a 1×1 PNG
    const PNG: &[u8] = &[
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4,
        0x89, 0, 0, 0, 13, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0xf0, 0x1f, 0, 0x05, 0, 0x01, 0xff, 0x89, 0x99, 0x3d, 0x1d, 0, 0, 0,
        0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ];

    #[test]
    fn compiles_a_source_with_its_files() {
        let src = "#set document(title: \"Prueba\", date: datetime(year: 2026, month: 11, day: 21))\n#set text(lang: \"es\")\n= Título\nTexto con una imagen.\n#figure(image(\"figures/x.png\", width: 2cm, alt: \"Un punto\"), caption: [Figura 1.], numbering: none)\n";
        let files = HashMap::from([("figures/x.png".to_string(), PNG.to_vec())]);
        let out = compile(src, files.clone(), None).unwrap();
        assert!(out.pdf.starts_with(b"%PDF"));
        assert_eq!(out.pages, 1);
        assert!(render_png(&out.document, 0, 0.5).unwrap().starts_with(&[0x89, 0x50]));
        // accessible and archival PDF from the same source
        for std in ["ua-1", "a-2a"] {
            assert!(compile(src, files.clone(), Some(std)).is_ok(), "{std}");
        }
    }

    #[test]
    fn reaches_only_the_files_it_was_given() {
        let err = compile("#image(\"../secret.png\")", HashMap::new(), None).err().unwrap();
        assert!(!err.is_empty());
        let err = compile("#read(\"C:/Windows/win.ini\")", HashMap::new(), None).err().unwrap();
        assert!(!err.is_empty());
        assert!(standards(Some("x")).is_err());
    }
}
