// The project's own library, seen and edited (PLAN 5.6, record 0037): where each reference
// is cited, the quick search used when citing (author, year, title…, without accents or
// case), the fields of the edit form and their conversion to CSL-JSON, adding, editing and
// deleting references, and choosing an article's citation style. Files only through
// ProjectFs; the library is validated before it is written.
import { CSL_TYPES, newId, validate, type LibraryFile, type PMNode } from "@scidesk/formats";
import { identityKeys } from "./library-import.ts";
import { now, saveJson, type Project } from "./project.ts";
import { bundledStyle } from "./resources.ts";

type Csl = LibraryFile["references"][number]["csl"];
type Entry = LibraryFile["references"][number];
type Name = { family?: string; given?: string; literal?: string; "non-dropping-particle"?: string; "dropping-particle"?: string; suffix?: string };

const fold = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: unknown) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);
const yearOf = (csl: Record<string, unknown>) => (csl.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]?.[0];

// ------------------------------------------------------------------ where it is cited

export interface ReferenceUse {
  /** Article folder. */
  article: string;
  /** Path of the document relative to the article folder. */
  path: string;
  /** Id of the citation. */
  citation: string;
}

/**
 * Every citation of every reference, in all the documents of all the articles (body,
 * abstract, tables, figures, letters). `live` replaces saved documents by what is on
 * screen, keyed "<article>/<path>": a reference cited only in unsaved text is cited.
 */
export function referenceUses(project: Project, live: Record<string, PMNode> = {}): Map<string, ReferenceUse[]> {
  const uses = new Map<string, ReferenceUse[]>();
  for (const art of project.articles) {
    const docs = new Map<string, PMNode>([...art.documents].map(([p, d]) => [p, d.doc as PMNode]));
    for (const [k, doc] of Object.entries(live)) if (k.startsWith(`${art.folder}/`)) docs.set(k.slice(art.folder.length + 1), doc);
    for (const [path, doc] of docs) {
      const visit = (n: PMNode) => {
        if (n.type === "citation") {
          for (const item of (n.attrs?.items ?? []) as { ref: string }[]) {
            if (!uses.has(item.ref)) uses.set(item.ref, []);
            uses.get(item.ref)!.push({ article: art.folder, path, citation: String(n.attrs?.id) });
          }
        }
        n.content?.forEach(visit);
      };
      visit(doc);
    }
  }
  return uses;
}

// ------------------------------------------------------------------ how it is shown

const nameText = (n: Name) => n.literal ?? [n["non-dropping-particle"], n.family].filter(Boolean).join(" ");

export interface ReferenceSummary {
  /** "Alonso, Benítez" / "Alonso et al." / "WHO". */
  authors: string;
  year?: number;
  title: string;
  container?: string;
  /** One line: "Alonso, Benítez · 2025 · Una cohorte… · Reumatol Clin". */
  line: string;
}

export function summarize(csl: Record<string, unknown>): ReferenceSummary {
  const names = ((csl.author ?? csl.editor ?? []) as Name[]).map(nameText).filter(Boolean);
  const authors = names.length > 2 ? `${names[0]} et al.` : names.join(", ");
  const year = yearOf(csl);
  const title = String(csl.title ?? "").trim();
  const container = String(csl["container-title-short"] ?? csl["container-title"] ?? csl.publisher ?? "").trim() || undefined;
  return { authors, year, title, container, line: [authors || "—", year ?? "s. f.", title || "—", container].filter(Boolean).join(" · ") };
}

// ------------------------------------------------------------------ quick search

export interface SearchHit { entry: Entry; score: number }

/**
 * The quick search when citing (PLAN 5.6): every word typed must be found in the authors,
 * the year, the title, the journal, the DOI or the PMID, ignoring accents and case. A word
 * that starts an author's surname or is the year weighs most; then the start of a title
 * word; then any other match. Ties go to the earliest first author and year.
 */
export function searchLibrary(library: LibraryFile, query: string, limit = 50): SearchHit[] {
  const terms = words(query);
  const hits: SearchHit[] = [];
  for (const entry of library.references) {
    const c = entry.csl as Record<string, unknown>;
    if (!terms.length) { hits.push({ entry, score: 0 }); continue; }
    const authorWords = ((c.author ?? c.editor ?? []) as Name[]).flatMap((n) => words([nameText(n), n.given].join(" ")));
    const surnames = ((c.author ?? c.editor ?? []) as Name[]).flatMap((n) => words(nameText(n)));
    const year = String(yearOf(c) ?? "");
    const titleWords = words(`${c.title ?? ""} ${c["title-short"] ?? ""}`);
    const rest = fold([c["container-title"], c["container-title-short"], c.DOI, c.PMID, c.publisher, c.ISBN].filter(Boolean).join(" "));
    let score = 0;
    let all = true;
    for (const t of terms) {
      const s = surnames.some((w) => w.startsWith(t)) ? 4
        : year && t === year ? 4
        : authorWords.some((w) => w.startsWith(t)) ? 3
        : titleWords.some((w) => w.startsWith(t)) ? 2
        : titleWords.some((w) => w.includes(t)) || rest.includes(t) || (t.length >= 3 && year.startsWith(t)) ? 1 : 0;
      if (!s) { all = false; break; }
      score += s;
    }
    if (all) hits.push({ entry, score });
  }
  const key = (e: Entry) => `${words(summarize(e.csl).authors)[0] ?? "~"} ${yearOf(e.csl as never) ?? 9999}`;
  return hits.sort((a, b) => b.score - a.score || key(a.entry).localeCompare(key(b.entry))).slice(0, limit);
}

