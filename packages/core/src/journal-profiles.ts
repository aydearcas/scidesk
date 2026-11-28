// Journal profiles kept on this computer (PLAN 5.9, record 0105). The profiles the user
// creates, edits or keeps live in the app's local data folder (journals/<id>.json, next to
// the settings and the recent projects), to be reused in other projects; each project keeps
// its own copy in resources/journals/, which travels with it. Editing a profile never
// changes a project's copy by itself: the project offers to update it.
import { stableStringify, validate, type Issue, type JournalProfileFile } from "@scidesk/formats";
import { sameJson } from "./compose.ts";
import { JOURNAL_CATALOG, type CatalogJournal } from "./new-article.ts";
import { saveJson, type Project } from "./project.ts";
import type { LocalStore } from "./recovery.ts";
import { bundledStyle, REUMATOLOGIA_CLINICA } from "./resources.ts";

const PREFIX = "journals/";
const keyOf = (id: string) => `${PREFIX}${id}.json`;
const guideKey = (id: string) => `${PREFIX}${id}.guide.txt`;
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

/** What is wrong with a profile, as the schema says (the form shows it and does not save). */
export const profileIssues = (profile: unknown): Issue[] => validate("journal-profile", profile, "profile");

/** The profiles of this computer, by title; a file that is not a valid profile is left out. */
export async function storedProfiles(store: LocalStore): Promise<JournalProfileFile[]> {
  const out: JournalProfileFile[] = [];
  for (const key of await store.list(PREFIX)) {
    if (!/^journals\/[a-z0-9-]+\.json$/.test(key)) continue;
    try {
      const p = JSON.parse((await store.read(key)) ?? "null");
      if (p && profileIssues(p).length === 0) out.push(p);
    } catch { /* not JSON: ignored */ }
  }
  return out.sort((a, b) => a.journal.title.value.localeCompare(b.journal.title.value));
}

export async function storedProfile(store: LocalStore, id: string): Promise<JournalProfileFile | null> {
  try {
    const p = JSON.parse((await store.read(keyOf(id))) ?? "null");
    return p && profileIssues(p).length === 0 ? p : null;
  } catch { return null; }
}

/** Saves a profile on this computer with the time it was saved; an invalid one is refused. */
export async function saveStoredProfile(store: LocalStore, profile: JournalProfileFile): Promise<JournalProfileFile> {
  const saved = { ...profile, updated: now() };
  const issues = profileIssues(saved);
  if (issues.length) throw new Error(`invalid journal profile: ${issues[0].path ?? ""} ${issues[0].message}`);
  await store.write(keyOf(saved.id), stableStringify(saved));
  return saved;
}

export async function forgetStoredProfile(store: LocalStore, id: string) {
  await store.remove(keyOf(id));
  await store.remove(guideKey(id));
}

/** The text of the author guide the user pasted next to the form (only on this computer, never in the project). */
export async function storedGuide(store: LocalStore, id: string): Promise<string> {
  return (await store.read(guideKey(id))) ?? "";
}
export async function saveStoredGuide(store: LocalStore, id: string, text: string) {
  if (text.trim()) await store.write(guideKey(id), text);
  else await store.remove(guideKey(id));
}

// ---------------------------------------------------------------- the journals SciDesk knows

export type JournalOrigin = "mine" | "bundled" | "style-only";

export interface KnownJournal extends CatalogJournal {
  /** mine: a profile of this computer; bundled: SciDesk's; style-only: only its citation style. */
  origin: JournalOrigin;
  /** A profile of this computer (it wins over SciDesk's of the same id). */
  stored?: JournalProfileFile;
}

