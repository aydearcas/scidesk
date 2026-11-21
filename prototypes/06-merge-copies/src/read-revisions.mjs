// Reads a DOCX as SciDesk's merge needs it: paragraphs in order (body and table cells),
// each as segments of text that is unchanged, inserted or deleted (tracked changes, with
// author and date), with format changes (w:rPrChange), the revision of its paragraph mark,
// and the comments anchored in it.
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const kids = (n) => { const o = []; for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) o.push(c); return o; };
const attr = (e, a) => e.getAttributeNS(W, a) || e.getAttribute(`w:${a}`) || "";

export async function readRevisions(file) {
  const zip = await JSZip.loadAsync(readFileSync(file));
  const dom = new DOMParser().parseFromString(await zip.file("word/document.xml").async("string"), "text/xml");
  const comments = {};
  const cx = await zip.file("word/comments.xml")?.async("string");
  if (cx) for (const c of [...new DOMParser().parseFromString(cx, "text/xml").getElementsByTagNameNS(W, "comment")]) {
    comments[attr(c, "id")] = { author: attr(c, "author"), date: attr(c, "date"), text: [...c.getElementsByTagNameNS(W, "t")].map((t) => t.textContent).join("") };
  }
  const props = await zip.file("docProps/core.xml")?.async("string");
  const lastModifiedBy = /<cp:lastModifiedBy>([^<]*)</.exec(props ?? "")?.[1] ?? "";

  const paragraphs = [];
  const openComments = new Map(); // id -> { para, offset }
  let table = null;
  let tables = 0;

  function para(p, where) {
    const P = { i: paragraphs.length, where, segs: [], mark: null, comments: [] };
    const pPr = kids(p).find((e) => e.localName === "pPr");
    const markRev = pPr && kids(kids(pPr).find((e) => e.localName === "rPr") ?? pPr).find((e) => e.localName === "ins" || e.localName === "del");
    if (markRev && kids(pPr).some((e) => e.localName === "rPr")) P.mark = { kind: markRev.localName, author: attr(markRev, "author"), date: attr(markRev, "date") };
    const offset = () => P.segs.filter((s) => s.kind !== "del").reduce((n, s) => n + s.text.length, 0); // accepted-view offset
    const push = (text, kind, rev, fmt) => {
      if (!text) return;
      const last = P.segs.at(-1);
      if (last && last.kind === kind && last.author === rev?.author && !!last.fmt === !!fmt && last.fmt?.author === fmt?.author) last.text += text;
      else P.segs.push({ text, kind, author: rev?.author ?? null, date: rev?.date ?? null, ...(fmt ? { fmt } : {}) });
    };
    function run(r, kind, rev) {
      const rPr = kids(r).find((e) => e.localName === "rPr");
      const ch = rPr && kids(rPr).find((e) => e.localName === "rPrChange");
      const fmt = ch ? { author: attr(ch, "author"), date: attr(ch, "date") } : null;
      for (const e of kids(r)) {
        if (e.localName === "t" || e.localName === "delText") push(e.textContent, kind, rev, fmt);
        else if (e.localName === "tab") push("\t", kind, rev, fmt);
        else if (e.localName === "noBreakHyphen") push("‑", kind, rev, fmt);
      }
    }
    function walk(n, kind, rev) {
      for (const e of kids(n)) {
        const ln = e.localName;
        if (ln === "r") run(e, kind, rev);
        else if (ln === "ins" || ln === "moveTo") walk(e, "ins", { author: attr(e, "author"), date: attr(e, "date") });
        else if (ln === "del" || ln === "moveFrom") walk(e, "del", { author: attr(e, "author"), date: attr(e, "date") });
        else if (ln === "commentRangeStart") openComments.set(attr(e, "id"), { para: P.i, offset: offset() });
        else if (ln === "commentRangeEnd") {
          const s = openComments.get(attr(e, "id"));
          if (s) P.comments.push({ id: attr(e, "id"), startPara: s.para, start: s.offset, end: offset(), ...comments[attr(e, "id")] });
        } else if (ln === "hyperlink" || ln === "smartTag" || ln === "sdt" || ln === "sdtContent" || ln === "fldSimple") walk(e, kind, rev);
      }
    }
    walk(p, "same", null);
    paragraphs.push(P);
  }
  function block(n) {
    for (const e of kids(n)) {
      if (e.localName === "p") para(e, table ? { ...table } : null);
      else if (e.localName === "tbl") {
        const t = tables++;
        kids(e).filter((x) => x.localName === "tr").forEach((tr, r) => kids(tr).filter((x) => x.localName === "tc").forEach((tc, c) => { table = { t, r, c }; block(tc); }));
        table = null;
      } else if (e.localName === "sdt" || e.localName === "sdtContent") block(e);
    }
  }
  block(dom.getElementsByTagNameNS(W, "body")[0]);
  return { paragraphs, lastModifiedBy };
}

// texts of a paragraph in each view
export const rejected = (p) => p.segs.filter((s) => s.kind !== "ins").map((s) => s.text).join("");
export const accepted = (p) => p.segs.filter((s) => s.kind !== "del").map((s) => s.text).join("");

// "units": paragraphs as they are in the rejected view. A paragraph whose mark was inserted
// with tracked changes (a tracked split) is joined with the next one; the accepted text keeps
// a "\n" where the new mark is. Each unit keeps its segments with that "\n" as an insertion.
export function units(doc) {
  const out = [];
  let cur = null;
  for (const p of doc.paragraphs) {
    if (!cur) cur = { paras: [], segs: [], where: p.where, comments: [] };
    cur.paras.push(p.i);
    cur.segs.push(...p.segs);
    cur.comments.push(...p.comments);
    if (p.mark?.kind === "ins") { cur.segs.push({ text: "\n", kind: "ins", author: p.mark.author, date: p.mark.date }); continue; }
    if (p.mark?.kind === "del") { cur.markDeleted = p.mark; }
    out.push(cur);
    cur = null;
  }
  if (cur) out.push(cur);
  return out.map((u, i) => ({ ...u, i, rejected: u.segs.filter((s) => s.kind !== "ins").map((s) => s.text).join(""), accepted: u.segs.filter((s) => s.kind !== "del").map((s) => s.text).join("") }));
}
