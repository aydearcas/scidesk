// The lines of the tables in the editor (record 0076): each cell drawn with the lines the
// core computes for the Word and the PDF (the table's style, then the cells' own borders),
// and a faint dashed gridline where there is none, as Word's "View gridlines". And the
// commands: a table's style, and Word's border presets on the selected cells with a pen
// (line style, width, colour). A border on the edge of the selection is set on the
// neighbouring cell too, so both sides of the edge always agree.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNodeType } from "@tiptap/pm/model";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import { resolveBorders, tableStyleOf, type BorderSpec, type CellBorders, type Line, type Side, type TableStyle } from "@scidesk/core";

/** The journal's table style, set by the window (as the section numbering). */
export const tableLines: { journalStyle: string | null } = { journalStyle: null };
export const tableLinesKey = new PluginKey<DecorationSet>("tableLines");

const CSS_STYLE = { single: "solid", double: "double", dashed: "dashed", dotted: "dotted" } as const;
const css = (side: Side, l: Line | null) => (l
  ? `border-${side}: ${l.style === "double" ? `max(3px, calc(${l.width * 3}pt * var(--zoom)))` : `max(1px, calc(${l.width}pt * var(--zoom)))`} ${CSS_STYLE[l.style]} ${l.color};`
  : `border-${side}: 1px dashed var(--gridline-on, transparent);`);

interface Resolved { key: string; styles: string[][]; lines: ReturnType<typeof resolveBorders>; at: Map<number, [number, number]> }
const cache = new WeakMap<PMNodeType, Resolved>();
/** The lines of every cell of a table node, their style attributes, and each cell's row and index by its offset in the table. */
function resolved(table: PMNodeType): Resolved {
  const key = tableLines.journalStyle ?? "";
  const hit = cache.get(table);
  if (hit && hit.key === key) return hit;
  const rows: { colspan: number; rowspan: number; header: boolean; borders: CellBorders | null }[][] = [];
  table.forEach((row) => {
    const cells: (typeof rows)[number] = [];
    row.forEach((c) => cells.push({ colspan: c.attrs.colspan as number, rowspan: c.attrs.rowspan as number, header: c.type.name === "tableHeader", borders: (c.attrs.borders as CellBorders | null) ?? null }));
    rows.push(cells);
  });
  const lines = resolveBorders(tableStyleOf(table.attrs.style, tableLines.journalStyle), rows);
  const styles = lines.map((row) => row.map((b) => (["top", "bottom", "left", "right"] as const).map((s) => css(s, b[s])).join(" ")));
  const at = new Map<number, [number, number]>();
  table.forEach((row, rowOffset, i) => row.forEach((_c, cellOffset, j) => at.set(rowOffset + 1 + cellOffset, [i, j])));
  const value = { key, styles, lines, at };
  cache.set(table, value);
  return value;
}
const cellStyles = (table: PMNodeType) => resolved(table).styles;

function decorations(doc: PMNodeType): DecorationSet {
  const out: Decoration[] = [];
  const table = (node: PMNodeType, pos: number) => {
    const styles = cellStyles(node);
    let rowPos = pos + 1;
    node.forEach((row, _o, i) => {
      let cellPos = rowPos + 1;
      row.forEach((cell, _c, j) => {
        out.push(Decoration.node(cellPos, cellPos + cell.nodeSize, { style: styles[i]?.[j] ?? "" }));
        cellPos += cell.nodeSize;
      });
      rowPos += row.nodeSize;
    });
  };
  // tables are inside table parts, at the top of the manuscript (or the root of a table's tab)
  const visit = (node: PMNodeType, pos: number) => {
    if (node.type.name === "table") table(node, pos);
    else if (node.type.name === "tablePart") node.forEach((child, offset) => visit(child, pos + 1 + offset));
  };
  if (doc.type.name === "tablePart") doc.forEach((child, offset) => visit(child, offset));
  else doc.forEach((child, offset) => visit(child, offset));
  return DecorationSet.create(doc, out);
}

