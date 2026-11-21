// Minimal DOCX writer and reader for tracked changes, for the suggest-changes model:
// marks insertion/deletion/modification {id} + a document-level registry
// changes[id] = { author, date }.
//
// Mapping (export and import are symmetric):
//   text with insertion mark            <-> <w:ins w:author w:date><w:r>…</w:r></w:ins>
//   text with deletion mark             <-> <w:del …><w:r><w:delText>…</w:delText></w:r></w:del>
//   U+200B with insertion at end of a
//   paragraph (suggest-changes' way of
//   marking a split)                    <-> inserted paragraph mark <w:pPr><w:rPr><w:ins/></w:rPr></w:pPr>
//   U+200B with deletion (a join)       <-> deleted paragraph mark  <w:pPr><w:rPr><w:del/></w:rPr></w:pPr>
//   deletion + insertion of the same
//   text differing only in marks        <-> <w:rPrChange> (format change)
// The real exporter will use the `docx` library (prototype 3); this one is hand-written
// because the question here is the mapping, not the library.
import JSZip from "jszip";
import "./dom.js";

const ZW = "​";
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ------------------------------------------------------------------ export
export async function exportDocx({ doc, changes }) {
  let wid = 1;
  const revAttrs = (id) => {
    const c = changes[id] ?? { author: "Desconocido", date: "2026-11-21T10:00:00Z" };
    return `w:id="${wid++}" w:author="${esc(c.author)}" w:date="${c.date.replace(/\.\d+Z$/, "Z")}"`;
  };
  const markOf = (node, name) => (node.marks ?? []).find((m) => m.type === name);
  const rPr = (node) => {
    const bold = markOf(node, "bold") ? "<w:b/>" : "";
    const ital = markOf(node, "italic") ? "<w:i/>" : "";
    return bold || ital ? `<w:rPr>${bold}${ital}</w:rPr>` : "";
  };
  const run = (text, node, deleted) =>
    `<w:r>${rPr(node)}<w:${deleted ? "delText" : "t"} xml:space="preserve">${esc(text)}</w:${deleted ? "delText" : "t"}></w:r>`;
  const inlineText = (n) => (n.type === "text" ? n.text : n.type === "citation" ? "{cit}" : "");

  // A paragraph boundary belongs to a change when the content on both sides carries the
  // same change id (suggest-changes marks a split or a join with a U+200B on each side).
  const sugg = (n) => (n?.marks ?? []).find((m) => m.type === "insertion" || m.type === "deletion");
  function boundaryRev(p, next) {
    const a = sugg(p.content?.[p.content.length - 1]);
    const b = sugg(next?.content?.[0]);
    if (a && b && a.type === b.type && a.attrs.id === b.attrs.id) return `<w:${a.type === "insertion" ? "ins" : "del"} ${revAttrs(a.attrs.id)}/>`;
    return "";
  }
  function paragraph(p, next) {
    // A whole inserted or deleted paragraph carries the mark on the node itself:
    // in Word that is every run plus the paragraph mark.
    const blockMark = sugg(p);
    const content = (p.content ?? []).map((n) => (blockMark && !sugg(n) ? { ...n, marks: [...(n.marks ?? []), blockMark] } : n));
    const pMarkRev = blockMark
      ? `<w:${blockMark.type === "insertion" ? "ins" : "del"} ${revAttrs(blockMark.attrs.id)}/>`
      : boundaryRev(p, next);
    let body = "";
    for (let i = 0; i < content.length; i++) {
      const n = content[i];
      let text = inlineText(n).replaceAll(ZW, "");
      if (!text) continue;
      const ins = markOf(n, "insertion");
      const del = markOf(n, "deletion");
      const next = content[i + 1];
      // deletion immediately followed by an insertion of the same text = format change
      if (del && next && markOf(next, "insertion") && inlineText(next) === inlineText(n)) {
        const id = markOf(next, "insertion").attrs.id;
        const old = rPr(n).replace("<w:rPr>", "").replace("</w:rPr>", "");
        const newPr = rPr(next).replace("</w:rPr>", "") || "<w:rPr>";
        body += `<w:r>${newPr}<w:rPrChange ${revAttrs(id)}><w:rPr>${old}</w:rPr></w:rPrChange></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
        i++;
        continue;
      }
      if (ins) body += `<w:ins ${revAttrs(ins.attrs.id)}>${run(text, n, false)}</w:ins>`;
      else if (del) body += `<w:del ${revAttrs(del.attrs.id)}>${run(text, n, true)}</w:del>`;
      else body += run(text, n, false);
    }
    const pPr = pMarkRev ? `<w:pPr><w:rPr>${pMarkRev}</w:rPr></w:pPr>` : "";
    return `<w:p>${pPr}${body}</w:p>`;
  }
  function block(b, i, all) {
    if (b.type === "paragraph") return paragraph(b, all[i + 1]?.type === "paragraph" ? all[i + 1] : null);
    if (b.type === "table") {
      const rows = b.content
        .map((r) => `<w:tr>${r.content.map((c) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${c.content.map((cp, i) => paragraph(cp, c.content[i + 1])).join("")}</w:tc>`).join("")}</w:tr>`)
        .join("");
      const grid = `<w:tblGrid>${b.content[0].content.map(() => '<w:gridCol w:w="3000"/>').join("")}</w:tblGrid>`;
      return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>${grid}${rows}</w:tbl><w:p/>`;
    }
    return "";
  }
  const bodyXml = doc.content.map(block).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`;
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "nodebuffer" });
}

// ------------------------------------------------------------------ import
// Reads w:p / w:tbl with w:ins, w:del, w:rPrChange and paragraph-mark revisions back into
// { doc, changes } with the same marks. Unknown elements are skipped (prototype scope).
export async function importDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml").async("string");
  const dom = new window.DOMParser().parseFromString(xml, "application/xml");
  const changes = {};
  const byRevision = new Map(); // Word w:id -> our id
  let counter = 0;
  const kids = (el, name) => [...el.childNodes].filter((n) => n.nodeType === 1 && (!name || n.localName === name));
  const attr = (el, name) => el.getAttributeNS(W_NS, name) ?? el.getAttribute(`w:${name}`);
  // Word gives every run its own w:id; adjacent revisions of the same kind, author and
  // date are one change for the user, so they share our id.
  let lastRev = null;
  const changeId = (revEl) => {
    const key = `${revEl.localName}:${attr(revEl, "id")}`;
    if (!byRevision.has(key)) {
      const author = attr(revEl, "author") ?? "Desconocido";
      const date = attr(revEl, "date") ?? null;
      const kind = revEl.localName;
      let id;
      if (lastRev && lastRev.kind === kind && lastRev.author === author && lastRev.date === date) id = lastRev.id;
      else {
        id = `c${++counter}`;
        changes[id] = { author, date, origin: "docx" };
      }
      byRevision.set(key, id);
    }
    const id = byRevision.get(key);
    lastRev = { kind: revEl.localName, author: changes[id].author, date: changes[id].date, id };
    return id;
  };
  const runMarks = (r) => {
    const marks = [];
    const pr = kids(r, "rPr")[0];
    if (pr && kids(pr, "b").length && attr(kids(pr, "b")[0], "val") !== "0") marks.push({ type: "bold" });
    if (pr && kids(pr, "i").length && attr(kids(pr, "i")[0], "val") !== "0") marks.push({ type: "italic" });
    return marks;
  };
  const oldRunMarks = (change) => {
    const pr = kids(change, "rPr")[0];
    return pr ? runMarks({ childNodes: [pr] }) : [];
  };
  const runText = (r) =>
    kids(r)
      .map((n) => (n.localName === "t" || n.localName === "delText" ? n.textContent : n.localName === "tab" ? "\t" : ""))
      .join("");
  const textNode = (text, marks) => (marks.length ? { type: "text", text, marks } : { type: "text", text });

  function paragraph(p) {
    const content = [];
    const pushRun = (r, rev) => {
      const text = runText(r);
      if (!text) return;
      const marks = runMarks(r);
      const rprChange = kids(kids(r, "rPr")[0] ?? { childNodes: [] }, "rPrChange")[0];
      if (rprChange && !rev) {
        const id = changeId(rprChange);
        content.push(textNode(text, [...oldRunMarks(rprChange), { type: "deletion", attrs: { id } }]));
        content.push(textNode(text, [...marks, { type: "insertion", attrs: { id } }]));
        return;
      }
      if (rev) marks.push({ type: rev.localName === "ins" ? "insertion" : "deletion", attrs: { id: changeId(rev) } });
      else lastRev = null;
      content.push(textNode(text, marks));
    };
    for (const el of kids(p)) {
      if (el.localName === "r") pushRun(el, null);
      else if (el.localName === "ins" || el.localName === "del") for (const r of kids(el, "r")) pushRun(r, el);
    }
    const pPrRev = kids(kids(kids(p, "pPr")[0] ?? { childNodes: [] }, "rPr")[0] ?? { childNodes: [] }).find(
      (n) => n.localName === "ins" || n.localName === "del",
    );
    const pMark = pPrRev ? { type: pPrRev.localName === "ins" ? "insertion" : "deletion", attrs: { id: changeId(pPrRev) } } : null;
    return { pMark, content };
  }
  // Word marks a split on the paragraph mark of the FIRST half; suggest-changes puts a
  // marked U+200B at the end of the first half and at the start of the second.
  function paragraphs(ps) {
    const out = ps.map(paragraph);
    return out.map(({ pMark, content }, i) => {
      const result = [...content];
      if (pMark) result.push({ type: "text", text: ZW, marks: [pMark] });
      const prev = out[i - 1];
      if (prev?.pMark) result.unshift({ type: "text", text: ZW, marks: [prev.pMark] });
      return { type: "paragraph", attrs: { id: null }, content: result };
    });
  }
  const body = dom.getElementsByTagNameNS(W_NS, "body")[0];
  const blocks = [];
  let pending = [];
  const flush = () => {
    blocks.push(...paragraphs(pending));
    pending = [];
  };
  for (const el of kids(body)) {
    if (el.localName === "p") pending.push(el);
    else if (el.localName === "tbl") {
      flush();
      blocks.push({
        type: "table",
        content: kids(el, "tr").map((tr) => ({
          type: "table_row",
          content: kids(tr, "tc").map((tc) => ({ type: "table_cell", content: paragraphs(kids(tc, "p")) })),
        })),
      });
    }
  }
  flush();
  // drop empty paragraphs (Word's mandatory one after a table, the final one)
  const docBlocks = blocks.filter((b) => b.type !== "paragraph" || b.content.length);
  return { doc: { type: "doc", content: docBlocks }, changes };
}
