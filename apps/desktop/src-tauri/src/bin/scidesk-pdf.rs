//! scidesk-pdf <bundle folder> <out.pdf> [--standard tagged|ua-1|a-2a|a-4] [--png <folder>]
//!
//! The command line's PDF (record 0040): compiles a Typst bundle written by the core
//! (`main.typ` and the files it uses, such as figure images) with the same code as the app.
//! Only the files of the bundle folder are given to Typst. Prints a JSON line with the
//! number of pages and Typst's warnings; with --png, also writes every page as an image.
//!
//! scidesk-pdf --raster <image> <out.png>
//!
//! Record 0068: the PNG the DOCX needs for an SVG figure, drawn with the same code as the
//! app. Prints a JSON line with the image's own width and height in CSS pixels.
use std::collections::HashMap;
use std::path::Path;

fn collect(root: &Path, dir: &Path, out: &mut HashMap<String, Vec<u8>>) -> std::io::Result<()> {
    for e in std::fs::read_dir(dir)? {
        let e = e?;
        let t = e.file_type()?;
        if t.is_symlink() {
            continue;
        }
        if t.is_dir() {
            collect(root, &e.path(), out)?;
        } else {
            let rel = e.path().strip_prefix(root).unwrap().components().map(|c| c.as_os_str().to_string_lossy().to_string()).collect::<Vec<_>>().join("/");
            out.insert(rel, std::fs::read(e.path())?);
        }
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() == 4 && args[1] == "--raster" {
        let bytes = std::fs::read(&args[2]).unwrap_or_else(|e| {
            eprintln!("cannot read {}: {e}", args[2]);
            std::process::exit(1);
        });
        match scidesk_lib::raster::to_png(&bytes) {
            Ok(r) => {
                std::fs::write(&args[3], &r.png).expect("cannot write the PNG");
                println!("{}", serde_json::json!({ "width": r.width, "height": r.height }));
            }
            Err(e) => {
                println!("{}", serde_json::json!({ "errors": [e] }));
                std::process::exit(1);
            }
        }
        return;
    }
    if args.len() < 3 {
        eprintln!("usage: scidesk-pdf <bundle folder> <out.pdf> [--standard tagged|ua-1|a-2a|a-4] [--png <folder>]");
        std::process::exit(2);
    }
    let opt = |name: &str| args.iter().position(|a| a == name).and_then(|i| args.get(i + 1)).cloned();
    let root = Path::new(&args[1]);
    let mut files = HashMap::new();
    if let Err(e) = collect(root, root, &mut files) {
        eprintln!("cannot read {}: {e}", root.display());
        std::process::exit(1);
    }
    let Some(main) = files.remove("main.typ") else {
        eprintln!("{} has no main.typ", root.display());
        std::process::exit(1);
    };
    let source = String::from_utf8_lossy(&main).to_string();
    match scidesk_lib::pdf::compile(&source, files, opt("--standard").as_deref()) {
        Ok(out) => {
            std::fs::write(&args[2], &out.pdf).expect("cannot write the PDF");
            if let Some(dir) = opt("--png") {
                std::fs::create_dir_all(&dir).expect("cannot create the image folder");
                for i in 0..out.pages {
                    if let Some(png) = scidesk_lib::pdf::render_png(&out.document, i, 1.5) {
                        std::fs::write(Path::new(&dir).join(format!("page-{}.png", i + 1)), png).expect("cannot write an image");
                    }
                }
            }
            println!("{}", serde_json::json!({ "pages": out.pages, "kb": out.pdf.len() / 1024, "warnings": out.warnings }));
        }
        Err(errors) => {
            println!("{}", serde_json::json!({ "errors": errors }));
            std::process::exit(1);
        }
    }
}
