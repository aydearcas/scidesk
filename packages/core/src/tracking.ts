// Tracked changes of an article (phase 2a, record 0090): whether they are on, kept in
// article.json as Word keeps w:trackRevisions in the document, so that the article opens as
// it was left and the Word for co-authors carries it.
import { saveJson, type Project } from "./project.ts";

export async function setTrackChanges(project: Project, folder: string, on: boolean) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const { trackChanges: _, ...rest } = art.article;
  const article = on ? { ...rest, trackChanges: true } : rest;
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}
