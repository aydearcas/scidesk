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

/** Where a note letter starts in a note paragraph: in the text, from `at`, `length` characters long. */
interface NoteMark { at: number; length: number; letter: string }

/**
 * The notes of the paragraphs after a pasted table (record 0085). A note starts with its letter,
 * in superscript ("ᵃ Con metotrexato.") or as text ("a. Con metotrexato.", "a) …"). Word often
 * writes all of them in one paragraph, or with line breaks that arrive as spaces: a letter
 * inside a paragraph starts a new note when it is the next one in order (a, b, c…), after the
 * end of a sentence or a wide space, and, written as text, when a cell calls it.
 */
export function splitNotes(paras: Run[][], calls: Set<string>): { letter: string | null; runs: Run[] }[] {
  const out: { letter: string | null; runs: Run[] }[] = [];
  let last = ""; // the letter of the last note, across paragraphs
  for (const runs of paras) {
    const full = text(runs);
    const marks: NoteMark[] = [];
    // superscript letters, and letters written as text
    let at = 0;
    for (const r of runs) {
      const t = r.text.trim();
      if (r.sup && LETTER.test(t)) marks.push({ at: at + r.text.indexOf(t), length: t.length, letter: t });
      at += r.text.length;
    }
    for (const m of full.matchAll(/(^|\s)([a-z])[.)]\s+/g)) {
      const start = m.index! + m[1].length;
      if (!marks.some((k) => k.at === start)) marks.push({ at: start, length: m[0].length - m[1].length, letter: m[2] });
    }
    marks.sort((a, b) => a.at - b.at);
    const taken: NoteMark[] = [];
    for (const k of marks) {
      const lead = !full.slice(0, k.at).trim();
      const next = last ? String.fromCharCode(last.charCodeAt(0) + 1) : "a";
      const sup = runs.some((r) => r.sup && r.text.trim() === k.letter);
      if (lead) { if (sup || calls.has(k.letter) || /^[a-z][.)]/.test(full.slice(k.at))) { taken.push(k); last = k.letter; } continue; }
      const before = full.slice(0, k.at);
      const boundary = /([.;:)\]]\s*|\s{2,})$/.test(before);
      if (k.letter === next && boundary && (sup || calls.has(k.letter))) { taken.push(k); last = k.letter; }
    }
    // the pieces: the text before the first letter, and each note from its letter on
    const cuts = [0, ...taken.map((k) => k.at), full.length];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const k = i > 0 ? taken[i - 1] : null;
      const piece = trimRuns(sliceRuns(runs, k ? k.at + k.length : cuts[i], cuts[i + 1]));
      if (k || piece.length) out.push({ letter: k?.letter ?? null, runs: piece });
    }
  }
  return out;
}
const sliceRuns = (runs: Run[], from: number, to: number): Run[] => {
  const out: Run[] = [];
  let at = 0;
  for (const r of runs) {
    const a = Math.max(from, at), b = Math.min(to, at + r.text.length);
    if (b > a) out.push({ ...r, text: r.text.slice(a - at, b - at) });
    at += r.text.length;
  }
  return out;
};
const trimRuns = (runs: Run[]): Run[] => {
  const out = runs.map((r) => ({ ...r }));
  if (out[0]) out[0].text = out[0].text.replace(/^\s+/, "");
  if (out.at(-1)) out.at(-1)!.text = out.at(-1)!.text.replace(/\s+$/, "");
  return out.filter((r) => r.text);
};

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

  // notes: a leading note letter makes a specific note, called from the cells; several
  // notes written in one paragraph ("a. … b. … c. …") are split (record 0085)
  const calls = new Set<string>();
  for (const r of rows) for (const c of r) for (const p of c.paras) for (const run of p) {
    if (run.sup) for (const l of run.text.split(/[\s,;]+/)) if (LETTER.test(l)) calls.add(l);
  }
  const notes = splitNotes(t.notes, calls).map((n) => ({ id: newId("n"), ...n }));
  const byLetter = new Map(notes.filter((n) => n.letter).map((n) => [n.letter!, n.id]));
  const content = (runs: Run[]): PMNode[] => {
    const out: PMNode[] = [];
    for (const r of runs) {
      // "a,b,c" in one superscript: one call per letter, the commas kept
      const tokens = r.sup ? r.text.split(/([\s,;]+)/).filter(Boolean) : [];
      const letters = tokens.filter((x) => !/^[\s,;]+$/.test(x));
      if (letters.length && letters.every((l) => byLetter.has(l))) {
        for (const x of tokens) {
          const target = byLetter.get(x);
          if (target) out.push({ type: "noteRef", attrs: { target } });
          else out.push(...inline([{ ...r, text: x }]));
        }
      } else out.push(...inline([r]));
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
