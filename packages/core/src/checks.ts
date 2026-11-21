// Checks before submission, minimal panel of phase 1 (PLAN 5.8, R12, R43, record 0041):
// the journal's limits (words of the text and of each abstract, references, tables,
// figures, authors, keywords, characters of the title), the word count by section,
// pending markers left while writing ("XX", "??", "[REF]"…), and tables, figures and
// references that are never cited. Three levels; every warning has a stable id, so that it
// can be marked "correct" or "not applicable" in article.json and does not come back. No
// AI and nothing sent anywhere: rules on the project's own files.
import type { ArticleFile, PMNode } from "@scidesk/formats";
import { citationsOf } from "./citations.ts";
import { composite, numbering } from "./docx-export.ts";
import { now, saveJson, type Project } from "./project.ts";

export type CheckLevel = "blocking" | "review" | "info";
export type CheckCode =
  | "word-limit" | "abstract-word-limit" | "references-limit" | "tables-limit" | "figures-limit" | "figures-tables-limit"
  | "authors-limit" | "authors-advised" | "keywords-limit" | "keywords-min" | "title-characters"
  | "pending" | "uncited-table" | "uncited-figure" | "uncited-reference" | "no-limits";

export interface CheckWarning {
  /** Stable: the same thing gives the same id after any edit elsewhere. */
  id: string;
  code: CheckCode;
  level: CheckLevel;
  /** For the message, in the interface's language. */
  params: Record<string, string | number>;
  /** Where it is: the document (relative to the article folder) and the block. */
  where?: { path: string; block: string };
  /** Present when the user marked it (it is still returned, to be reviewed). */
  ignored?: ArticleFile["ignoredWarnings"][number];
}

export interface SectionCount { heading: string; role: string | null; words: number; counted: boolean; block: string | null }
export interface CheckReport {
  warnings: CheckWarning[];
  counts: {
    /** Words of the text that the journal counts: from the first section to the last, without references or back matter. */
    main: number;
    sections: SectionCount[];
    abstract: { lang: string; words: number }[];
    keywords: { lang: string; count: number }[];
    titleCharacters: number;
    references: number;
    tables: number;
    figures: number;
    authors: number;
  };
  /** The limits that apply (journal profile, article type), for showing "1234 / 3000". */
  limits: Record<string, number>;
}

/** Sections that journals leave out of the word count of the text. */
const NOT_COUNTED = new Set(["references", "acknowledgements", "funding", "conflicts", "ethics", "consent", "data-availability", "registration", "ai-use", "contributions", "appendix"]);

/** Words as Word counts them: what is between spaces, if it has a letter or a digit. Citations do not count. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

/** The plain text of a block, without deleted text, citations or cross-references. */
export function blockText(n: PMNode): string {
  if (n.type === "text") return (n.marks ?? []).some((m) => m.type === "deletion") ? "" : n.text ?? "";
  if (n.type === "hardBreak") return " ";
  if (n.type === "citation" || n.type === "xref" || n.type === "noteRef") return "";
  const inner = (n.content ?? []).map(blockText);
  // blocks inside blocks (list items, cells) are separate words
  return (n.content ?? []).some((c) => c.content && c.type !== "text") ? inner.join(" ") : inner.join("");
}

/**
 * Pending markers left while writing (R12): XX (or more X), ?? (or more), and words in
 * brackets or in capitals: [REF], [CITA], [TODO], [PENDIENTE], [COMPROBAR], TODO, FIXME,
 * PENDIENTE, COMPROBAR. "comprobar" in lower case is an ordinary word and is not one.
 */
const PENDING = /(?<![\p{L}\p{N}])X{2,}(?![\p{L}\p{N}])|\?{2,}|\[(?:REFS?|CITAS?|CITE|TODO|PENDIENTE|COMPROBAR|CHECK|XX+)\]|(?<![\p{L}\p{N}])(?:TODO|FIXME|PENDIENTE|COMPROBAR)(?![\p{L}\p{N}])/giu;
export function pendingMarkers(text: string): { marker: string; index: number }[] {
  return [...text.matchAll(PENDING)]
    // bare words only in capitals; bracketed and symbols in any case
    .filter((m) => m[0].startsWith("[") || m[0].startsWith("?") || m[0] === m[0].toUpperCase())
    .map((m) => ({ marker: m[0], index: m.index! }));
}

const TEXT_BLOCKS = new Set(["paragraph", "heading", "title", "tableCaption", "tableNote", "figureCaption", "figureNote", "keyword"]);

