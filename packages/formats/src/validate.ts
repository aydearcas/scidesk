// Validation in three layers:
//   1. Shape: the published JSON Schema of each format (validate()).
//   2. Normalisation on load (record 0021, rule 1): ids that are missing get one, repeated
//      ids are renamed and U+200B without a tracked-change mark are removed (normalize()).
//   3. Rules JSON Schema cannot express, inside one file (checkDocument()) and across the
//      files of a project (checkProject()).
// ProseMirror checks its own content expressions when the editor loads a document.
import Schema from "typebox/schema";
import { newId, type IdKind } from "./ids.ts";
import { FORMATS, toPublished, type FormatName } from "./registry.ts";
import type { PMNode } from "./scidoc.ts";

export interface Issue {
  level: "error" | "warning";
  file?: string;
  path?: string;
  message: string;
}

// ------------------------------------------------------------------ 1. shape

const compiled = new Map<FormatName, ReturnType<typeof Schema.Compile>>();
const validator = (name: FormatName) => {
  let v = compiled.get(name);
  if (!v) compiled.set(name, (v = Schema.Compile(toPublished(name) as never)));
  return v;
};

type RawError = { instancePath: string; message: string };

/** Checks a value against the published schema of its format. Returns [] when it is valid. */
export function validate(name: FormatName, value: unknown, file?: string): Issue[] {
  const v = validator(name);
  if (v.Check(value)) return [];
  if (/^(scidoc|scitable|scifigure)$/.test(name)) {
    const precise = explainDocument(name, value as { doc?: unknown }, file);
    if (precise.length) return precise;
  }
  return summarise(v.Errors(value)[1] as unknown as RawError[], file);
}

function summarise(errors: RawError[], file?: string, prefix = ""): Issue[] {
  // a union reports every branch: keep the deepest errors, which say what is wrong
  const depth = (p: string) => p.split("/").length;
  const max = Math.max(...errors.map((e) => depth(e.instancePath)));
  const seen = new Set<string>();
  return errors.filter((e) => depth(e.instancePath) >= max - 1).flatMap((e) => {
    const key = `${e.instancePath} ${e.message}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ level: "error" as const, file, path: prefix + e.instancePath || "/", message: e.message }];
  }).slice(0, 20);
}

// A document is a tree of nodes discriminated by `type`: the precise error is the one of
// the deepest node that fails its own definition, or a child that its parent does not admit.
const nodeDefs = (() => {
  const defs = (toPublished("scidoc") as { $defs: Record<string, any> }).$defs;
  const byType = new Map<string, string[]>();
  for (const [defName, def] of Object.entries(defs)) {
    const t = def?.properties?.type?.const;
    if (typeof t === "string") byType.set(t, [...(byType.get(t) ?? []), defName]); // marks never share a name with a node
  }
  const allowed = (defName: string): Set<string> => {
    const out = new Set<string>();
    const collect = (s: any) => {
      if (!s || typeof s !== "object") return;
      if (typeof s.$ref === "string") {
        const ref = s.$ref.replace("#/$defs/", "");
        const d = defs[ref];
        if (d?.properties?.type?.const) out.add(d.properties.type.const);
        else collect(d);
      }
      for (const k of ["anyOf", "oneOf", "prefixItems"]) if (Array.isArray(s[k])) s[k].forEach(collect);
      if (s.items) collect(s.items);
    };
    collect(defs[defName]?.properties?.content);
    return out;
  };
  const compiledDefs = new Map<string, ReturnType<typeof Schema.Compile>>();
  const check = (defName: string) => {
    let c = compiledDefs.get(defName);
    if (!c) compiledDefs.set(defName, (c = Schema.Compile({ $defs: defs, $ref: `#/$defs/${defName}` } as never)));
    return c;
  };
  return { byType, allowed, check };
})();

