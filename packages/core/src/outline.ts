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
}
export interface ArticleOutline {
  title: { block: string; text: string } | null;
  tables: OutlinePart[];
  figures: OutlinePart[];
  abstract: { lang: string; block: string; text: string; keywords: string[] }[];
}

/** The outline of one article; `live` replaces saved documents by what is on screen (as checkArticle). */
export function articleOutline(project: Project, folder: string, live: Record<string, PMNode> = {}): ArticleOutline {
  const art0 = project.articles.find((a) => a.folder === folder);
  if (!art0) throw new Error(`no article ${folder}`);
  const documents = new Map(art0.documents);
  for (const [p, doc] of Object.entries(live)) { const f = documents.get(p); if (f) documents.set(p, { ...f, doc } as never); }
  const art = { ...art0, documents };
  const body = documents.get("manuscript/article.scidoc")!.doc as PMNode;
  const title = (body.content ?? []).find((n) => n.type === "title");
  const { tree, tables, figures } = composite(art);
  const targets = new Set<string>();
  const visit = (n: PMNode) => { if (n.type === "xref") targets.add(n.attrs!.target as string); n.content?.forEach(visit); };
  visit(tree);
  const abstractDoc = documents.get("manuscript/abstract.scidoc")?.doc as PMNode | undefined;
  abstractDoc && visit(abstractDoc);
  const refs = (body.content ?? []).filter((n) => n.type === "tableRef" || n.type === "figureRef");
  const src = new Map(refs.map((n) => [n.attrs!.id as string, n.attrs!.src as string]));
  const parts = (map: Map<string, PMNode>, captionType: string, noteType: string): OutlinePart[] => {
    const no = numbering(tree, [...map.keys()]);
    return [...map].map(([id, part]) => ({
      id, src: src.get(id)!, number: no.get(id)!,
      caption: blockText((part.content ?? []).find((n) => n.type === captionType) ?? { type: "text", text: "" }).trim(),
      cited: targets.has(id),
      notes: (part.content ?? []).filter((n) => n.type === noteType).length,
      ...(part.type === "figurePart" ? { image: part.attrs!.image as string } : {}),
    })).sort((a, b) => a.number - b.number);
  };
  return {
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
