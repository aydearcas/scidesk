// Reads the citations of a Word document made with EndNote or Zotero, from the document
// itself (no reference manager needed): every citation field with where it is, what it
// shows and the full records it carries, and the bibliography the manager wrote.
//
// EndNote (Word plug-in, "Cite While You Write"):
//   - each citation is a complex field  ADDIN EN.CITE <EndNote><Cite>…<record>…</record></Cite>…</EndNote>;
//     when the XML is long it is not in the code but in a nested field ADDIN EN.CITE.DATA,
//     whose <w:fldData> (on its begin character) holds the XML in base64 (UTF-8);
//   - the bibliography is a field ADDIN EN.REFLIST whose result spans one paragraph per entry.
// Zotero: ADDIN ZOTERO_ITEM CSL_CITATION {json} and ADDIN ZOTERO_BIBL (prototypes 3 and 5).
//
// Parts read: document, footnotes and endnotes; paragraphs inside tables too. Text inside
// tracked deletions (w:del, w:moveFrom) does not count; tracked insertions do.
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const PARTS = ["word/document.xml", "word/footnotes.xml", "word/endnotes.xml"];

export async function readCitations(file) {
  const zip = await JSZip.loadAsync(readFileSync(file));
  const out = { citations: [], bibliography: [], fieldsByKind: {}, deletedCitations: 0, paragraphs: 0 };
  for (const part of PARTS) {
    const xml = await zip.file(part)?.async("string");
    if (!xml) continue;
    const dom = new DOMParser().parseFromString(xml, "text/xml");
    walkPart(dom.documentElement, part.replace(/^word\/|\.xml$/g, ""), out);
  }
  return out;
}

function walkPart(root, part, out) {
  const stack = []; // open complex fields: { instr, data, result, phase, para, deleted, children }
  let para = -1, inTable = 0;
  const fields = [];

  function visit(node, del) {
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      const name = c.localName;
      if (name === "p") { para = out.paragraphs++; for (const f of stack) if (f.phase === "result") f.paras.add(para); visit(c, del); for (const f of stack) if (f.phase === "result") f.result += "\n"; }
      else if (name === "tbl") { inTable++; visit(c, del); inTable--; }
      else if ((name === "del" || name === "moveFrom") && c.parentNode.localName !== "rPr") visit(c, true);
      else if (name === "fldChar") {
        const type = c.getAttributeNS(W, "fldCharType");
        if (type === "begin") {
          const data = [...childElements(c)].find((e) => e.localName === "fldData")?.textContent ?? "";
          stack.push({ instr: "", data: data.replace(/\s/g, ""), result: "", phase: "instr", para, paras: new Set([para]), deleted: del, inTable: inTable > 0, part, children: [] });
        } else if (type === "separate" && stack.length) stack.at(-1).phase = "result";
        else if (type === "end" && stack.length) {
          const f = stack.pop();
          if (stack.length) stack.at(-1).children.push(f);
          fields.push(f);
        }
      } else if (name === "instrText" || name === "delInstrText") { if (stack.length && stack.at(-1).phase === "instr") stack.at(-1).instr += c.textContent; }
      else if (name === "t" || name === "delText") {
        if (del) continue;
        for (const f of stack) if (f.phase === "result") f.result += c.textContent;
      } else if (name === "fldSimple") {
        const f = { instr: c.getAttributeNS(W, "instr"), data: "", result: "", phase: "result", para, paras: new Set([para]), deleted: del, inTable: inTable > 0, part, children: [] };
        stack.push(f); visit(c, del); stack.pop(); fields.push(f);
      } else visit(c, del);
    }
  }
  visit(root, false);

  for (const f of fields) {
    const instr = f.instr.trim();
    const kind = /^ADDIN EN\.CITE\.DATA/.test(instr) ? "EN.CITE.DATA" : /^ADDIN EN\.CITE/.test(instr) ? "EN.CITE" : /^ADDIN EN\.REFLIST/.test(instr) ? "EN.REFLIST"
      : /^ADDIN ZOTERO_ITEM/.test(instr) ? "ZOTERO_ITEM" : /^ADDIN ZOTERO_BIBL/.test(instr) ? "ZOTERO_BIBL" : /^ADDIN CSL_CITATION/.test(instr) ? "MENDELEY" : instr.split(/\s+/)[0] || "?";
    out.fieldsByKind[kind] = (out.fieldsByKind[kind] ?? 0) + 1;
    if (kind === "EN.CITE") {
      // the XML: in the code, or in the nested EN.CITE.DATA field's fldData
      let xml = instr.replace(/^ADDIN EN\.CITE\s*/, "").trim();
      let source = "code";
      if (!xml.startsWith("<")) {
        const data = f.children.find((ch) => /^ADDIN EN\.CITE\.DATA/.test(ch.instr.trim()));
        xml = data?.data ? Buffer.from(data.data, "base64").toString("utf8") : "";
        source = data ? "fldData" : "none";
      }
      if (f.deleted) { out.deletedCitations++; continue; }
      out.citations.push({ manager: "endnote", part: f.part, para: f.para, inTable: f.inTable, shown: f.result.replace(/\n+$/, ""), source, cites: parseEndNoteCite(xml) });
    } else if (kind === "ZOTERO_ITEM" || kind === "MENDELEY") {
      // Zotero and Mendeley Desktop write the same CSL citation JSON
      if (f.deleted) { out.deletedCitations++; continue; }
      let data = null;
      try { data = JSON.parse(instr.replace(/^ADDIN (ZOTERO_ITEM )?CSL_CITATION\s*/, "")); } catch {}
      out.citations.push({ manager: kind === "MENDELEY" ? "mendeley" : "zotero", part: f.part, para: f.para, inTable: f.inTable, shown: f.result.replace(/\n+$/, ""), source: "code", citationID: data?.citationID, cites: (data?.citationItems ?? []).map((ci) => ({ key: ci.uris?.[0] ?? ci.id, csl: ci.itemData, locator: ci.locator })) });
    } else if (kind === "EN.REFLIST" || kind === "ZOTERO_BIBL") {
      out.bibliography = f.result.split("\n").map((s) => s.trim()).filter(Boolean);
    }
  }
}

