// Makes the three DOCX copies for the Zotero-in-Word test, from prototype 3's export:
//   out/word/A-embedded.docx  as SciDesk exports it now: citation items with no URI
//                             (Zotero calls them embedded items: not in any library);
//   out/word/B-linked.docx    each citation item carries the URI of its item in the test
//                             Zotero (matched by title and DOI), as SciDesk would write it
//                             for a library linked to Zotero;
//   out/word/C-own-uri.docx   each citation item carries a stable URI of SciDesk's own
//                             (https://scidesk.app/ref/<project>/<reference>), for a library
//                             not linked to Zotero: Zotero groups embedded items by URI.
//   node src/link-docx.mjs   (needs prototype 3's out/article-coauthors.docx and the test Zotero)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import JSZip from "jszip";
import { ZoteroLocal } from "./zotero.mjs";

const SRC = "../03-docx-markers/out/article-coauthors.docx";
const z = new ZoteroLocal();
const { items } = await z.all("/users/0/items/top", { format: "json", include: "csljson" });
const uriOf = new Map();
for (const it of items) {
  let c = it.csljson;
  if (typeof c === "string") c = JSON.parse(c)[0];
  uriOf.set(`${c.title}|${c.DOI ?? ""}`, c.id);
}

const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

mkdirSync("out/word", { recursive: true });
const src = readFileSync(SRC);
writeFileSync("out/word/A-embedded.docx", src);

const zip = await JSZip.loadAsync(src);
let xml = await zip.file("word/document.xml").async("string");
let linked = 0, missing = 0;
xml = xml.replace(/(<w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION )([^<]*)(<\/w:instrText>)/g, (_, a, json, b) => {
  const data = JSON.parse(unesc(json).trim());
  for (const ci of data.citationItems) {
    const uri = uriOf.get(`${ci.itemData.title}|${ci.itemData.DOI ?? ""}`);
    if (uri) { ci.uris = [uri]; linked++; } else missing++;
  }
  return a + esc(JSON.stringify(data)) + " " + b;
});
const original = await zip.file("word/document.xml").async("string");
zip.file("word/document.xml", xml);
writeFileSync("out/word/B-linked.docx", await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));

const own = original.replace(/(<w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION )([^<]*)(<\/w:instrText>)/g, (_, a, json, b) => {
  const data = JSON.parse(unesc(json).trim());
  for (const ci of data.citationItems) ci.uris = [`https://scidesk.app/ref/p-7f3a9c1e/${ci.itemData.id}`];
  return a + esc(JSON.stringify(data)) + " " + b;
});
zip.file("word/document.xml", own);
writeFileSync("out/word/C-own-uri.docx", await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log(JSON.stringify({ linkedItems: linked, notFound: missing }));