// ------------------------------------------------------------------ the edit form

/** The types offered in the form (any other CSL type is kept as it is). */
export const FORM_TYPES = ["article-journal", "book", "chapter", "report", "paper-conference", "thesis", "webpage", "dataset", "article"] as const;

/** What the edit form shows: plain strings, one author per line. */
export interface ReferenceFields {
  type: string;
  /** One person per line, "Family, Given"; a line without a comma is a group author. */
  authors: string;
  editors: string;
  title: string;
  container: string;
  containerShort: string;
  /** "2025" or "2025-03" or "2025-03-12". */
  issued: string;
  volume: string;
  issue: string;
  page: string;
  publisher: string;
  publisherPlace: string;
  edition: string;
  DOI: string;
  PMID: string;
  URL: string;
  ISBN: string;
  accessed: string;
}

const nameLine = (n: Name) => n.literal ?? [nameText(n), [n.given, n.suffix].filter(Boolean).join(" ")].filter(Boolean).join(", ");
const dateText = (d: unknown) => {
  const parts = (d as { "date-parts"?: number[][]; raw?: string; literal?: string } | undefined);
  const p = parts?.["date-parts"]?.[0];
  if (p) return p.map((x, i) => (i ? String(x).padStart(2, "0") : String(x))).join("-");
  return parts?.literal ?? parts?.raw ?? "";
};
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

export function referenceFields(csl: Record<string, unknown>): ReferenceFields {
  return {
    type: String(csl.type),
    authors: ((csl.author ?? []) as Name[]).map(nameLine).join("\n"),
    editors: ((csl.editor ?? []) as Name[]).map(nameLine).join("\n"),
    title: str(csl.title), container: str(csl["container-title"]), containerShort: str(csl["container-title-short"]),
    issued: dateText(csl.issued), volume: str(csl.volume), issue: str(csl.issue), page: str(csl.page),
    publisher: str(csl.publisher), publisherPlace: str(csl["publisher-place"]), edition: str(csl.edition),
    DOI: str(csl.DOI), PMID: str(csl.PMID), URL: str(csl.URL), ISBN: str(csl.ISBN), accessed: dateText(csl.accessed),
  };
}

/** Lines of names -> CSL names; a line that is unchanged keeps its original name (particles…). */
function parseNames(text: string, before: Name[] = []): Name[] {
  const old = new Map(before.map((n) => [nameLine(n), n]));
  return text.split(/\n|;/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean).map((l) => {
    if (old.has(l)) return old.get(l)!;
    const i = l.indexOf(",");
    if (i < 0) return { literal: l };
    const family = l.slice(0, i).trim(), given = l.slice(i + 1).trim();
    return given ? { family, given } : { family };
  });
}

export class FieldError extends Error {
  readonly field: keyof ReferenceFields;
  constructor(field: keyof ReferenceFields, message: string) { super(message); this.field = field; }
}

function parseDate(field: "issued" | "accessed", text: string): Record<string, unknown> | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const m = /^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?$/.exec(t);
  if (!m) {
    if (field === "issued" && /^(en prensa|in press|s\. ?f\.|n\.d\.)$/i.test(t)) return { literal: t };
    throw new FieldError(field, `${t}: use a year, year-month or year-month-day (2025, 2025-03, 2025-03-12)`);
  }
  const parts = [m[1], m[2], m[3]].filter(Boolean).map(Number);
  if ((parts[1] && (parts[1] < 1 || parts[1] > 12)) || (parts[2] && (parts[2] < 1 || parts[2] > 31))) throw new FieldError(field, `${t}: not a date`);
  return { "date-parts": [parts] };
}

/**
 * The form's fields applied to a CSL item: the variables the form shows are replaced (an
 * empty field removes it), every other variable of the item is kept.
 */
