// Cleaner for the HTML desktop Word puts on the clipboard (PLAN.md risk 7.1), applied as
// Tiptap's transformPastedHTML. Each rule comes from a failure seen with real tables:
//  1. Symbol fonts: Word writes a check mark as the letter "P" in Wingdings 2. Without
//     mapping, the cell shows "P".
//  2. Word lists: the bullet or number is typed text inside <span style="mso-list:Ignore">.
//     Without removing it, "- " becomes part of the text. Runs of list paragraphs become
//     real lists.
//  3. Header rows (w:tblHeader, repeated on each page) arrive as <thead> with <td> cells;
//     they become <th> so the editor knows which rows are the header.
//  4. Nested tables (not allowed in a journal table): one paragraph per row, cells
//     separated by a tab.
//  5. Nothing from <head> survives: it carries local file paths (msohtmlclip, the source
//     document's path) that SciDesk must not keep.
const SYMBOLS = {
  "wingdings 2": { P: "✓", O: "✗", R: "☑", T: "☒", "£": "☐" },
  wingdings: { "ü": "✓", "û": "✗", "þ": "☑", "ý": "☒", "¨": "☐" },
  symbol: {
    a: "α", b: "β", g: "γ", d: "δ", e: "ε", z: "ζ", h: "η", q: "θ", k: "κ", l: "λ", m: "μ", n: "ν", p: "π", r: "ρ", s: "σ", t: "τ", f: "φ", c: "χ", y: "ψ", w: "ω",
    D: "Δ", G: "Γ", L: "Λ", P: "Π", S: "Σ", F: "Φ", W: "Ω",
    "³": "≥", "£": "≤", "±": "±", "´": "×", "¸": "÷", "¹": "≠", "»": "≈", "®": "→", "¬": "←", "°": "°", "¥": "∞",
  },
};

function textNodes(el) {
  const out = [];
  const walker = el.ownerDocument.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
  while (walker.nextNode()) out.push(walker.currentNode);
  return out;
}

export function cleanOfficeHtml(html) {
  if (!/urn:schemas-microsoft-com:office|mso-/i.test(html)) return html; // not from Word
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;

  // 1. symbol fonts -> Unicode
  for (const el of body.querySelectorAll("span[style]")) {
    const st = el.getAttribute("style");
    const m = /mso-symbol-font-family:\s*"?([^";']+)"?/i.exec(st) ?? /font-family:\s*"?(Wingdings 2|Wingdings|Symbol)"?\s*(;|$)/i.exec(st);
    const map = m && SYMBOLS[m[1].trim().toLowerCase()];
    if (!map) continue;
    for (const t of textNodes(el)) t.data = [...t.data].map((ch) => map[ch] ?? ch).join("");
    el.removeAttribute("style");
  }

  // 2. Word lists -> <ul>/<ol>
  for (const ign of body.querySelectorAll("span[style*='mso-list:Ignore'], span[style*='mso-list: Ignore']")) {
    const p = ign.closest("p");
    if (p) p.dataset.listMarker = ign.textContent.replace(/ /g, " ").trim();
    ign.remove();
  }
  const isListPara = (n) => n?.nodeType === 1 && n.tagName === "P" && n.dataset.listMarker !== undefined;
  for (const p of [...body.querySelectorAll("p[data-list-marker]")]) {
    if (!p.isConnected || isListPara(prevElement(p))) continue; // only start at the first of a run
    const ordered = /^\(?([0-9]+|[a-zA-Z]|[ivxlc]+)[.)]$/.test(p.dataset.listMarker);
    const list = doc.createElement(ordered ? "ol" : "ul");
    p.before(list);
    let cur = p;
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

  // 4. nested tables -> paragraphs (innermost first)
  const nested = [...body.querySelectorAll("td table, th table")].reverse();
  for (const t of nested) {
    // keep the inline formatting (bold, superscripts) of the nested cells
    const paras = [...t.querySelectorAll(":scope > tbody > tr, :scope > thead > tr, :scope > tr")].map((tr) => {
      const p = doc.createElement("p");
      [...tr.children].forEach((cell, i) => {
        if (i > 0) p.append("\t");
        const blocks = [...cell.querySelectorAll("p")];
        (blocks.length ? blocks : [cell]).forEach((b, j) => {
          if (j > 0) p.append(" ");
          p.append(...b.childNodes);
        });
      });
      return p;
    });
    t.replaceWith(...paras);
  }

  // 5. only the body content is returned
  return body.innerHTML;
}

// Comments and whitespace sit between Word's paragraphs; skip them when grouping lists.
function nextElement(n) {
  let x = n.nextSibling;
  while (x && (x.nodeType === 8 || (x.nodeType === 3 && !x.data.trim()))) x = x.nextSibling;
  return x;
}
function prevElement(n) {
  let x = n.previousSibling;
  while (x && (x.nodeType === 8 || (x.nodeType === 3 && !x.data.trim()))) x = x.previousSibling;
  return x;
}
