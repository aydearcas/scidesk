// One line per refreshed copy: citation fields and citationIDs kept, citation numbers
// changed, bibliography entries, bookmarks, document properties, and what Zotero wrote in
// each citation item (id, uris, itemData.id).
//   node src/summary-refresh.mjs <before.docx> <after.docx> [...]
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { readDocx } from "../../03-docx-markers/src/read-docx.mjs";

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const before = await readDocx(args[i]), after = await readDocx(args[i + 1]);
  const cb = new Map(before.fields.filter((f) => f.kind === "citation").map((f) => [f.citationID, f.result]));
  const ca = after.fields.filter((f) => f.kind === "citation");
  const changed = ca.filter((f) => cb.get(f.citationID) !== f.result).map((f) => `${cb.get(f.citationID)}→${f.result}`);
  const bib = after.fields.find((f) => f.kind === "bibliography")?.result ?? "";
  const xml = await (await JSZip.loadAsync(readFileSync(args[i + 1]))).file("word/document.xml").async("string");
  const code = JSON.parse((xml.match(/ADDIN ZOTERO_ITEM CSL_CITATION ([^<]*)/)[1]).replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim());
  const ci = code.citationItems[0];
  console.log(JSON.stringify({
    file: args[i + 1].split("/").pop(),
    citations: `${cb.size}→${ca.length}`, citationIDsKept: ca.filter((f) => cb.has(f.citationID)).length,
    numbersChanged: changed.length, changedExamples: changed.slice(0, 4),
    bibliographyEntries: (bib.match(/(^|\D)\d+\.\s?(?=[A-ZÁÉÍÓÚ\[])/g) ?? []).length,
    bookmarks: `${Object.keys(before.bookmarks).length}→${Object.keys(after.bookmarks).length}`,
    properties: Object.keys(after.custom).join(","),
    firstItem: { id: ci.id, uris: ci.uris, itemDataId: ci.itemData?.id, containerShort: ci.itemData?.["container-title-short"] },
  }));
}
