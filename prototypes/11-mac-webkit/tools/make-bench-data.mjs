// Copies what the bench page needs (all synthetic or public): prototype 2's test library and
// citation clusters, its CSL styles and locales, and the synthetic article as plain text.
//   node tools/make-bench-data.mjs
import { writeFileSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";
import { items, clusters } from "../../02-citeproc/src/library.mjs";

mkdirSync("public/csl", { recursive: true });
writeFileSync("public/bench-data.json", JSON.stringify({ items, clusters }));
for (const f of ["reumatologia-clinica-2026.csl", "nlm-citation-sequence.csl", "apa.csl", "locales-es-ES.xml", "locales-en-US.xml"]) copyFileSync(`../02-citeproc/csl/${f}`, `public/csl/${f}`);
const md = readFileSync("../corpus/synthetic-round-knee-oa/source/article.md", "utf8");
writeFileSync("public/article.txt", [md, md, md].join("\n"));
console.log("bench data written");