function* childElements(n) { for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) yield c; }

// <EndNote><Cite [ExcludeAuth ExcludeYear]><Author/><Year/><RecNum/><Prefix/><Suffix/><Pages/><DisplayText/><record>…</record></Cite>…</EndNote>
function parseEndNoteCite(xml) {
  if (!xml) return [];
  const dom = new DOMParser({ onError: () => {} }).parseFromString(xml, "text/xml");
  const cites = [];
  for (const cite of [...dom.getElementsByTagName("Cite")]) {
    const get = (tag) => [...childElements(cite)].find((e) => e.nodeName === tag)?.textContent ?? "";
    const record = [...childElements(cite)].find((e) => e.nodeName === "record");
    const fk = record?.getElementsByTagName("key")[0];
    cites.push({
      key: fk ? `${fk.getAttribute("db-id")}#${fk.textContent.trim()}` : `rec#${get("RecNum")}`,
      recNum: get("RecNum"), prefix: get("Prefix"), suffix: get("Suffix"), pages: get("Pages"),
      excludeAuthor: cite.getAttribute("ExcludeAuth") === "1", excludeYear: cite.getAttribute("ExcludeYear") === "1",
      record: record ? recordToObject(record) : null,
    });
  }
  return cites;
}

// An EndNote XML <record> as a plain object: element paths -> text (text inside <style>
// is joined), lists for repeated authors, keywords and URLs.
function recordToObject(rec) {
  const o = {};
  const text = (e) => e.textContent.replace(/\s+/g, " ").trim();
  const add = (k, v) => { if (!v) return; if (o[k] === undefined) o[k] = v; else o[k] = [].concat(o[k], v); };
  for (const e of childElements(rec)) {
    const n = e.nodeName;
    if (n === "ref-type") { o["ref-type"] = e.getAttribute("name"); continue; }
    if (n === "foreign-keys" || n === "database" || n === "source-app") continue;
    if (n === "contributors" || n === "titles" || n === "periodical" || n === "alt-periodical" || n === "dates" || n === "urls" || n === "keywords") {
      for (const g of childElements(e)) {
        const gn = g.nodeName;
        const leaves = [...childElements(g)].filter((x) => x.nodeName !== "style");
        if (leaves.length) for (const l of leaves) {
          if (l.nodeName === "date" || l.nodeName === "url" || l.nodeName === "keyword" || /author$/.test(l.nodeName)) add(`${n}/${gn}`, text(l));
          else for (const ll of childElements(l)) add(`${n}/${gn}/${l.nodeName}`, text(ll));
        }
        else add(`${n}/${gn}`, text(g));
      }
      continue;
    }
    add(n, text(e));
  }
  return o;
}
