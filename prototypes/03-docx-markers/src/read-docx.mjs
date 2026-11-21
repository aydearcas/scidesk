// Reads back what SciDesk needs from a DOCX it exported (and a co-author edited):
// paragraphs in document order (also inside tables) with the SciDesk bookmarks that start
// in them, their text as it would be after accepting and after rejecting the tracked
// changes, the fields they contain (Zotero citations, REF, SEQ), and the custom properties.
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const local = (n) => n.localName;

export async function readDocx(file) {
  const zip = await JSZip.loadAsync(readFileSync(file));
  const xml = await zip.file("word/document.xml").async("string");
  const dom = new DOMParser().parseFromString(xml, "text/xml");
  const body = dom.getElementsByTagNameNS(W, "body")[0];

  const paragraphs = [];
  const bookmarks = {}; // name -> { start, end } paragraph indexes
  const openBm = {}; // w:id -> name
  const fields = [];
  const stack = []; // open complex fields
  let p = null;

  // `state` says whether we are inside inserted / deleted / moved content
  function visit(node, state) {
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      const name = local(c);
      if (name === "p") {
        p = { i: paragraphs.length, bookmarks: [], accepted: "", rejected: "", plainAccepted: "", inTable: state.inTable, mark: "" };
        const pPr = Array.from(c.childNodes).find((e) => e.nodeType === 1 && local(e) === "pPr");
        const pPrRpr = pPr && Array.from(pPr.childNodes).find((e) => e.nodeType === 1 && local(e) === "rPr");
        if (pPrRpr?.getElementsByTagNameNS(W, "del")[0]) p.mark = "deleted";
        else if (pPrRpr?.getElementsByTagNameNS(W, "ins")[0]) p.mark = "inserted";
        paragraphs.push(p);
        visit(c, state);
      } else if (name === "tbl") visit(c, { ...state, inTable: true });
      else if (["ins", "moveTo"].includes(name) && c.parentNode && local(c.parentNode) !== "rPr") visit(c, { ...state, ins: true });
      else if (["del", "moveFrom"].includes(name) && local(c.parentNode) !== "rPr") visit(c, { ...state, del: true });
      else if (name === "bookmarkStart") {
        const n = c.getAttributeNS(W, "name");
        openBm[c.getAttributeNS(W, "id")] = n;
        if (n.startsWith("_SD")) {
          bookmarks[n] = { start: p?.i ?? 0, end: null };
          p?.bookmarks.push(n);
        }
      } else if (name === "bookmarkEnd") {
        const n = openBm[c.getAttributeNS(W, "id")];
        if (n && bookmarks[n]) bookmarks[n].end = p?.i ?? 0;
      } else if (name === "fldSimple") {
        const f = { instr: c.getAttributeNS(W, "instr").trim(), result: "", p: p.i, deleted: !!state.del, simple: true };
        stack.push({ ...f, phase: "result" });
        visit(c, state);
        const done = stack.pop();
        fields.push({ ...f, result: done.result });
      } else if (name === "fldChar") {
        const type = c.getAttributeNS(W, "fldCharType");
        if (type === "begin") stack.push({ instr: "", result: "", phase: "instr", p: p.i, deleted: !!state.del });
        else if (type === "separate") stack.at(-1).phase = "result";
        else if (type === "end") {
          const f = stack.pop();
          if (f) fields.push({ instr: f.instr.trim(), result: f.result, p: f.p, deleted: f.deleted });
        }
      } else if (name === "instrText" || name === "delInstrText") {
        if (stack.length) stack.at(-1).instr += c.textContent;
      } else if (name === "t" || name === "delText") {
        const text = c.textContent;
        const inResult = stack.length > 0;
        if (inResult && stack.at(-1).phase === "instr") continue;
        for (const f of stack) f.result += state.del ? "" : text;
        if (!state.del) p.accepted += text;
        if (!state.ins) p.rejected += text;
        if (!state.del && !inResult) p.plainAccepted += text;
      } else if (name === "tab") { if (!state.del) p.accepted += "\t"; }
      else visit(c, state);
    }
  }
  visit(body, { ins: false, del: false, inTable: false });

  // classify the fields
  for (const f of fields) {
    const m = /^ADDIN ZOTERO_ITEM CSL_CITATION\s+(\{[\s\S]*\})\s*$/.exec(f.instr);
    if (m) {
      try {
        const data = JSON.parse(m[1]);
        f.kind = "citation";
        f.citationID = data.citationID;
        f.refs = data.citationItems.map((it) => it.itemData?.id ?? it.id);
        f.formatted = data.properties?.plainCitation;
      } catch { f.kind = "citation-unreadable"; }
    } else if (/^ADDIN ZOTERO_BIBL/.test(f.instr)) f.kind = "bibliography";
    else if (/^REF\s/.test(f.instr)) { f.kind = "ref"; f.target = f.instr.split(/\s+/)[1]; }
    else if (/^SEQ\s/.test(f.instr)) { f.kind = "seq"; f.label = f.instr.split(/\s+/)[1]; }
    else f.kind = "other";
  }

  const custom = {};
  const cxml = await zip.file("docProps/custom.xml")?.async("string");
  if (cxml) for (const m of cxml.matchAll(/name="([^"]+)"><vt:lpwstr>([^<]*)</g)) custom[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return { paragraphs, bookmarks, fields, custom };
}
