// The lines of a table (record 0076): its style (three-line, rows, grid or none; the journal's
// or three-line when it has none) and each cell's own borders, as Word's (line style, width,
// colour), over it. The lines live on the edges of the table's grid, so two cells that share
// an edge always draw the same line; the editor, the Word and the PDF all draw what this
// computes.
import { TABLE_STYLES, type PMNode } from "@scidesk/formats";

export type TableStyle = (typeof TABLE_STYLES)[number];
export type Side = "top" | "bottom" | "left" | "right";
export const SIDES: readonly Side[] = ["top", "bottom", "left", "right"];
export type LineStyle = "single" | "double" | "dashed" | "dotted";
/** A drawn line. */
export interface Line { style: LineStyle; width: number; color: string }
/** A cell's own border on one side: a line, or style "none" for no line. */
export interface BorderSpec { style: LineStyle | "none"; width?: number; color?: string }
export type CellBorders = Partial<Record<Side, BorderSpec>>;

/** What the grid needs of a cell. */
export interface GridCell { colspan: number; rowspan: number; header: boolean; borders?: CellBorders | null }
/** The lines of a cell, null where there is none. */
export type ResolvedBorders = Record<Side, Line | null>;

export const THIN: Line = { style: "single", width: 0.5, color: "#000000" };
export const THICK: Line = { style: "single", width: 1, color: "#000000" };
export const DEFAULT_TABLE_STYLE: TableStyle = "three-line";

const line = (b: BorderSpec): Line | null => (b.style === "none" ? null : { style: b.style, width: b.width ?? 0.5, color: (b.color ?? "#000000").toUpperCase() });

/** Where each cell sits in the grid (rows, then cells as written), with row spans taken into account. */
export function gridPlaces(rows: GridCell[][]): { places: { r: number; c: number; rs: number; cs: number }[][]; nRows: number; nCols: number } {
  const taken: boolean[][] = [];
  const places = rows.map((row, r) => {
    let c = 0;
    return row.map((cell) => {
      while (taken[r]?.[c]) c++;
      const p = { r, c, rs: Math.max(1, cell.rowspan), cs: Math.max(1, cell.colspan) };
      for (let i = r; i < r + p.rs; i++) for (let j = c; j < c + p.cs; j++) (taken[i] ??= [])[j] = true;
      c += p.cs;
      return p;
    });
  });
  const nRows = Math.max(rows.length, ...places.flat().map((p) => p.r + p.rs));
  const nCols = Math.max(1, ...places.flat().map((p) => p.c + p.cs));
  return { places, nRows, nCols };
}

/**
 * The lines of every cell, in the shape of `rows`: the style's on the grid's edges, then each
 * cell's own borders (in order; a later cell wins on an edge it shares with an earlier one).
 */
export function resolveBorders(style: TableStyle, rows: GridCell[][]): ResolvedBorders[][] {
  const { places, nRows, nCols } = gridPlaces(rows);
  // H[r][c]: the line above grid row r at column c (r = nRows: the bottom); V[r][c]: left of column c at row r
  const H: (Line | null)[][] = Array.from({ length: nRows + 1 }, () => new Array<Line | null>(nCols).fill(null));
  const V: (Line | null)[][] = Array.from({ length: nRows }, () => new Array<Line | null>(nCols + 1).fill(null));
  const lastHeader = (() => { let h = -1; for (let r = 0; r < rows.length && rows[r].length && rows[r].every((c) => c.header); r++) h = r; return h; })();
  const hRow = (r: number, l: Line) => H[r].fill(l);
  if (style === "three-line" || style === "rows") {
    hRow(0, THICK);
    hRow(nRows, THICK);
    if (style === "rows") for (let r = 1; r < nRows; r++) hRow(r, THIN);
    else if (lastHeader >= 0 && lastHeader + 1 < nRows) hRow(lastHeader + 1, THIN);
  } else if (style === "grid") {
    for (const row of H) row.fill(THIN);
    for (const row of V) row.fill(THIN);
  }
  rows.forEach((row, i) => row.forEach((cell, j) => {
    const p = places[i][j];
    for (const side of SIDES) {
      const b = cell.borders?.[side];
      if (!b) continue;
      const l = line(b);
      if (side === "top" || side === "bottom") for (let c = p.c; c < p.c + p.cs; c++) H[side === "top" ? p.r : p.r + p.rs][c] = l;
      else for (let r = p.r; r < p.r + p.rs; r++) V[r][side === "left" ? p.c : p.c + p.cs] = l;
    }
  }));
  return places.map((row) => row.map((p) => ({
    top: H[p.r][p.c], bottom: H[p.r + p.rs][p.c], left: V[p.r][p.c], right: V[p.r][p.c + p.cs],
  })));
}

/** The style a table is drawn with: its own, else the journal's, else three-line. */
export const tableStyleOf = (own: unknown, journal?: string | null): TableStyle =>
  (TABLE_STYLES as readonly string[]).includes(own as string) ? (own as TableStyle) : (TABLE_STYLES as readonly string[]).includes(journal ?? "") ? (journal as TableStyle) : DEFAULT_TABLE_STYLE;

/** The lines of every cell of a table node (a .scitable's `table`), with the journal's style as the default. */
export function tableNodeBorders(table: PMNode, journalStyle?: string | null): ResolvedBorders[][] {
  const rows = (table.content ?? []).map((r) => (r.content ?? []).map((c) => ({
    colspan: (c.attrs?.colspan as number) ?? 1, rowspan: (c.attrs?.rowspan as number) ?? 1, header: c.type === "tableHeader", borders: (c.attrs?.borders as CellBorders | null) ?? null,
  })));
  return resolveBorders(tableStyleOf(table.attrs?.style, journalStyle), rows);
}
