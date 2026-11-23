// The composite document of the window (record 0021, prototype 8): the article's body, its
// abstract and every table and figure as one ProseMirror tree, so that writing, undo, find
// and the numbering work over the whole article as one document. composeArticle() builds
// it on load; splitArticle() gives every file back, and saveComposite() writes only those
// whose content changed.
import { ID_OF_NODE, newId, type DocumentFile, type PMNode } from "@scidesk/formats";
import { saveDocument, type ArticleData, type Project } from "./project.ts";

export const BODY_PATH = "manuscript/article.scidoc";
export const ABSTRACT_PATH = "manuscript/abstract.scidoc";

const PART_OF_REF: Record<string, string> = { tableRef: "tablePart", figureRef: "figurePart" };
const REF_OF_PART: Record<string, string> = { tablePart: "tableRef", figurePart: "figureRef" };

export interface Composed {
  doc: PMNode;
  /** Parts whose file is missing: their reference stays in the tree, shown as missing. */
  warnings: string[];
}

/**
 * The article as one tree: the titles, then the abstract (an `abstractPart`), then the body
 * with each `tableRef`/`figureRef` replaced by its part, which keeps the file it came from
 * in `src`. Marks on a reference (a whole table suggested for deletion) move to the part.
 */
export function composeArticle(art: ArticleData): Composed {
  const warnings: string[] = [];
  const body = art.documents.get(BODY_PATH)?.doc as PMNode | undefined;
  if (!body) throw new Error(`articles/${art.folder}/${BODY_PATH} is missing`);
  const abstract = art.documents.get(ABSTRACT_PATH)?.doc as PMNode | undefined;
  const content: PMNode[] = [];
  let abstractDone = !abstract?.content?.length;
  const putAbstract = () => {
    if (abstractDone) return;
    abstractDone = true;
    content.push({ type: "abstractPart", attrs: { src: ABSTRACT_PATH }, content: structuredClone(abstract!.content!) });
  };
  for (const n of body.content ?? []) {
    if (n.type !== "title") putAbstract();
    const partType = PART_OF_REF[n.type];
    if (!partType) { content.push(structuredClone(n)); continue; }
    const src = n.attrs!.src as string;
    const part = art.documents.get(src)?.doc as PMNode | undefined;
    if (!part || part.type !== partType || part.attrs?.id !== n.attrs!.id) {
      warnings.push(`${src} is missing or is not the part of ${n.attrs!.id}`);
      content.push(structuredClone(n));
      continue;
    }
    // record 0085: a landscape page belongs to the place in the text, not to the file
    content.push({ ...structuredClone(part), attrs: { ...part.attrs, src, ...(n.attrs!.landscape ? { landscape: true } : {}) }, ...(n.marks?.length ? { marks: structuredClone(n.marks) } : {}) });
  }
  putAbstract();
  return { doc: { type: "doc", content }, warnings };
}

/** Change and comment ids used in a tree. */
function usedIds(n: PMNode, out = new Set<string>()) {
  for (const m of n.marks ?? []) if (m.attrs?.id) out.add(m.attrs.id as string);
  n.content?.forEach((c) => usedIds(c, out));
  return out;
}

/** Who made each tracked change and each comment the editor knows (record 0090): its registry, by id. */
export interface Registries { changes?: Record<string, unknown>; comments?: Record<string, unknown> }

/** Every change and comment of the article's files, as one registry (ids are unique), with the editor's own over them. */
export function registries(art: ArticleData, extra: Registries = {}) {
  const changes: Record<string, unknown> = {};
  const comments: Record<string, unknown> = {};
  for (const f of art.documents.values()) { Object.assign(changes, f.changes); Object.assign(comments, f.comments); }
  Object.assign(changes, extra.changes);
  Object.assign(comments, extra.comments);
  return { changes, comments };
}

function envelope(art: ArticleData, path: string, documentType: string, doc: PMNode, reg: ReturnType<typeof registries>): DocumentFile {
  const old = art.documents.get(path);
  const used = usedIds(doc);
  const pick = (r: Record<string, unknown>) => Object.fromEntries(Object.keys(r).filter((id) => used.has(id)).sort().map((id) => [id, r[id]]));
  return { schemaVersion: 1, lang: art.article.lang, ...(old ?? {}), documentType, doc, changes: pick(reg.changes), comments: pick(reg.comments) } as DocumentFile;
}

/**
 * The editor's tree back into files, by path relative to the article folder: the body
 * (with a reference in the place of each part), the abstract and one file per part. A
 * part removed from the text is not in the result: its file stays on disk (rule 4).
 */
