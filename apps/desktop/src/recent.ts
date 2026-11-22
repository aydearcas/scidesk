// The recent projects of the start screen (sheet 6, record 0048): kept in this computer's
// local store, never in a project (R26). Each project keeps a short summary of its articles
// (title, type, journal, words against the limit, review round) to show without opening it.
import type { LocalStore, Project } from "@scidesk/core";

export interface RecentArticle {
  folder: string;
  title: string;
  articleType: string;
  journal: string | null;
  words: number;
  limit: number | null;
  /** The latest review round with coauthors, if there is one. */
  round: { number: number; copies: number } | null;
}
export interface RecentProject {
  /** Where the folder is (in the browser preview, PREVIEW_PLACE). */
  path: string;
  /** The project's id (its manifest), to know a moved folder when it is found again. */
  id?: string;
  name: string;
  opened: string;
  articles: RecentArticle[];
}

const KEY = "settings/recent.json";
const MAX = 12;
/** The browser preview's only project, kept in the browser's storage. */
export const PREVIEW_PLACE = "preview:";
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export async function loadRecent(store: LocalStore): Promise<RecentProject[]> {
  try {
    const list = JSON.parse((await store.read(KEY)) ?? "[]");
    return Array.isArray(list) ? list.filter((r) => r && typeof r.path === "string" && Array.isArray(r.articles)) : [];
  } catch {
    return [];
  }
}

async function write(store: LocalStore, list: RecentProject[]) {
  await store.write(KEY, JSON.stringify(list.slice(0, MAX), null, 1));
}

/** The project first in the list, opened now; its articles' summaries kept until they are recomputed. */
export async function rememberProject(store: LocalStore, entry: Omit<RecentProject, "opened">) {
  const list = await loadRecent(store);
  const old = list.find((r) => same(r.path, entry.path));
  const articles = entry.articles.map((a) => ({ ...(old?.articles.find((o) => o.folder === a.folder) ?? {}), ...a }));
  await write(store, [{ ...entry, articles, opened: new Date().toISOString() }, ...list.filter((r) => !same(r.path, entry.path))]);
}

/** One article's summary, after the checks ran; nothing is written when it did not change. */
export async function updateRecentArticle(store: LocalStore, path: string, article: RecentArticle) {
  const list = await loadRecent(store);
  const entry = list.find((r) => same(r.path, path));
  if (!entry) return;
  const i = entry.articles.findIndex((a) => a.folder === article.folder);
  if (i >= 0 && JSON.stringify(entry.articles[i]) === JSON.stringify(article)) return;
  if (i >= 0) entry.articles[i] = article; else entry.articles.push(article);
  await write(store, list);
}

export async function forgetRecent(store: LocalStore, path: string) {
  await write(store, (await loadRecent(store)).filter((r) => !same(r.path, path)));
}

/** The review rounds of an article (rounds/<round>/round.json): how many, and the copies of the latest. */
export async function roundOf(project: Project, folder: string): Promise<RecentArticle["round"]> {
  const files = (await project.fs.list(`articles/${folder}/rounds`)).filter((p) => p.endsWith("/round.json")).sort();
  if (!files.length) return null;
  try {
    const last = JSON.parse((await project.fs.readText(files.at(-1)!)) ?? "{}");
    return { number: files.length, copies: Array.isArray(last.copies) ? last.copies.length : 0 };
  } catch {
    return { number: files.length, copies: 0 };
  }
}