function explainDocument(name: FormatName, value: { doc?: unknown }, file?: string): Issue[] {
  if (!value || typeof value !== "object" || !value.doc || typeof value.doc !== "object") return [];
  const rootDefs = name === "scitable" ? ["TablePart"] : name === "scifigure" ? ["FigurePart"] : (value as { documentType?: string }).documentType === "abstract" ? ["AbstractDoc"] : ["BodyDoc"];
  const marksOf = (node: PMNode, path: string): Issue[] | null => {
    for (const [i, m] of (Array.isArray(node.marks) ? node.marks : []).entries()) {
      const defs = nodeDefs.byType.get(m?.type);
      if (!defs) return [{ level: "error", file, path: `${path}/marks/${i}`, message: `unknown mark '${m?.type}'` }];
      const c = nodeDefs.check(defs[0]);
      if (!c.Check(m)) return summarise(c.Errors(m)[1] as unknown as RawError[], file, `${path}/marks/${i}`);
    }
    return null;
  };
  const visit = (node: PMNode, path: string, defNames: string[]): Issue[] | null => {
    const badMark = node && typeof node === "object" ? marksOf(node, path) : null;
    if (badMark) return badMark;
    const known = nodeDefs.byType.get(node?.type);
    if (!known) return [{ level: "error", file, path, message: `unknown node type '${node?.type}'` }];
    const candidates = defNames.filter((d) => known.includes(d));
    if (!candidates.length) return [{ level: "error", file, path, message: `a '${node.type}' cannot go here` }];
    const defName = candidates[0];
    const allowed = nodeDefs.allowed(defName);
    const children = Array.isArray(node.content) ? node.content : [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childPath = `${path}/content/${i}`;
      if (!allowed.has(child?.type)) {
        return [{ level: "error", file, path: childPath, message: `a '${child?.type}' cannot go inside a '${node.type}' (allowed: ${[...allowed].sort().join(", ") || "nothing"})` }];
      }
      const inner = visit(child, childPath, nodeDefs.byType.get(child.type) ?? []);
      if (inner) return inner;
    }
    const c = nodeDefs.check(defName);
    if (c.Check(node)) return null;
    return summarise(c.Errors(node)[1] as unknown as RawError[], file, path);
  };
  return visit(value.doc as PMNode, "/doc", rootDefs) ?? [];
}

export const formatOfPath = (path: string): FormatName | null => {
  const p = path.replace(/\\/g, "/");
  if (p.endsWith(".scidesk")) return "manifest";
  if (p.endsWith(".scidoc")) return "scidoc";
  if (p.endsWith(".scitable")) return "scitable";
  if (p.endsWith(".scifigure")) return "scifigure";
  if (/(^|\/)references\/library\.json$/.test(p)) return "library";
  if (/(^|\/)people\/people\.json$/.test(p)) return "people";
  if (/(^|\/)resources\/journals\/[^/]+\.json$/.test(p)) return "journal-profile";
  if (/(^|\/)articles\/[^/]+\/article\.json$/.test(p)) return "article";
  if (/(^|\/)articles\/[^/]+\/authors\.json$/.test(p)) return "authors";
  if (/(^|\/)articles\/[^/]+\/rounds\/[^/]+\/round\.json$/.test(p)) return "round";
  if (/(^|\/)articles\/[^/]+\/(rounds\/[^/]+\/)?proposals\/[^/]+\.json$/.test(p)) return "proposal-set";
  return null;
};

// ------------------------------------------------------------------ tree helpers

const SUGGESTION_MARKS = new Set(["insertion", "deletion", "modification"]);
const ZWSP = "​";

/** Id attribute kind by node type: every node listed here must have an id. */
export const ID_OF_NODE: Record<string, IdKind> = {
  paragraph: "b", heading: "b", title: "b", bulletList: "b", orderedList: "b", table: "b", blockquote: "b", pageBreak: "b",
  tableCaption: "b", figureCaption: "b", abstractSection: "b", keywords: "b",
  tableNote: "n", figureNote: "n", equation: "e", citation: "c",
  tablePart: "t", tableRef: "t", figurePart: "f", figureRef: "f",
};

export function* walk(node: PMNode, path = ""): Generator<[PMNode, string]> {
  yield [node, path];
  const children = node.content ?? [];
  for (let i = 0; i < children.length; i++) yield* walk(children[i], `${path}/content/${i}`);
}

// ------------------------------------------------------------------ 2. normalisation

/**
 * Normalises a document tree in place before validation: assigns missing ids, renames ids
 * already seen (pass the same `seen` for every file of a composite document) and removes
 * U+200B that carry no tracked-change mark. Returns what it changed.
 * tableRef/tablePart and figureRef/figurePart share their id on purpose: a part's id is
 * never renamed for matching its reference.
 */
