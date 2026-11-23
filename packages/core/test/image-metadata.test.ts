// Images without their metadata for the journal (R9, record 0089).
import { describe, expect, it } from "vitest";
import { exifOrientation, stripImageMetadata } from "../src/image-metadata.ts";

const bytes = (...parts: (number[] | string | Uint8Array)[]) => {
  const flat: number[] = [];
  for (const p of parts) for (const b of typeof p === "string" ? [...new TextEncoder().encode(p)] : p) flat.push(b);
  return new Uint8Array(flat);
};
const text = (b: Uint8Array) => new TextDecoder("latin1").decode(b);
const u32 = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function crc32(b: Uint8Array) {
  let c = ~0;
  for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
const chunk = (type: string, data: Uint8Array | string) => {
  const d = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const td = bytes(type, d);
  return bytes(u32(d.length), td, u32(crc32(td)));
};

/** An APP1 Exif segment (little-endian) with the orientation and an Artist. */
function exif(orientation: number, artist: string) {
  const a = new TextEncoder().encode(`${artist}\0`);
  const ifd = [2, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0x3b, 0x01, 2, 0, a.length, 0, 0, 0, 38, 0, 0, 0, 0, 0, 0, 0];
  const tiff = bytes([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0], ifd, a);
  const data = bytes("Exif\0\0", tiff);
  return bytes([0xff, 0xe1, (data.length + 2) >> 8, (data.length + 2) & 255], data);
}

describe("image metadata (record 0089)", () => {
  it("takes text, EXIF and time chunks out of a PNG", () => {
    const png = bytes([0x89], "PNG\r\n\x1a\n", chunk("IHDR", bytes(u32(1), u32(1), [8, 2, 0, 0, 0])), chunk("tEXt", "Author\0Lucía Herrera"),
      chunk("iCCP", "sRGB\0\0x"), chunk("eXIf", "MM"), chunk("IDAT", bytes([0x78, 0x9c, 0x63, 0, 0, 0, 1, 0, 1])), chunk("tIME", bytes([7, 234, 11, 23, 0, 0, 0])), chunk("IEND", ""));
    const clean = stripImageMetadata(png);
    expect(text(clean)).not.toContain("Herrera");
    expect(text(clean)).toContain("IHDR");
    expect(text(clean)).toContain("iCCP"); // the colour profile stays
    expect(text(clean)).not.toContain("eXIf");
    expect(text(clean)).not.toContain("tIME");
    expect(text(clean.subarray(-8, -4))).toBe("IEND");
  });

  it("keeps a JPEG's pixels, colour profile and orientation, and nothing else", () => {
    const sos = bytes([0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0], [0x12, 0x34, 0xff, 0, 0x56], [0xff, 0xd9]);
    const jpeg = bytes([0xff, 0xd8], [0xff, 0xe0, 0, 16], "JFIF\0", [1, 1, 0, 0, 1, 0, 1, 0, 0], exif(6, "Lucía Herrera"),
      [0xff, 0xe1, 0, 31], "http://ns.adobe.com/xap/1.0/\0",
      [0xff, 0xe2, 0, 18], "ICC_PROFILE\0", [1, 1, 0, 0],
      [0xff, 0xed, 0, 12], "Photoshop ", [0xff, 0xfe, 0, 9], "Herrera",
      [0xff, 0xdb, 0, 4, 0, 0], sos);
    const clean = stripImageMetadata(jpeg);
    expect(text(clean)).not.toContain("Herrera");
    expect(text(clean)).not.toContain("adobe");
    expect(text(clean)).not.toContain("Photoshop");
    expect(text(clean)).toContain("JFIF");
    expect(text(clean)).toContain("ICC_PROFILE");
    expect(text(clean).endsWith(text(sos))).toBe(true);
    // a minimal EXIF with the orientation only
    const at = text(clean).indexOf("Exif");
    expect(exifOrientation(clean.subarray(at))).toBe(6);
    // upright: no EXIF at all
    expect(text(stripImageMetadata(bytes([0xff, 0xd8], exif(1, "Ana"), sos)))).not.toContain("Exif");
  });

  it("takes comments and XMP out of a GIF, and keeps the loop", () => {
    const gif = bytes("GIF89a", [1, 0, 1, 0, 0, 0, 0],
      [0x21, 0xfe, 7], "Herrera", [0],
      [0x21, 0xff, 11], "NETSCAPE2.0", [3, 1, 0, 0, 0],
      [0x21, 0xff, 11], "XMP DataXMP", [7], "Herrera", [0],
      [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0], [0x3b]);
    const clean = stripImageMetadata(gif);
    expect(text(clean)).not.toContain("Herrera");
    expect(text(clean)).toContain("NETSCAPE2.0");
    expect(text(clean).endsWith("\x2c\0\0\0\0\x01\0\x01\0\0\x02\x02\x44\x01\0\x3b")).toBe(true);
  });

  it("takes metadata, comments and editor data out of an SVG", () => {
    const svg = `<?xml version="1.0"?>\n<!-- Created by Lucía Herrera -->\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="x" xmlns:inkscape="y" sodipodi:docname="fig_herrera.svg" inkscape:export-filename="C:\\Users\\herrera\\fig.png" width="10" height="10">
<metadata><rdf:RDF><dc:creator>Lucía Herrera</dc:creator></rdf:RDF></metadata><sodipodi:namedview id="n" inkscape:current-layer="l"/>
<title>Evolución</title><rect width="10" height="10" inkscape:label="fondo"/></svg>`;
    const clean = new TextDecoder().decode(stripImageMetadata(new TextEncoder().encode(svg)));
    expect(clean.toLowerCase()).not.toContain("herrera");
    expect(clean).toContain("<title>Evolución</title>");
    expect(clean).toContain('<rect width="10" height="10"/>');
  });

  it("leaves what it does not know, or cannot read, as it is", () => {
    const bmp = bytes("BM", [0, 0, 0, 0]);
    expect(stripImageMetadata(bmp)).toBe(bmp);
    const broken = bytes([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1]);
    expect(stripImageMetadata(broken)).toBe(broken);
  });
});
