// DOCX export with the `docx` library and a reference template (records 0025 and 0033).
//
// The manuscript: titles, the abstract in each language with its keywords, the body, the
// bibliography where the "references" heading is, tables (caption, table, notes) and
// figures (image, caption, notes), cross-references and table note calls. Numbers of
// citations, tables, figures and note letters are computed here, never stored.
//
// Profile "coauthors" writes the marks of the format spec (section 9): a hidden bookmark
// around every block and every table or figure part, SEQ fields for their numbers with a
// bookmark that REF fields point to, Zotero citation fields with a URI per reference, the
// Zotero bibliography field, the ZOTERO_PREF_n and SciDesk properties, and a bookmark with
// the snapshot the copy is sent from. Tables and figures stay where they are cited.
// Profile "journal" writes plain text and no metadata, and follows the journal profile:
// tables in the text or at the end, figure captions as a list at the end.
// Both take the page format of the journal profile (spacing, size, margins, page and line
// numbers) on top of the template's styles, which are looked up by their built-in name
// (Word localises style ids: "Ttulo1" in a Spanish Word).
import JSZip from "jszip";
import {
  AlignmentType, BorderStyle, BookmarkEnd, BookmarkStart, Document, Footer, ImageRun, ImportedXmlComponent,
  LineNumberRestartFormat, Packer, PageBreak, PageNumber, PageOrientation, Paragraph, SectionType, Table, TableCell, TableRow, TextRun, WidthType,
  bookmarkUniqueNumericId, type ParagraphChild,
} from "docx";
import {
  FIELDS, SCIDESK_PROPERTY, SEQ_LABELS, ZOTERO_PREF_PROPERTY, blockBookmark, numberBookmark, ownReferenceUri,
  snapshotBookmark, validate, type JournalProfileFile, type PMNode,
} from "@scidesk/formats";
import { renderCitations, runFormat, type CitationResources, type Rendering, type Run } from "./citations.ts";
import { sameLang } from "./lang.ts";
import type { ArticleData, Project } from "./project.ts";
import { saveSnapshot } from "./snapshot.ts";
import { headingRole, NUMBERED_LEVELS, sectionNumberingOf, sectionNumbers, type SectionNumbering } from "./sections.ts";
import { documentFontsOf } from "./document-font.ts";
import { tableNodeBorders, type Line } from "./table-borders.ts";

export type ExportProfile = "coauthors" | "journal";
export interface ExportResources extends CitationResources {
  /** The reference template (.dotx) whose styles the export takes (R35). */
  template(): Promise<Uint8Array>;
  /**
   * Record 0068: draws an image the DOCX cannot take as it is (an SVG) as a PNG, and gives
   * the image's own size in CSS pixels. Without it (or when it fails), such a figure is
   * left as its file name with a warning.
   */
  rasterize?: Rasterizer;
}
export type Rasterizer = (bytes: Uint8Array) => Promise<{ png: Uint8Array; width: number; height: number }>;

/** Whether the bytes are an SVG document (record 0068). */
export function isSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, 4096));
  return head.includes("<svg");
}
export interface ExportResult { bytes: Uint8Array; snapshot: string | null; path: string; warnings: string[] }

export const LABELS: Record<string, { bib: string; abstract: string; keywords: string; captions: string; table: string; figure: string }> = {
  es: { bib: "Bibliografía", abstract: "Resumen", keywords: "Palabras clave", captions: "Pies de figura", ...SEQ_LABELS.es },
  en: { bib: "References", abstract: "Abstract", keywords: "Keywords", captions: "Figure legends", ...SEQ_LABELS.en },
};
export const label = (lang: string) => LABELS[lang.slice(0, 2)] ?? LABELS.en;

