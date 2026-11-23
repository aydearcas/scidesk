// A table pasted from Word becomes a table of SciDesk (records 0022 and 0042): its own
// .scitable in tables/, with the caption and the notes as objects (R11), and a tableRef
// where it was pasted. The window reads the clipboard's HTML (cleaned of Office's quirks,
// prototype 1) into the plain data below; from here on it is the same as a table of a
// Word document opened with "New from Word" (record 0036): "Tabla 1." taken off the
// caption, merged cells, header rows, alignment, relative widths. Besides, a note that
// starts with a superscript letter is a specific note, and the same superscript letter in
// a cell becomes its call (noteRef), so that the letters are computed again on export.
import { newId, type PMNode } from "@scidesk/formats";
import type { Run } from "./citations.ts";
import { saveDocument, type Project } from "./project.ts";
import { inline, stripLead, TABLE_CAPTION } from "./word-import.ts";

export interface PastedCell {
  header: boolean;
  colspan: number;
  rowspan: number;
  align: "left" | "center" | "right" | null;
  /** Paragraphs of the cell, as formatted runs. */
  paras: Run[][];
}
export interface PastedTable {
  /** The paragraph before (or the first row) that says "Tabla 1. …", if any. */
  caption: Run[] | null;
  rows: PastedCell[][];
  /** Column widths in any unit (only their proportions count), or null. */
  widths: number[] | null;
  /** Paragraphs after the table that look like notes ("Abreviaturas: …", "ᵃ …"). */
  notes: Run[][];
}

const text = (runs: Run[]) => runs.map((r) => r.text).join("");
const LETTER = /^[a-z]$/;

/** The tablePart of a pasted table, with new ids everywhere (the composite document's rule 1, record 0021). */
export function tablePartFromPaste(t: PastedTable): { part: PMNode; warnings: string[] } {
  const warnings: string[] = [];
  const rows = t.rows.filter((r) => r.length);
  let caption = t.caption;
  // a caption written in the first row, as one cell across the table
  const width = Math.max(1, ...rows.map((r) => r.reduce((n, c) => n + c.colspan, 0)));
  if (!caption && rows.length > 1 && rows[0].length === 1 && rows[0][0].colspan === width && /^\s*(tabla|table)\b/i.test(text(rows[0][0].paras[0] ?? []))) {
    caption = rows[0][0].paras[0];
    rows.shift();
  }
  if (!caption) warnings.push("the pasted table has no \"Tabla N.\" caption: its caption is empty");

  // notes: a leading superscript letter makes a specific note, called from the cells
  const notes = t.notes.map((runs) => {
    const first = runs.find((r) => r.text.trim());
    const letter = first?.sup && LETTER.test(first.text.trim()) ? first.text.trim() : null;
    let rest = runs;
    if (letter) {
      const i = runs.indexOf(first!);
      rest = [...runs.slice(0, i), ...runs.slice(i + 1)];
      rest = stripLead(rest, /^\s+/);
    }
    return { id: newId("n"), letter, runs: rest };
  });
  const byLetter = new Map(notes.filter((n) => n.letter).map((n) => [n.letter!, n.id]));
  const content = (runs: Run[]): PMNode[] => {
    const out: PMNode[] = [];
    for (const r of runs) {
      const target = r.sup ? byLetter.get(r.text.trim()) : undefined;
      if (target) out.push({ type: "noteRef", attrs: { target } });
      else out.push(...inline([r]));
    }
    return out;
  };
  const para = (runs: Run[]): PMNode => {
    const c = content(runs);
    return { type: "paragraph", attrs: { id: newId("b"), lang: null }, ...(c.length ? { content: c } : {}) };
  };

  // header rows: the leading rows whose cells are all header cells
  let headerRows = 0;
  while (headerRows < rows.length && rows[headerRows].every((c) => c.header)) headerRows++;
  if (headerRows === rows.length) headerRows = Math.min(1, rows.length - 1); // a table that is all header has a body
  const total = t.widths?.reduce((a, b) => a + b, 0) ?? 0;
  const table: PMNode = {
    type: "table",
    attrs: { id: newId("b"), columnWidths: t.widths && t.widths.length === width && total > 0 && t.widths.every((w) => w > 0) ? t.widths.map((w) => Math.round((w / total) * 1000) / 10) : null },
    content: rows.map((r, ri) => ({
      type: "tableRow",
      content: r.map((c) => ({
        type: ri < headerRows ? "tableHeader" : "tableCell",
        attrs: { colspan: Math.max(1, c.colspan), rowspan: Math.max(1, c.rowspan), align: c.align === "left" ? null : c.align },
        content: (c.paras.length ? c.paras : [[]]).map(para),
      })),
    })),
  };
  const unused = notes.filter((n) => n.letter && !JSON.stringify(table).includes(`"target":"${n.id}"`));
  if (unused.length) warnings.push(`note(s) ${unused.map((n) => n.letter).join(", ")} are not called from any cell`);
  const part: PMNode = {
    type: "tablePart",
    attrs: { id: newId("t") },
    content: [
      { type: "tableCaption", attrs: { id: newId("b"), lang: null }, ...(caption && inline(stripLead(caption, TABLE_CAPTION)).length ? { content: inline(stripLead(caption, TABLE_CAPTION)) } : {}) },
      table,
      ...notes.map((n) => ({ type: "tableNote", attrs: { id: n.id, kind: n.letter ? "specific" : "general", lang: null }, ...(inline(n.runs).length ? { content: inline(n.runs) } : {}) })),
    ],
  };
  return { part, warnings };
}

/**
 * Saves a table part as tables/tabla-<n>.scitable (the first free number) and gives the
 * tableRef that places it. The file is validated before it is written.
 */
export async function addTablePart(project: Project, folder: string, part: PMNode): Promise<{ path: string; ref: PMNode }> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  let n = 1;
  while (art.documents.has(`tables/tabla-${n}.scitable`) || (await project.fs.readText(`articles/${folder}/tables/tabla-${n}.scitable`)) !== null) n++;
  const path = `tables/tabla-${n}.scitable`;
  await saveDocument(project, art, path, { schemaVersion: 1, documentType: "table", lang: art.article.lang, doc: part, changes: {}, comments: {} } as never);
  return { path, ref: { type: "tableRef", attrs: { id: part.attrs!.id, src: path } } };
}

/**
 * A table or figure out of the project: its .scitable or .scifigure leaves the article and
 * the disk. For what the user asked to delete (an unplaced table, with a snapshot first: the
 * caller keeps one) and for a paste undone. A figure's image file stays, so that the
 * snapshot can bring the figure back. Taking a table out of the text keeps its file (rule 4,
 * record 0021): that is not this.
 */
export async function deletePartFile(project: Project, folder: string, path: string): Promise<void> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  if (!/\.(scitable|scifigure)$/.test(path)) throw new Error(`not a table or figure: ${path}`);
  art.documents.delete(path);
  await project.fs.remove(`articles/${folder}/${path}`);
}

/** Undoing a paste (phase 1 test): the tables it created leave the project, as if never pasted. */
export const discardPastedPart = deletePartFile;