export function applyReferenceFields(csl: Record<string, unknown>, f: ReferenceFields): Csl {
  if (!(CSL_TYPES as readonly string[]).includes(f.type)) throw new FieldError("type", `${f.type} is not a CSL type`);
  const out: Record<string, unknown> = { ...csl, type: f.type };
  const set = (k: string, v: unknown) => { if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) delete out[k]; else out[k] = v; };
  set("author", parseNames(f.authors, csl.author as Name[]));
  set("editor", parseNames(f.editors, csl.editor as Name[]));
  set("title", f.title.trim());
  set("container-title", f.container.trim());
  set("container-title-short", f.containerShort.trim());
  const issued = parseDate("issued", f.issued);
  // an unchanged date keeps what the form does not show (season, a range…)
  set("issued", f.issued.trim() === dateText(csl.issued) ? csl.issued : issued);
  set("accessed", f.accessed.trim() === dateText(csl.accessed) ? csl.accessed : parseDate("accessed", f.accessed));
  for (const [k, v] of [["volume", f.volume], ["issue", f.issue], ["page", f.page], ["publisher", f.publisher], ["publisher-place", f.publisherPlace], ["edition", f.edition], ["URL", f.URL], ["ISBN", f.ISBN]] as const) set(k, v.trim());
  const doi = f.DOI.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) throw new FieldError("DOI", `${doi}: a DOI starts with 10. and has a slash (10.1136/ard-2023-000001)`);
  set("DOI", doi);
  const pmid = f.PMID.trim();
  if (pmid && !/^\d{1,9}$/.test(pmid)) throw new FieldError("PMID", `${pmid}: a PMID is a number`);
  set("PMID", pmid);
  if (!out.title && !out.author && !out["container-title"]) throw new FieldError("title", "a reference needs at least a title or an author");
  return out as Csl;
}

export const emptyFields = (): ReferenceFields => ({ ...referenceFields({ type: "article-journal" }) });

// ------------------------------------------------------------------ adding, editing, deleting

/** Why the library refused a change, for the window to say it in the user's language. */
export class LibraryError extends Error {
  readonly code: "duplicate" | "cited";
  /** The other reference's one-line summary, or how many times it is cited. */
  readonly detail: string;
  constructor(code: LibraryError["code"], detail: string, message: string) { super(message); this.code = code; this.detail = detail; }
}

function ensureOwn(project: Project) {
  if (project.manifest.library.mode !== "own") throw new Error("this project's library is Zotero: references are edited in Zotero");
}

async function writeLibrary(project: Project, library: LibraryFile) {
  await saveJson(project, "references/library.json", library);
  project.library = library;
}

/** The reference that is the same work as `csl` (DOI, PMID or first author, year and title), other than `except`. */
export function duplicateOf(library: LibraryFile, csl: Record<string, unknown>, except?: string): Entry | undefined {
  const keys = new Set(identityKeys(csl));
  return library.references.find((r) => r.id !== except && identityKeys(r.csl as never).some((k) => keys.has(k)));
}

function checked(entry: Entry) {
  const issues = validate("library", { schemaVersion: 1, references: [entry] });
  if (issues.length) throw new Error(`the reference is not valid: ${issues[0].path} ${issues[0].message}`);
}

/** Adds a reference written by hand. A duplicate is not added (record 0035). */
export async function addReference(project: Project, csl: Csl): Promise<Entry> {
  ensureOwn(project);
  const dup = duplicateOf(project.library, csl as never);
  if (dup) throw new LibraryError("duplicate", summarize(dup.csl as never).line, `already in the library: ${summarize(dup.csl as never).line}`);
  const date = now();
  const entry: Entry = { id: newId("r"), csl, added: date, source: { kind: "manual", date } };
  checked(entry);
  await writeLibrary(project, { ...project.library, references: [...project.library.references, entry] });
  return entry;
}

/** Replaces the CSL of a reference; where it came from (`source`, `zotero`) is kept. */
export async function updateReference(project: Project, id: string, csl: Csl): Promise<Entry> {
  ensureOwn(project);
  const old = project.library.references.find((r) => r.id === id);
  if (!old) throw new Error(`no reference ${id}`);
  const dup = duplicateOf(project.library, csl as never, id);
  if (dup) throw new LibraryError("duplicate", summarize(dup.csl as never).line, `it would be the same work as another reference: ${summarize(dup.csl as never).line}`);
  const entry = { ...old, csl };
  checked(entry);
  await writeLibrary(project, { ...project.library, references: project.library.references.map((r) => (r.id === id ? entry : r)) });
  return entry;
}

/** Deletes a reference that is not cited anywhere (a cited one would break its citations). */
export async function deleteReference(project: Project, id: string, live: Record<string, PMNode> = {}) {
  ensureOwn(project);
  if (!project.library.references.some((r) => r.id === id)) throw new Error(`no reference ${id}`);
  const n = referenceUses(project, live).get(id)?.length ?? 0;
  if (n) throw new LibraryError("cited", String(n), `the reference is cited ${n} time(s): remove those citations first`);
  await writeLibrary(project, { ...project.library, references: project.library.references.filter((r) => r.id !== id) });
}

// ------------------------------------------------------------------ the article's style

/** Chooses one of the bundled styles for an article (PLAN 5.6, "change style at once"). */
export async function setCitationStyle(project: Project, folder: string, styleId: string) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  if (!bundledStyle(styleId)) throw new Error(`style ${styleId} is not included with SciDesk`);
  const article = { ...art.article, citationStyle: { id: styleId } };
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}
