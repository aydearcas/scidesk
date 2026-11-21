// "New article from a Word document", basic version (R1, PLAN 5.1): sections from the
// heading styles (with the role guessed from the heading text), the title, the abstract and
// its keywords, paragraphs with bold, italic, superscript and subscript, lists, tables
// (merged cells, header rows, alignment, relative widths) as .scitable with the caption
// recognised by "Tabla 1." / "Table 1", their notes, and images extracted to figures/ with
// "Figura 1." captions. Cross-references written as "tabla 2" become live cross-references.
// Tracked changes are taken as accepted. Citations stay as their text for now: turning
// EndNote, Zotero and Mendeley fields into live citations is phase 2 (record 0028).
// Styles are recognised by their built-in name (Word localises the ids: "Ttulo1").
import type { Run } from "./citations.ts";
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";
import JSZip from "jszip";
import { newId, type PMNode } from "@scidesk/formats";
import type { ProjectFs } from "./fs.ts";
import { createProject, loadProject, saveDocument, type Project } from "./project.ts";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const kids = (n: Node): Element[] => {
  const o: Element[] = [];
  for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) o.push(c as Element);
  return o;
};
const child = (e: Element | undefined, name: string) => (e ? kids(e).find((k) => k.localName === name) : undefined);
const attr = (e: Element | undefined, a: string) => (e ? e.getAttributeNS(W, a) || e.getAttribute(`w:${a}`) || "" : "");
const parse = (xml: string) => {
  if (/<!DOCTYPE/i.test(xml)) throw new Error("DOCX with a DTD refused");
  return new DOMParser().parseFromString(xml, "text/xml");
};

const ROLES: [RegExp, string][] = [
  [/^(introducci[oó]n|introduction|background)$/i, "introduction"],
  [/^((material(es)?|pacientes|sujetos)( y | o )?(m[eé]todos?)?|m[eé]todos?|metodolog[ií]a|methods?|materials? and methods|patients and methods)$/i, "methods"],
  [/^(resultados|results)$/i, "results"],
  [/^(discusi[oó]n|discussion)$/i, "discussion"],
  [/^(conclusi[oó]n(es)?|conclusions?)$/i, "conclusions"],
  [/^(discusi[oó]n y conclusi[oó]n(es)?|discussion and conclusions?)$/i, "discussion-conclusions"],
  [/^(bibliograf[ií]a|referencias( bibliogr[aá]ficas)?|references|bibliography)$/i, "references"],
  [/^(agradecimientos?|acknowledge?ments?)$/i, "acknowledgements"],
  [/^(financiaci[oó]n|fuentes? de financiaci[oó]n|funding)$/i, "funding"],
  [/^(conflictos? de inter[eé]s(es)?|conflicts? of interests?|declaraci[oó]n de conflictos.*|competing interests)$/i, "conflicts"],
  [/^(responsabilidades [eé]ticas|aspectos [eé]ticos|consideraciones [eé]ticas|ethics.*)$/i, "ethics"],
  [/^(uso de (la )?(inteligencia artificial|ia)|declaration of generative ai.*|use of ai.*)$/i, "ai-use"],
];
const roleOf = (text: string) => ROLES.find(([re]) => re.test(text.trim().replace(/[.:]$/, "")))?.[1] ?? null;
const ABSTRACT = /^(resumen|abstract|summary)$/i;
const KEYWORDS = /^\s*(palabras? clave|key ?words)\s*[:.]\s*/i;
export const TABLE_CAPTION = /^\s*(tabla|table)\s+(\d+)\s*[.:\-–—]?\s*/i;
const FIGURE_CAPTION = /^\s*(figura|figure|fig\.)\s*(\d+)\s*[.:\-–—]?\s*/i;
// a table note: "Abreviaturas: …", "Fuente: …", "a …", "a. …", "* …", or an abbreviation line ("CI: …", "DAS28: …")
export const NOTE_START = /^\s*((abreviaturas|abbreviations|notas?|notes?|fuente|source)\b|[a-z*†‡§¶][.)]?\s|[A-Z][A-Za-z0-9-]{0,11}\s?:\s)/;
const IMAGE_EXT: Record<string, string> = { png: "png", jpg: "jpg", jpeg: "jpg", gif: "gif", tif: "tiff", tiff: "tiff", svg: "svg", eps: "eps", pdf: "pdf" };

