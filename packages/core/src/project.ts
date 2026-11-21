// Opening, creating and saving a project. Every file goes through @scidesk/formats: it is
// normalised (ids) and validated on load, and written with stable JSON.
import {
  checkProject, formatOfPath, newId, normalize, stableStringify, validate,
  type ArticleFile, type AuthorsFile, type DocumentFile, type Issue, type LibraryFile, type ManifestFile,
  type PMNode, type PeopleFile,
} from "@scidesk/formats";
import type { ProjectFs } from "./fs.ts";

export interface ArticleData {
  folder: string;
  article: ArticleFile;
  authors: AuthorsFile;
  /** Every document of the article by its path relative to the article folder. */
  documents: Map<string, DocumentFile>;
}

export interface Project {
  fs: ProjectFs;
  manifestPath: string;
  manifest: ManifestFile;
  library: LibraryFile;
  people: PeopleFile;
  articles: ArticleData[];
  /** What the load had to fix (missing or repeated ids) and what the checks found. */
  normalised: string[];
  issues: Issue[];
}

const JSON_FILE = /\.(json|scidesk|scidoc|scitable|scifigure)$/;

export class ProjectError extends Error {
  readonly issues: Issue[];
  constructor(message: string, issues: Issue[]) {
    super(`${message}\n${issues.slice(0, 10).map((i) => `  ${i.file ?? ""} ${i.path ?? ""}: ${i.message}`).join("\n")}`);
    this.issues = issues;
  }
}

/** Loads a project: normalises every document, then validates each file and the whole. */
export async function loadProject(fs: ProjectFs): Promise<Project> {
  const paths = (await fs.list("")).filter((p) => !p.startsWith(".scidesk/") && !p.includes("/exports/"));
  const files = new Map<string, unknown>();
  const normalised: string[] = [];
  const seenByArticle = new Map<string, Set<string>>();
  for (const p of paths) {
    if (!JSON_FILE.test(p)) { files.set(p, "(binary)"); continue; }
    const text = await fs.readText(p);
    let value: any;
    try { value = JSON.parse(text!); } catch { throw new ProjectError("not JSON", [{ level: "error", file: p, message: "the file is not valid JSON" }]); }
    if (/\.(scidoc|scitable|scifigure)$/.test(p) && value?.doc) {
      // rule 1 of record 0021: ids are checked across the composite document of each article
      const article = /^articles\/([^/]+)\//.exec(p)?.[1] ?? "";
      if (!seenByArticle.has(article)) seenByArticle.set(article, new Set());
      normalised.push(...normalize(value.doc as PMNode, seenByArticle.get(article)).map((l) => `${p}${l}`));
    }
    files.set(p, value);
  }
  const issues = checkProject(files);
  if (issues.some((i) => i.level === "error")) throw new ProjectError("the project has errors", issues.filter((i) => i.level === "error"));
  const manifestPath = paths.find((p) => !p.includes("/") && p.endsWith(".scidesk"))!;
  const manifest = files.get(manifestPath) as ManifestFile;
  const articles: ArticleData[] = manifest.articles.map(({ folder }) => {
    const base = `articles/${folder}/`;
    const documents = new Map<string, DocumentFile>();
    for (const [p, v] of files) if (p.startsWith(base) && /\.(scidoc|scitable|scifigure)$/.test(p)) documents.set(p.slice(base.length), v as DocumentFile);
    return { folder, article: files.get(base + "article.json") as ArticleFile, authors: files.get(base + "authors.json") as AuthorsFile, documents };
  });
  return {
    fs, manifestPath, manifest, articles, normalised, issues,
    library: (files.get("references/library.json") as LibraryFile) ?? { schemaVersion: 1, references: [] },
    people: (files.get("people/people.json") as PeopleFile) ?? { schemaVersion: 1, affiliations: [], people: [] },
  };
}

