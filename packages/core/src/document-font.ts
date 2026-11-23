// The document's font (record 0074; PLAN 5.2, "Fuentes": in the MVP the document's font is
// chosen, one per style comes in V1). Two fonts matter:
// - the one the journal gets (its profile's font and size; where it says nothing, the
//   document's), in the Word and the PDF for the journal and in the "adapted to the journal"
//   view;
// - the one the article is written in (its own choice in article.json; where it has none,
//   the journal's; then Calibri 12), in the "free font" view and the Word for co-authors.
import { saveJson, type Project } from "./project.ts";

export interface DocumentFont { family: string; size: number }
export const DEFAULT_DOCUMENT_FONT: DocumentFont = { family: "Calibri", size: 12 };

export interface DocumentFonts {
  /** What the journal gets. */
  journal: DocumentFont;
  /** What the article is written in. */
  writing: DocumentFont;
  /** The article's own choice, if any. */
  own: { family?: string; size?: number };
  /** What the journal's profile says, if anything. */
  journalSays: { family?: string; size?: number };
}

export function documentFontsOf(project: Project, folder: string): DocumentFonts {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const own = art.article.documentFont ?? {};
  const fmt = art.article.journal ? project.journals.get(art.article.journal)?.manuscriptFormat : undefined;
  const journalSays = { family: fmt?.font?.value, size: fmt?.fontSizePt?.value };
  return {
    journal: { family: journalSays.family ?? own.family ?? DEFAULT_DOCUMENT_FONT.family, size: journalSays.size ?? own.size ?? DEFAULT_DOCUMENT_FONT.size },
    writing: { family: own.family ?? journalSays.family ?? DEFAULT_DOCUMENT_FONT.family, size: own.size ?? journalSays.size ?? DEFAULT_DOCUMENT_FONT.size },
    own: { ...(own.family ? { family: own.family } : {}), ...(own.size ? { size: own.size } : {}) },
    journalSays: { ...(journalSays.family ? { family: journalSays.family } : {}), ...(journalSays.size ? { size: journalSays.size } : {}) },
  };
}

/** Sets the article's font and size; what is left out (or null) follows the journal again. */
export async function setDocumentFont(project: Project, folder: string, value: { family?: string | null; size?: number | null } | null) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const family = value?.family?.trim() || undefined;
  const size = value?.size ?? undefined;
  if (size !== undefined && !(size >= 6 && size <= 72)) throw new Error(`font size ${size} out of range (6 to 72)`);
  const { documentFont: _, ...rest } = art.article;
  const article = family || size ? { ...rest, documentFont: { ...(family ? { family } : {}), ...(size ? { size } : {}) } } : rest;
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}