/** The plugin, for the manuscript and the tables' tabs. */
export const tableLinesPlugin = () => new Plugin<DecorationSet>({
  key: tableLinesKey,
  state: {
    init: (_, state) => decorations(state.doc),
    apply: (tr, old, _o, state) => (tr.docChanged || tr.getMeta(tableLinesKey) ? decorations(state.doc) : old),
  },
  props: {
    // the table being edited shows its gridlines (where there is no line); the others, none
    decorations: (state) => {
      const base = tableLinesKey.getState(state);
      const t = around(state);
      if (!base || !t || t.tablePos < 0) return base;
      return base.add(state.doc, [Decoration.node(t.tablePos, t.tablePos + t.node.nodeSize, { class: "editing-grid" })]);
    },
  },
});
export const TableLines = Extension.create({ name: "tableLines", addProseMirrorPlugins: () => [tableLinesPlugin()] });

/** Sets the journal's style (the default of tables without their own) and redraws. */
export function setJournalTableStyle(view: { state: EditorState; dispatch: (tr: Transaction) => void }, style: string | null) {
  if (tableLines.journalStyle === style) return;
  tableLines.journalStyle = style;
  view.dispatch(view.state.tr.setMeta(tableLinesKey, true).setMeta("addToHistory", false));
}

// ---------------------------------------------------------------- commands

/** The table around the selection: its node, position and map, and the selected rectangle of the grid. */
function around(state: EditorState) {
  const sel = state.selection;
  const $a = sel instanceof CellSelection ? sel.$anchorCell : sel.$from;
  for (let d = $a.depth; d >= 0; d--) {
    const node = $a.node(d);
    if (node.type.spec.tableRole !== "table") continue;
    const start = d === 0 ? 0 : $a.start(d);
    const map = TableMap.get(node);
    let rect: { left: number; right: number; top: number; bottom: number };
    if (sel instanceof CellSelection) rect = map.rectBetween(sel.$anchorCell.pos - start, sel.$headCell.pos - start);
    else {
      let cellPos = -1;
      for (let e = $a.depth; e > d; e--) if (/^table(Cell|Header)$/.test($a.node(e).type.name)) { cellPos = $a.before(e) - start; break; }
      if (cellPos < 0) return null;
      rect = map.findCell(cellPos);
    }
    return { node, tablePos: d === 0 ? -1 : $a.before(d), start, map, rect };
  }
  return null;
}

/** The style of the table around the selection (null: the journal's), or undefined outside a table. */
export function tableStyleAt(state: EditorState): TableStyle | null | undefined {
  const t = around(state);
  return t ? ((t.node.attrs.style as TableStyle | null) ?? null) : undefined;
}

/** Sets the table's style (null: the journal's). */
/**
 * Sets the table's style (null: the journal's). As Word does when a table style is chosen, the
 * cells' own borders go: the style shows whole (one step, undone at once).
 */
export function setTableStyle(style: TableStyle | null) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const t = around(state);
    if (!t || t.tablePos < 0) return false;
    if (dispatch) {
      const tr = state.tr.setNodeAttribute(t.tablePos, "style", style);
      t.node.descendants((cell, offset) => {
        if (!/^table(Cell|Header)$/.test(cell.type.name)) return true;
        if (cell.attrs.borders) tr.setNodeAttribute(t.tablePos + 1 + offset, "borders", null);
        return false;
      });
      dispatch(tr);
    }
    return true;
  };
}

export type BorderPreset = "bottom" | "top" | "left" | "right" | "none" | "all" | "outside" | "inside" | "insideH" | "insideV" | "reset";
export interface Pen { style: "single" | "double" | "dashed" | "dotted"; width: number; color: string }
/** The pen, kept while the window is open (Word keeps it too). */
export const pen: Pen = { style: "single", width: 0.5, color: "#000000" };

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };
type Rect = { left: number; right: number; top: number; bottom: number };