/** The profiles of this computer, then SciDesk's catalogue without the ones they replace. */
export function knownJournals(stored: JournalProfileFile[], catalog: CatalogJournal[] = JOURNAL_CATALOG): KnownJournal[] {
  const mine: KnownJournal[] = stored.map((p) => {
    const entry = catalog.find((c) => c.id === p.id);
    return {
      id: p.id, title: p.journal.title.value, publisher: p.journal.publisher?.value ?? entry?.publisher,
      styleId: p.citationStyle.value.id, areas: p.areas ?? entry?.areas ?? [], origin: "mine", stored: p,
    };
  });
  const ids = new Set(mine.map((m) => m.id));
  return [...mine, ...catalog.filter((c) => !ids.has(c.id)).map((c) => ({ ...c, origin: (c.profile ? "bundled" : "style-only") as JournalOrigin }))];
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** Known journals whose name or publisher has every word of the query (without accents). */
export function searchKnownJournals(journals: KnownJournal[], query: string): KnownJournal[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return journals.filter((j) => words.every((w) => fold(`${j.title} ${j.publisher ?? ""}`).includes(w)));
}

/** An id for a profile from the journal's title, not used yet: "Journal of Rheumatology" → "journal-of-rheumatology". */
export function profileIdFor(title: string, taken: Iterable<string> = []): string {
  const base = fold(title).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "") || "revista";
  const used = new Set(taken);
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  return id;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * A new profile with what is known so far: the journal's name, its author guide (read today)
 * and, from a journal of the catalogue, its citation style and areas. Everything else is
 * filled in the form.
 */
export function newProfile(opts: { title: string; guideUrl?: string; lang?: string; id?: string; from?: CatalogJournal; taken?: Iterable<string> }): JournalProfileFile {
  const lang = opts.lang ?? "es";
  const styleId = opts.from?.styleId ?? REUMATOLOGIA_CLINICA;
  const url = opts.guideUrl?.trim() || "https://example.org/";
  return {
    schemaVersion: 1,
    id: opts.id ?? opts.from?.id ?? profileIdFor(opts.title, opts.taken),
    ...(opts.from?.areas.length ? { areas: [...opts.from.areas] } : {}),
    sources: [{ id: "guide", kind: "author-guide", url, accessed: today() }],
    journal: {
      title: { value: opts.title.trim(), source: "guide" },
      ...(opts.from?.publisher ? { publisher: { value: opts.from.publisher, source: "guide" } } : {}),
    },
    citationStyle: { value: { id: styleId }, source: "guide" },
    languages: { value: { manuscript: [lang] }, source: "guide" },
    articleTypes: [],
  };
}

/** A copy of a profile under another id (to make one's own from SciDesk's or another): the same data, a new id. */
export function copyProfile(profile: JournalProfileFile, title: string, taken: Iterable<string>): JournalProfileFile {
  const copy: JournalProfileFile = structuredClone(profile);
  copy.id = profileIdFor(title, taken);
  copy.journal.title = { ...copy.journal.title, value: title };
  delete copy.updated;
  return copy;
}

// ---------------------------------------------------------------- age of the data

/** The date the author guide was read (the oldest when there are several). */
export function guideRead(profile: JournalProfileFile): string | null {
  const dates = profile.sources.filter((s) => s.kind === "author-guide").map((s) => s.accessed).sort();
  return dates[0] ?? profile.sources[0]?.accessed ?? null;
}

/** PLAN 5.9, point 6: the guide was read more than a year ago. */
export function profileIsOld(profile: JournalProfileFile, on: string = today()): boolean {
  const read = guideRead(profile);
  if (!read) return false;
  const limit = new Date(`${on}T00:00:00Z`);
  limit.setUTCFullYear(limit.getUTCFullYear() - 1);
  return new Date(`${read}T00:00:00Z`) < limit;
}

// ---------------------------------------------------------------- a project's copy

/**
 * How a project's copy stands against the profile of this computer: the same data; this
 * computer's is newer (the project offers to update its copy); the project's is newer (it
 * came from another computer or a co-author: it can be kept here); different without dates
 * to tell; or not on this computer.
 */
export type CopyState = "same" | "computer-newer" | "project-newer" | "differs" | "not-stored";

const withoutDate = (p: JournalProfileFile) => { const { updated: _, ...rest } = p; return rest; };

export function copyState(projectCopy: JournalProfileFile, stored: JournalProfileFile | null | undefined): CopyState {
  if (!stored) return "not-stored";
  if (sameJson(withoutDate(projectCopy), withoutDate(stored))) return "same";
  const a = projectCopy.updated, b = stored.updated;
  if (a && b && a !== b) return a < b ? "computer-newer" : "project-newer";
  if (b && !a) return "computer-newer";
  if (a && !b) return "project-newer";
  return "differs";
}

/**
 * Writes a profile as the project's copy, replacing the one it had (its own style is copied
 * next to it when it is missing, read with `readStyle`).
 */
export async function writeProjectJournal(project: Project, profile: JournalProfileFile, readStyle?: (file: string) => Promise<string>) {
  await saveJson(project, `resources/journals/${profile.id}.json`, profile);
  const own = profile.citationStyle.value.file;
  if (own && (await project.fs.readText(`resources/journals/${own}`)) === null) {
    if (!readStyle) throw new Error(`the journal's own style ${own} needs readStyle`);
    await project.fs.write(`resources/journals/${own}`, await readStyle(own.replace(/^styles\//, "")));
  }
  project.journals.set(profile.id, profile);
}

export interface JournalChange {
  /** The citation style changed to the journal's. */
  styleChanged: boolean;
  previous: string | null;
}

/**
 * Makes `profile` the target journal of an article: its copy goes to resources/journals/
 * (replacing an older one of the same id), and the article's citation style becomes the
 * journal's when it was the previous journal's (or the article had none); a style the user
 * chose stays. Nothing of the text changes: what the new journal asks is for the checks and
 * the exports (the adaptation module, PLAN 5.9, comes next).
 */
export async function setArticleJournal(project: Project, folder: string, profile: JournalProfileFile | null, readStyle?: (file: string) => Promise<string>): Promise<JournalChange> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const previous = art.article.journal;
  const oldStyle = previous ? project.journals.get(previous)?.citationStyle.value.id : undefined;
  if (profile) await writeProjectJournal(project, profile, readStyle);
  const style = profile?.citationStyle.value.id;
  const follow = !!style && bundledStyle(style) !== undefined && art.article.citationStyle.id !== style && (!previous || art.article.citationStyle.id === oldStyle);
  const article = { ...art.article, journal: profile?.id ?? null, ...(follow ? { citationStyle: { id: style! } } : {}) };
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
  return { styleChanged: follow, previous };
}

/** The articles of a project whose target journal is `id`. */
export const articlesWithJournal = (project: Project, id: string) => project.articles.filter((a) => a.article.journal === id).map((a) => a.folder);