export function normalize(doc: PMNode, seen = new Set<string>(), random?: () => number): string[] {
  const log: string[] = [];
  for (const [node, path] of walk(doc)) {
    if (node.content?.some((c) => c.type === "text" && c.text?.includes(ZWSP) && !c.marks?.some((m) => SUGGESTION_MARKS.has(m.type)))) {
      node.content = node.content.flatMap((c) => {
        if (c.type !== "text" || !c.text?.includes(ZWSP)) return [c];
        if (c.marks?.some((m) => SUGGESTION_MARKS.has(m.type))) return [c];
        const text = c.text.replaceAll(ZWSP, "");
        return text ? [{ ...c, text }] : [];
      });
      log.push(`${path}: removed U+200B without a mark`);
    }
    const kind = ID_OF_NODE[node.type];
    if (!kind) continue;
    node.attrs ??= {};
    const id = node.attrs.id as string | null | undefined;
    // a reference and its part share the id: one of each is allowed ("ref:"/"part:" keys
    // cannot clash with ids, which have no colon)
    const link = /^(tableRef|figureRef)$/.test(node.type) ? "ref:" : /^(tablePart|figurePart)$/.test(node.type) ? "part:" : null;
    if (id && link && !seen.has(link + id)) { seen.add(link + id); seen.add(id); continue; }
    if (id && !link && !seen.has(id)) { seen.add(id); continue; }
    let fresh: string;
    do fresh = newId(kind, random); while (seen.has(fresh));
    seen.add(fresh);
    node.attrs.id = fresh;
    log.push(`${path}: ${id ? `repeated id ${id}` : "missing id"} -> ${fresh}`);
  }
  return log;
}

// ------------------------------------------------------------------ 3a. one file

interface DocFile { documentType: string; doc: PMNode; changes: Record<string, unknown>; comments: Record<string, unknown> }

export function checkDocument(file: DocFile, name?: string): Issue[] {
  const issues: Issue[] = [];
  const err = (path: string, message: string) => issues.push({ level: "error", file: name, path, message });
  const warn = (path: string, message: string) => issues.push({ level: "warning", file: name, path, message });
  const ids = new Map<string, string>();
  const usedChanges = new Set<string>();
  const usedComments = new Set<string>();
  const markOf = (m: { type: string; attrs?: Record<string, unknown> }, path: string) => {
    const id = m.attrs?.id as string;
    if (SUGGESTION_MARKS.has(m.type)) {
      usedChanges.add(id);
      if (!(id in file.changes)) err(path, `tracked change ${id} is not in the changes registry`);
    }
    if (m.type === "comment") {
      usedComments.add(id);
      if (!(id in file.comments)) err(path, `comment ${id} is not in the comments registry`);
    }
  };
  for (const [node, path] of walk(file.doc)) {
    const id = node.attrs?.id as string | undefined;
    if (id && ID_OF_NODE[node.type] && node.type !== "citation") {
      if (ids.has(id)) err(path, `id ${id} repeated (also at ${ids.get(id)})`);
      else ids.set(id, path);
    }
    node.marks?.forEach((m, i) => markOf(m, `${path}/marks/${i}`));
    if (node.type === "table") checkTableGrid(node, path, err);
    if ((node.type === "tablePart" || node.type === "figurePart") && path === "" && node.attrs?.src) {
      warn(path, "a part stored in its own file has no src (it is the composite document's)");
    }
    if (node.type === "tablePart" || node.type === "figurePart") checkNotes(node, path, err, warn);
  }
  if (file.documentType !== "abstract" && file.doc.type === "doc") {
    let pastTitles = false;
    file.doc.content?.forEach((b, i) => {
      if (b.type === "title" && pastTitles) err(`/content/${i}`, "a title can only be at the start of the document");
      if (b.type !== "title") pastTitles = true;
    });
  }
  for (const id of Object.keys(file.changes)) if (!usedChanges.has(id)) warn(`/changes/${id}`, `change ${id} is not used in the document (dropped on save)`);
  for (const id of Object.keys(file.comments)) if (!usedComments.has(id)) warn(`/comments/${id}`, `comment ${id} has no anchor in the document`);
  return issues;
}

