// The manuscript as Typst source, for the PDF (records 0024 and 0040). The same content
// and order as the DOCX for the journal (record 0033): titles, the abstract in each
// language with its keywords, the body, the bibliography where the "references" heading
// is, tables (caption, table, notes) and figures (image, caption, notes), cross-references
// and note calls, with the journal profile's page format (spacing, size, font, margins,
// line and page numbers, tables at the end, figure captions in a list). Citations and the
// bibliography come formatted by citeproc-js: Typst formats none, so the PDF and the DOCX
// say the same. Blinded like the DOCX for the journal: no authors, not even in the
// metadata. Every paragraph carries an invisible marker with its block id (for the
// preview, later). Compiling is not done here: a TypstCompiler is given (Rust in the app,
// the scidesk-pdf binary on the command line).
import type { JournalProfileFile, PMNode } from "@scidesk/formats";
import { renderCitations, runFormat, type CitationResources, type Run } from "./citations.ts";
import { acceptedView, composite, imageSize, label, noteLetters, numbering, styleResources } from "./docx-export.ts";
import { sameLang } from "./lang.ts";
import type { Project } from "./project.ts";
import { journalExportWarnings } from "./checks.ts";
import { blindedArticle } from "./blinding.ts";
import { stripImageMetadata } from "./image-metadata.ts";
import { headingRole, sectionNumberingOf, sectionNumbers } from "./sections.ts";
import { documentFontsOf } from "./document-font.ts";
import { tableNodeBorders, type Line } from "./table-borders.ts";

export interface TypstBundle {
  /** main.typ */
  source: string;
  /** Files the source uses (figure images), by their path in the bundle. */
  files: Record<string, Uint8Array>;
  warnings: string[];
}

export type PdfStandard = "tagged" | "ua-1" | "a-2a" | "a-4";
export type TypstCompiler = (bundle: TypstBundle, standard: PdfStandard) => Promise<{ pdf: Uint8Array; pages: number; warnings: string[] }>;