export function splitArticle(doc: PMNode, art: ArticleData, extra: Registries = {}): Map<string, DocumentFile> {
  const reg = registries(art, extra);
  const out = new Map<string, DocumentFile>();
  const body: PMNode[] = [];
  for (const n of doc.content ?? []) {
    if (n.type === "abstractPart") {
      out.set(ABSTRACT_PATH, envelope(art, ABSTRACT_PATH, "abstract", { type: "doc", content: n.content ?? [] }, reg));
      continue;
    }
    const refType = REF_OF_PART[n.type];
    if (!refType) { body.push(n); continue; }
    const { src, landscape, ...attrs } = n.attrs as Record<string, unknown> & { src: string };
    const { marks, ...rest } = n;
    out.set(src, envelope(art, src, n.type === "tablePart" ? "table" : "figure", { ...rest, attrs } as PMNode, reg));
    body.push({ type: refType, attrs: { id: attrs.id, src, ...(landscape ? { landscape: true } : {}) }, ...(marks?.length ? { marks } : {}) });
  }
  const bodyFile = art.documents.get(BODY_PATH);
  out.set(BODY_PATH, envelope(art, BODY_PATH, bodyFile?.documentType ?? "article", { type: "doc", content: body }, reg));
  return out;
}

/**
 * Whether two JSON values are the same as stableStringify would write them: key order does
 * not matter and keys whose value is undefined do not exist. Stops at the first difference,
 * and builds no strings: comparing every file of a long article after each pause in typing
 * was the slowest step of the recovery journal and the save (record 0055).
 */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameJson(a[i], bb[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  let na = 0;
  for (const k in ao) {
    if (ao[k] === undefined) continue;
    na++;
    if (!sameJson(ao[k], bo[k])) return false;
  }
  let nb = 0;
  for (const k in bo) if (bo[k] !== undefined) nb++;
  return na === nb;
}

/** The files of `split` whose content differs from what the article holds (what is on disk). */
export function changedDocuments(split: Map<string, DocumentFile>, art: ArticleData): Map<string, DocumentFile> {
  const changed = new Map<string, DocumentFile>();
  for (const [path, file] of split) {
    const old = art.documents.get(path);
    if (!old || !sameJson(old, file)) changed.set(path, file);
  }
  return changed;
}

/** Writes the files of the tree that changed (each validated); gives their paths. */
export async function saveComposite(project: Project, art: ArticleData, doc: PMNode, extra: Registries = {}): Promise<string[]> {
  const changed = changedDocuments(splitArticle(doc, art, extra), art);
  // the parts first and the body last: a body never points at a part that is not written
  const order = [...changed.keys()].sort((a, b) => Number(a === BODY_PATH) - Number(b === BODY_PATH));
  for (const path of order) await saveDocument(project, art, path, changed.get(path)!);
  return order;
}

/** The documents of the tree as `live` overrides for the checks, the outline and the citations. */
export function liveDocuments(doc: PMNode, art: ArticleData): Record<string, PMNode> {
  return Object.fromEntries([...splitArticle(doc, art)].map(([p, f]) => [p, f.doc as PMNode]));
}

/** A free file name for a new table or figure part: tables/tabla-<n>.scitable, figures/figura-<n>.scifigure. */
export function freePartPath(kind: "table" | "figure", taken: Iterable<string>): string {
  const used = new Set(taken);
  const [dir, stem, ext] = kind === "table" ? ["tables", "tabla", "scitable"] : ["figures", "figura", "scifigure"];
  let n = 1;
  while (used.has(`${dir}/${stem}-${n}.${ext}`)) n++;
  return `${dir}/${stem}-${n}.${ext}`;
}

/**
 * A copy of a part (rule 3 of record 0021): a new id, a new file and new ids for every
 * block and note inside, with the calls to its notes following them.
 */
export function copyPart(part: PMNode, src: string): PMNode {
  const copy = structuredClone(part);
  const notes = new Map<string, string>();
  const visit = (n: PMNode) => {
    const kind = ID_OF_NODE[n.type];
    if (kind && n !== copy) {
      const id = newId(kind);
      if (kind === "n") notes.set(n.attrs!.id as string, id);
      n.attrs = { ...n.attrs, id };
    }
    n.content?.forEach(visit);
  };
  visit(copy);
  const retarget = (n: PMNode) => {
    if (n.type === "noteRef" && notes.has(n.attrs!.target as string)) n.attrs!.target = notes.get(n.attrs!.target as string);
    n.content?.forEach(retarget);
  };
  retarget(copy);
  copy.attrs = { ...copy.attrs, id: newId(part.type === "tablePart" ? "t" : "f"), src };
  return copy;
}