/** The grid edges a preset touches in the selected rectangle, as (row, column, side) of the cell inside it. */
function presetEdges(preset: BorderPreset, rect: Rect): { row: number; col: number; side: Side }[] {
  const out: { row: number; col: number; side: Side }[] = [];
  for (let row = rect.top; row < rect.bottom; row++) {
    for (let col = rect.left; col < rect.right; col++) {
      const top = row === rect.top, bottom = row === rect.bottom - 1, left = col === rect.left, right = col === rect.right - 1;
      for (const side of ["top", "bottom", "left", "right"] as const) {
        const outer = (side === "top" && top) || (side === "bottom" && bottom) || (side === "left" && left) || (side === "right" && right);
        const innerH = (side === "top" && !top) || (side === "bottom" && !bottom);
        const innerV = (side === "left" && !left) || (side === "right" && !right);
        const take = preset === "top" ? side === "top" && top
          : preset === "bottom" ? side === "bottom" && bottom
          : preset === "left" ? side === "left" && left
          : preset === "right" ? side === "right" && right
          : preset === "outside" ? outer
          : preset === "inside" ? innerH || innerV
          : preset === "insideH" ? innerH
          : preset === "insideV" ? innerV
          : true; // all, none, reset
        if (take) out.push({ row, col, side });
      }
    }
  }
  return out;
}

/** The current line of each edge of a preset (null where there is none). */
function edgeLines(t: NonNullable<ReturnType<typeof around>>, preset: BorderPreset) {
  const r = resolved(t.node);
  return presetEdges(preset, t.rect).map(({ row, col, side }) => {
    const ij = r.at.get(t.map.map[row * t.map.width + col]);
    return ij ? r.lines[ij[0]]?.[ij[1]]?.[side] ?? null : null;
  });
}

/**
 * Which presets the selected cells already have (record 0076): every edge of the preset with a
 * line (for "none", no line at all); and whether the selection has inner edges at all.
 */
export function bordersState(state: EditorState): { active: Set<BorderPreset>; innerH: boolean; innerV: boolean } | null {
  const t = around(state);
  if (!t) return null;
  const active = new Set<BorderPreset>();
  for (const preset of ["bottom", "top", "left", "right", "all", "outside", "inside", "insideH", "insideV"] as const) {
    const lines = edgeLines(t, preset);
    if (lines.length && lines.every(Boolean)) active.add(preset);
  }
  if (edgeLines(t, "all").every((l) => !l)) active.add("none");
  return { active, innerH: t.rect.bottom - t.rect.top > 1, innerV: t.rect.right - t.rect.left > 1 };
}

/**
 * Word's border presets on the selected cells (and the neighbours across the edges they touch).
 * A preset the cells already have is taken away (its edges get no line), as in Word.
 */
export function applyBorders(preset: BorderPreset, p: Pen = pen) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const t = around(state);
    if (!t) return false;
    if (!dispatch) return true;
    const { map, rect, start } = t;
    const line: BorderSpec = { style: p.style, width: p.width, color: p.color.toUpperCase() };
    const noLine: BorderSpec = { style: "none" };
    const lines = edgeLines(t, preset);
    const off = preset !== "none" && preset !== "reset" && lines.length > 0 && lines.every(Boolean);
    const value: BorderSpec | null = preset === "reset" ? null : preset === "none" || off ? noLine : line;
    // what each cell (by its position in the table) gets, side by side; null removes the cell's own
    const changes = new Map<number, Partial<Record<Side, BorderSpec | null>>>();
    const set = (cellPos: number, side: Side, v: BorderSpec | null) => { const c = changes.get(cellPos) ?? {}; c[side] = v; changes.set(cellPos, c); };
    for (const { row, col, side } of presetEdges(preset, rect)) {
      const inside = map.map[row * map.width + col];
      set(inside, side, value);
      const r2 = side === "top" ? row - 1 : side === "bottom" ? row + 1 : row;
      const c2 = side === "left" ? col - 1 : side === "right" ? col + 1 : col;
      if (r2 >= 0 && r2 < map.height && c2 >= 0 && c2 < map.width) {
        const other = map.map[r2 * map.width + c2];
        if (other !== inside) set(other, OPPOSITE[side], value);
      }
    }
    const tr = state.tr;
    for (const [cellPos, sides] of changes) {
      const pos = start + cellPos;
      const cell = tr.doc.nodeAt(pos);
      if (!cell) continue;
      const own: CellBorders = { ...((cell.attrs.borders as CellBorders | null) ?? {}) };
      for (const [side, value2] of Object.entries(sides) as [Side, BorderSpec | null][]) {
        if (value2) own[side] = value2; else delete own[side];
      }
      tr.setNodeAttribute(pos, "borders", Object.keys(own).length ? own : null);
    }
    dispatch(tr);
    return true;
  };
}
