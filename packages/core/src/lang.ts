// The language of a fragment (record 0060): a `lang` mark only where the text is in a
// language other than the one around it (its block, the abstract of its language, the
// article). What comes from Word marks almost every run with a language, usually the
// document's own: only the marks that say something are kept.
import type { PMNode } from "@scidesk/formats";
import { saveJson, type Project } from "./project.ts";

/** A BCP 47 tag, tidied (es → es, EN-us → en-US), or null if it is not one. */
export function normalLang(tag: string | null | undefined): string | null {
  const m = /^([a-z]{2,3})(?:[-_]([a-z]{2}|\d{3}))?$/i.exec((tag ?? "").trim());
  return m ? (m[2] ? `${m[1].toLowerCase()}-${m[2].toUpperCase()}` : m[1].toLowerCase()) : null;
}

// the region a language tag without one means: es is Spain's, en is American (as Word and
// the dictionaries take them); en-GB is another variety (record 0063)
const DEFAULT_REGION: Record<string, string> = { es: "es", en: "us" };
/** The same language and variety: es and es-ES are, en and en-US are, en and en-GB are not. */
export function sameLang(a: string, b: string): boolean {
  const full = (t: string) => {
    const [l, r] = t.toLowerCase().replace("_", "-").split("-");
    return `${l}-${r ?? DEFAULT_REGION[l] ?? ""}`;
  };
  return full(a) === full(b);
}

const LETTER = /\p{L}/u;

/**
 * The tree without the `lang` marks that repeat the language around them, or that sit on
 * text without letters (spaces, numbers, punctuation). `around` is the article's language;
 * a node with its own `lang` attribute (a block, an abstract section) changes it inside.
 */
export function cleanLangMarks<T extends PMNode>(node: T, around: string): T {
  const here = (node.attrs?.lang as string | null | undefined) ?? around;
  if (node.type === "text") {
    if (!node.marks?.some((m) => m.type === "lang")) return node;
    const marks = node.marks.filter((m) => m.type !== "lang" || (LETTER.test(node.text ?? "") && !sameLang(String(m.attrs?.lang), here)));
    const { marks: _drop, ...rest } = node;
    return (marks.length ? { ...rest, marks } : rest) as T;
  }
  if (!node.content) return node;
  return { ...node, content: node.content.map((c) => cleanLangMarks(c, here)) };
}

/** Which words a language's dictionary accepts, or null if there is no dictionary for it. */
export type LangCheck = (lang: string, words: string[]) => Promise<boolean[] | null>;

// words worth asking about: letters only, no acronyms (the spell checker's rule, simplified)
const wordsOf = (text: string) => [...text.matchAll(/\p{L}+/gu)].map((m) => m[0]).filter((w) => w.length > 1 && (w.match(/\p{Lu}/gu)?.length ?? 0) < 2);

/**
 * The tree with each `lang` mark checked against the dictionaries: a fragment keeps its mark
 * only if more of its words belong to the marked language alone than to the language around
 * it alone. Word often marks Spanish text as English (a heading, a list of drugs). A mark to a
 * language without a dictionary goes if most words are of the one around; names stay.
 */
export async function verifyLangMarks<T extends PMNode>(node: T, around: string, check: LangCheck): Promise<T> {
  const found: { mark: string; around: string; words: string[] }[] = [];
  const collect = (n: PMNode, here: string) => {
    const h = (n.attrs?.lang as string | null | undefined) ?? here;
    const m = n.type === "text" ? n.marks?.find((x) => x.type === "lang") : undefined;
    if (m) found.push({ mark: String(m.attrs?.lang), around: h, words: wordsOf(n.text ?? "") });
    n.content?.forEach((c) => collect(c, h));
  };
  collect(node, around);
  if (!found.length) return node;
  // one call per language, every word once
  const asked = new Map<string, Set<string>>();
  for (const f of found) for (const l of [f.mark, f.around]) {
    if (!asked.has(l)) asked.set(l, new Set());
    for (const w of f.words) asked.get(l)!.add(w);
  }
  const known = new Map<string, Map<string, boolean> | null>();
  for (const [l, set] of asked) {
    const list = [...set];
    const ok = list.length ? await check(l, list) : [];
    known.set(l, ok ? new Map(list.map((w, i) => [w, ok[i]])) : null);
  }
  const keep = found.map((f) => {
    const a = known.get(f.mark), b = known.get(f.around);
    if (!b) return true;
    // a language without a dictionary: wrong if most of its words are of the one around
    if (!a) return f.words.filter((w) => b.get(w)).length * 2 <= f.words.length;
    let mine = 0, theirs = 0;
    for (const w of f.words) { const x = a.get(w), y = b.get(w); if (x && !y) mine++; else if (y && !x) theirs++; }
    return theirs <= mine;
  });
  let i = 0;
  const rebuild = (n: PMNode): PMNode => {
    if (n.type === "text" && n.marks?.some((x) => x.type === "lang")) {
      if (keep[i++]) return n;
      const marks = n.marks.filter((x) => x.type !== "lang");
      const { marks: _drop, ...rest } = n;
      return marks.length ? { ...rest, marks } : rest;
    }
    return n.content ? { ...n, content: n.content.map(rebuild) } : n;
  };
  return rebuild(node) as T;
}

/**
 * Record 0063: the article's language, when it changes variety (en → en-GB after making its
 * English British). Saved in article.json; the documents keep their own tags.
 */
export async function setArticleLang(project: Project, folder: string, lang: string) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const tag = normalLang(lang);
  if (!tag) throw new Error(`not a language tag: ${lang}`);
  const article = { ...art.article, lang: tag };
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}