/** Checks one article. `live` replaces saved documents by what is on screen, keyed by path in the article. */
export function checkArticle(project: Project, folder: string, live: Record<string, PMNode> = {}): CheckReport {
  const art0 = project.articles.find((a) => a.folder === folder);
  if (!art0) throw new Error(`no article ${folder}`);
  // the article with what is on screen
  const documents = new Map(art0.documents);
  for (const [p, doc] of Object.entries(live)) documents.set(p, { ...(documents.get(p) ?? { schemaVersion: 1, documentType: "article", lang: art0.article.lang, changes: {}, comments: {} }), doc } as never);
  const art = { ...art0, documents };
  const warnings: CheckWarning[] = [];
  const journal = art.article.journal ? project.journals.get(art.article.journal) : undefined;
  const rules = journal?.articleTypes.find((t) => t.articleType === art.article.articleType);
  const limits: Record<string, number> = {};
  for (const [k, v] of Object.entries(rules?.limits ?? {})) if (v && typeof (v as { value?: unknown }).value === "number") limits[k] = (v as { value: number }).value;
  if (journal?.abstract?.keywordsMin?.value !== undefined) limits.keywordsMin = journal.abstract.keywordsMin.value;
  const add = (w: Omit<CheckWarning, "ignored">) => warnings.push(w);

  // ---------------------------------------------------------------- counts
  const body = documents.get("manuscript/article.scidoc")!.doc as PMNode;
  const sections: SectionCount[] = [];
  let current: SectionCount | null = null;
  for (const n of body.content ?? []) {
    if ((n.marks ?? []).some((m) => m.type === "deletion")) continue;
    if (n.type === "title") continue;
    if (n.type === "heading" && ((n.attrs!.level as number) ?? 1) === 1) {
      const role = (n.attrs!.role as string) ?? null;
      current = { heading: blockText(n), role, words: 0, counted: !NOT_COUNTED.has(role ?? ""), block: (n.attrs!.id as string) ?? null };
      sections.push(current);
      continue;
    }
    if (n.type === "tableRef" || n.type === "figureRef") continue; // tables and figures are not text
    if (!current) { current = { heading: "", role: null, words: 0, counted: true, block: null }; sections.push(current); }
    current.words += countWords(blockText(n)); // subheadings count, as in Word
  }
  const main = sections.filter((s) => s.counted).reduce((a, s) => a + s.words, 0);

  const abstractDoc = documents.get("manuscript/abstract.scidoc")?.doc as PMNode | undefined;
  const abstract = (abstractDoc?.content ?? []).map((s) => ({
    lang: (s.attrs!.lang as string) ?? art.article.lang,
    words: countWords((s.content ?? []).filter((n) => n.type !== "keywords" && n.type !== "heading").map(blockText).join(" ")),
    keywords: (s.content ?? []).filter((n) => n.type === "keywords").flatMap((k) => (k.content ?? []).filter((x) => blockText(x).trim())).length,
    block: s.attrs!.id as string,
  }));
  const title = (body.content ?? []).find((n) => n.type === "title");
  const titleCharacters = title ? blockText(title).trim().length : 0;
  const { tree, tables, figures } = composite(art);
  const trees = [...(abstractDoc ? [abstractDoc] : []), tree];
  const cited = new Set(trees.flatMap(citationsOf).flatMap((c) => (c.attrs!.items as { ref: string }[]).map((i) => i.ref)));
  const authors = art.authors.authors.length;
  const tableNo = numbering(tree, [...tables.keys()]);
  const figureNo = numbering(tree, [...figures.keys()]);

  // ---------------------------------------------------------------- limits
  const over = (code: CheckCode, id: string, value: number, limit: number | undefined, level: CheckLevel = "blocking", extra: Record<string, string | number> = {}, where?: CheckWarning["where"]) => {
    if (limit !== undefined && value > limit) add({ id, code, level, params: { value, limit, ...extra }, where });
  };
  if (!journal || !rules) add({ id: `no-limits:${art.article.journal ?? "none"}:${art.article.articleType}`, code: "no-limits", level: "info", params: { journal: journal?.journal.title.value ?? "", type: art.article.articleType } });
  over("word-limit", "word-limit", main, limits.words);
  for (const a of abstract) over("abstract-word-limit", `abstract-word-limit:${a.lang}`, a.words, limits.abstractWords, "blocking", { lang: a.lang }, { path: "manuscript/abstract.scidoc", block: a.block });
  over("references-limit", "references-limit", cited.size, limits.references);
  over("tables-limit", "tables-limit", tables.size, limits.tables);
  over("figures-limit", "figures-limit", figures.size, limits.figures);
  over("figures-tables-limit", "figures-tables-limit", tables.size + figures.size, limits.figuresAndTables);
  over("authors-limit", "authors-limit", authors, limits.authors);
  over("authors-advised", "authors-advised", authors, limits.authorsAdvised, "review");
  for (const a of abstract) {
    over("keywords-limit", `keywords-limit:${a.lang}`, a.keywords, limits.keywords, "blocking", { lang: a.lang }, { path: "manuscript/abstract.scidoc", block: a.block });
    if (limits.keywordsMin !== undefined && a.keywords < limits.keywordsMin) add({ id: `keywords-min:${a.lang}`, code: "keywords-min", level: "review", params: { value: a.keywords, limit: limits.keywordsMin, lang: a.lang }, where: { path: "manuscript/abstract.scidoc", block: a.block } });
  }
  over("title-characters", "title-characters", titleCharacters, limits.titleCharacters, "blocking", {}, title ? { path: "manuscript/article.scidoc", block: title.attrs!.id as string } : undefined);

  // ---------------------------------------------------------------- pending markers, in every document of the article
  for (const [path, file] of documents) {
    if (!/\.(scidoc|scitable|scifigure)$/.test(path)) continue;
    const visit = (n: PMNode, block: string | null) => {
      const id = typeof n.attrs?.id === "string" ? (n.attrs.id as string) : block;
      if (TEXT_BLOCKS.has(n.type)) {
        const seen = new Map<string, number>();
        for (const m of pendingMarkers(blockText(n))) {
          const k = m.marker.toUpperCase();
          const i = seen.get(k) ?? 0;
          seen.set(k, i + 1);
          add({ id: `pending:${path}:${id}:${k}:${i}`, code: "pending", level: "review", params: { marker: m.marker, text: blockText(n).slice(Math.max(0, m.index - 30), m.index + m.marker.length + 30).trim() }, where: id ? { path, block: id } : undefined });
        }
        return;
      }
      n.content?.forEach((c) => visit(c, id));
    };
    visit(file.doc as PMNode, null);
  }

  // ---------------------------------------------------------------- never cited
  const targets = new Set<string>();
  const findXrefs = (n: PMNode) => { if (n.type === "xref") targets.add(n.attrs!.target as string); n.content?.forEach(findXrefs); };
  trees.forEach(findXrefs);
  for (const id of tables.keys()) if (!targets.has(id)) add({ id: `uncited-table:${id}`, code: "uncited-table", level: "review", params: { number: tableNo.get(id)! }, where: { path: "manuscript/article.scidoc", block: id } });
  for (const id of figures.keys()) if (!targets.has(id)) add({ id: `uncited-figure:${id}`, code: "uncited-figure", level: "review", params: { number: figureNo.get(id)! }, where: { path: "manuscript/article.scidoc", block: id } });
  for (const r of project.library.references) {
    if (cited.has(r.id)) continue;
    const a = (r.csl.author as { family?: string; literal?: string }[] | undefined)?.[0];
    const year = (r.csl.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]?.[0];
    add({ id: `uncited-reference:${r.id}`, code: "uncited-reference", level: "info", params: { reference: `${a?.family ?? a?.literal ?? "?"} ${year ?? ""}`.trim(), title: String(r.csl.title ?? "").slice(0, 80) } });
  }

  // ---------------------------------------------------------------- ignored
  const ignored = new Map(art.article.ignoredWarnings.map((w) => [w.warning, w]));
  for (const w of warnings) { const i = ignored.get(w.id); if (i) w.ignored = i; }
  const order: Record<CheckLevel, number> = { blocking: 0, review: 1, info: 2 };
  warnings.sort((a, b) => Number(!!a.ignored) - Number(!!b.ignored) || order[a.level] - order[b.level]);
  return {
    warnings,
    counts: {
      main, sections: sections.filter((s) => s.heading || s.words), abstract: abstract.map(({ lang, words }) => ({ lang, words })),
      keywords: abstract.map(({ lang, keywords }) => ({ lang, count: keywords })), titleCharacters, references: cited.size,
      tables: tables.size, figures: figures.size, authors,
    },
    limits,
  };
}

/** Marks a warning "correct" or "not applicable" (R12): saved in article.json, so that it does not come back. */
export async function ignoreWarning(project: Project, folder: string, id: string, status: "correct" | "not-applicable", note?: string) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const entry = { warning: id, status, date: now(), ...(note?.trim() ? { note: note.trim() } : {}) };
  const article = { ...art.article, ignoredWarnings: [...art.article.ignoredWarnings.filter((w) => w.warning !== id), entry] };
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}

/** Shows a warning again. */
export async function restoreWarning(project: Project, folder: string, id: string) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const article = { ...art.article, ignoredWarnings: art.article.ignoredWarnings.filter((w) => w.warning !== id) };
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}

/** Pending markers left, for the export for the journal to say so (R12). */
export function pendingCount(project: Project, folder: string): number {
  return checkArticle(project, folder).warnings.filter((w) => w.code === "pending" && !w.ignored).length;
}