interface Para { kind: "p"; style: string; outline: number | null; runs: Run[]; text: string; list: { num: string; ordered: boolean } | null; images: string[]; align: string | null }
interface Tbl { kind: "t"; rows: { header: boolean; cells: { colspan: number; vmerge: "restart" | "continue" | null; paras: Para[]; align: string | null }[] }[]; grid: number[] }
type Item = Para | Tbl;

export interface WordImportReport { title: string; headings: number; paragraphs: number; tables: number; figures: number; abstract: boolean; abstractLanguages: string[]; crossReferences: number; warnings: string[] }

/** Reads a DOCX as a flat list of paragraphs and tables, with the style names resolved. */
async function readWord(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("not a Word document (no word/document.xml)");
  const styles = new Map<string, { name: string; basedOn: string; outline: number | null }>();
  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  if (stylesXml) for (const s of [...parse(stylesXml).getElementsByTagNameNS(W, "style")]) {
    const o = attr(child(child(s, "pPr"), "outlineLvl"), "val");
    styles.set(attr(s, "styleId"), { name: attr(child(s, "name"), "val").toLowerCase(), basedOn: attr(child(s, "basedOn"), "val"), outline: o ? Number(o) : null });
  }
  const styleInfo = (id: string) => {
    let s = styles.get(id); let outline = s?.outline ?? null; const name = s?.name ?? id.toLowerCase();
    for (let i = 0; s && outline === null && s.basedOn && i < 10; i++) { s = styles.get(s.basedOn); outline = s?.outline ?? null; }
    const h = /^heading (\d)$/.exec(name);
    return { name, outline: h ? Number(h[1]) - 1 : outline };
  };
  // lists: ordered when the level's format is a number
  const ordered = new Set<string>();
  const numXml = await zip.file("word/numbering.xml")?.async("string");
  if (numXml) {
    const dom = parse(numXml);
    const abstractOrdered = new Set<string>();
    for (const a of [...dom.getElementsByTagNameNS(W, "abstractNum")]) {
      const lvl0 = kids(a).find((k) => k.localName === "lvl" && attr(k, "ilvl") === "0");
      const fmt = attr(child(lvl0, "numFmt"), "val");
      if (fmt && fmt !== "bullet" && fmt !== "none") abstractOrdered.add(attr(a, "abstractNumId"));
    }
    for (const n of [...dom.getElementsByTagNameNS(W, "num")]) if (abstractOrdered.has(attr(child(n, "abstractNumId"), "val"))) ordered.add(attr(n, "numId"));
  }
  const rels = new Map<string, string>();
  const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
  if (relsXml) for (const m of relsXml.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);
  for (const m of (relsXml ?? "").matchAll(/<Relationship [^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)) rels.set(m[2], m[1]);

  const images = new Map<string, { bytes: Uint8Array; ext: string }>();
  function paragraph(p: Element): Para {
    const pPr = child(p, "pPr");
    const info = styleInfo(attr(child(pPr, "pStyle"), "val"));
    const outlineHere = attr(child(pPr, "outlineLvl"), "val");
    const numPr = child(pPr, "numPr");
    const numId = attr(child(numPr, "numId"), "val");
    const P: Para = { kind: "p", style: info.name, outline: outlineHere ? Number(outlineHere) : info.outline, runs: [], text: "", list: numId && numId !== "0" ? { num: numId, ordered: ordered.has(numId) } : null, images: [], align: attr(child(pPr, "jc"), "val") || null };
    let inFieldCode = 0;
    const run = (r: Element, deleted: boolean) => {
      const rPr = child(r, "rPr");
      const on = (n: string) => { const e = child(rPr, n); return !!e && !["0", "false", "off"].includes(attr(e, "val")); };
      const va = attr(child(rPr, "vertAlign"), "val");
      const f = { bold: on("b"), italic: on("i"), sup: va === "superscript", sub: va === "subscript" };
      for (const e of kids(r)) {
        const ln = e.localName;
        if (ln === "fldChar") { const t = attr(e, "fldCharType"); if (t === "begin") inFieldCode++; else if (t === "separate" && inFieldCode) inFieldCode--; continue; }
        if (ln === "instrText" || inFieldCode || deleted) continue; // field codes never; field results yes
        if (ln === "t") push(e.textContent ?? "", f);
        else if (ln === "tab") push("\t", f);
        else if (ln === "br" && attr(e, "type") !== "page") push(" ", f);
        else if (ln === "noBreakHyphen") push("‑", f);
        else if (ln === "drawing" || ln === "pict") {
          for (const blip of [...e.getElementsByTagNameNS("*", "blip"), ...e.getElementsByTagNameNS("*", "imagedata")]) {
            const rid = blip.getAttribute("r:embed") || blip.getAttribute("r:id") || "";
            const target = rels.get(rid);
            if (target) P.images.push(target.replace(/^\/?(word\/)?/, ""));
          }
        }
      }
    };
    const push = (text: string, f: Omit<Run, "text">) => {
      if (!text) return;
      const last = P.runs.at(-1);
      if (last && !!last.bold === !!f.bold && !!last.italic === !!f.italic && !!last.sup === !!f.sup && !!last.sub === !!f.sub) last.text += text;
      else P.runs.push({ text, ...f });
    };
    const walk = (n: Element, deleted: boolean) => {
      for (const e of kids(n)) {
        const ln = e.localName;
        if (ln === "r") run(e, deleted);
        else if (ln === "del" || ln === "moveFrom") walk(e, true);
        else if (["ins", "moveTo", "hyperlink", "smartTag", "sdt", "sdtContent", "fldSimple", "customXml"].includes(ln ?? "")) walk(e, deleted);
      }
    };
    walk(p, false);
    P.text = P.runs.map((r) => r.text).join("");
    return P;
  }
  function table(t: Element): Tbl {
    const grid = kids(child(t, "tblGrid") ?? t).filter((g) => g.localName === "gridCol").map((g) => Number(attr(g, "w")) || 1);
    const rows = kids(t).filter((r) => r.localName === "tr").map((tr) => ({
      header: !!child(child(tr, "trPr"), "tblHeader"),
      cells: kids(tr).filter((c) => c.localName === "tc").map((tc) => {
        const tcPr = child(tc, "tcPr");
        const vm = child(tcPr, "vMerge");
        const paras: Para[] = [];
        const collect = (n: Element) => { for (const e of kids(n)) { if (e.localName === "p") paras.push(paragraph(e)); else if (e.localName === "tbl") for (const row of kids(e).filter((x) => x.localName === "tr")) for (const c of kids(row).filter((x) => x.localName === "tc")) collect(c); else if (e.localName === "sdt" || e.localName === "sdtContent") collect(e); } };
        collect(tc);
        return { colspan: Number(attr(child(tcPr, "gridSpan"), "val")) || 1, vmerge: vm ? (attr(vm, "val") === "restart" ? "restart" as const : "continue" as const) : null, paras, align: paras.find((x) => x.align)?.align ?? null };
      }),
    }));
    return { kind: "t", rows, grid };
  }
  const items: Item[] = [];
  const blocks = (n: Element) => {
    for (const e of kids(n)) {
      if (e.localName === "p") items.push(paragraph(e));
      else if (e.localName === "tbl") items.push(table(e));
      else if (e.localName === "sdt" || e.localName === "sdtContent" || e.localName === "customXml") blocks(e);
    }
  };
  const body = parse(docXml).getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("document.xml has no body");
  blocks(body as unknown as Element);
  for (const it of items) for (const target of (it.kind === "p" ? it.images : [])) {
    if (images.has(target)) continue;
    const f = zip.file(`word/${target}`);
    if (f) images.set(target, { bytes: await f.async("uint8array"), ext: (/\.([a-z0-9]+)$/i.exec(target)?.[1] ?? "").toLowerCase() });
  }
  return { items, images };
}

export const inline = (runs: Run[]): PMNode[] => runs.filter((r) => r.text).map((r) => {
  const marks = [r.bold && { type: "bold" }, r.italic && { type: "italic" }, r.sup && { type: "superscript" }, r.sub && { type: "subscript" }].filter(Boolean) as { type: string }[];
  return marks.length ? { type: "text", text: r.text, marks } : { type: "text", text: r.text };
});
/** Runs without a leading pattern (the "Tabla 1. " of a caption). */
export function stripLead(runs: Run[], re: RegExp): Run[] {
  const text = runs.map((r) => r.text).join("");
  const m = re.exec(text);
  if (!m || m.index !== 0) return runs;
  let cut = m[0].length;
  const out: Run[] = [];
  for (const r of runs) {
    if (cut >= r.text.length) { cut -= r.text.length; continue; }
    out.push({ ...r, text: r.text.slice(cut) });
    cut = 0;
  }
  return out;
}

/**
 * Creates a project in an empty folder from a Word document. The original stays where it
 * is; nothing of it is sent anywhere.
 */
export async function projectFromWord(fs: ProjectFs, bytes: Uint8Array, opts: { fileName: string; name?: string; lang?: string }): Promise<{ project: Project; report: WordImportReport }> {
  const { items, images } = await readWord(bytes);
  const warnings: string[] = [];
  const headingsText = items.filter((i): i is Para => i.kind === "p" && i.outline !== null).map((p) => p.text).join(" ");
  const lang = opts.lang ?? (/\b(introducci[oó]n|m[eé]todos|resultados|discusi[oó]n|resumen|bibliograf[ií]a)\b/i.test(headingsText) || !/\b(introduction|methods|results|discussion)\b/i.test(headingsText) ? "es" : "en");

  // --- pass 1: tables and figures with their captions and notes, numbered as in the Word
  const consumed = new Set<number>();
  const tables: { at: number; number: number; caption: Run[]; table: Tbl; notes: Para[] }[] = [];
  const figures: { at: number; number: number; caption: Run[]; image: string }[] = [];
  let uncaptioned = 0;
  const isCaption = (i: number, re: RegExp) => { const it = items[i]; return it?.kind === "p" && re.test(it.text) && it.text.length < 600; };
  items.forEach((it, i) => {
    if (it.kind === "t") {
      const capAt = isCaption(i - 1, TABLE_CAPTION) && !consumed.has(i - 1) ? i - 1 : isCaption(i + 1, TABLE_CAPTION) ? i + 1 : -1;
      let cap = capAt >= 0 ? (items[capAt] as Para) : null;
      if (capAt >= 0) consumed.add(capAt);
      // a caption written in the table's first row, as one cell across the table
      const first = it.rows[0];
      const width = Math.max(...it.rows.map((r) => r.cells.reduce((n, c) => n + c.colspan, 0)));
      if (!cap && first && first.cells.length === 1 && first.cells[0].colspan === width && it.rows.length > 1) {
        const cellText = first.cells[0].paras.map((x) => x.text).join(" ");
        // one cell across the whole first row that starts with "Tabla" is a title, numbered or not
        if (/^\s*(tabla|table)\b/i.test(cellText) && first.cells[0].paras.length) {
          cap = first.cells[0].paras[0];
          it.rows.shift();
        }
      }
      const notes: Para[] = [];
      for (let j = i + 1; j < items.length; j++) {
        const n = items[j];
        if (consumed.has(j)) continue;
        if (n.kind !== "p" || n.outline !== null || !n.text.trim() || !NOTE_START.test(n.text) || n.text.length > 500 || isCaption(j, TABLE_CAPTION) || isCaption(j, FIGURE_CAPTION)) break;
        notes.push(n); consumed.add(j);
      }
      const numbered = cap ? TABLE_CAPTION.exec(cap.text) : null;
      let number = numbered ? Number(numbered[2]) : tables.length + 1;
      if (tables.some((x) => x.number === number)) { warnings.push(`two tables are numbered ${number}: the second becomes ${Math.max(...tables.map((x) => x.number)) + 1}`); number = Math.max(...tables.map((x) => x.number)) + 1; }
      if (!cap) uncaptioned++;
      tables.push({ at: i, number, caption: cap ? (numbered ? stripLead(cap.runs, TABLE_CAPTION) : cap.runs) : [], table: it, notes });
    } else if (it.images.length) {
      const capAt = isCaption(i + 1, FIGURE_CAPTION) ? i + 1 : isCaption(i - 1, FIGURE_CAPTION) && !consumed.has(i - 1) ? i - 1 : -1;
      const cap = capAt >= 0 ? (items[capAt] as Para) : null;
      const img = it.images[0];
      const ext = (/\.([a-z0-9]+)$/i.exec(img)?.[1] ?? "").toLowerCase();
      if (!IMAGE_EXT[ext]) { warnings.push(`image ${img}: .${ext} cannot be a figure yet (convert it to PNG or TIFF)`); return; }
      if (capAt >= 0) consumed.add(capAt);
      if (it.images.length > 1) warnings.push(`a paragraph has ${it.images.length} images: only the first one becomes a figure`);
      let number = cap ? Number(FIGURE_CAPTION.exec(cap.text)![2]) : figures.length + 1;
      if (figures.some((x) => x.number === number)) number = Math.max(...figures.map((x) => x.number)) + 1;
      figures.push({ at: i, number, caption: cap ? stripLead(cap.runs, FIGURE_CAPTION) : [], image: img });
    }
  });
  if (uncaptioned) warnings.push(`${uncaptioned} table(s) without a "Tabla N." caption next to them: their caption is empty`);
  const tableId = new Map<number, string>(tables.map((t) => [t.number, newId("t")]));
  const figureId = new Map<number, string>(figures.map((f) => [f.number, newId("f")]));

  // cross-references written as text: "tabla 2", "Figure 1"
  let crossReferences = 0;
  const XREF = /\b(tablas?|tables?|figuras?|figures?|figs?\.)\s+(\d+)\b/gi;
  const withXrefs = (runs: Run[]): PMNode[] => {
    const out: PMNode[] = [];
    for (const node of inline(runs)) {
      const text = node.text!;
      let last = 0;
      for (const m of text.matchAll(XREF)) {
        const isTable = /^tabl/i.test(m[1]);
        const target = (isTable ? tableId : figureId).get(Number(m[2]));
        if (!target) continue;
        const before = text.slice(last, m.index! + m[0].length - m[2].length);
        if (before) out.push({ ...node, text: before });
        out.push({ type: "xref", attrs: { target } });
        crossReferences++;
        last = m.index! + m[0].length;
      }
      if (last < text.length) out.push({ ...node, text: text.slice(last) });
    }
    return out;
  };
  const block = (type: string, p: Para, extra: Record<string, unknown> = {}): PMNode => {
    const content = withXrefs(p.runs);
    return { type, attrs: { id: newId("b"), lang: null, ...extra }, ...(content.length ? { content } : {}) };
  };

  // --- pass 2: title, abstract, body
  const title: PMNode[] = [];
  const body: PMNode[] = [];
  // one section per language: "Resumen" and "Abstract" headings each start one
  const sections: { lang: string; content: PMNode[] }[] = [];
  let abstract: PMNode[] = [];
  let abstractLevel: number | null = null;
  let currentList: PMNode | null = null;
  let headings = 0, paragraphs = 0;
  const tableAt = new Map(tables.map((t) => [t.at, t]));
  const figureAt = new Map(figures.map((f) => [f.at, f]));
  items.forEach((it, i) => {
    if (consumed.has(i)) return;
    const t = tableAt.get(i);
    if (t) { currentList = null; body.push({ type: "tableRef", attrs: { id: tableId.get(t.number), src: `tables/tabla-${t.number}.scitable` } }); return; }
    if (it.kind === "t") return;
    const f = figureAt.get(i);
    if (f) { currentList = null; body.push({ type: "figureRef", attrs: { id: figureId.get(f.number), src: `figures/figura-${f.number}.scifigure` } }); if (!it.text.trim()) return; }
    if (!it.text.trim()) { currentList = null; return; }
    const isTitle = it.style === "title" || (it.style === "subtitle" && title.length > 0);
    if (isTitle && !body.length && !sections.length) { title.push({ type: "title", attrs: { id: newId("b"), lang: title.length ? (lang === "es" ? "en" : "es") : lang }, content: inline(it.runs) }); return; }
    if (it.outline !== null && it.outline < 6) {
      currentList = null;
      const level = it.outline + 1;
      if (ABSTRACT.test(it.text.trim().replace(/[.:]$/, ""))) {
        abstractLevel = level;
        abstract = [];
        sections.push({ lang: /^resumen/i.test(it.text.trim()) ? "es" : "en", content: abstract });
        return;
      }
      if (abstractLevel !== null && level <= abstractLevel) abstractLevel = null;
      headings++;
      const role = roleOf(it.text);
      (abstractLevel !== null ? abstract : body).push(block("heading", it, { level: abstractLevel !== null ? Math.max(2, level) : level, role }));
      return;
    }
    if (abstractLevel !== null) {
      if (KEYWORDS.test(it.text)) {
        const words = it.text.replace(KEYWORDS, "").replace(/\.\s*$/, "").split(/\s*[;,]\s*/).filter(Boolean);
        abstract.push({ type: "keywords", attrs: { id: newId("b") }, content: words.map((w) => ({ type: "keyword", content: [{ type: "text", text: w }] })) });
        return;
      }
      abstract.push(block("paragraph", it));
      return;
    }
    paragraphs++;
    if (it.list) {
      const type = it.list.ordered ? "orderedList" : "bulletList";
      if (!currentList || currentList.type !== type) { currentList = { type, attrs: { id: newId("b"), ...(type === "orderedList" ? { start: 1 } : {}) }, content: [] }; body.push(currentList); }
      currentList.content!.push({ type: "listItem", content: [block("paragraph", it)] });
      return;
    }
    currentList = null;
    body.push(block("paragraph", it));
  });
  if (!title.length) {
    const fallback = opts.fileName.replace(/\.docx$/i, "");
    title.push({ type: "title", attrs: { id: newId("b"), lang }, content: [{ type: "text", text: fallback }] });
    warnings.push("no paragraph with the Title style: the file name is the title");
  }
  if (body.some((n) => n.type === "heading" && n.attrs!.role === "references")) warnings.push("the bibliography came in as text; the citations become live citations in phase 2");

  // --- the project
  const titleText = (title[0].content ?? []).map((c) => c.text).join("");
  const p = await createProject(fs, { name: opts.name ?? titleText.slice(0, 80), fileName: opts.fileName.replace(/\.docx$/i, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").toLowerCase().slice(0, 40) || "articulo", title: titleText, lang });
  const art = p.articles[0];
  const envelope = (documentType: string, doc: PMNode) => ({ schemaVersion: 1, documentType, lang, doc, changes: {}, comments: {} }) as never;
  await saveDocument(p, art, "manuscript/article.scidoc", envelope("article", { type: "doc", content: [...title, ...body] }));
  await saveDocument(p, art, "manuscript/abstract.scidoc", envelope("abstract", { type: "doc", content: (sections.some((x) => x.content.length) ? sections.filter((x) => x.content.length) : [{ lang, content: [{ type: "paragraph", attrs: { id: newId("b"), lang: null } }] }]).map((x) => ({ type: "abstractSection", attrs: { id: newId("b"), lang: x.lang }, content: x.content })) }));

  for (const t of tables) {
    // vertical merges: a "restart" cell spans the "continue" cells below it in the same grid column
    const grid = t.table.rows.map((r) => { let col = 0; return r.cells.map((c) => { const at = col; col += c.colspan; return { ...c, col: at }; }); });
    const rowspan = (ri: number, col: number) => { let n = 1; while (grid[ri + n]?.some((c) => c.col === col && c.vmerge === "continue")) n++; return n; };
    const headerRows = t.table.rows.filter((r, ri) => r.header && t.table.rows.slice(0, ri + 1).every((x) => x.header)).length;
    const total = t.table.grid.reduce((a, b) => a + b, 0);
    const width = grid[0]?.reduce((n, c) => n + c.colspan, 0) ?? 0;
    const tableNode: PMNode = {
      type: "table",
      attrs: { id: newId("b"), columnWidths: t.table.grid.length === width && total > 0 ? t.table.grid.map((g) => Math.round((g / total) * 1000) / 10) : null },
      content: grid.map((cells, ri) => ({
        type: "tableRow",
        content: cells.filter((c) => c.vmerge !== "continue").map((c) => ({
          type: ri < headerRows ? "tableHeader" : "tableCell",
          attrs: { colspan: c.colspan, rowspan: c.vmerge === "restart" ? rowspan(ri, c.col) : 1, align: ({ center: "center", right: "right", end: "right", left: null, start: null } as Record<string, string | null>)[c.align ?? ""] ?? null },
          content: (c.paras.length ? c.paras : [{ kind: "p", runs: [] } as unknown as Para]).map((cp) => ({ type: "paragraph", attrs: { id: newId("b"), lang: null }, ...(inline(cp.runs).length ? { content: inline(cp.runs) } : {}) })),
        })),
      })).filter((r) => r.content.length),
    };
    const part: PMNode = {
      type: "tablePart", attrs: { id: tableId.get(t.number) },
      content: [
        { type: "tableCaption", attrs: { id: newId("b"), lang: null }, ...(inline(t.caption).length ? { content: inline(t.caption) } : {}) },
        tableNode,
        ...t.notes.map((n) => ({ type: "tableNote", attrs: { id: newId("n"), kind: "general", lang: null }, content: inline(n.runs) })),
      ],
    };
    await saveDocument(p, art, `tables/tabla-${t.number}.scitable`, envelope("table", part));
  }
  for (const f of figures) {
    const img = images.get(f.image);
    if (!img) { warnings.push(`image ${f.image} is not in the document`); continue; }
    const ext = IMAGE_EXT[img.ext];
    const file = `figures/figura-${f.number}.${ext}`;
    await fs.write(`articles/${art.folder}/${file}`, img.bytes);
    const part: PMNode = {
      type: "figurePart",
      attrs: { id: figureId.get(f.number), image: file, alt: null, credit: null, license: null },
      content: [{ type: "figureCaption", attrs: { id: newId("b"), lang: null }, ...(inline(f.caption).length ? { content: inline(f.caption) } : {}) }],
    };
    await saveDocument(p, art, `figures/figura-${f.number}.scifigure`, envelope("figure", part));
    if (!f.caption.length) warnings.push(`figure ${f.number} has no "Figura N." caption next to it`);
  }
  const project = await loadProject(fs);
  return { project, report: { title: titleText, headings, paragraphs, tables: tables.length, figures: figures.length, abstract: sections.some((x) => x.content.length), abstractLanguages: sections.filter((x) => x.content.length).map((x) => x.lang), crossReferences, warnings } };
}