/** Writes one document: unused change and comment entries are dropped (record 0020). */
export async function saveDocument(project: Project, article: ArticleData, path: string, file: DocumentFile) {
  const used = new Set<string>();
  const visit = (n: PMNode) => { n.marks?.forEach((m) => m.attrs?.id && used.add(m.attrs.id as string)); n.content?.forEach(visit); };
  visit(file.doc as PMNode);
  const clean = {
    ...file,
    changes: Object.fromEntries(Object.entries(file.changes).filter(([id]) => used.has(id))),
    comments: Object.fromEntries(Object.entries(file.comments).filter(([id]) => used.has(id))),
  } as DocumentFile;
  const full = `articles/${article.folder}/${path}`;
  const issues = validate(formatOfPath(full)!, clean, full);
  if (issues.length) throw new ProjectError(`refusing to write an invalid ${path}`, issues);
  await project.fs.write(full, stableStringify(clean));
  article.documents.set(path, clean);
}

export async function saveJson(project: Project, path: string, value: unknown) {
  const fmt = formatOfPath(path);
  const issues = fmt ? validate(fmt, value, path) : [];
  if (issues.length) throw new ProjectError(`refusing to write an invalid ${path}`, issues);
  await project.fs.write(path, stableStringify(value));
}

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const paragraph = (text: string, lang: string | null = null): PMNode => ({ type: "paragraph", attrs: { id: newId("b"), lang }, content: text ? [{ type: "text", text }] : undefined });

/** A new project with one article: what the "new article" wizard creates (IMRaD, minimal). */
export async function createProject(fs: ProjectFs, opts: { name: string; fileName: string; title: string; lang?: string }) {
  if ((await fs.list("")).length) throw new Error("the folder is not empty");
  const lang = opts.lang ?? "es";
  const articleId = newId("a");
  const headings = lang === "es"
    ? [["Introducción", "introduction"], ["Métodos", "methods"], ["Resultados", "results"], ["Discusión", "discussion"], ["Bibliografía", "references"]]
    : [["Introduction", "introduction"], ["Methods", "methods"], ["Results", "results"], ["Discussion", "discussion"], ["References", "references"]];
  const body: PMNode[] = [{ type: "title", attrs: { id: newId("b"), lang }, content: [{ type: "text", text: opts.title }] }];
  for (const [text, role] of headings) {
    body.push({ type: "heading", attrs: { id: newId("b"), level: 1, role, lang: null }, content: [{ type: "text", text }] });
    if (role !== "references") body.push(paragraph(""));
  }
  const doc = (documentType: string, content: PMNode[]) => ({ schemaVersion: 1, documentType, lang, doc: { type: "doc", content }, changes: {}, comments: {} });
  const files: Record<string, unknown> = {
    [`${opts.fileName}.scidesk`]: { format: "scidesk-project", schemaVersion: 1, id: crypto.randomUUID(), name: opts.name, created: now(), articles: [{ id: articleId, folder: "main" }], library: { mode: "own" } },
    "references/library.json": { schemaVersion: 1, references: [] },
    "people/people.json": { schemaVersion: 1, affiliations: [], people: [] },
    "articles/main/article.json": { schemaVersion: 1, id: articleId, articleType: "original", lang, translations: [], journal: null, citationStyle: { id: "http://www.zotero.org/styles/reumatologia-clinica-scidesk-prototype" }, referenceTermsLang: null, ignoredWarnings: [] },
    "articles/main/authors.json": { schemaVersion: 1, authors: [] },
    "articles/main/manuscript/article.scidoc": doc("article", body),
    "articles/main/manuscript/abstract.scidoc": doc("abstract", [{ type: "abstractSection", attrs: { id: newId("b"), lang }, content: [paragraph("")] }]),
  };
  for (const [p, v] of Object.entries(files)) {
    const fmt = formatOfPath(p)!;
    const issues = validate(fmt, v, p);
    if (issues.length) throw new ProjectError("invalid template", issues);
    await fs.write(p, stableStringify(v));
  }
  return loadProject(fs);
}

export { now };
