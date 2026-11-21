// Quick look: the guide examples and hard cases in each candidate style.
//   node src/try-styles.mjs [--lang en-US] <style> [style...]   (file names in csl/, without .csl)
// The language of the terms ("En:" / "In:", "editores" / "editors") is the engine's, as in
// SciDesk, where it follows the manuscript's language unless the user picks another.
import { readFileSync } from "node:fs";
import CSL from "citeproc";
import { items, guide, hard } from "./library.mjs";

const locale = (l) => readFileSync(`csl/locales-${l}.xml`, "utf8");
const args = process.argv.slice(2);
const li = args.indexOf("--lang");
const lang = li >= 0 ? args.splice(li, 2)[1] : "es-ES";
for (const style of args) {
  const engine = new CSL.Engine({ retrieveLocale: locale, retrieveItem: (id) => items[id] }, readFileSync(`csl/${style}.csl`, "utf8"), lang, true);
  engine.updateItems([...Object.keys(guide), ...Object.keys(hard)]);
  const [, bib] = engine.makeBibliography();
  console.log(`\n### ${style}  cita: ${engine.makeCitationCluster([{ id: "g1" }, { id: "g2" }, { id: "g3" }])}  ${engine.makeCitationCluster([{ id: "g4", locator: "290", label: "page" }])}`);
  for (const e of bib) console.log(e.replace(/<\/?div[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}
