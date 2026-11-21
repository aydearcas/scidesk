// Pasting from Word (R23, records 0022 and 0042). The clipboard's HTML goes through a
// cleaner of Office's quirks (prototype 1: 135/135 real tables right), and every table in
// it is read into plain data for the core, which makes it a .scitable with its caption and
// notes. What is not a table is pasted as usual by the editor's schema.
import { sameFormat, type PastedCell, type PastedTable, type Run } from "@scidesk/core";
import { NOTE_START } from "@scidesk/core";
import { HIGHLIGHT_COLORS } from "@scidesk/formats";
import { cssColor } from "./editor.ts";

const SYMBOLS: Record<string, Record<string, string>> = {
  "wingdings 2": { P: "✓", O: "✗", R: "☑", T: "☒", "£": "☐" },
  wingdings: { "ü": "✓", "û": "✗", "þ": "☑", "ý": "☒", "¨": "☐" },
  symbol: {
    a: "α", b: "β", g: "γ", d: "δ", e: "ε", z: "ζ", h: "η", q: "θ", k: "κ", l: "λ", m: "μ", n: "ν", p: "π", r: "ρ", s: "σ", t: "τ", f: "φ", c: "χ", y: "ψ", w: "ω",
    D: "Δ", G: "Γ", L: "Λ", P: "Π", S: "Σ", F: "Φ", W: "Ω",
    "³": "≥", "£": "≤", "±": "±", "´": "×", "¸": "÷", "¹": "≠", "»": "≈", "®": "→", "¬": "←", "°": "°", "¥": "∞",
  },
};

export const isOfficeHtml = (html: string) => /urn:schemas-microsoft-com:office|mso-|class="?Mso/i.test(html);

function textNodes(el: Element): Text[] {
  const out: Text[] = [];
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}
const nextElement = (n: Node) => { let x = n.nextSibling; while (x && (x.nodeType === 8 || (x.nodeType === 3 && !x.textContent!.trim()))) x = x.nextSibling; return x; };
const prevElement = (n: Node) => { let x = n.previousSibling; while (x && (x.nodeType === 8 || (x.nodeType === 3 && !x.textContent!.trim()))) x = x.previousSibling; return x; };

/**
 * The cleaner of prototype 1, as transformPastedHTML: symbol fonts to Unicode, Word's list
 * paragraphs to lists, header rows marked, nested tables to paragraphs, and only the body
 * kept. Also: images with a local path (file:///…msohtmlclip…) are dropped, so that no path
 * of the user's computer stays in the project.
 */