/** Every row of a table must cover the same number of columns, counting row spans. */
function checkTableGrid(table: PMNode, path: string, err: (p: string, m: string) => void) {
  const rows = table.content ?? [];
  const carry: number[] = []; // rows still covered by a rowspan, per column
  let width = -1;
  rows.forEach((row, r) => {
    let col = 0;
    const next: number[] = [];
    const advance = () => { while ((carry[col] ?? 0) > 0) { next[col] = carry[col] - 1; col++; } };
    advance();
    for (const cell of row.content ?? []) {
      const cs = (cell.attrs?.colspan as number) ?? 1;
      const rs = (cell.attrs?.rowspan as number) ?? 1;
      for (let k = 0; k < cs; k++) next[col + k] = rs - 1;
      col += cs;
      advance();
    }
    if (width < 0) width = col;
    else if (col !== width) err(`${path}/content/${r}`, `row covers ${col} columns, the first row ${width}`);
    carry.length = 0;
    next.forEach((v, i) => (carry[i] = v ?? 0));
  });
  const widths = table.attrs?.columnWidths as number[] | null | undefined;
  if (widths && width > 0 && widths.length !== width) err(path, `columnWidths has ${widths.length} values for ${width} columns`);
}

/** Note calls point to a note of the same part; a specific note is called, a general one is not. */
function checkNotes(part: PMNode, path: string, err: (p: string, m: string) => void, warn: (p: string, m: string) => void) {
  const notes = new Map<string, string>();
  for (const n of part.content ?? []) if (/Note$/.test(n.type)) notes.set(n.attrs?.id as string, n.attrs?.kind as string);
  const called = new Set<string>();
  for (const [node, p] of walk(part, path)) {
    if (node.type !== "noteRef") continue;
    const t = node.attrs?.target as string;
    if (!notes.has(t)) err(p, `note call to ${t}, which is not a note of this ${part.type === "tablePart" ? "table" : "figure"}`);
    else if (notes.get(t) === "general") warn(p, `note ${t} is general but it is called`);
    called.add(t);
  }
  for (const [id, kind] of notes) if (kind === "specific" && !called.has(id)) warn(path, `specific note ${id} is never called`);
}

// ------------------------------------------------------------------ 3b. a whole project

export const orcidChecksumOk = (orcid: string) => {
  const digits = orcid.replace(/-/g, "");
  let total = 0;
  for (const ch of digits.slice(0, -1)) total = (total + Number(ch)) * 2;
  const check = (12 - (total % 11)) % 11;
  return digits.at(-1) === (check === 10 ? "X" : String(check));
};

/**
 * Checks a project given as a map from its relative paths to the parsed JSON of each file
 * (binary files such as images: any non-JSON value, only their presence counts).
 */
