// The comments of an article (record 0094) in reading order, with the text each is anchored
// to: for `scidesk comments`, and for anything that lists them outside the editor.
import type { PMNode } from "@scidesk/formats";
import type { Project } from "./project.ts";
import { composite } from "./docx-export.ts";

export interface CommentRecord {
  author: { name: string; person?: string };
  date: string;
  origin: string;
  text: string;
  resolved: boolean;
  replies: { author: { name: string; person?: string }; date: string; text: string }[];
}
export interface ArticleComment { id: string; file: string; quote: string; record: CommentRecord }

export function articleComments(project: Project, folder: string): ArticleComment[] {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const records = new Map<string, { file: string; record: CommentRecord }>();
  for (const [file, d] of art.documents) {
    for (const [id, record] of Object.entries((d as unknown as { comments?: Record<string, CommentRecord> }).comments ?? {})) records.set(id, { file, record });
  }
  const quotes = new Map<string, string>();
  const visit = (n: PMNode) => {
    for (const m of n.marks ?? []) {
      if (m.type !== "comment") continue;
      const id = String(m.attrs!.id);
      const text = n.type === "text" ? (n.text ?? "").replaceAll("​", "") : "￼";
      quotes.set(id, (quotes.get(id) ?? "") + text);
    }
    n.content?.forEach(visit);
  };
  // the order the Word writes them: titles, the abstract, then the body with its tables and figures
  const { tree } = composite(art);
  const body = tree.content ?? [];
  body.filter((n) => n.type === "title").forEach(visit);
  const abstract = art.documents.get("manuscript/abstract.scidoc")?.doc as PMNode | undefined;
  if (abstract) visit(abstract);
  body.filter((n) => n.type !== "title").forEach(visit);
  return [...quotes.entries()].flatMap(([id, quote]) => {
    const r = records.get(id);
    return r ? [{ id, file: r.file, quote, record: r.record }] : [];
  });
}