/** Every character with a meaning in Typst markup, escaped (prototype 4). */
export const typstEscape = (s: string) => s.replace(/[\\#$*_`<>@[\]~"/=+\-]/g, (c) => "\\" + c);
const str = (s: string) => JSON.stringify(s); // a Typst string literal: same escapes as JSON

/** Free equivalents of Word's usual fonts, so that a computer without them gets the same metrics (record 0011). */
const FONT_FALLBACKS: Record<string, string[]> = {
  calibri: ["Calibri", "Carlito"],
  cambria: ["Cambria", "Caladea"],
  arial: ["Arial", "Liberation Sans", "Arimo"],
  helvetica: ["Helvetica", "Arial", "Liberation Sans"],
  "times new roman": ["Times New Roman", "Liberation Serif", "Tinos"],
  times: ["Times New Roman", "Liberation Serif", "Tinos"],
  georgia: ["Georgia", "Gelasio"],
  roboto: ["Roboto"],
};
export function fontList(font?: string): string[] {
  const own = font ? FONT_FALLBACKS[font.toLowerCase()] ?? [font] : FONT_FALLBACKS.calibri;
  // the template's font and Typst's own as the last resort, so that something always shows
  return [...new Set([...own, "Calibri", "Carlito", "Liberation Sans", "Libertinus Serif"])];
}

const IMAGE_TYPES = /\.(png|jpe?g|gif|svg|webp|pdf)$/i;
/** Word's single line spacing with ascender and descender as the line's edges (see the preamble). */
const SINGLE = "0.2em";

/** The manuscript of an article as a Typst bundle. */
export async function manuscriptTypst(project: Project, folder: string, res: CitationResources, opts: { date?: Date; live?: Record<string, PMNode> } = {}): Promise<TypstBundle> {
  const saved = project.articles.find((a) => a.folder === folder);
  if (!saved) throw new Error(`no article ${folder}`);
  // the preview (record 0058) shows what is on screen, saved or not: `live` replaces documents by path
  const shown = opts.live ? { ...saved, documents: new Map([...saved.documents, ...Object.entries(opts.live).map(([p, doc]) => [p, { ...(saved.documents.get(p) ?? { schemaVersion: 1, documentType: "article", lang: saved.article.lang, changes: {}, comments: {} }), doc }] as const)]) } as typeof saved : saved;
  // R9, record 0088: the journal gets the blinded version under double-blind review
  const art = blindedArticle(project, shown);
  const lang = art.article.lang;
  const L = label(lang);
  const journal: JournalProfileFile | undefined = art.article.journal ? project.journals.get(art.article.journal) : undefined;
  if (art.article.journal && !journal) throw new Error(`journal profile ${art.article.journal} is not in resources/journals/`);
  const fmt = journal?.manuscriptFormat;
  const { tree, tables, figures, warnings } = composite(art);
  // record 0095: no deleted table or figure, neither in the text nor at the end
  for (const parts of [tables, figures]) for (const [id, part] of parts) if ((part.marks ?? []).some((m) => m.type === "deletion")) parts.delete(id);
  // record 0070: the numbers of numbered sections, as in the editor and the Word
  const sectionNo = sectionNumbers(tree, sectionNumberingOf(project, saved.folder).value);
  const abstract = art.documents.get("manuscript/abstract.scidoc")?.doc as PMNode | undefined;
  // record 0095: citations numbered with the tracked changes accepted, as in the Word for the journal
  const rendering = await renderCitations(project.library, [...(abstract ? [abstract] : []), tree].map(acceptedView), art.article.citationStyle.id, art.article.referenceTermsLang ?? lang, await styleResources(project, art, res));
  const tableNo = numbering(tree, [...tables.keys()]);
  const figureNo = numbering(tree, [...figures.keys()]);
  const files: Record<string, Uint8Array> = {};

  // ---------------------------------------------------------------- inline content
  const runs = (rs: Run[]) => rs.map((r) => wrap(typstEscape(r.text), r)).join("");
  // Word's highlight colours, as Typst colours (record 0043)
  const HIGHLIGHT: Record<string, string> = { yellow: "#FFFF00", green: "#00FF00", cyan: "#00FFFF", magenta: "#FF00FF", blue: "#0000FF", red: "#FF0000", darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000", darkYellow: "#808000", darkGray: "#808080", lightGray: "#C0C0C0", black: "#000000", white: "#FFFFFF" };
  function wrap(t: string, m: Omit<Run, "text">) {
    if (!t) return t;
    let out = t;
    // record 0060: a fragment in another language (hyphenation, and the PDF's /Lang)
    if (m.lang && /^[a-z]{2,3}([-_][a-z0-9]+)?$/i.test(m.lang)) {
      const [l, r] = m.lang.split(/[-_]/);
      out = `#text(lang: ${str(l.toLowerCase())}${r && /^[a-z]{2}$/i.test(r) ? `, region: ${str(r.toUpperCase())}` : ""})[${out}]`;
    }
    if (m.underline) out = `#underline[${out}]`;
    if (m.color && /^#[0-9A-F]{6}$/i.test(m.color)) out = `#text(fill: rgb(${str(m.color)}))[${out}]`;
    if (m.highlight && HIGHLIGHT[m.highlight]) out = `#highlight(fill: rgb(${str(HIGHLIGHT[m.highlight])}))[${out}]`;
    if (m.sup) out = `#super[${out}]`;
    if (m.sub) out = `#sub[${out}]`;
    if (m.italic) out = `#emph[${out}]`;
    if (m.bold) out = `#strong[${out}]`;
    // a ";" ends the command: without it, "#strong[x](y)" takes "(y)" as more arguments,
    // and bold or italic text followed by a bracket is everywhere in clinical writing
    return out === t ? t : `${out};`;
  }
  // the language around the block being written: the article's, or that of an abstract
  let around = lang;
  function inlines(content: PMNode[] = [], notes?: Map<string, string>, blockLang = around): string {
    let out = "";
    for (const n of content) {
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      if (marks.has("deletion")) continue; // tracked changes go out accepted, as in the DOCX
      // the PDF is for the journal: a fragment's own font and size are not carried (record 0047)
      if (n.type === "text") {
        const { font: _f, size: _s, lang: own, ...format } = runFormat(n.marks);
        const runLang = own ?? blockLang;
        out += wrap(typstEscape(n.text ?? ""), { ...format, ...(sameLang(runLang, around) ? {} : { lang: runLang }) });
      }
      else if (n.type === "hardBreak") out += "#linebreak();";
      else if (n.type === "citation") out += runs(rendering.citations.get(n.attrs!.id as string)?.runs ?? [{ text: "?" }]);
      else if (n.type === "xref") {
        const target = n.attrs!.target as string;
        const num = tableNo.get(target) ?? figureNo.get(target);
        if (num === undefined) warnings.push(`cross-reference to ${target} is not exported yet`);
        out += String(num ?? "?");
      } else if (n.type === "noteRef") out += `#super[${typstEscape(notes?.get(n.attrs!.target as string) ?? "?")}];`;
      else warnings.push(`'${n.type}' is not exported yet`);
    }
    return out;
  }
  // a marker with the block id: the introspector finds on which page each block landed
  const marker = (n: PMNode) => (typeof n.attrs?.id === "string" && /^[a-z]+-[a-z0-9]+$/.test(n.attrs.id) ? `#metadata(${str(n.attrs.id)}) <${n.attrs.id}>` : "");
  // "1. " at the start of a line would be a numbered list in Typst
  const paragraph = (n: PMNode, notes?: Map<string, string>) => {
    const text = inlines(n.content, notes, (n.attrs?.lang as string | null) ?? around).replace(/^(\d+)\./, "$1\\.");
    // record 0069: a paragraph's left indent, 1.25 cm a step
    const indent = (n.attrs?.indent as number | null) ?? 0;
    const padded = indent ? `#pad(left: ${(1.25 * indent).toFixed(2)}cm)[${text}]` : text;
    return `${marker(n)}${aligned(n, padded)}`;
  };

  // ---------------------------------------------------------------- blocks
  const out: string[] = [];
  // record 0070: a numbered section's number before its text (escaped: "2." could start a list)
  /** Record 0073: a text block's own alignment. */
  const aligned = (n: PMNode, body: string) => {
    const a = n.attrs?.align as string | null | undefined;
    return a === "center" || a === "right" ? `#align(${a})[${body}]` : a === "justify" ? `#par(justify: true)[${body}]` : body;
  };
  const heading = (n: PMNode, level?: number) => {
    const num = level === undefined && n.attrs?.id ? sectionNo.get(n.attrs.id as string) : undefined;
    const prefix = num ? `${num.replace(/\./g, "\\.")} ` : "";
    const h = `${"=".repeat(Math.min(level ?? (n.attrs?.level as number) ?? 1, 6))} ${prefix}${inlines(n.content, undefined, (n.attrs?.lang as string | null) ?? around)}`;
    const a = n.attrs?.align as string | null | undefined;
    out.push(`${marker(n)}\n${a === "center" || a === "right" ? `#align(${a})[\n${h}\n]` : h}`);
  };

  function list(n: PMNode): string {
    const items = (n.content ?? []).map((item) => `[${(item.content ?? []).map((c) => (c.type === "paragraph" ? paragraph(c) : list(c))).join("\n\n")}]`);
    return n.type === "orderedList" ? `#enum(start: ${(n.attrs?.start as number) ?? 1}, ${items.join(", ")})` : `#list(${items.join(", ")})`;
  }

  const capLabel = (kind: "table" | "figure", num: number) => `#strong[${typstEscape(`${L[kind]} ${num}.`)}] `;
  function notesOf(notes: PMNode[], letters?: Map<string, string>) {
    return notes.map((n) => {
      const lead = n.attrs!.kind === "specific" ? `#super[${typstEscape(letters?.get(n.attrs!.id as string) ?? "?")}] ` : "";
      // single-spaced, as in the DOCX
      return `#block(above: 0.4em, below: 0.4em)[#set par(leading: ${SINGLE})
#text(size: 0.85em)[${lead}${paragraph(n, letters)}]]`;
    }).join("\n");
  }

  function table(part: PMNode, pageBreak = false) {
    const id = part.attrs!.id as string;
    const [cap, tbl, ...notes] = part.content!;
    const letters = noteLetters(part);
    const rows = tbl.content ?? [];
    const isHeader = (r: PMNode) => (r.content ?? []).every((c) => c.type === "tableHeader");
    const lastHeader = rows.findLastIndex((r, i) => isHeader(r) && rows.slice(0, i + 1).every(isHeader));
    // the number of columns: the widest row, counting spans
    const columns = Math.max(...rows.map((r) => (r.content ?? []).reduce((a, c) => a + ((c.attrs!.colspan as number) ?? 1), 0)), 1);
    const widths = tbl.attrs?.columnWidths as number[] | null | undefined;
    // without widths of its own, a wide table shares the page equally: as many auto columns as
    // its content asks for ran off the page and over each other (phase 1 test, 13 columns)
    const cols = widths?.length === columns ? `(${widths.map((w) => `${+w.toFixed(3)}fr`).join(", ")})` : columns >= 7 ? `(1fr,) * ${columns}` : String(columns);
    const ALIGN: Record<string, string> = { left: "left", center: "center", right: "right", decimal: "right" };
    // record 0076: each cell's lines, as in the Word (Typst has no double line: a thicker one)
    const lines = tableNodeBorders(tbl, fmt?.tableStyle?.value);
    const stroke = (l: Line | null) => (l ? `(paint: rgb(${str(l.color)}), thickness: ${+(l.style === "double" ? l.width * 2 : l.width).toFixed(2)}pt${l.style === "dashed" ? `, dash: "dashed"` : l.style === "dotted" ? `, dash: "dotted"` : ""})` : "none");
    const cell = (c: PMNode, i: number, j: number) => {
      const b = lines[i]?.[j];
      const args = [
        b ? `stroke: (top: ${stroke(b.top)}, bottom: ${stroke(b.bottom)}, left: ${stroke(b.left)}, right: ${stroke(b.right)})` : "",
        (c.attrs!.colspan as number) > 1 ? `colspan: ${c.attrs!.colspan}` : "",
        (c.attrs!.rowspan as number) > 1 ? `rowspan: ${c.attrs!.rowspan}` : "",
        c.attrs!.align ? `align: ${ALIGN[c.attrs!.align as string] ?? "left"}` : "",
      ].filter(Boolean);
      const body = (c.content ?? []).map((p) => (p.type === "paragraph" ? paragraph(p, letters) : list(p))).join("\n\n");
      return args.length ? `table.cell(${args.join(", ")})[${body}]` : `[${body}]`;
    };
    const head = rows.slice(0, lastHeader + 1).map((r, i) => (r.content ?? []).map((c, j) => cell(c, i, j)).join(", "));
    const body = rows.slice(lastHeader + 1).map((r, i) => (r.content ?? []).map((c, j) => cell(c, i + lastHeader + 1, j)).join(", "));
    // a wide table (the GRADE one of the phase 1 test had 13 columns): smaller text, words split
    // with hyphens and less room around each cell, or the text of a column ran over the next one
    const perColumn = textWidthPt() / columns;
    const wide = perColumn < 40 ? { size: "0.7em", inset: "2pt" } : perColumn < 65 ? { size: "0.8em", inset: "3pt" } : null;
    out.push(`${pageBreak ? "#pagebreak(weak: true)\n" : ""}${marker(part)}
#figure(kind: table, numbering: none, gap: 0.6em,
  caption: figure.caption(position: top, separator: none)[${capLabel("table", tableNo.get(id)!)}${paragraph(cap, letters)}],
  [${wide ? `#set text(size: ${wide.size}, hyphenate: true);\n  ` : ""}#table(columns: ${cols}, stroke: none, align: left, inset: (x: ${wide?.inset ?? "4pt"}, y: 3pt),
${head.length ? `    table.header(${head.join(",\n      ")}),\n` : ""}    ${body.join(",\n    ")}${body.length ? "," : ""})])
${notesOf(notes, letters)}
#v(0.8em, weak: true)`);
  }

  // record 0085: on a landscape page the text is as wide as the A4 is tall
  let landscapeNow = false;
  const textWidthPt = () => (((landscapeNow ? 29.7 : 21) - 2 * marginCm()) / 2.54) * 72;
  /** Turns the pages (Typst starts a new page when the page changes). */
  const orient = (landscape: boolean) => {
    if (landscape === landscapeNow) return;
    landscapeNow = landscape;
    out.push(`#set page(flipped: ${landscape});`);
  };
  function marginCm() { return fmt?.sideMarginsCm?.value ? (fmt.sideMarginsCm.value.max ?? fmt.sideMarginsCm.value.min) : 2.5; }

  async function figure(part: PMNode, withImage: boolean) {
    const id = part.attrs!.id as string;
    const [cap, ...notes] = part.content!;
    const caption = `${capLabel("figure", figureNo.get(id)!)}${paragraph(cap)}`;
    if (!withImage) { out.push(`${marker(part)}#par[${caption}]\n${notesOf(notes)}`); return; }
    const image = part.attrs!.image as string;
    // R9, record 0089: the PDF for the journal gets the images without their metadata
    const original = await project.fs.readBytes(`articles/${folder}/${image}`);
    const bytes = original && stripImageMetadata(original);
    let body: string;
    if (!bytes) { warnings.push(`${image} is missing`); body = `[\\[${typstEscape(image)}\\]]`; }
    else if (!IMAGE_TYPES.test(image)) { warnings.push(`${image}: TIFF and EPS images are not in the PDF yet`); body = `[\\[${typstEscape(image)}\\]]`; }
    else {
      files[image] = bytes;
      const size = imageSize(bytes);
      // at most the text width; a bitmap at 96 dpi otherwise, as in the DOCX
      const width = size ? `${+Math.min(textWidthPt(), size.width * 0.75).toFixed(1)}pt` : "100%";
      body = `image(${str(image)}, width: ${width}${part.attrs!.alt ? `, alt: ${str(part.attrs!.alt as string)}` : ""})`;
      if (!part.attrs!.alt) warnings.push(`${image} has no text alternative (needed for an accessible PDF)`);
    }
    out.push(`${marker(part)}
#figure(${body}, kind: image, numbering: none, gap: 0.6em,
  caption: figure.caption(separator: none)[${caption}])
${notesOf(notes)}
#v(0.8em, weak: true)`);
  }

  // ---------------------------------------------------------------- the manuscript
  let bibliographyPlaced = false;
  const bibliography = () => {
    bibliographyPlaced = true;
    if (!rendering.bibliography.length) return;
    // as citeproc-js gives it: the style's label and the reference, not Typst's numbering
    out.push(`#grid(columns: (auto, 1fr), column-gutter: 0.6em, row-gutter: 0.9em,\n  ${rendering.bibliography.map((e) => `[${typstEscape(e.label)}], [${runs(e.runs)}]`).join(",\n  ")})`);
  };
  let abstractDone = !abstract;
  const writeAbstract = () => {
    abstractDone = true;
    for (const section of abstract?.content ?? []) {
      const sl = label((section.attrs!.lang as string) ?? lang);
      // an abstract in another language sets it for everything in it (record 0060)
      around = (section.attrs!.lang as string) ?? lang;
      if (!sameLang(around, lang)) out.push(`#set text(lang: ${str(around.split(/[-_]/)[0].toLowerCase())})`);
      out.push(`= ${typstEscape(sl.abstract)}`);
      for (const n of section.content ?? []) {
        if (n.type === "heading") heading(n, 2);
        else if (n.type === "paragraph") out.push(paragraph(n));
        else if (n.type === "keywords") {
          const words = (n.content ?? []).map((k) => inlines(k.content)).filter(Boolean);
          out.push(`${marker(n)}#strong[${typstEscape(sl.keywords)}:] ${words.join("; ")}`);
        }
      }
      if (!sameLang(around, lang)) out.push(`#set text(lang: ${str(lang.split(/[-_]/)[0].toLowerCase())})`);
    }
    around = lang;
  };
  const tablesAtEnd = fmt?.tables?.value === "end";
  const captionsList = fmt?.figureCaptionsList?.value === true;
  const bodyNodes = tree.content ?? [];
  for (const n of bodyNodes) {
    if ((n.marks ?? []).some((m) => m.type === "deletion")) continue;
    if (n.type !== "title" && !abstractDone) { orient(false); writeAbstract(); }
    // a table or a figure that goes to the end takes its landscape page there
    const atEnd = (n.type === "tablePart" && tablesAtEnd) || (n.type === "figurePart" && captionsList);
    if (!atEnd) orient(n.type !== "title" && !!n.attrs?.landscape);
    if (n.type === "title") out.push(`${marker(n)}${aligned(n, `#block(below: 1.5em, text(size: 1.4em, weight: "bold")[${inlines(n.content, undefined, (n.attrs?.lang as string | null) ?? lang)}])`)}`);
    else if (n.type === "heading") {
      heading(n);
      if (headingRole(n) === "references") bibliography();
    } else if (n.type === "paragraph") out.push(paragraph(n));
    else if (n.type === "bulletList" || n.type === "orderedList") out.push(`${marker(n)}${list(n)}`);
    // record 0073: a block quotation, indented on both sides as in the Word
    else if (n.type === "blockquote") out.push(`${marker(n)}#pad(x: 1.25cm)[${(n.content ?? []).map((p) => paragraph(p)).join("\n\n")}]`);
    // record 0078: a page break (two with an empty paragraph between: a blank page)
    else if (n.type === "pageBreak") out.push(`${marker(n)}#pagebreak();`);
    else if (n.type === "tablePart") { if (!tablesAtEnd) table(n); }
    else if (n.type === "figurePart") { if (!captionsList) await figure(n, true); }
    else warnings.push(`'${n.type}' is not exported yet`);
  }
  orient(false);
  if (!abstractDone) writeAbstract();
  if (!bibliographyPlaced && rendering.bibliography.length) { out.push(`= ${typstEscape(L.bib)}`); bibliography(); }
  if (tablesAtEnd) [...tables.entries()].sort((a, b) => tableNo.get(a[0])! - tableNo.get(b[0])!).forEach(([, part]) => { orient(!!part.attrs?.landscape); table(part, true); });
  orient(false);
  if (captionsList && figures.size) {
    out.push(`#pagebreak(weak: true)\n= ${typstEscape(L.captions)}`);
    for (const [, part] of [...figures.entries()].sort((a, b) => figureNo.get(a[0])! - figureNo.get(b[0])!)) await figure(part, false);
    // the images themselves go to the journal as separate files, as with the DOCX
  }

  // ---------------------------------------------------------------- page format
  const titleText = (bodyNodes.find((n) => n.type === "title")?.content ?? []).map((c) => c.text ?? "").join("");
  const d = opts.date ?? new Date();
  const spacing = fmt?.lineSpacing?.value ?? 1.15;
  const journalFont = documentFontsOf(project, saved.folder).journal;
  // Word's line spacing: a single line is about 1.2 em with ascender and descender as the
  // line's edges; "double" is twice that, with no extra space between paragraphs (as the DOCX)
  const leading = `${+((spacing * 1.2 - 1)).toFixed(3)}em`;
  const preamble = [
    `// Generated by SciDesk from articles/${folder}/ (record 0040). Do not edit: export again.`,
    `#set document(title: ${str(titleText)}, author: (), date: datetime(year: ${d.getFullYear()}, month: ${d.getMonth() + 1}, day: ${d.getDate()}))`,
    `#set page(paper: "a4", margin: (x: ${marginCm()}cm, y: 2.5cm), numbering: ${fmt?.pageNumbers?.value === false ? "none" : `"1"`})`,
    // record 0074: the journal's font and size, or the document's where it says nothing
    `#set text(font: (${fontList(journalFont.family).map(str).join(", ")}), size: ${journalFont.size}pt, lang: ${str(lang.slice(0, 2))}, hyphenate: ${fmt?.hyphenation?.value === true}, top-edge: "ascender", bottom-edge: "descender")`,
    `#set par(leading: ${leading}, spacing: ${spacing > 1.5 ? leading : "0.8em"}, justify: ${fmt?.justified?.value === true})`,
    // tables without numbers, as in Word (record 0064)
    ...(fmt?.lineNumbers?.value ? [`#set par.line(numbering: n => text(size: 8pt, fill: gray)[#n], numbering-scope: "page")`, "#show table: set par.line(numbering: none)"] : []),
    `#show heading: set text(size: 1em)`,
    `#show heading.where(level: 1): set text(size: 1.15em)`,
    `#show heading: set block(above: 1.4em, below: 0.9em)`,
    `#show figure.where(kind: table): set block(breakable: true)`,
    `#show table: set par(leading: ${SINGLE}, spacing: 0.4em)`,
    `#show figure.caption: set align(left)`,
    `#set list(indent: 0.6em)`,
    `#set enum(indent: 0.6em)`,
  ];
  return { source: `${preamble.join("\n")}\n\n${out.join("\n\n")}\n`, files, warnings: [...new Set(warnings)] };
}

export interface PdfResult { bytes: Uint8Array; path: string; pages: number; warnings: string[] }

/** The PDF of the manuscript for the journal, in exports/ (blinded, as the DOCX for the journal). */
export async function exportPdf(project: Project, folder: string, res: CitationResources, compile: TypstCompiler, opts: { standard?: PdfStandard; date?: Date } = {}): Promise<PdfResult> {
  const bundle = await manuscriptTypst(project, folder, res, opts);
  const r = await compile(bundle, opts.standard ?? "tagged");
  // Typst warns about every family of the font list it does not find: only the journal's
  // font (and its free equivalents) all missing is worth saying
  const wanted = fontList(documentFontsOf(project, folder).journal.family);
  const missing = new Set(r.warnings.map((w) => /^unknown font family: (.+)$/i.exec(w)?.[1]?.toLowerCase()).filter(Boolean));
  const own = wanted.slice(0, wanted.indexOf("Libertinus Serif"));
  const first = own.findIndex((f) => !missing.has(f.toLowerCase()));
  const fontNote = first > 0 ? [`the font ${own[0]} is not installed: the PDF uses ${own[first]}`] : first < 0 ? [`none of the fonts ${own.join(", ")} is installed: the PDF uses Typst's own`] : [];
  r.warnings = [...fontNote, ...r.warnings.filter((w) => !/^unknown font family/i.test(w))];
  const art = project.articles.find((a) => a.folder === folder)!;
  const path = `articles/${folder}/exports/${folder}-${art.article.lang.startsWith("es") ? "revista" : "journal"}.pdf`;
  await project.fs.write(path, r.pdf);
  return { bytes: r.pdf, path, pages: r.pages, warnings: [...journalExportWarnings(project, folder), ...bundle.warnings, ...r.warnings] };
}
