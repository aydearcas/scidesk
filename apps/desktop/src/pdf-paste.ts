// Pasting text copied from a PDF (R23, record 0065): a PDF gives one line per line of the
// page, cut in the middle of sentences and of words. Text that looks like that is put back
// into paragraphs: lines joined with a space, a word cut by a hyphen at the end of a line
// joined again, and a new paragraph after a blank line, before a list item, or after a short
// line that ends a sentence. Other plain text is pasted as it is.

const ENDS_SENTENCE = /[.!?:…»”)]$/u;
const LIST_ITEM = /^(?:\d{1,3}[.)]|[a-z][.)]|[•·▪◦‣*–-])\s/u;

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** Whether plain text looks like lines copied from a PDF page. */
export function looksLikePdf(text: string): boolean {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  const typical = median(lines.map((l) => l.length));
  if (typical < 35) return false;
  // in a PDF most lines stop where the page ends, not where a sentence does
  const open = lines.slice(0, -1).filter((l) => !ENDS_SENTENCE.test(l)).length;
  return open / (lines.length - 1) >= 0.5;
}

/** The paragraphs of text copied from a PDF, or null if it does not look like one. */
export function unwrapPdfText(text: string): string[] | null {
  if (!looksLikePdf(text)) return null;
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim());
  const typical = median(lines.filter(Boolean).map((l) => l.length));
  const paragraphs: string[] = [];
  let current = "";
  let previous = "";
  const close = () => { if (current) paragraphs.push(current); current = ""; };
  for (const line of lines) {
    if (!line) { close(); previous = ""; continue; }
    if (!current) { current = line; previous = line; continue; }
    const shortEnd = ENDS_SENTENCE.test(previous) && previous.length < typical * 0.75;
    if (LIST_ITEM.test(line) || shortEnd) { close(); current = line; previous = line; continue; }
    // a word cut at the end of the line: a soft hyphen, or a hyphen after a letter with a
    // lower-case continuation (inflama-/ción); "anti-/TNF" keeps its hyphen
    if (/­$/.test(current)) current = current.slice(0, -1) + line;
    else if (/\p{L}-$/u.test(current) && /^\p{Ll}/u.test(line)) current = current.slice(0, -1) + line;
    // a compound cut at its own hyphen (anti-/TNF): the hyphen stays, without a space
    else if (/\p{L}-$/u.test(current)) current += line;
    else current += " " + line;
    previous = line;
  }
  close();
  return paragraphs;
}
