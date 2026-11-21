// Compares each copy refreshed by Zotero with the copy before the refresh, using prototype
// 3's DOCX reader: citation fields kept, citationIDs kept, results changed, URIs, bookmarks.
//   node src/check-refresh.mjs out/word/A-embedded.docx out/word/A-embedded-refreshed.docx ...
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { readDocx } from "../../03-docx-markers/src/read-docx.mjs";

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const [before, after] = [await readDocx(args[i]), await readDocx(args[i + 1])];
  const cits = (d) => d.fields.filter((f) => f.kind === "citation");
  const b = cits(before), a = cits(after);
  const ids = new Set(b.map((f) => f.citationID));
  const zip = await JSZip.loadAsync(readFileSync(args[i + 1]));
  const xml = await zip.file("word/document.xml").async("string");
  const firstCode = (xml.match(/ADDIN ZOTERO_ITEM CSL_CITATION [^<]*/) ?? [""])[0].replace(/&quot;/g, '"').slice(0, 400);
  console.log(JSON.stringify({
    file: args[i + 1],
    citationFields: `${b.length} -> ${a.length}`,
    citationIDsKept: a.filter((f) => ids.has(f.citationID)).length,
    resultsChanged: a.filter((f, k) => b[k] && f.result !== b[k].result).map((f, k) => `${b[k]?.result}->${f.result}`).slice(0, 8),
    otherFields: after.fields.filter((f) => f.kind !== "citation").map((f) => f.kind).join(","),
    bookmarks: `${Object.keys(before.bookmarks).length} -> ${Object.keys(after.bookmarks).length}`,
    zoteroPrefs: Object.keys(after.custom).join(","),
    firstCode,
  }, null, 1));
}
