// What the window's concept navigator shows (record 0044, R28): the article's title, its
// tables and figures numbered as they will come out, each with its caption and whether the
// text cites it, and the abstract by language. Word counts and limits come from
// checkArticle; this adds what the checks do not need. Also the two ways the window adds
// a table or a figure that does not come from Word: an empty table and an image file.
import { newId, type PMNode } from "@scidesk/formats";
import { blockText } from "./checks.ts";
import { composite, numbering } from "./docx-export.ts";
import { saveDocument, type Project } from "./project.ts";
import { addTablePart, tablePartFromPaste, type PastedCell } from "./paste-table.ts";

export interface OutlinePart {
  /** Id of the tableRef or figureRef (the target of cross-references). */
  id: string;
  /** Its file, relative to the article folder. */
  src: string;
  number: number;
  caption: string;
  /** Some cross-reference in the text points at it. */
  cited: boolean;
  notes: number;
  /** Figures: the image file, relative to the article folder. */
  image?: string;
  /** Where the text cites it: the block, its section and which paragraph of the section (from 1). */
  citedIn: { block: string; section: string | null; paragraph: number }[];
  /** Tables: their shape (sheet 8, record 0048). */
  shape?: TableShape;
}

export interface TableShape {
  columns: number;
  headerRows: number;
  dataRows: number;
  /** Cells that span more than one row or column. */
  merged: number;
  /** Cells with their own alignment (centre, right, decimal). */
  aligned: number;
  /** Relative widths of the columns, or null when the export decides. */
  widths: number[] | null;
  specificNotes: number;
  generalNotes: number;
  captioned: boolean;
}

/** The shape of a table part: columns, header and data rows, merged and aligned cells, widths and notes. */
export function tableShape(part: PMNode): TableShape {
  const table = (part.content ?? []).find((n) => n.type === "table");
  const rows = table?.content ?? [];
  const cells = rows.flatMap((r) => r.content ?? []);
  let headerRows = 0;
  while (headerRows < rows.length && (rows[headerRows].content ?? []).every((c) => c.type === "tableHeader")) headerRows++;
  const notes = (part.content ?? []).filter((n) => n.type === "tableNote");
  const caption = (part.content ?? []).find((n) => n.type === "tableCaption");
  return {
    columns: Math.max(0, ...rows.map((r) => (r.content ?? []).reduce((n, c) => n + Number(c.attrs?.colspan ?? 1), 0))),
    headerRows, dataRows: rows.length - headerRows,
    merged: cells.filter((c) => Number(c.attrs?.colspan ?? 1) > 1 || Number(c.attrs?.rowspan ?? 1) > 1).length,
    aligned: cells.filter((c) => c.attrs?.align).length,
    widths: (table?.attrs?.columnWidths as number[] | null | undefined) ?? null,
    specificNotes: notes.filter((n) => n.attrs?.kind === "specific").length,
    generalNotes: notes.filter((n) => n.attrs?.kind !== "specific").length,
    captioned: !!caption && blockText(caption).trim().length > 0,
  };
}

/** Where each table or figure is cited: block, section heading and paragraph number in the section. */
function citationSites(tree: PMNode): Map<string, OutlinePart["citedIn"]> {
  const out = new Map<string, OutlinePart["citedIn"]>();
  let section: string | null = null;
  let paragraph = 0;
  for (const n of tree.content ?? []) {
    if (n.type === "heading" && Number(n.attrs?.level ?? 1) === 1) { section = blockText(n).trim() || null; paragraph = 0; continue; }
    if (n.type === "paragraph") paragraph++;
    const targets = new Set<string>();
    const visit = (x: PMNode) => { if (x.type === "xref") targets.add(x.attrs!.target as string); x.content?.forEach(visit); };
    visit(n);
    for (const id of targets) {
      if (!out.has(id)) out.set(id, []);
      out.get(id)!.push({ block: String(n.attrs?.id ?? ""), section, paragraph: Math.max(1, paragraph) });
    }
  }
  return out;
}
export interface ArticleOutline {
  title: { block: string; text: string } | null;
  tables: OutlinePart[];
  figures: OutlinePart[];
  abstract: { lang: string; block: string; text: string; keywords: string[] }[];
  /** Tables and figures whose file is in the article but not in the text (rule 4 of record 0021). */
  unplaced: { src: string; kind: "table" | "figure"; caption: string }[];
}

