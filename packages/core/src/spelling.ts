// Spelling outside the editor (record 0061): the words of an article the checker does not
// recognise, with the same rules as the editor's underlines (words of letters, no acronyms,
// the language of each fragment, never deleted text), the project dictionary and the words
// ignored in this article. The dictionaries come from outside (the worker in the window,
// @scidesk/spell/node on the command line), as for the language marks (record 0060).
import { PROJECT_LAYOUT, type PMNode } from "@scidesk/formats";
import { parseDictionary, wordsIn } from "@scidesk/spell";
import { saveJson, type Project } from "./project.ts";
import type { LangCheck } from "./lang.ts";

export interface SpellingIssue {
  word: string;
  lang: string;
  count: number;
  /** Where it is: the file in the article and the block id. */
  places: { path: string; block: string | null }[];
}
export interface SpellingReport {
  /** Words looked at (with repeats). */
  words: number;
  /** Languages without a dictionary, whose words were not looked at. */
  unchecked: string[];
  issues: SpellingIssue[];
}

/** A word that a list accepts: as it is, or in lower case when it starts a sentence (Hunspell's rule). */
export const inWordList = (list: Set<string>, word: string) => list.has(word) || (/^\p{Lu}\p{Ll}*$/u.test(word) && list.has(word.toLowerCase()));

/** The words of every textblock of a tree, with their language. */
function wordsOfTree(doc: PMNode, around: string, out: { word: string; lang: string; block: string | null }[]) {
  const visit = (n: PMNode, here: string) => {
    const lang = (n.attrs?.lang as string | null | undefined) ?? here;
    // a textblock: only text and atoms inside (a figure's image is an atom next to blocks)
    if (n.type !== "text" && n.content?.length && n.content.every((c) => c.type === "text" || !c.content) && n.content.some((c) => c.type === "text")) {
      // a textblock: its text with atoms and deleted text as spaces, as the editor reads it
      let text = "";
      const segs: { at: number; lang: string | null }[] = [];
      for (const c of n.content) {
        const deleted = c.marks?.some((m) => m.type === "deletion") ?? false;
        const own = c.marks?.find((m) => m.type === "lang")?.attrs?.lang as string | undefined;
        segs.push({ at: text.length, lang: deleted ? null : own ?? lang });
        text += c.type === "text" && !deleted ? c.text ?? "" : " ";
      }
      for (const w of wordsIn(text)) {
        const seg = [...segs].reverse().find((s) => s.at <= w.index);
        if (seg?.lang) out.push({ word: w.word, lang: seg.lang, block: (n.attrs?.id as string | undefined) ?? null });
      }
      return;
    }
    n.content?.forEach((c) => visit(c, lang));
  };
  visit(doc, around);
}

/**
 * The words of an article the dictionaries do not know. `live` replaces saved documents by
 * what is on screen (paths in the article). The bibliography is generated from the library
 * and is not looked at.
 */
export async function spellingReport(project: Project, folder: string, check: LangCheck, live: Record<string, PMNode> = {}): Promise<SpellingReport> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const accepted = new Set([...parseDictionary(await project.fs.readText(PROJECT_LAYOUT.dictionary).catch(() => null)), ...(art.article.ignoredWords ?? [])]);
  const found: { word: string; lang: string; block: string | null; path: string }[] = [];
  const docs = new Map<string, PMNode>([...art.documents].map(([p, d]) => [p, d.doc as PMNode]));
  for (const [p, d] of Object.entries(live)) docs.set(p, d);
  for (const [path, doc] of docs) {
    const out: { word: string; lang: string; block: string | null }[] = [];
    wordsOfTree(doc, art.article.lang, out);
    for (const w of out) found.push({ ...w, path });
  }
  // one call per language, each word once; the parts of a hyphenated word too, because the
  // editor's dictionaries hold the project's words and accept them as parts (Herrera-Gil)
  const parts = (w: string) => (/['’-]/.test(w) ? w.split(/['’-]/).filter(Boolean) : []);
  const byLang = new Map<string, Set<string>>();
  for (const f of found) {
    if (inWordList(accepted, f.word)) continue;
    if (!byLang.has(f.lang)) byLang.set(f.lang, new Set());
    for (const w of [f.word, ...parts(f.word)]) if (!inWordList(accepted, w)) byLang.get(f.lang)!.add(w);
  }
  const known = new Map<string, Map<string, boolean> | null>();
  for (const [lang, set] of byLang) {
    const list = [...set];
    const ok = await check(lang, list);
    known.set(lang, ok ? new Map(list.map((w, i) => [w, ok[i]])) : null);
  }
  const issues = new Map<string, SpellingIssue>();
  for (const f of found) {
    const answers = known.get(f.lang);
    if (!answers || answers.get(f.word) !== false) continue;
    // hyphenated: right if every part is in the project's list or the dictionary
    const ps = parts(f.word);
    if (ps.length && ps.every((p) => inWordList(accepted, p) || answers.get(p))) continue;
    const key = `${f.lang}\u0000${f.word}`;
    const i = issues.get(key) ?? { word: f.word, lang: f.lang, count: 0, places: [] };
    i.count++;
    i.places.push({ path: f.path, block: f.block });
    issues.set(key, i);
  }
  return {
    words: found.length,
    unchecked: [...known].filter(([, v]) => v === null).map(([k]) => k),
    issues: [...issues.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, a.lang)),
  };
}

/** Record 0061: a word the checker stops underlining in this article ("Ignore"). */
export async function ignoreWord(project: Project, folder: string, word: string) {
  await setIgnoredWords(project, folder, (list) => [...list.filter((w) => w !== word), word]);
}
/** The word is underlined again. */
export async function unignoreWord(project: Project, folder: string, word: string) {
  await setIgnoredWords(project, folder, (list) => list.filter((w) => w !== word));
}
async function setIgnoredWords(project: Project, folder: string, change: (list: string[]) => string[]) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const words = [...new Set(change(art.article.ignoredWords ?? []).map((w) => w.trim()).filter((w) => /^\S{1,100}$/u.test(w)))].sort((a, b) => a.localeCompare(b, "es"));
  const { ignoredWords: _, ...rest } = art.article;
  const article = words.length ? { ...rest, ignoredWords: words } : rest;
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}