export function checkProject(files: Map<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  const err = (file: string, message: string, path?: string) => issues.push({ level: "error", file, path, message });
  const get = <T>(p: string) => files.get(p) as T | undefined;

  for (const [p, value] of files) {
    const fmt = formatOfPath(p);
    if (!fmt) continue;
    const shape = validate(fmt, value, p);
    issues.push(...shape);
    if (!shape.length && /^(scidoc|scitable|scifigure)$/.test(fmt)) issues.push(...checkDocument(value as DocFile, p));
  }
  if (issues.some((i) => i.level === "error")) return issues; // cross-file rules need valid files

  const manifestPath = [...files.keys()].find((p) => !p.includes("/") && p.endsWith(".scidesk"));
  if (!manifestPath) return [{ level: "error", message: "no <name>.scidesk manifest at the root" }];
  const manifest = get<{ articles: { id: string; folder: string }[]; library: { mode: string } }>(manifestPath)!;
  const library = get<{ references: { id: string; zotero?: unknown }[] }>("references/library.json");
  const refs = new Set(library?.references.map((r) => r.id));
  if (library && refs.size !== library.references.length) err("references/library.json", "repeated reference ids");
  if (library && manifest.library.mode === "own" && library.references.some((r) => r.zotero)) err("references/library.json", "zotero blocks in a project with its own library");

  const people = get<{ affiliations: { id: string }[]; people: { id: string; kind: string; affiliations: string[]; orcid?: string; members?: string[] }[] }>("people/people.json");
  const personById = new Map(people?.people.map((x) => [x.id, x]));
  const affiliations = new Set(people?.affiliations.map((a) => a.id));
  for (const person of people?.people ?? []) {
    for (const a of person.affiliations) if (!affiliations.has(a)) err("people/people.json", `${person.id}: unknown affiliation ${a}`);
    for (const m of person.members ?? []) if (!personById.has(m)) err("people/people.json", `${person.id}: unknown member ${m}`);
    if (person.orcid && !orcidChecksumOk(person.orcid)) err("people/people.json", `${person.id}: ORCID ${person.orcid} fails its check digit`);
  }

  for (const { id, folder } of manifest.articles) {
    const base = `articles/${folder}/`;
    const article = get<{ id: string; journal: string | null }>(`${base}article.json`);
    if (!article) { err(base, "article.json missing"); continue; }
    if (article.id !== id) err(`${base}article.json`, `id ${article.id} differs from the manifest's ${id}`);
    if (article.journal && !files.has(`resources/journals/${article.journal}.json`)) err(`${base}article.json`, `journal profile ${article.journal} not in resources/journals/`);
    for (const required of ["manuscript/article.scidoc", "manuscript/abstract.scidoc", "authors.json"]) {
      if (!files.has(base + required)) err(base + required, "missing");
    }
    const authors = get<{ authors: { person: string; affiliations: string[] }[]; acknowledged?: string[] }>(`${base}authors.json`);
    for (const a of authors?.authors ?? []) {
      const person = personById.get(a.person);
      if (!person) { err(`${base}authors.json`, `unknown person ${a.person}`); continue; }
      for (const af of a.affiliations) if (!person.affiliations.includes(af)) err(`${base}authors.json`, `${a.person}: affiliation ${af} is not one of the person's`);
    }
    for (const p of authors?.acknowledged ?? []) if (!personById.has(p)) err(`${base}authors.json`, `unknown person ${p}`);

    // ids, targets and citations across the article's documents (the composite document)
    const docs = [...files.keys()].filter((p) => p.startsWith(base) && /\.(scidoc|scitable|scifigure)$/.test(p));
    const idAt = new Map<string, string>();
    const targets = new Set<string>();
    const refAt = new Map<string, string>();
    const pending: [string, string, string][] = []; // file, path, target
    for (const p of docs) {
      const d = get<DocFile>(p)!;
      for (const [node, path] of walk(d.doc)) {
        const nid = node.attrs?.id as string | undefined;
        if (nid && ID_OF_NODE[node.type] && !/^(tableRef|figureRef|tablePart|figurePart|citation)$/.test(node.type)) {
          if (idAt.has(nid)) err(p, `id ${nid} also in ${idAt.get(nid)}`, path);
          idAt.set(nid, p);
        }
        if (nid && /^(heading|equation|tablePart|figurePart)$/.test(node.type)) targets.add(nid);
        if (node.type === "xref") pending.push([p, path, node.attrs!.target as string]);
        if (node.type === "citation" && library) {
          for (const item of node.attrs!.items as { ref: string }[]) if (!refs.has(item.ref)) err(p, `citation of ${item.ref}, which is not in the library`, path);
        }
        if (node.type === "tableRef" || node.type === "figureRef") {
          if (refAt.has(nid!)) err(p, `${node.type} ${nid} repeated (a copy of a table or figure is a new one, record 0021)`, path);
          refAt.set(nid!, p);
          const src = base + (node.attrs!.src as string);
          const part = get<DocFile>(src);
          if (!part) err(p, `${node.attrs!.src} does not exist`, path);
          else if (part.doc.attrs?.id !== nid) err(p, `${node.attrs!.src} holds part ${part.doc.attrs?.id}, not ${nid}`, path);
        }
        if (node.type === "figurePart" && !files.has(base + (node.attrs!.image as string))) err(p, `image ${node.attrs!.image} does not exist`, path);
      }
    }
    for (const [p, path, t] of pending) if (!targets.has(t)) err(p, `cross-reference to ${t}, which is not a table, figure, heading or equation of the article`, path);
  }
  return issues;
}

