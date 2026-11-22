// Opening, creating and saving a project. Every file goes through @scidesk/formats: it is
// normalised (ids) and validated on load, and written with stable JSON.
import {
  checkProject, formatOfPath, newId, normalize, stableStringify, validate,
  type ArticleFile, type AuthorsFile, type DocumentFile, type Issue, type LibraryFile, type ManifestFile,
  type JournalProfileFile, type PMNode, type PeopleFile,
} from "@scidesk/formats";
import type { ProjectFs } from "./fs.ts";
import { articleDocs, folderName } from "./new-article.ts";
import { REUMATOLOGIA_CLINICA } from "./resources.ts";

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
  /** Journal profiles in resources/journals/, by id. */
  journals: Map<string, JournalProfileFile>;
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
  const journals = new Map<string, JournalProfileFile>();
  for (const [p, v] of files) if (/^resources\/journals\/[^/]+\.json$/.test(p)) journals.set((v as JournalProfileFile).id, v as JournalProfileFile);
  return {
    fs, manifestPath, manifest, articles, normalised, issues, journals,
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

export interface ArticleCreateOptions {
  title: string;
  lang?: string;
  articleType?: string;
  /** Other languages of the title, the abstract and the keywords. */
  translations?: string[];
  /** The target journal: its profile is copied to resources/journals/ (with its own style, if it has one). */
  journal?: JournalProfileFile | null;
  /** CSL id of the citation style; by default the journal's, or Reumatología Clínica's. */
  citationStyle?: string;
}

/** The files of a new article, by path in the project (validated before they are written). */
function articleFiles(id: string, folder: string, opts: ArticleCreateOptions): Record<string, unknown> {
  const lang = opts.lang ?? "es";
  const articleType = opts.articleType ?? "original";
  const translations = (opts.translations ?? []).filter((l) => l !== lang);
  const { body, abstract } = articleDocs({ title: opts.title, lang, translations, articleType, journal: opts.journal });
  const doc = (documentType: string, d: PMNode) => ({ schemaVersion: 1, documentType, lang, doc: d, changes: {}, comments: {} });
  const base = `articles/${folder}`;
  const style = opts.citationStyle ?? opts.journal?.citationStyle.value.id ?? REUMATOLOGIA_CLINICA;
  return {
    [`${base}/article.json`]: { schemaVersion: 1, id, articleType, lang, translations, journal: opts.journal?.id ?? null, citationStyle: { id: style }, referenceTermsLang: null, ignoredWarnings: [] },
    [`${base}/authors.json`]: { schemaVersion: 1, authors: [] },
    [`${base}/manuscript/article.scidoc`]: doc("article", body),
    [`${base}/manuscript/abstract.scidoc`]: doc("abstract", abstract),
  };
}

async function writeValidated(fs: ProjectFs, files: Record<string, unknown>) {
  for (const [p, v] of Object.entries(files)) {
    const issues = validate(formatOfPath(p)!, v, p);
    if (issues.length) throw new ProjectError("invalid template", issues);
  }
  for (const [p, v] of Object.entries(files)) await fs.write(p, stableStringify(v));
}

/**
 * A new project with one article: what the "new article" wizard creates (record 0048). The
 * journal's profile goes to resources/journals/ and its own style next to it, read with
 * `readStyle` (the bundled file of the same name).
 */
export async function createProject(fs: ProjectFs, opts: ArticleCreateOptions & {
  name: string; fileName: string; readStyle?: (file: string) => Promise<string>;
  /** Own (the default) or linked to a Zotero collection (record 0052); a linked library is filled by syncing. */
  library?: ManifestFile["library"];
}) {
  if ((await fs.list("")).length) throw new Error("the folder is not empty");
  const articleId = newId("a");
  await writeValidated(fs, {
    [`${opts.fileName}.scidesk`]: { format: "scidesk-project", schemaVersion: 1, id: crypto.randomUUID(), name: opts.name, created: now(), articles: [{ id: articleId, folder: "main" }], library: opts.library ?? { mode: "own" } },
    "references/library.json": { schemaVersion: 1, references: [] },
    "people/people.json": { schemaVersion: 1, affiliations: [], people: [] },
    ...articleFiles(articleId, "main", opts),
  });
  await writeJournal(fs, opts.journal, opts.readStyle);
  return loadProject(fs);
}

/**
 * The journal's profile in resources/journals/, and its own style next to it, read with
 * `readStyle` (the bundled file of the same name). A profile the project already has is kept
 * as it is: it may have been completed by hand or by an LLM package since.
 */
async function writeJournal(fs: ProjectFs, journal: JournalProfileFile | null | undefined, readStyle?: (file: string) => Promise<string>) {
  if (!journal) return;
  const path = `resources/journals/${journal.id}.json`;
  if ((await fs.readText(path)) === null) await writeValidated(fs, { [path]: journal });
  const own = journal.citationStyle.value.file;
  if (own && (await fs.readText(`resources/journals/${own}`)) === null) {
    if (!readStyle) throw new Error(`the journal's own style ${own} needs readStyle`);
    await fs.write(`resources/journals/${own}`, await readStyle(own.replace(/^styles\//, "")));
  }
}

/** A folder under articles/ for a new article: from its title, and not used yet ("-2", "-3"…). */
export async function articleFolder(project: Project, title: string): Promise<string> {
  const base = folderName(title);
  const taken = async (f: string) => project.manifest.articles.some((a) => a.folder.toLowerCase() === f.toLowerCase()) || (await project.fs.list(`articles/${f}`)).length > 0;
  let folder = base;
  for (let n = 2; await taken(folder); n++) folder = `${base}-${n}`;
  return folder;
}

/**
 * Another article in the same project (record 0015): its folder under articles/, with the
 * project's library and directory of people in common, and the journal's profile if the
 * project does not have it yet (record 0051). The manifest is written last, so a failure
 * leaves the project as it was. Gives the project loaded again.
 */
export async function addArticle(project: Project, opts: ArticleCreateOptions & { folder: string; readStyle?: (file: string) => Promise<string> }): Promise<Project> {
  if (project.manifest.articles.some((a) => a.folder.toLowerCase() === opts.folder.toLowerCase()) || (await project.fs.list(`articles/${opts.folder}`)).length) throw new Error(`there is already an article in articles/${opts.folder}`);
  const id = newId("a");
  const manifest = { ...project.manifest, articles: [...project.manifest.articles, { id, folder: opts.folder }] };
  await writeValidated(project.fs, articleFiles(id, opts.folder, opts));
  await writeJournal(project.fs, opts.journal, opts.readStyle);
  await writeValidated(project.fs, { [project.manifestPath]: manifest });
  return loadProject(project.fs);
}

export { now };
