// How long the work the window repeats after each pause in typing takes with a given project
// (record 0055): the checks, the outline, the uses of each reference, the citations, and the
// recovery journal and the save (split and compare). The window does the same on the composed
// document of the article on screen.
//   npx tsx tools/measure.ts <project folder> [article folder] [rounds]
import { performance } from "node:perf_hooks";
import { NodeFs, nodeResources } from "../src/node-fs.ts";
import { loadProject } from "../src/project.ts";
import { changedDocuments, composeArticle, liveDocuments, splitArticle } from "../src/compose.ts";
import { checkArticle } from "../src/checks.ts";
import { articleOutline } from "../src/outline.ts";
import { referenceUses } from "../src/library.ts";
import { renderCitations } from "../src/citations.ts";
import { styleResources } from "../src/docx-export.ts";

const [dir, folder = "main", roundsArg = "5"] = process.argv.slice(2);
if (!dir) { console.log("usage: npx tsx tools/measure.ts <project folder> [article folder] [rounds]"); process.exit(2); }
const rounds = Number(roundsArg);
const times = new Map<string, number[]>();
async function time<T>(name: string, f: () => T | Promise<T>): Promise<T> {
  const t = performance.now();
  const r = await f();
  (times.get(name) ?? times.set(name, []).get(name)!).push(performance.now() - t);
  return r;
}

const project = await time("load project", () => loadProject(new NodeFs(dir)));
const art = project.articles.find((a) => a.folder === folder)!;
const res = await nodeResources();
const doc = (await time("compose", () => composeArticle(art))).doc;
const count = (n: { content?: unknown[] }): number => 1 + ((n.content ?? []) as { content?: unknown[] }[]).reduce((a, c) => a + count(c), 0);
console.log(`${dir}: ${doc.content?.length} top-level blocks, ${count(doc)} nodes, ${(JSON.stringify(doc).length / 1024).toFixed(0)} KB of JSON`);
for (let i = 0; i < rounds; i++) {
  const live = await time("liveDocuments", () => liveDocuments(doc, art));
  await time("checkArticle", () => checkArticle(project, folder, live));
  await time("articleOutline", () => articleOutline(project, folder, live));
  await time("referenceUses", () => referenceUses(project, Object.fromEntries(Object.entries(live).map(([p, d]) => [`${folder}/${p}`, d]))));
  const style = await styleResources(project, art, res);
  await time("renderCitations", () => renderCitations(project.library, [doc], art.article.citationStyle.id, art.article.lang, style));
  const split = await time("splitArticle", () => splitArticle(doc, art));
  await time("changedDocuments", () => changedDocuments(split, art));
  await time("JSON round trip (getJSON stand-in)", () => JSON.parse(JSON.stringify(doc)));
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const [name, t] of times) console.log(`${name.padEnd(36)} ${median(t).toFixed(1).padStart(8)} ms${t.length > 1 ? ` (median of ${t.length})` : ""}`);