export function cleanOfficeHtml(html: string): string {
  if (!isOfficeHtml(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  for (const op of [...body.getElementsByTagName("o:p")]) op.remove();
  for (const img of [...body.querySelectorAll("img, v\\:imagedata, v\\:shape")]) if (/^file:|^[a-z]:\\/i.test(img.getAttribute("src") ?? img.getAttribute("o:href") ?? "file:")) img.remove();

  // 1. symbol fonts -> Unicode
  for (const el of body.querySelectorAll("span[style]")) {
    const st = el.getAttribute("style")!;
    const m = /mso-symbol-font-family:\s*"?([^";']+)"?/i.exec(st) ?? /font-family:\s*"?(Wingdings 2|Wingdings|Symbol)"?\s*(;|$)/i.exec(st);
    const map = m && SYMBOLS[m[1].trim().toLowerCase()];
    if (!map) continue;
    // Word for Mac shifts the font's letter to the private use area (U+F050 = 0xF000 + "P")
    const sym = (ch: string) => { const c = ch.codePointAt(0)!; return c >= 0xf020 && c <= 0xf0ff ? String.fromCharCode(c - 0xf000) : ch; };
    for (const t of textNodes(el)) t.data = [...t.data].map((ch) => map[ch] ?? map[sym(ch)] ?? ch).join("");
    el.removeAttribute("style");
  }

  // 2. Word lists -> <ul>/<ol>
  for (const ign of body.querySelectorAll("span[style*='mso-list:Ignore'], span[style*='mso-list: Ignore']")) {
    const p = ign.closest("p");
    if (p) p.dataset.listMarker = (ign.textContent ?? "").replace(/ /g, " ").trim();
    ign.remove();
  }
  const isListPara = (n: Node | null): n is HTMLElement => n?.nodeType === 1 && (n as Element).tagName === "P" && (n as HTMLElement).dataset.listMarker !== undefined;
  for (const p of [...body.querySelectorAll<HTMLElement>("p[data-list-marker]")]) {
    if (!p.isConnected || isListPara(prevElement(p))) continue;
    const ordered = /^\(?([0-9]+|[a-zA-Z]|[ivxlc]+)[.)]$/.test(p.dataset.listMarker!);
    const list = doc.createElement(ordered ? "ol" : "ul");
    p.before(list);
    let cur: Node | null = p;
    while (isListPara(cur)) {
      const next = nextElement(cur);
      const li = doc.createElement("li");
      delete cur.dataset.listMarker;
      li.append(cur);
      list.append(li);
      cur = next;
    }
  }

  // 3. header rows
  for (const tr of body.querySelectorAll("thead > tr")) {
    for (const td of [...tr.children].filter((c) => c.tagName === "TD")) {
      const th = doc.createElement("th");
      for (const a of td.attributes) th.setAttribute(a.name, a.value);
      th.append(...td.childNodes);
      td.replaceWith(th);
    }
  }

  // 4. nested tables -> one paragraph per row (innermost first)
  for (const t of [...body.querySelectorAll("td table, th table")].reverse()) {
    const paras = [...t.querySelectorAll(":scope > tbody > tr, :scope > thead > tr, :scope > tr")].map((tr) => {
      const p = doc.createElement("p");
      [...tr.children].forEach((cell, i) => {
        if (i > 0) p.append("\t");
        const blocks = [...cell.querySelectorAll("p")];
        (blocks.length ? blocks : [cell]).forEach((b, j) => { if (j > 0) p.append(" "); p.append(...b.childNodes); });
      });
      return p;
    });
    t.replaceWith(...paras);
  }
  return body.innerHTML;
}

// ---------------------------------------------------------------- reading the cleaned HTML

/** Formatted runs of an element, with Word's line wrapping undone. */
function runsOf(el: Node): Run[] {
  const out: Run[] = [];
  const visit = (n: Node, f: Omit<Run, "text">) => {
    if (n.nodeType === 3) { out.push({ text: n.textContent!.replace(/[\t\r\n ]+/g, " "), ...f }); return; }
    if (n.nodeType !== 1) return;
    const e = n as HTMLElement;
    const tag = e.tagName.toLowerCase();
    if (tag === "br") { out.push({ text: " ", ...f }); return; }
    const st = e.getAttribute("style") ?? "";
    const g = { ...f };
    if (tag === "b" || tag === "strong" || /font-weight:\s*(bold|[6-9]00)/i.test(st)) g.bold = true;
    if (/font-weight:\s*normal/i.test(st)) delete g.bold;
    if (tag === "i" || tag === "em" || /font-style:\s*italic/i.test(st)) g.italic = true;
    if (tag === "sup" || /vertical-align:\s*super/i.test(st)) g.sup = true;
    if (tag === "sub" || /vertical-align:\s*sub/i.test(st)) g.sub = true;
    if (tag === "u" || /text-decoration:[^;]*underline/i.test(st)) g.underline = true;
    const color = cssColor(/(?:^|;)\s*color:\s*([^;]+)/i.exec(st)?.[1]);
    if (color) g.color = color;
    const hl = /mso-highlight:\s*([a-zA-Z]+)/i.exec(st)?.[1];
    if (hl && (HIGHLIGHT_COLORS as readonly string[]).includes(hl)) g.highlight = hl;
    e.childNodes.forEach((c) => visit(c, g));
  };
  visit(el, {});
  // trim the paragraph and merge runs with the same format
  const merged: Run[] = [];
  for (const r of out) {
    const last = merged.at(-1);
    if (last && sameFormat(last, r)) last.text += r.text;
    else merged.push({ ...r });
  }
  if (merged[0]) merged[0].text = merged[0].text.replace(/^\s+/, "");
  if (merged.at(-1)) merged.at(-1)!.text = merged.at(-1)!.text.replace(/\s+$/, "");
  return merged.filter((r) => r.text);
}
const plain = (runs: Run[]) => runs.map((r) => r.text).join("");

function alignOf(el: Element): PastedCell["align"] {
  const p = el.querySelector("p") ?? el;
  const a = (p.getAttribute("align") ?? /text-align:\s*(\w+)/i.exec(p.getAttribute("style") ?? "")?.[1] ?? el.getAttribute("align") ?? "").toLowerCase();
  return a === "center" ? "center" : a === "right" ? "right" : null;
}
function widthOf(el: Element): number {
  const pt = /(?:^|;)\s*width:\s*([\d.]+)pt/i.exec(el.getAttribute("style") ?? "")?.[1];
  return Number(pt ?? el.getAttribute("width") ?? 0);
}

function readTable(t: HTMLTableElement): Omit<PastedTable, "caption" | "notes"> {
  const rows = [...t.rows].map((tr) => [...tr.cells].map((c): PastedCell => {
    const blocks = [...c.querySelectorAll(":scope > p, :scope > div > p, :scope > ul > li > p, :scope > ol > li > p, :scope > li, :scope > h1, :scope > h2, :scope > h3")];
    const paras = (blocks.length ? blocks : [c]).map(runsOf).filter((r) => r.length);
    return { header: c.tagName === "TH", colspan: c.colSpan || 1, rowspan: c.rowSpan || 1, align: alignOf(c), paras };
  }));
  const width = Math.max(1, ...rows.map((r) => r.reduce((n, c) => n + c.colspan, 0)));
  const plainRow = [...t.rows].find((tr) => tr.cells.length === width);
  const widths = plainRow ? [...plainRow.cells].map(widthOf) : null;
  return { rows, widths: widths?.every((w) => w > 0) ? widths : null };
}

export type PasteSegment = { kind: "html"; html: string } | { kind: "table"; table: PastedTable };

/**
 * The cleaned HTML in order: stretches of ordinary content, and tables with the caption
 * paragraph before them ("Tabla 1. …") and the note paragraphs after them.
 */
export function readPaste(cleanHtml: string): PasteSegment[] {
  const doc = new DOMParser().parseFromString(cleanHtml, "text/html");
  let root: Element = doc.body;
  // Word wraps everything in <div class=WordSection1>
  while (root.children.length === 1 && root.children[0].tagName === "DIV" && !root.querySelector(":scope > table")) root = root.children[0];
  const nodes = [...root.childNodes].filter((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent!.trim()));
  const segments: PasteSegment[] = [];
  let html: Node[] = [];
  const flush = () => {
    if (html.length) segments.push({ kind: "html", html: html.map((n) => (n.nodeType === 1 ? (n as Element).outerHTML : n.textContent)).join("") });
    html = [];
  };
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const table = n.nodeType === 1 ? ((n as Element).tagName === "TABLE" ? (n as HTMLTableElement) : (n as Element).querySelector<HTMLTableElement>(":scope > table")) : null;
    if (!table) { html.push(n); continue; }
    // the caption: the paragraph just before, if it says "Tabla N."
    let caption: Run[] | null = null;
    const before = html.at(-1);
    if (before?.nodeType === 1 && /^P$/.test((before as Element).tagName) && /^\s*(tabla|table)\s+\d+/i.test(before.textContent ?? "")) {
      caption = runsOf(before);
      html.pop();
    }
    flush();
    // the notes: the paragraphs just after that look like notes
    const notes: Run[][] = [];
    while (i + 1 < nodes.length) {
      const next = nodes[i + 1];
      if (next.nodeType !== 1 || (next as Element).tagName !== "P") break;
      const runs = runsOf(next);
      if (!runs.length || !NOTE_START.test(plain(runs)) || plain(runs).length > 500) break;
      notes.push(runs);
      i++;
    }
    segments.push({ kind: "table", table: { caption, ...readTable(table), notes } });
  }
  flush();
  return segments;
}