/** A language tag as Word writes it: a region always (es → es-ES, en → en-US). */
export function wordLang(tag: string): string {
  const [l, r] = tag.split(/[-_]/);
  const lang = l.toLowerCase();
  return r ? `${lang}-${r.toUpperCase()}` : ({ es: "es-ES", en: "en-US", fr: "fr-FR", pt: "pt-PT", de: "de-DE", it: "it-IT" } as Record<string, string>)[lang] ?? lang;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rPr = (r: Omit<Run, "text">) => {
  const p = (r.font ? `<w:rFonts w:ascii="${esc(r.font)}" w:hAnsi="${esc(r.font)}" w:cs="${esc(r.font)}"/>` : "") + (r.bold ? "<w:b/>" : "") + (r.italic ? "<w:i/>" : "") + (r.color ? `<w:color w:val="${r.color.slice(1)}"/>` : "") + (r.highlight ? `<w:highlight w:val="${r.highlight}"/>` : "") + (r.underline ? '<w:u w:val="single"/>' : "") + (r.size ? `<w:sz w:val="${Math.round(r.size * 2)}"/><w:szCs w:val="${Math.round(r.size * 2)}"/>` : "") + (r.sup ? '<w:vertAlign w:val="superscript"/>' : r.sub ? '<w:vertAlign w:val="subscript"/>' : "") + (r.lang ? `<w:lang w:val="${esc(wordLang(r.lang))}"/>` : "");
  return p ? `<w:rPr>${p}</w:rPr>` : "";
};
const runXml = (r: Run) => `<w:r>${rPr(r)}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`;
const raw = (xml: string) => ImportedXmlComponent.fromXmlString(xml) as unknown as ParagraphChild;
/** A complex field with its result already formatted: Word shows it as it is (record 0025). */
const fieldXml = (instr: string, result: string) =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${esc(instr)} </w:instrText></w:r>` +
  `<w:r><w:fldChar w:fldCharType="separate"/></w:r>${result}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const textRun = (r: Run) => new TextRun({
  text: r.text, ...(r.bold ? { bold: true } : {}), ...(r.italic ? { italics: true } : {}), ...(r.sup ? { superScript: true } : {}), ...(r.sub ? { subScript: true } : {}),
  ...(r.underline ? { underline: {} } : {}), ...(r.color ? { color: r.color.slice(1) } : {}), ...(r.highlight ? { highlight: r.highlight as "yellow" } : {}),
  ...(r.font ? { font: r.font } : {}), ...(r.size ? { size: Math.round(r.size * 2) } : {}), ...(r.lang ? { language: { value: wordLang(r.lang) } } : {}),
});
export const letters = (n: number) => { let s = ""; n++; while (n > 0) { n--; s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };

/** Width and height in pixels of a PNG, JPEG, GIF or BMP, from its header. */
export function imageSize(b: Uint8Array): { type: "png" | "jpg" | "gif" | "bmp"; width: number; height: number } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return { type: "png", width: dv.getUint32(16), height: dv.getUint32(20) };
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49) return { type: "gif", width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
  if (b.length > 26 && b[0] === 0x42 && b[1] === 0x4d) return { type: "bmp", width: dv.getInt32(18, true), height: Math.abs(dv.getInt32(22, true)) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = dv.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: "jpg", height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}

/** The template's styles.xml with the journal's page format applied to Normal, and the ids of the styles SciDesk uses. */
export function applyTemplate(stylesXml: string, format: { lineSpacing?: number; fontSizePt?: number; font?: string; lang?: string; sectionNumbering?: SectionNumbering } = {}) {
  const ids: Record<string, string> = {};
  for (const m of stylesXml.matchAll(/<w:style [^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"/g)) ids[m[2].toLowerCase()] = m[1];
  let xml = stylesXml;
  // record 0060: the document's language is the article's (the template says es-ES), so that
  // Word checks each fragment with its own dictionary; fragments in another language say so
  if (format.lang) {
    const lang = `<w:lang w:val="${esc(wordLang(format.lang))}"`;
    xml = /<w:docDefaults>[\s\S]*?<w:lang /.test(xml)
      ? xml.replace(/(<w:docDefaults>[\s\S]*?)<w:lang w:val="[^"]*"/, `$1${lang}`)
      : xml.replace(/(<w:rPrDefault>\s*<w:rPr>)/, `$1${lang}/>`);
  }
  const normal = new RegExp(`(<w:style [^>]*w:styleId="${ids["normal"] ?? "Normal"}"[^>]*>)([\\s\\S]*?)(</w:style>)`);
  xml = xml.replace(normal, (_, open: string, body: string, close: string) => {
    let b = body;
    if (format.lineSpacing) {
      const line = Math.round(240 * format.lineSpacing);
      const spacing = `<w:spacing w:before="0" w:after="0" w:line="${line}" w:lineRule="auto"/>`;
      if (/<w:pPr>/.test(b)) b = /<w:spacing [^>]*\/>/.test(b.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)![0]) ? b.replace(/(<w:pPr>[\s\S]*?)<w:spacing [^>]*\/>/, `$1${spacing}`) : b.replace("<w:pPr>", `<w:pPr>${spacing}`);
      else b = b.replace(/(<w:rPr>|$)/, `<w:pPr>${spacing}</w:pPr>$1`);
    }
    if (format.fontSizePt || format.font) {
      const sz = format.fontSizePt ? `<w:sz w:val="${format.fontSizePt * 2}"/><w:szCs w:val="${format.fontSizePt * 2}"/>` : "";
      const fonts = format.font ? `<w:rFonts w:ascii="${esc(format.font)}" w:hAnsi="${esc(format.font)}" w:cs="${esc(format.font)}"/>` : "";
      if (/<w:rPr>/.test(b)) {
        b = b.replace(/(<w:rPr>[\s\S]*?)(<\/w:rPr>)/, (_m, inner: string, end: string) => {
          let r = inner;
          if (sz) r = r.replace(/<w:sz [^>]*\/>|<w:szCs [^>]*\/>/g, "") + sz;
          if (fonts) r = r.replace(/<w:rFonts [^>]*\/>/, "") + fonts;
          return r + end;
        });
      } else b += `<w:rPr>${fonts}${sz}</w:rPr>`;
    }
    return open + b + close;
  });
  // record 0073: Word's Quote style as a block quotation: 1.25 cm in on both sides, aligned as the text
  const quote = ids["quote"];
  if (quote) {
    const style = new RegExp(`(<w:style [^>]*w:styleId="${quote}"[^>]*>)([\\s\\S]*?)(</w:style>)`);
    xml = xml.replace(style, (_, open: string, body: string, close: string) => {
      // in plain letters, as the text (Word's own Quote style is italic and grey)
      let b = body.replace(/<w:jc [^>]*\/>/, "").replace(/<w:ind [^>]*\/>/, "").replace(/<w:i\/>|<w:iCs\/>|<w:color [^>]*\/>/g, "");
      const ind = `<w:ind w:left="709" w:right="709"/>`;
      b = /<w:pPr>/.test(b) ? b.replace(/(<w:pPr>[\s\S]*?)(<\/w:pPr>)/, `$1${ind}$2`) : b.replace(/(<w:rPr>|$)/, `<w:pPr>${ind}</w:pPr>$1`);
      return open + b + close;
    });
  }
  // record 0070: headings 1 to 3 in the sections' list, as Word does with a multilevel list
  // linked to its heading styles (a heading a co-author adds in Word is numbered too)
  if (format.sectionNumbering && format.sectionNumbering !== "none") {
    for (let level = 1; level <= NUMBERED_LEVELS; level++) {
      const id = ids[`heading ${level}`];
      if (!id) continue;
      const numPr = `<w:numPr><w:ilvl w:val="${level - 1}"/><w:numId w:val="${SECTIONS_NUM_ID}"/></w:numPr>`;
      const style = new RegExp(`(<w:style [^>]*w:styleId="${id}"[^>]*>)([\\s\\S]*?)(</w:style>)`);
      xml = xml.replace(style, (_, open: string, body: string, close: string) => {
        let b = body.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/, "");
        if (!/<w:pPr>/.test(b)) b = b.replace(/(<w:rPr>|$)/, `<w:pPr>${numPr}</w:pPr>$1`);
        else {
          // numPr goes after keepNext, keepLines, pageBreakBefore, framePr and widowControl (CT_PPrBase)
          const before = /^(<w:pPr>(?:<w:(?:pStyle|keepNext|keepLines|pageBreakBefore|framePr|widowControl)\b[^>]*\/>)*)/;
          b = b.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, (pPr) => pPr.replace(before, `$1${numPr}`));
        }
        return open + b + close;
      });
    }
  }
  return { xml, style: (name: string) => ids[name] };
}

/** Record 0070: the numId and abstractNumId of the sections' list, far from those the docx library gives. */
export const SECTIONS_NUM_ID = 9000;

/** The sections' multilevel list: "1." / "1.1." / "1.1.1." (or without the last dot), each level linked to its heading style. */
export function sectionsNumbering(numberingXml: string, style: SectionNumbering, headingIds: (string | undefined)[]): string {
  const dot = style === "1." ? "." : "";
  const levels = [0, 1, 2].map((l) => {
    const text = Array.from({ length: l + 1 }, (_, i) => `%${i + 1}`).join(".") + dot;
    const link = headingIds[l] ? `<w:pStyle w:val="${esc(headingIds[l]!)}"/>` : "";
    return `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="decimal"/>${link}<w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:suff w:val="space"/><w:pPr><w:ind w:left="0" w:firstLine="0"/></w:pPr></w:lvl>`;
  }).join("");
  const abstract = `<w:abstractNum w:abstractNumId="${SECTIONS_NUM_ID}"><w:multiLevelType w:val="multilevel"/>${levels}</w:abstractNum>`;
  const num = `<w:num w:numId="${SECTIONS_NUM_ID}"><w:abstractNumId w:val="${SECTIONS_NUM_ID}"/></w:num>`;
  // every abstractNum goes before the first num (CT_Numbering)
  const firstNum = numberingXml.search(/<w:num [^>]*>|<w:num>/);
  let xml = firstNum >= 0 ? numberingXml.slice(0, firstNum) + abstract + numberingXml.slice(firstNum) : numberingXml.replace("</w:numbering>", `${abstract}</w:numbering>`);
  xml = xml.replace("</w:numbering>", `${num}</w:numbering>`);
  return xml;
}

/** Body, tables and figures as one tree, in reading order (the composite document, record 0021). */
export function composite(art: ArticleData): { tree: PMNode; tables: Map<string, PMNode>; figures: Map<string, PMNode>; warnings: string[] } {
  const warnings: string[] = [];
  const tables = new Map<string, PMNode>();
  const figures = new Map<string, PMNode>();
  const body = art.documents.get("manuscript/article.scidoc")!.doc as PMNode;
  const content: PMNode[] = [];
  for (const n of body.content ?? []) {
    if (n.type === "tableRef" || n.type === "figureRef") {
      const part = art.documents.get(n.attrs!.src as string)?.doc as PMNode | undefined;
      if (!part) { warnings.push(`${n.attrs!.src} is missing`); continue; }
      // record 0085: the landscape page of its place in the text
      const placed = n.attrs!.landscape ? { ...part, attrs: { ...part.attrs, landscape: true } } : part;
      (n.type === "tableRef" ? tables : figures).set(n.attrs!.id as string, placed);
      content.push(placed);
    } else content.push(n);
  }
  return { tree: { type: "doc", content }, tables, figures, warnings };
}

/** Table and figure numbers by order of first cross-reference, then by position (PLAN 5.4). */
export function numbering(tree: PMNode, ids: string[]): Map<string, number> {
  const order: string[] = [];
  const visit = (n: PMNode) => {
    if (n.type === "xref" && ids.includes(n.attrs!.target as string) && !order.includes(n.attrs!.target as string)) order.push(n.attrs!.target as string);
    n.content?.forEach(visit);
  };
  visit(tree);
  for (const id of ids) if (!order.includes(id)) order.push(id);
  return new Map(order.map((id, i) => [id, i + 1]));
}

/** Letters of a part's specific notes, by order of first call (R11). */
export function noteLetters(part: PMNode): Map<string, string> {
  const specific = new Set((part.content ?? []).filter((n) => /Note$/.test(n.type) && n.attrs!.kind === "specific").map((n) => n.attrs!.id as string));
  const order: string[] = [];
  const visit = (n: PMNode) => {
    if (n.type === "noteRef" && specific.has(n.attrs!.target as string) && !order.includes(n.attrs!.target as string)) order.push(n.attrs!.target as string);
    n.content?.forEach(visit);
  };
  visit(part);
  for (const id of specific) if (!order.includes(id)) order.push(id);
  return new Map(order.map((id, i) => [id, letters(i)]));
}

/** The style of an article: the journal profile's own file if it has one, else a bundled style. */
export async function styleResources(project: Project, art: ArticleData, res: CitationResources): Promise<CitationResources> {
  const profile = art.article.journal ? project.journals.get(art.article.journal) : undefined;
  const own = profile?.citationStyle.value;
  return {
    locale: res.locale,
    style: async (id) => {
      if (own?.file && own.id === id) {
        const text = await project.fs.readText(`resources/journals/${own.file}`);
        if (text) return text;
      }
      const local = art.article.citationStyle.file ? await project.fs.readText(art.article.citationStyle.file) : null;
      return local ?? res.style(id);
    },
  };
}

export async function exportDocx(project: Project, folder: string, profile: ExportProfile, res: ExportResources): Promise<ExportResult> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const markers = profile === "coauthors";
  const lang = art.article.lang;
  const L = label(lang);
  const journal: JournalProfileFile | undefined = art.article.journal ? project.journals.get(art.article.journal) : undefined;
  if (art.article.journal && !journal) throw new Error(`journal profile ${art.article.journal} is not in resources/journals/`);
  const fmt = journal?.manuscriptFormat;
  const { tree, tables, figures, warnings } = composite(art);
  const abstract = art.documents.get("manuscript/abstract.scidoc")?.doc as PMNode | undefined;
  const style = art.article.citationStyle.id;
  const rendering: Rendering = await renderCitations(project.library, [...(abstract ? [abstract] : []), tree], style, art.article.referenceTermsLang ?? lang, await styleResources(project, art, res));
  const refById = new Map(project.library.references.map((r) => [r.id, r]));
  const tableNo = numbering(tree, [...tables.keys()]);
  const figureNo = numbering(tree, [...figures.keys()]);

  // template and page format (R35)
  const tplZip = await JSZip.loadAsync(await res.template());
  const tplStyles = await tplZip.file("word/styles.xml")?.async("string");
  if (!tplStyles) throw new Error("the reference template has no styles");
  // record 0070: numbered sections, by Word itself from the heading styles
  const sectionStyle = sectionNumberingOf(project, folder).value;
  const numbered = sectionNumbers(tree, sectionStyle);
  // record 0074: the journal gets its font (or the document's); co-authors, the one the article is written in
  const fonts = documentFontsOf(project, folder);
  const font = markers ? fonts.writing : fonts.journal;
  const tpl = applyTemplate(tplStyles, { lineSpacing: fmt?.lineSpacing?.value, fontSizePt: font.size, font: font.family, lang, sectionNumbering: sectionStyle });
  /** A heading style, and no number when the sections are numbered and this one is not. */
  const headingOpts = (level: number, id?: string) => ({
    style: headingStyle(level),
    ...(sectionStyle !== "none" && level <= NUMBERED_LEVELS && !(id && numbered.has(id)) ? { numbering: false as const } : {}),
  });
  const S = (name: string) => tpl.style(name) ?? (warnings.push(`style '${name}' not in the template`), undefined);
  const marginCm = fmt?.sideMarginsCm?.value ? (fmt.sideMarginsCm.value.max ?? fmt.sideMarginsCm.value.min) : 2.5;
  const margin = Math.round((marginCm / 2.54) * 1440);
  const pageWidth = 11906;
  const pageHeight = 16838;
  // record 0085: on a landscape page the text is as wide as the A4 is tall
  let landscapeNow = false;
  const textWidthNow = () => (landscapeNow ? pageHeight : pageWidth) - 2 * margin;

  // R42: every export for co-authors saves a snapshot, the base of the three-way merge
  const snapshot = markers ? await saveSnapshot(project, folder, "DOCX para coautores") : null;

  // BookmarkStart/End work as paragraph children (prototype 3) but are not typed as such
  const bm = (name: string): [ParagraphChild, ParagraphChild] => {
    const id = bookmarkUniqueNumericId();
    return [new BookmarkStart(name, id) as unknown as ParagraphChild, new BookmarkEnd(id) as unknown as ParagraphChild];
  };

  function citation(n: PMNode): ParagraphChild[] {
    const r = rendering.citations.get(n.attrs!.id as string)!;
    if (!markers) return r.runs.map(textRun);
    const items = n.attrs!.items as { ref: string; locator?: string; label?: string; prefix?: string; suffix?: string; suppressAuthor?: boolean }[];
    const code = {
      citationID: n.attrs!.id,
      properties: { formattedCitation: r.html, plainCitation: r.plain, noteIndex: 0 },
      citationItems: items.map((i) => {
        const entry = refById.get(i.ref)!;
        return {
          id: i.ref,
          uris: [entry.zotero?.uri ?? ownReferenceUri(project.manifest.id, i.ref)], // record 0027
          itemData: { id: i.ref, ...entry.csl },
          ...(i.locator ? { locator: i.locator } : {}), ...(i.label ? { label: i.label } : {}),
          ...(i.prefix ? { prefix: i.prefix } : {}), ...(i.suffix ? { suffix: i.suffix } : {}),
          ...(i.suppressAuthor ? { "suppress-author": true } : {}),
        };
      }),
      schema: "https://github.com/citation-style-language/schema/raw/master/csl-citation.json" as const,
    };
    const issues = validate("docx-citation", code);
    if (issues.length) throw new Error(`invalid citation field: ${issues[0].message}`);
    return [raw(fieldXml(`${FIELDS.citation} ${JSON.stringify(code)}`, r.runs.map(runXml).join("")))];
  }

  // record 0060: the language around the block being written (the abstract of each language)
  let around = lang;
  function inlines(content: PMNode[] = [], notes?: Map<string, string>, blockLang = around): ParagraphChild[] {
    const out: ParagraphChild[] = [];
    for (const n of content) {
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      if (marks.has("deletion")) continue; // tracked changes go out accepted (w:ins/w:del: V1)
      if (n.type === "text") {
        // a fragment's own font and size go to the coauthors, never to the journal (record 0047)
        const { font, size, lang: own, ...format } = runFormat(n.marks);
        // only what differs from the document's language is written (its default is the article's)
        const runLang = own ?? blockLang;
        out.push(textRun({ text: n.text!, ...format, ...(markers ? { font, size } : {}), ...(sameLang(runLang, lang) ? {} : { lang: runLang }) }));
      }
      else if (n.type === "hardBreak") out.push(new TextRun({ break: 1 }));
      else if (n.type === "citation") out.push(...citation(n));
      else if (n.type === "xref") {
        const target = n.attrs!.target as string;
        const num = tableNo.get(target) ?? figureNo.get(target);
        if (num === undefined) { warnings.push(`cross-reference to ${target} is not exported yet`); out.push(new TextRun("?")); continue; }
        out.push(markers ? raw(fieldXml(FIELDS.ref(target), runXml({ text: String(num) }))) : new TextRun(String(num)));
      } else if (n.type === "noteRef") {
        const target = n.attrs!.target as string;
        const letter = notes?.get(target) ?? "?";
        // a note's letter is its number: the call is a REF to it, like a cross-reference
        out.push(markers ? raw(fieldXml(FIELDS.ref(target), runXml({ text: letter, sup: true }))) : new TextRun({ text: letter, superScript: true }));
      }
      else warnings.push(`'${n.type}' is not exported yet`);
    }
    return out;
  }

  type Opts = Record<string, unknown>;
  const para = (n: PMNode, opts: Opts = {}, lead: ParagraphChild[] = [], notes?: Map<string, string>, wrap: { before?: ParagraphChild[]; after?: ParagraphChild[] } = {}, own?: ParagraphChild[]) => {
    // generated text ("Tabla 1. ", a note's letter, "Palabras clave: ") goes before the
    // block's bookmark: the reader leaves it out, so it never comes back as an edit
    const children = own ?? inlines(n.content, notes, (n.attrs?.lang as string | null) ?? around);
    if (markers && n.attrs?.id) {
      const [s, e] = bm(blockBookmark(n.attrs.id as string));
      children.unshift(s);
      children.push(e);
    }
    // record 0069: a paragraph's left indent, 1.25 cm (709 twips) a step, as Word's "Increase indent"
    const indent = n.type === "paragraph" ? ((n.attrs?.indent as number | null) ?? 0) : 0;
    const withIndent = indent ? { ...opts, indent: { ...(opts.indent ?? {}), left: (((opts.indent as { left?: number } | undefined)?.left) ?? 0) + 709 * indent } } : opts;
    // record 0073: a text block's own alignment (left, or the template's, when it has none)
    const align = n.attrs?.align as string | null | undefined;
    const o = align && !withIndent.alignment ? { ...withIndent, alignment: align === "center" ? AlignmentType.CENTER : align === "right" ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED } : withIndent;
    return new Paragraph({ ...o, children: [...(wrap.before ?? []), ...lead, ...children, ...(wrap.after ?? [])] });
  };

  const out: (Paragraph | Table)[] = [];
  /** Record 0085: where the output changes orientation: from that index on, landscape or not. */
  const turns: { at: number; landscape: boolean }[] = [];
  const orient = (landscape: boolean) => {
    if (landscape === landscapeNow) return;
    landscapeNow = landscape;
    const last = turns.at(-1);
    if (last && last.at === out.length) turns.pop(); // nothing between: back as it was
    else turns.push({ at: out.length, landscape });
  };
  const headingStyle = (level: number) => S(`heading ${Math.min(level, 6)}`);
  const caption = (part: PMNode, kind: "table" | "figure", num: number) => {
    const lbl = L[kind];
    if (!markers) return [new TextRun({ text: `${lbl} ${num}. `, bold: true })];
    const [s, e] = bm(numberBookmark(part.attrs!.id as string));
    return [new TextRun({ text: `${lbl} `, bold: true }), s, raw(fieldXml(FIELDS.seq(lbl), runXml({ text: String(num), bold: true }))), e, new TextRun({ text: ". ", bold: true })];
  };

  // record 0076: the lines of each cell, from the table's style and the cells' own borders
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const LINE_STYLES = { single: BorderStyle.SINGLE, double: BorderStyle.DOUBLE, dashed: BorderStyle.DASHED, dotted: BorderStyle.DOTTED } as const;
  const wordLine = (l: Line | null) => (l ? { style: LINE_STYLES[l.style], size: Math.min(96, Math.max(2, Math.round(l.width * 8))), color: l.color.slice(1) } : none);
  const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, decimal: AlignmentType.RIGHT } as const;
  function table(part: PMNode, opts: { pageBreakBefore?: boolean } = {}) {
    const id = part.attrs!.id as string;
    const [cap, tbl, ...notes] = part.content!;
    const letters = noteLetters(part);
    const [ps, pe] = markers ? bm(blockBookmark(id)) : [undefined, undefined];
    out.push(para(cap, { style: S("caption"), keepNext: true, pageBreakBefore: opts.pageBreakBefore }, caption(part, "table", tableNo.get(id)!), letters, { before: ps ? [ps] : [] }));
    const rows = tbl.content ?? [];
    const isHeader = (r: PMNode) => (r.content ?? []).every((c) => c.type === "tableHeader");
    const lastHeader = rows.findLastIndex((r, i) => isHeader(r) && rows.slice(0, i + 1).every(isHeader));
    const widths = (tbl.attrs?.columnWidths as number[] | null) ?? null;
    const total = widths?.reduce((a, b) => a + b, 0) ?? 0;
    const lines = tableNodeBorders(tbl, fmt?.tableStyle?.value);
    out.push(new Table({
      width: { size: textWidthNow(), type: WidthType.DXA },
      ...(widths ? { columnWidths: widths.map((w) => Math.round((w / total) * textWidthNow())) } : {}),
      rows: rows.map((row, i) => new TableRow({
        tableHeader: i <= lastHeader,
        children: (row.content ?? []).map((cell, j) => new TableCell({
          columnSpan: cell.attrs!.colspan as number, rowSpan: cell.attrs!.rowspan as number,
          borders: { top: wordLine(lines[i][j].top), bottom: wordLine(lines[i][j].bottom), left: wordLine(lines[i][j].left), right: wordLine(lines[i][j].right) },
          children: (cell.content ?? []).map((p) => p.type === "paragraph"
            ? para(p, { alignment: cell.attrs!.align ? ALIGN[cell.attrs!.align as keyof typeof ALIGN] : undefined, spacing: { line: 240 } }, [], letters)
            : (warnings.push("lists inside table cells are exported as paragraphs"), para({ type: "paragraph", attrs: {}, content: [] }))),
        })),
      })),
    }));
    notes.forEach((n, i) => {
      const letter = new TextRun({ text: letters.get(n.attrs!.id as string) ?? "?", superScript: true });
      const numbered: ParagraphChild[] = markers ? (() => { const [s, e] = bm(numberBookmark(n.attrs!.id as string)); return [s, letter, e]; })() : [letter];
      const lead = n.attrs!.kind === "specific" ? [...numbered, new TextRun(" ")] : [];
      out.push(para(n, { spacing: { line: 240 } }, lead, letters, { after: pe && i === notes.length - 1 ? [pe] : [] }));
    });
    if (!notes.length && pe) out.push(new Paragraph({ children: [pe] }));
  }

  const imageBytes = new Map<string, Uint8Array | null>();
  // record 0068: an SVG goes as itself plus the PNG Word asks for, drawn by the rasterizer
  const svgFallback = new Map<string, { png: Uint8Array; width: number; height: number } | string>();
  for (const part of figures.values()) {
    const image = part.attrs!.image as string;
    const bytes = await project.fs.readBytes(`articles/${folder}/${image}`);
    imageBytes.set(image, bytes);
    if (bytes && isSvg(bytes) && !svgFallback.has(image)) {
      if (!res.rasterize) svgFallback.set(image, "SVG images need the app or the scidesk-pdf binary to be embedded");
      else svgFallback.set(image, await res.rasterize(bytes).catch((e: unknown) => `the SVG cannot be drawn (${e instanceof Error ? e.message : String(e)})`));
    }
  }
  function figure(part: PMNode, withImage: boolean) {
    const id = part.attrs!.id as string;
    const [cap, ...notes] = part.content!;
    const [ps, pe] = markers ? bm(blockBookmark(id)) : [undefined, undefined];
    if (withImage) {
      const bytes = imageBytes.get(part.attrs!.image as string);
      const size = bytes ? imageSize(bytes) : null;
      const svg = svgFallback.get(part.attrs!.image as string);
      const maxPx = (textWidthNow() / 1440) * 96;
      const fit = (width: number, height: number) => { const w = Math.min(maxPx, Math.max(width, 1)); return { width: Math.round(w), height: Math.round((w * height) / Math.max(width, 1)) }; };
      const altText = { name: L.figure, title: L.figure, description: (part.attrs!.alt as string) ?? "" };
      if (bytes && size) {
        out.push(new Paragraph({ keepNext: true, children: [...(ps ? [ps] : []), new ImageRun({ type: size.type, data: bytes, transformation: fit(size.width, size.height), altText }) as unknown as ParagraphChild] }));
      } else if (bytes && svg && typeof svg !== "string") {
        out.push(new Paragraph({ keepNext: true, children: [...(ps ? [ps] : []), new ImageRun({ type: "svg", data: bytes, fallback: { type: "png", data: svg.png }, transformation: fit(svg.width, svg.height), altText }) as unknown as ParagraphChild] }));
      } else {
        warnings.push(`${part.attrs!.image}: ${typeof svg === "string" ? svg : "only PNG, JPEG, GIF, BMP and SVG images are embedded for now"}`);
        // generated text: before the block's bookmark, so that it never comes back as an edit
        out.push(new Paragraph({ children: [new TextRun(`[${part.attrs!.image}]`), ...(ps ? [ps] : [])] }));
      }
    }
    out.push(para(cap, { style: S("caption") }, caption(part, "figure", figureNo.get(id)!), undefined, { before: !withImage && ps ? [ps] : [], after: pe && !notes.length ? [pe] : [] }));
    notes.forEach((n, i) => out.push(para(n, { spacing: { line: 240 } }, [], undefined, { after: pe && i === notes.length - 1 ? [pe] : [] })));
  }

  // --- bibliography, where the "references" heading is
  let bibliographyPlaced = false;
  const bibliography = () => {
    bibliographyPlaced = true;
    rendering.bibliography.forEach((e, i) => {
      const runs: ParagraphChild[] = [new TextRun(`${e.label} `), ...e.runs.map(textRun)];
      const first = i === 0, last = i === rendering.bibliography.length - 1;
      out.push(new Paragraph({
        indent: { left: 400, hanging: 400 },
        children: markers
          ? [
            ...(first ? [raw(`<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${FIELDS.bibliography} {"uncited":[],"omitted":[],"custom":[]} CSL_BIBLIOGRAPHY </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>`)] : []),
            ...runs,
            ...(last ? [raw('<w:r><w:fldChar w:fldCharType="end"/></w:r>')] : []),
          ]
          : runs,
      }));
    });
  };

  // --- the manuscript
  const bodyNodes = tree.content ?? [];
  const tablesAtEnd = !markers && fmt?.tables?.value === "end";
  const captionsList = !markers && fmt?.figureCaptionsList?.value === true;
  const list = (n: PMNode, depth: number) => n.content?.forEach((item, k) => item.content?.forEach((child, j) => {
    if (child.type === "paragraph") out.push(para(child, { indent: { left: 360 * (depth + 1) } }, j === 0 ? [new TextRun(n.type === "orderedList" ? `${((n.attrs?.start as number) ?? 1) + k}. ` : "• ")] : []));
    else list(child, depth + 1);
  }));
  let abstractDone = !abstract;
  const writeAbstract = () => {
    abstractDone = true;
    for (const section of abstract?.content ?? []) {
      const sl = label((section.attrs!.lang as string) ?? lang);
      around = (section.attrs!.lang as string) ?? lang;
      const sectionLang = sameLang(around, lang) ? {} : { language: { value: wordLang(around) } };
      out.push(new Paragraph({ ...headingOpts(1), children: [new TextRun({ text: sl.abstract, ...sectionLang })] }));
      for (const n of section.content ?? []) {
        if (n.type === "heading") out.push(para(n, headingOpts(2)));
        else if (n.type === "paragraph") out.push(para(n));
        else if (n.type === "keywords") {
          const words = (n.content ?? []).map((k) => (k.content ?? []).map((c) => c.text ?? "").join("")).filter(Boolean);
          const kw = { type: "paragraph", attrs: n.attrs, content: [{ type: "text", text: words.join("; ") }] } as PMNode;
          out.push(para(kw, {}, [new TextRun({ text: `${sl.keywords}: `, bold: true, ...sectionLang })]));
        }
      }
    }
    around = lang;
  };
  for (const n of bodyNodes) {
    if ((n.marks ?? []).some((m) => m.type === "deletion")) continue;
    if (n.type !== "title" && !abstractDone) { orient(false); writeAbstract(); }
    // a table or a figure that goes to the end takes its landscape page there
    const atEnd = (n.type === "tablePart" && tablesAtEnd) || (n.type === "figurePart" && captionsList);
    if (!atEnd) orient(n.type !== "title" && !!n.attrs?.landscape);
    if (n.type === "title") out.push(para(n, { style: S("title") }));
    else if (n.type === "heading") {
      out.push(para(n, headingOpts((n.attrs!.level as number) ?? 1, n.attrs!.id as string | undefined)));
      if (headingRole(n) === "references") bibliography();
    } else if (n.type === "paragraph") out.push(para(n));
    else if (n.type === "bulletList" || n.type === "orderedList") list(n, 0);
    else if (n.type === "blockquote") for (const p of n.content ?? []) out.push(para(p, { style: S("quote") }));
    // record 0078: a page break, in a paragraph of its own as Word writes Ctrl+Enter (its bookmark around it)
    else if (n.type === "pageBreak") out.push(para(n, {}, [], undefined, {}, [new PageBreak()]));
    else if (n.type === "tablePart") { if (!tablesAtEnd) table(n); }
    else if (n.type === "figurePart") { if (!captionsList) figure(n, true); }
    else warnings.push(`'${n.type}' is not exported yet`);
  }
  orient(false);
  if (!abstractDone) writeAbstract();
  if (!bibliographyPlaced && rendering.bibliography.length) {
    out.push(new Paragraph({ ...headingOpts(1), children: [new TextRun(L.bib)] }));
    bibliography();
  }
  if (tablesAtEnd) [...tables.entries()].sort((a, b) => tableNo.get(a[0])! - tableNo.get(b[0])!).forEach(([, part]) => {
    const turn = !!part.attrs?.landscape !== landscapeNow;
    orient(!!part.attrs?.landscape);
    // a new section already starts on a new page
    table(part, { pageBreakBefore: !turn });
  });
  orient(false);
  if (captionsList && figures.size) {
    out.push(new Paragraph({ ...headingOpts(1), pageBreakBefore: true, children: [new TextRun(L.captions)] }));
    [...figures.entries()].sort((a, b) => figureNo.get(a[0])! - figureNo.get(b[0])!).forEach(([, part]) => figure(part, false));
  }
  if (markers && snapshot && out.length) {
    // the snapshot the copy was sent from, also when the properties are lost (record 0025)
    const [s, e] = bm(snapshotBookmark(snapshot.id));
    out.unshift(new Paragraph({ children: [s, e] }));
    for (const turn of turns) turn.at++;
  }

  // --- properties
  const custom: { name: string; value: string }[] = [];
  if (markers && snapshot) {
    const pref = `<data data-version="3" zotero-version="7.0"><session id="SciDesk01"/><style id="${esc(style)}" locale="${lang.startsWith("es") ? "es-ES" : "en-US"}" hasBibliography="1" bibliographyStyleHasBeenSet="1"/><prefs><pref name="fieldType" value="Field"/><pref name="automaticJournalAbbreviations" value="true"/></prefs></data>`;
    for (let i = 0; i * 255 < pref.length; i++) custom.push({ name: `${ZOTERO_PREF_PROPERTY}${i + 1}`, value: pref.slice(i * 255, (i + 1) * 255) });
    const prop = { format: 1 as const, project: project.manifest.id, article: art.article.id, snapshot: snapshot.id, profile: "coauthors" as const };
    const propIssues = validate("docx-property", prop);
    if (propIssues.length) throw new Error(`invalid SciDesk property: ${propIssues[0].message}`);
    custom.push({ name: SCIDESK_PROPERTY, value: JSON.stringify(prop) });
  }
  const titleText = (bodyNodes.find((n) => n.type === "title")?.content ?? []).map((c) => c.text ?? "").join("");
  // record 0085: one section per stretch of one orientation, each starting on a new page; the
  // page numbers go on, and every section has the same footer, margins and line numbers
  const cuts = [{ at: 0, landscape: false }, ...turns].filter((c, i, all) => i === all.length - 1 || all[i + 1].at > c.at);
  const section = (landscape: boolean, children: (Paragraph | Table)[], first: boolean) => ({
    properties: {
      ...(first ? {} : { type: SectionType.NEXT_PAGE }),
      page: { size: { width: pageWidth, height: pageHeight, ...(landscape ? { orientation: PageOrientation.LANDSCAPE } : {}) }, margin: { top: 1418, bottom: 1418, left: margin, right: margin } },
      ...(fmt?.lineNumbers?.value ? { lineNumbers: { countBy: 1, restart: LineNumberRestartFormat.NEW_PAGE } } : {}),
    },
    ...(fmt?.pageNumbers?.value !== false ? { footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }) } } : {}),
    children,
  });
  const doc = new Document({
    externalStyles: tpl.xml,
    ...(markers ? { title: titleText, creator: "SciDesk", lastModifiedBy: "SciDesk" } : { title: "", creator: "", lastModifiedBy: "" }),
    customProperties: custom,
    sections: cuts.map((c, i) => section(c.landscape, out.slice(c.at, cuts[i + 1]?.at ?? out.length), i === 0)),
  });
  let bytes: Uint8Array = new Uint8Array(await Packer.toArrayBuffer(doc));
  if (sectionStyle !== "none") {
    // record 0070: the sections' list in numbering.xml (the heading styles point to it)
    const zip = await JSZip.loadAsync(bytes);
    const file = zip.file("word/numbering.xml");
    if (file) {
      zip.file("word/numbering.xml", sectionsNumbering(await file.async("string"), sectionStyle, [1, 2, 3].map((l) => tpl.style(`heading ${l}`))));
      bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    } else warnings.push("numbered sections: the document has no numbering part");
  }
  if (!markers) {
    // pending markers should not reach the journal (R12); imported here to avoid a cycle
    const pending = (await import("./checks.ts")).pendingCount(project, folder);
    if (pending) warnings.push(`${pending} pending marker(s) left in the text (XX, ??, [REF]…)`);
  }
  const name = profile === "coauthors" ? "coautores" : "revista";
  const path = `articles/${folder}/exports/${folder}-${name}${snapshot ? `-${snapshot.id}` : ""}.docx`;
  await project.fs.write(path, bytes);
  return { bytes, snapshot: snapshot?.id ?? null, path, warnings: [...new Set(warnings)] };
}
