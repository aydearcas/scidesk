// Compares a pasted ProseMirror table with the ground truth read from the DOCX
// (tools/docx_tables.py): structure (rows and merged cells), text, paragraphs per cell
// and inline formatting (superscript, subscript, bold, italic).
const norm = (s) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
const nonSpace = (s) => s.replace(/\s/g, "").length;

export function tablesIn(doc) {
  const out = [];
  doc.descendants((node) => {
    if (node.type.name === "table") {
      out.push(node);
      return false;
    }
    return true;
  });
  return out;
}

export function gridOf(table) {
  const rows = [];
  table.forEach((row) => {
    const cells = [];
    row.forEach((cell) => {
      const paras = [];
      const fmt = { b: 0, i: 0, sup: 0, sub: 0 };
      // every textblock in the cell, also inside lists
      cell.descendants((block) => {
        if (!block.isTextblock) return true;
        paras.push(block.textContent);
        block.descendants((n) => {
          if (!n.isText) return;
          const k = nonSpace(n.text);
          for (const m of n.marks) {
            if (m.type.name === "bold") fmt.b += k;
            if (m.type.name === "italic") fmt.i += k;
            if (m.type.name === "superscript") fmt.sup += k;
            if (m.type.name === "subscript") fmt.sub += k;
          }
        });
        return false;
      });
      cells.push({ colspan: cell.attrs.colspan, rowspan: cell.attrs.rowspan, paras, fmt, header: cell.type.name === "tableHeader" });
    });
    rows.push(cells);
  });
  return rows;
}

// Returns { ok, checks: {structure, text, paragraphs, sup, sub, bold, italic}, problems: [...] }
export function compare(truth, doc, { boldWant } = {}) {
  const tables = tablesIn(doc);
  const problems = [];
  if (tables.length !== 1) return { ok: false, checks: { found: false }, problems: [`${tables.length} tablas tras pegar`] };
  const got = gridOf(tables[0]);
  const want = truth.grid;
  let structure = got.length === want.length;
  if (!structure) problems.push(`filas: ${got.length} en lugar de ${want.length}`);
  let textCells = 0, textOk = 0, paraOk = 0;
  const fmtGot = { b: 0, i: 0, sup: 0, sub: 0 }, fmtWant = { b: 0, i: 0, sup: 0, sub: 0 };
  for (let r = 0; r < Math.min(got.length, want.length); r++) {
    const g = got[r], w = want[r];
    const spans = (row) => row.map((c) => `${c.colspan}x${c.rowspan}`).join(" ");
    if (spans(g) !== spans(w)) {
      structure = false;
      if (problems.length < 8) problems.push(`fila ${r + 1}: celdas ${spans(g)} en lugar de ${spans(w)}`);
    }
    for (let c = 0; c < Math.min(g.length, w.length); c++) {
      textCells++;
      const gt = norm(g[c].paras.join(" ")), wt = norm(w[c].paras.join(" "));
      if (gt === wt) textOk++;
      else if (problems.length < 8) {
        let d = 0;
        while (d < gt.length && gt[d] === wt[d]) d++;
        const a = Math.max(0, d - 15);
        problems.push(`texto fila ${r + 1} celda ${c + 1} desde el carácter ${d}: ${JSON.stringify(gt.slice(a, d + 25))} ≠ ${JSON.stringify(wt.slice(a, d + 25))}`);
      }
      const gp = g[c].paras.filter((p) => norm(p)).length, wp = w[c].paras.filter((p) => norm(p)).length;
      if (gp === wp) paraOk++;
      else if (problems.length < 8) problems.push(`párrafos fila ${r + 1} celda ${c + 1}: ${gp} en lugar de ${wp}`);
      for (const k of Object.keys(fmtGot)) {
        fmtGot[k] += g[c].fmt[k];
        fmtWant[k] += w[c].fmt[k];
      }
    }
  }
  // Bold from paragraph and table styles is real bold for the reader; Word's own count
  // (tools/word-bold.ps1) replaces the direct-formatting count from the XML when available.
  if (boldWant !== undefined) fmtWant.b = boldWant;
  const ratio = (k) => (fmtWant[k] === 0 ? (fmtGot[k] === 0 ? 1 : 0) : Math.min(fmtGot[k], fmtWant[k]) / Math.max(fmtGot[k], fmtWant[k]));
  const checks = {
    found: true,
    structure,
    text: textCells > 0 && textOk === textCells,
    paragraphs: textCells > 0 && paraOk === textCells,
    sup: ratio("sup") === 1,
    sub: ratio("sub") === 1,
    bold: ratio("b") >= 0.95,
    italic: ratio("i") >= 0.95,
    // rows Word repeats on every page (w:tblHeader) must arrive as header rows
    header: JSON.stringify(got.map((row, i) => (row.every((c) => c.header) ? i : -1)).filter((i) => i >= 0)) === JSON.stringify(truth.headerRows ?? []),
  };
  for (const k of ["sup", "sub", "b", "i"]) if (fmtGot[k] !== fmtWant[k] && problems.length < 10) problems.push(`formato ${k}: ${fmtGot[k]} caracteres en lugar de ${fmtWant[k]}`);
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks, problems, textOk, textCells, header: got[0]?.some((c) => c.header) ?? false };
}

// What a browser gets from Word's CF_HTML clipboard format: the markup between StartHTML and EndHTML.
export function cfHtmlToMarkup(cf) {
  const start = Number(/StartHTML:(\d+)/.exec(cf)?.[1] ?? -1);
  const end = Number(/EndHTML:(\d+)/.exec(cf)?.[1] ?? -1);
  if (start < 0) return cf;
  // offsets are in UTF-8 bytes
  const bytes = new TextEncoder().encode(cf);
  return new TextDecoder().decode(bytes.slice(start, end));
}
