//! Images the exports cannot take as they are (record 0068): an SVG figure goes into the
//! DOCX as itself plus the PNG that Word requires as a fallback (Word 2016 and later draw
//! the SVG; older versions and other programs show the PNG). The PNG is drawn here with
//! resvg, already in the app through Typst, with the computer's fonts for the SVG's text.
use std::sync::{Arc, OnceLock};

use resvg::usvg;

/// A PNG drawn from an image, and the image's own size in CSS pixels (96 per inch).
pub struct Raster {
    pub png: Vec<u8>,
    pub width: f32,
    pub height: f32,
}

/// The longest side of the PNG, in pixels: sharp at the width of a page of text (about 16 cm
/// at 300 dpi) without making the DOCX heavy.
pub const MAX_SIDE: u32 = 2400;

fn fonts() -> Arc<usvg::fontdb::Database> {
    static FONTS: OnceLock<Arc<usvg::fontdb::Database>> = OnceLock::new();
    FONTS
        .get_or_init(|| {
            let mut db = usvg::fontdb::Database::new();
            db.load_system_fonts();
            // what a plot's text asks for most often, when the computer has it
            db.set_sans_serif_family("Arial");
            db.set_serif_family("Times New Roman");
            Arc::new(db)
        })
        .clone()
}

/// Whether the bytes look like an SVG document (text, with an <svg element near the start).
pub fn is_svg(bytes: &[u8]) -> bool {
    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(4096)]);
    head.contains("<svg")
}

/// Draws an SVG as a PNG whose longest side is at most `max_side` pixels (twice its own size
/// when that is smaller). External files and scripts in the SVG are ignored.
pub fn svg_to_png(bytes: &[u8], max_side: u32) -> Result<Raster, String> {
    let mut opt = usvg::Options::default();
    opt.fontdb = fonts();
    // no files from outside the SVG: an image it links to is left out
    opt.resources_dir = None;
    opt.image_href_resolver = usvg::ImageHrefResolver {
        resolve_data: usvg::ImageHrefResolver::default_data_resolver(),
        resolve_string: Box::new(|_, _| None),
    };
    let tree = usvg::Tree::from_data(bytes, &opt).map_err(|e| format!("the SVG cannot be read: {e}"))?;
    let size = tree.size();
    let (w, h) = (size.width(), size.height());
    if !(w > 0.0 && h > 0.0) {
        return Err("the SVG has no size".into());
    }
    let scale = (max_side as f32 / w.max(h)).min(2.0);
    let (pw, ph) = ((w * scale).ceil().max(1.0) as u32, (h * scale).ceil().max(1.0) as u32);
    let mut pixmap = tiny_skia::Pixmap::new(pw, ph).ok_or("the image is too large")?;
    // a white page under it, as on paper (a transparent PNG looks black in some viewers)
    pixmap.fill(tiny_skia::Color::WHITE);
    resvg::render(&tree, tiny_skia::Transform::from_scale(scale, scale), &mut pixmap.as_mut());
    let png = pixmap.encode_png().map_err(|e| format!("the PNG cannot be written: {e}"))?;
    Ok(Raster { png, width: w, height: h })
}

/// The PNG for an image the exports cannot take as it is, or why not.
pub fn to_png(bytes: &[u8]) -> Result<Raster, String> {
    if is_svg(bytes) {
        return svg_to_png(bytes, MAX_SIDE);
    }
    Err("only SVG images are converted for now".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn draws_an_svg_with_its_own_size() {
        let svg = br##"<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect x="10" y="10" width="100" height="50" fill="#0b6477"/><text x="150" y="100" font-family="Arial" font-size="20">Figura</text></svg>"##;
        let r = to_png(svg).unwrap();
        assert_eq!((r.width, r.height), (300.0, 150.0));
        assert_eq!(&r.png[1..4], b"PNG");
        // twice the size, and the rectangle is there in the accent colour
        let img = tiny_skia::Pixmap::decode_png(&r.png).unwrap();
        assert_eq!((img.width(), img.height()), (600, 300));
        let p = img.pixel(60, 60).unwrap();
        assert_eq!((p.red(), p.green(), p.blue()), (0x0b, 0x64, 0x77));
        // the text is drawn with a font of the computer: some dark pixels where it goes
        let dark = (300..600).flat_map(|x| (150..210).map(move |y| (x, y))).filter(|&(x, y)| img.pixel(x, y).unwrap().red() < 100).count();
        assert!(dark > 50, "the text was not drawn ({dark} dark pixels)");
    }

    #[test]
    fn a_large_svg_stays_under_the_limit() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="5000" height="1000"/>"#;
        let r = to_png(svg).unwrap();
        let img = tiny_skia::Pixmap::decode_png(&r.png).unwrap();
        assert_eq!((img.width(), img.height()), (MAX_SIDE, 480));
    }

    #[test]
    fn refuses_what_it_cannot_read() {
        assert!(to_png(b"<svg").is_err());
        assert!(to_png(b"II*\0not really a tiff").is_err());
    }
}
