// Images without their metadata, for the version for the journal (R9, record 0089). A photo
// or a figure can carry who made it and where: EXIF (camera owner, GPS, software), XMP and
// IPTC (author, copyright), PNG text chunks (Author, Comment), GIF comments, and the
// metadata, comments and editor data of an SVG (Inkscape's file name, Illustrator's private
// data). The pixels, the colour profile and the orientation stay: a JPEG turned by its EXIF
// gets a minimal EXIF with only its orientation.

/** Whether the bytes are an SVG document (record 0068). */
export function isSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, 4096));
  return head.includes("<svg");
}

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/** The image without metadata; unknown or broken images as they are. */
export function stripImageMetadata(bytes: Uint8Array): Uint8Array {
  try {
    if (bytes.length > 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return png(bytes);
    if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) return jpeg(bytes);
    if (bytes.length > 13 && ascii(bytes, 0, 4) === "GIF8") return gif(bytes);
    if (isSvg(bytes)) return svg(bytes);
  } catch {
    // a malformed image goes as it is: the export must not fail because of it
  }
  return bytes;
}

// ---------------------------------------------------------------- PNG: text, EXIF and time chunks
const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
function png(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let at = 8;
  while (at + 12 <= b.length) {
    const length = view.getUint32(at);
    const type = ascii(b, at + 4, 4);
    const end = at + 12 + length;
    if (end > b.length) return b;
    if (!PNG_DROP.has(type)) parts.push(b.subarray(at, end));
    at = end;
    if (type === "IEND") break;
  }
  return concat(parts);
}

// ---------------------------------------------------------------- JPEG: APPn but JFIF, ICC and Adobe; comments
/** The orientation (1–8) in an APP1 "Exif" segment's data, if it is not 1. */
export function exifOrientation(seg: Uint8Array): number | null {
  if (ascii(seg, 0, 6) !== "Exif\0\0") return null;
  const t = seg.subarray(6);
  const view = new DataView(t.buffer, t.byteOffset, t.byteLength);
  const le = ascii(t, 0, 2) === "II";
  const ifd = view.getUint32(4, le);
  const count = view.getUint16(ifd, le);
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (view.getUint16(e, le) === 0x0112) {
      const o = view.getUint16(e + 8, le);
      return o >= 2 && o <= 8 ? o : null;
    }
  }
  return null;
}
/** An APP1 segment with only the orientation. */
function orientationApp1(o: number): Uint8Array {
  const tiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0, 0, 0, 0, 0];
  const data = [..."Exif\0\0"].map((c) => c.charCodeAt(0)).concat(tiff);
  const length = data.length + 2;
  return new Uint8Array([0xff, 0xe1, length >> 8, length & 0xff, ...data]);
}
function jpeg(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let at = 2;
  while (at + 4 <= b.length) {
    if (b[at] !== 0xff) return b;
    const marker = b[at + 1];
    if (marker === 0xff) { at++; continue; } // fill byte
    if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { parts.push(b.subarray(at, at + 2)); at += 2; continue; }
    const length = (b[at + 2] << 8) | b[at + 3];
    const end = at + 2 + length;
    if (end > b.length) return b;
    const data = b.subarray(at + 4, end);
    // start of scan: the rest is the image
    if (marker === 0xda) { parts.push(b.subarray(at)); break; }
    const app = marker >= 0xe0 && marker <= 0xef;
    const keep = !app && marker !== 0xfe
      || marker === 0xe0 // JFIF
      || (marker === 0xe2 && ascii(data, 0, 12) === "ICC_PROFILE\0") // colour profile
      || marker === 0xee; // Adobe: colour transform
    if (keep) parts.push(b.subarray(at, end));
    else if (marker === 0xe1) { const o = exifOrientation(data); if (o) parts.push(orientationApp1(o)); }
    at = end;
  }
  return concat(parts);
}

// ---------------------------------------------------------------- GIF: comments and XMP
function gif(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let at = 13;
  if (b[10] & 0x80) at += 3 * 2 ** ((b[10] & 0x07) + 1);
  parts.push(b.subarray(0, at));
  const subBlocks = (from: number) => { let i = from; while (i < b.length && b[i] !== 0) i += b[i] + 1; return i + 1; };
  while (at < b.length) {
    const kind = b[at];
    if (kind === 0x3b) { parts.push(b.subarray(at, at + 1)); break; }
    if (kind === 0x2c) {
      let i = at + 10;
      if (b[at + 9] & 0x80) i += 3 * 2 ** ((b[at + 9] & 0x07) + 1);
      const end = subBlocks(i + 1);
      parts.push(b.subarray(at, end));
      at = end;
    } else if (kind === 0x21) {
      const label = b[at + 1];
      const end = subBlocks(at + 2);
      const application = label === 0xff ? ascii(b, at + 3, 11) : "";
      // comments and XMP go; graphic control, plain text and the loop (NETSCAPE2.0) stay
      if (label !== 0xfe && !(label === 0xff && application !== "NETSCAPE2.0" && application !== "ANIMEXTS1.0")) parts.push(b.subarray(at, end));
      at = end;
    } else return b;
  }
  return concat(parts);
}

// ---------------------------------------------------------------- SVG: metadata, comments and editor data
function svg(b: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(b);
  const clean = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\?xpacket[\s\S]*?\?>/g, "")
    .replace(/<((?:svg:)?metadata|sodipodi:namedview|i:pgf)\b[^>]*\/>/g, "")
    .replace(/<((?:svg:)?metadata|sodipodi:namedview|i:pgf)\b[^>]*>[\s\S]*?<\/\1>/g, "")
    .replace(/\s(?:sodipodi|inkscape):[\w.-]+\s*=\s*(?:"[^"]*"|'[^']*')/g, "");
  return clean === text ? b : new TextEncoder().encode(clean);
}