/** The outline of one article; `live` replaces saved documents by what is on screen (as checkArticle). */
export function articleOutline(project: Project, folder: string, live: Record<string, PMNode> = {}): ArticleOutline {
  const art0 = project.articles.find((a) => a.folder === folder);
  if (!art0) throw new Error(`no article ${folder}`);
  const documents = new Map(art0.documents);
  // a part only on screen (a copy not saved yet) gets an envelope of its own
  for (const [p, doc] of Object.entries(live)) documents.set(p, { ...(documents.get(p) ?? { schemaVersion: 1, documentType: doc.type === "figurePart" ? "figure" : doc.type === "tablePart" ? "table" : "article", lang: art0.article.lang, changes: {}, comments: {} }), doc } as never);
  const art = { ...art0, documents };
  const body = documents.get("manuscript/article.scidoc")!.doc as PMNode;
  const title = (body.content ?? []).find((n) => n.type === "title");
  const { tree, tables, figures } = composite(art);
  const targets = new Set<string>();
  const visit = (n: PMNode) => { if (n.type === "xref") targets.add(n.attrs!.target as string); n.content?.forEach(visit); };
  visit(tree);
  const abstractDoc = documents.get("manuscript/abstract.scidoc")?.doc as PMNode | undefined;
  abstractDoc && visit(abstractDoc);
  const sites = citationSites(tree);
  const refs = (body.content ?? []).filter((n) => n.type === "tableRef" || n.type === "figureRef");
  const src = new Map(refs.map((n) => [n.attrs!.id as string, n.attrs!.src as string]));
  const parts = (map: Map<string, PMNode>, captionType: string, noteType: string): OutlinePart[] => {
    const no = numbering(tree, [...map.keys()]);
    return [...map].map(([id, part]) => ({
      id, src: src.get(id)!, number: no.get(id)!,
      caption: blockText((part.content ?? []).find((n) => n.type === captionType) ?? { type: "text", text: "" }).trim(),
      cited: targets.has(id),
      notes: (part.content ?? []).filter((n) => n.type === noteType).length,
      citedIn: sites.get(id) ?? [],
      ...(part.type === "figurePart" ? { image: part.attrs!.image as string } : { shape: tableShape(part) }),
    })).sort((a, b) => a.number - b.number);
  };
  const placed = new Set(refs.map((n) => n.attrs!.src as string));
  const unplaced = [...documents].filter(([p, f]) => (f.documentType === "table" || f.documentType === "figure") && !placed.has(p)).map(([p, f]) => ({
    src: p, kind: f.documentType as "table" | "figure",
    caption: blockText(((f.doc as PMNode).content ?? [])[0] ?? { type: "text", text: "" }).trim(),
  })).sort((a, b) => a.src.localeCompare(b.src, undefined, { numeric: true }));
  return {
    unplaced,
    title: title ? { block: title.attrs!.id as string, text: blockText(title).trim() } : null,
    tables: parts(tables, "tableCaption", "tableNote"),
    figures: parts(figures, "figureCaption", "figureNote"),
    abstract: (abstractDoc?.content ?? []).filter((s) => s.type === "abstractSection").map((s) => ({
      lang: (s.attrs!.lang as string) ?? art.article.lang,
      block: s.attrs!.id as string,
      text: (s.content ?? []).filter((n) => n.type !== "keywords").map(blockText).join("\n").trim(),
      keywords: (s.content ?? []).filter((n) => n.type === "keywords").flatMap((k) => (k.content ?? []).map((x) => blockText(x).trim()).filter(Boolean)),
    })),
  };
}

/** An empty table with a header row, to fill in: what "Insert › Table" adds (its file is saved at once). */
export async function addEmptyTable(project: Project, folder: string, rows = 3, cols = 3): Promise<{ path: string; ref: PMNode }> {
  const cell = (header: boolean): PastedCell => ({ header, colspan: 1, rowspan: 1, align: null, paras: [[]] });
  const { part } = tablePartFromPaste({ caption: null, rows: Array.from({ length: Math.max(2, rows) }, (_, r) => Array.from({ length: Math.max(1, cols) }, () => cell(r === 0))), widths: null, notes: [] });
  return addTablePart(project, folder, part);
}

const IMAGE = /\.(png|jpe?g|tiff?|svg)$/i;

/**
 * A figure from an image file: the image is copied to figures/figura-<n>.<ext> and its
 * part saved as figures/figura-<n>.scifigure (the first free number), with an empty caption.
 */
export async function addFigure(project: Project, folder: string, image: { name: string; bytes: Uint8Array }): Promise<{ path: string; ref: PMNode }> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const ext = IMAGE.exec(image.name)?.[1].toLowerCase();
  if (!ext) throw new Error(`${image.name}: a figure is a PNG, JPEG, TIFF or SVG image`);
  const taken = new Set(await project.fs.list(`articles/${folder}/figures`).catch(() => [] as string[]));
  let n = 1;
  const free = (k: number) => !art.documents.has(`figures/figura-${k}.scifigure`) && ![...taken].some((p) => new RegExp(`(^|/)figura-${k}\\.`).test(p));
  while (!free(n)) n++;
  const file = `figures/figura-${n}.${ext}`;
  await project.fs.write(`articles/${folder}/${file}`, image.bytes);
  const part: PMNode = {
    type: "figurePart",
    attrs: { id: newId("f"), image: file, alt: null, credit: null, license: null },
    content: [{ type: "figureCaption", attrs: { id: newId("b"), lang: null } }],
  };
  const path = `figures/figura-${n}.scifigure`;
  await saveDocument(project, art, path, { schemaVersion: 1, documentType: "figure", lang: art.article.lang, doc: part, changes: {}, comments: {} } as never);
  return { path, ref: { type: "figureRef", attrs: { id: part.attrs!.id, src: path } } };
}
