// Dragging a column border of a table (record 0053). The .scitable keeps relative widths
// (`columnWidths`, percentages of the table, record 0022), not pixels per cell, so this is
// not prosemirror-tables' columnResizing: the border between two columns moves, the two
// columns share their width, and the others keep theirs. While dragging, a guide line and
// the two percentages are drawn outside the editor's DOM (ProseMirror would re-read any
// change inside it); on release the widths are set in one step, which one undo reverts.
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** Closest a column may get, as a percentage of the table. */
export const MIN_WIDTH = 4;
/** How near the border the pointer must be, in screen pixels. */
const GRAB = 5;

/**
 * The x of every column edge of an HTML table, from its first left edge to its last right
 * edge (n + 1 values for n columns), found with the HTML table grid (colspan and rowspan);
 * null where every cell spans across the edge.
 */
export function columnEdges(table: HTMLTableElement): (number | null)[] {
  const taken: boolean[][] = [];
  const edges: (number | null)[] = [];
  const rows = [...table.rows];
  rows.forEach((row, r) => {
    let c = 0;
    for (const cell of [...row.cells]) {
      while (taken[r]?.[c]) c++;
      const rect = cell.getBoundingClientRect();
      const span = Math.max(1, cell.colSpan || 1);
      const down = Math.max(1, cell.rowSpan || 1);
      for (let i = 0; i < down; i++) for (let j = 0; j < span; j++) (taken[r + i] ??= [])[c + j] = true;
      edges[c] ??= rect.left;
      edges[c + span] ??= rect.right;
      c += span;
    }
  });
  for (let i = 0; i < edges.length; i++) edges[i] ??= null;
  return edges;
}

/** The widths after moving the border between columns `i` and `i + 1` by `delta` percentage points. */
export function moveBorder(widths: number[], i: number, delta: number): number[] {
  const pair = widths[i] + widths[i + 1];
  const left = Math.min(Math.max(widths[i] + delta, MIN_WIDTH), pair - MIN_WIDTH);
  const out = [...widths];
  out[i] = Math.round(left * 10) / 10;
  out[i + 1] = Math.round((pair - out[i]) * 10) / 10;
  return out;
}

/** The table's widths as percentages: its own, or the drawn ones when it has none. */
function currentWidths(stored: number[] | null, edges: (number | null)[]): number[] | null {
  const n = edges.length - 1;
  if (stored && stored.length === n) {
    const total = stored.reduce((a, b) => a + b, 0);
    return stored.map((w) => (w / total) * 100);
  }
  const first = edges[0];
  const last = edges[n];
  if (first == null || last == null || last <= first) return null;
  // edges no cell reaches are shared out evenly between their neighbours
  const known = edges.map((x, i) => (x == null ? null : { x, i })).filter((e): e is { x: number; i: number } => !!e);
  const xs = edges.map((x, i) => {
    if (x != null) return x;
    const a = [...known].reverse().find((e) => e.i < i)!;
    const b = known.find((e) => e.i > i)!;
    return a.x + ((b.x - a.x) * (i - a.i)) / (b.i - a.i);
  });
  return xs.slice(1).map((x, i) => ((x - xs[i]) / (last - first)) * 100);
}

interface Hit { table: HTMLTableElement; border: number; edges: (number | null)[] }

/** The inner border under the pointer, if any. */
function hitBorder(view: EditorView, e: MouseEvent): Hit | null {
  const target = e.target as HTMLElement | null;
  const table = target?.closest?.("table.part-grid") as HTMLTableElement | null;
  if (!table || !view.dom.contains(table) || !view.editable) return null;
  const edges = columnEdges(table);
  // inner borders only: the table always fills the width of the text
  for (let i = 1; i < edges.length - 1; i++) {
    const x = edges[i];
    if (x != null && Math.abs(e.clientX - x) <= GRAB) return { table, border: i - 1, edges };
  }
  return null;
}

/** The position of the table node a DOM table draws. */
function tablePos(view: EditorView, table: HTMLTableElement): number | null {
  const $pos = view.state.doc.resolve(view.posAtDOM(table, 0));
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type.name === "table") return $pos.before(d);
  return null;
}

/** The guide line and the two percentages, on the page outside the editor. */
function guide() {
  const line = document.createElement("div");
  line.className = "column-guide";
  const tip = document.createElement("div");
  tip.className = "column-guide-tip";
  document.body.append(line, tip);
  return {
    show(x: number, top: number, bottom: number, text: string) {
      Object.assign(line.style, { left: `${x}px`, top: `${top}px`, height: `${bottom - top}px` });
      tip.textContent = text;
      Object.assign(tip.style, { left: `${x}px`, top: `${top}px` });
    },
    remove() { line.remove(); tip.remove(); },
  };
}

export const columnResizeKey = new PluginKey("columnResize");

/** "33,3 %" in the interface language (the page's lang, set from the settings). */
const percent = (n: number) => `${n.toLocaleString(document.documentElement.lang || undefined, { maximumFractionDigits: 1 })} %`;
const round = (w: number) => Math.round(w * 10) / 10;

export function columnResize(format: (n: number) => string = percent): Plugin {
  // the cursor is set on the page's body, never on the editor's own DOM
  const setHover = (on: boolean) => document.body.classList.toggle("column-border-hover", on);
  return new Plugin({
    key: columnResizeKey,
    props: {
      handleDOMEvents: {
        mousemove(view, e) {
          if (e.buttons) return false;
          setHover(!!hitBorder(view, e));
          return false;
        },
        mouseleave() { setHover(false); return false; },
        mousedown(view, e) {
          if (e.button !== 0) return false;
          const hit = hitBorder(view, e);
          if (!hit) return false;
          const pos = tablePos(view, hit.table);
          if (pos == null) return false;
          const node = view.state.doc.nodeAt(pos);
          const start = currentWidths(node?.attrs.columnWidths ?? null, hit.edges);
          const first = hit.edges[0];
          const last = hit.edges[hit.edges.length - 1];
          if (!node || !start || first == null || last == null) return false;
          e.preventDefault();
          setHover(false);
          const box = hit.table.getBoundingClientRect();
          const g = guide();
          const x0 = e.clientX;
          let widths = start;
          const draw = (clientX: number) => {
            widths = moveBorder(start, hit.border, ((clientX - x0) / (last - first)) * 100);
            const x = first + (widths.slice(0, hit.border + 1).reduce((a, b) => a + b, 0) / 100) * (last - first);
            g.show(x, box.top, box.bottom, `${format(widths[hit.border])} | ${format(widths[hit.border + 1])}`);
          };
          draw(e.clientX);
          document.body.classList.add("resizing-column");
          const move = (ev: MouseEvent) => draw(ev.clientX);
          const up = (ev: MouseEvent) => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
            document.body.classList.remove("resizing-column");
            g.remove();
            draw(ev.clientX);
            if (Math.abs(ev.clientX - x0) < 1) return;
            // the table may have moved while dragging (another view edited it): find it again
            const at = tablePos(view, hit.table);
            if (at == null || view.state.doc.nodeAt(at)?.type.name !== "table") return;
            view.dispatch(view.state.tr.setNodeAttribute(at, "columnWidths", widths.map(round)).setMeta("columnResize", true));
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
          return true;
        },
      },
    },
  });
}
