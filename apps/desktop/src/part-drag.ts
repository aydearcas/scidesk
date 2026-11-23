// Moving a table or a figure by dragging it (record 0077), as with Word's table move handle:
// a small handle at the top left corner of each part, in the margin, shown while the pointer
// is over the part or the cursor is in it. A click on it selects the whole part; dragging it
// shows the part under the pointer and a line where it will go, between two blocks of the
// text (never inside a paragraph, a list or another part, nor above the title and the
// abstract), and releasing moves it there in one step, which one undo reverts. The part keeps
// its id and its file: it is the same table, in another place (rule 1 of record 0021).
// The drag uses pointer events, not the browser's drag and drop, which Tauri takes over on
// Windows; the line and the moving label are drawn outside the editor's DOM.
import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

/** The parts that move: the ones shown in place, and the places of those that cannot be shown. */
const MOVABLE = new Set(["tablePart", "figurePart", "tableRef", "figureRef"]);
/** What stays at the top of the article: nothing is moved above it. */
const HEADER = new Set(["title", "abstractPart"]);
/** How far the pointer goes before a press becomes a drag, in screen pixels. */
const THRESHOLD = 4;
/** How near the top or bottom of the scrolling area the sheet starts scrolling, in screen pixels. */
const EDGE = 48;

/** What the window tells the handles: where a pointer is in the text, and the texts. */
export const partDrag = {
  /** The text position under the pointer, also when it is in a side margin (the window knows the sheets). */
  pointerPos: null as ((clientX: number, clientY: number) => number | null) | null,
  title: (kind: "table" | "figure"): string => (kind === "table" ? "Move the table" : "Move the figure"),
};

interface DragState { dragging: number | null }
export const partDragKey = new PluginKey<DragState>("partDrag");

const kindOf = (node: PMNode): "table" | "figure" => (node.type.name.startsWith("table") ? "table" : "figure");

/** The first gap of the text a part may go to: after the titles and the abstract. */
export function firstGap(doc: PMNode): number {
  let at = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const n = doc.child(i);
    if (!HEADER.has(n.type.name)) break;
    at += n.nodeSize;
  }
  return at;
}

/** The position the part at `from` lands at when dropped in the gap `gap` (null: it stays where it is). */
export function dropTarget(doc: PMNode, from: number, gap: number): number | null {
  const node = doc.nodeAt(from);
  if (!node) return null;
  const to = from + node.nodeSize;
  if (gap === from || gap === to || (gap > from && gap < to)) return null;
  return gap > to ? gap - node.nodeSize : gap;
}

/** Moves the part at `from` to the gap `gap` between two top-level blocks, and selects it. */
export function movePart(state: EditorState, from: number, gap: number) {
  const node = state.doc.nodeAt(from);
  if (!node || !MOVABLE.has(node.type.name)) return null;
  if (gap < firstGap(state.doc) || gap > state.doc.content.size) return null;
  const at = dropTarget(state.doc, from, gap);
  if (at === null) return null;
  const tr = state.tr.delete(from, from + node.nodeSize);
  tr.insert(at, node);
  return tr.setSelection(NodeSelection.create(tr.doc, at)).setMeta("partMove", true);
}

// ---------------------------------------------------------------- where the pointer drops

/** The top-level gap under the pointer: before or after the block the pointer is on, by which half. */
function gapAt(view: EditorView, x: number, y: number): number | null {
  const pos = partDrag.pointerPos?.(x, y) ?? view.posAtCoords({ left: x, top: y })?.pos ?? null;
  if (pos === null) return null;
  const doc = view.state.doc;
  const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));
  let start: number;
  if ($pos.depth > 0) start = $pos.before(1);
  else if ($pos.nodeAfter) start = pos;
  else return Math.max(pos, firstGap(doc));
  const node = doc.nodeAt(start)!;
  const dom = view.nodeDOM(start) as HTMLElement | null;
  const rects = dom?.getClientRects ? [...dom.getClientRects()].filter((r) => r.height > 0) : [];
  let after = false;
  if (rects.length) {
    // a block split over two pages has a box on each: the one under the pointer, or the nearest
    let i = rects.findIndex((r) => x >= r.left - 80 && x <= r.right + 80 && y >= r.top && y <= r.bottom);
    if (i < 0) {
      const dist = (r: DOMRect) => (y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0) + (x < r.left ? r.left - x : x > r.right ? x - r.right : 0);
      i = rects.reduce((best, r, k) => (dist(r) < dist(rects[best]) ? k : best), 0);
    }
    const r = rects[i];
    const within = Math.min(Math.max((y - r.top) / r.height, 0), 1);
    after = (i + within) / rects.length >= 0.5;
  }
  return Math.max(after ? start + node.nodeSize : start, firstGap(doc));
}

/** Where the line of a gap is drawn: between the block before it and the one after it. */
function gapLine(view: EditorView, gap: number): { left: number; right: number; y: number } | null {
  const $gap = view.state.doc.resolve(gap);
  const box = (pos: number, last: boolean) => {
    const dom = view.nodeDOM(pos) as HTMLElement | null;
    const rects = dom?.getClientRects ? [...dom.getClientRects()].filter((r) => r.height > 0) : [];
    return rects.length ? rects[last ? rects.length - 1 : 0] : null;
  };
  const before = $gap.nodeBefore ? box(gap - $gap.nodeBefore.nodeSize, true) : null;
  const after = $gap.nodeAfter ? box(gap, false) : null;
  // the same column of the same sheet: halfway between them; otherwise, at the edge of the one there is
  if (before && after && Math.abs(before.left - after.left) < 4 && after.top >= before.bottom - 2) {
    return { left: Math.min(before.left, after.left), right: Math.max(before.right, after.right), y: (before.bottom + after.top) / 2 };
  }
  if (after) return { left: after.left, right: after.right, y: after.top - 3 };
  if (before) return { left: before.left, right: before.right, y: before.bottom + 3 };
  return null;
}

/** The first ancestor that scrolls up and down (the desk around the sheets). */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

/** What the moving label says: "Tabla 2. Its caption" as shown on the sheet. */
function labelOf(view: EditorView, from: number): string {
  const dom = view.nodeDOM(from) as HTMLElement | null;
  const caption = dom?.querySelector?.(".part-caption");
  if (caption) return `${caption.getAttribute("data-label") ?? ""} ${caption.textContent ?? ""}`.trim();
  return (dom?.textContent ?? "").trim();
}

// ---------------------------------------------------------------- the drag

let active: (() => void) | null = null;

/** A press on a part's handle: a click selects the part, a drag moves it. */
export function pressHandle(view: EditorView, from: number, e: PointerEvent) {
  if (e.button !== 0 || !view.editable || active) return;
  const node = view.state.doc.nodeAt(from);
  if (!node || !MOVABLE.has(node.type.name)) return;
  e.preventDefault();
  e.stopPropagation();
  const x0 = e.clientX, y0 = e.clientY;
  let x = x0, y = y0;
  let started = false;
  let gap: number | null = null;
  let ghost: HTMLElement | null = null;
  let line: HTMLElement | null = null;
  let frame = 0;
  const scroller = scrollerOf(view.dom);

  const draw = () => {
    if (!ghost || !line) return;
    Object.assign(ghost.style, { left: `${x + 14}px`, top: `${y + 10}px` });
    const from = partDragKey.getState(view.state)?.dragging ?? null;
    gap = gapAt(view, x, y);
    const target = from === null || gap === null ? null : dropTarget(view.state.doc, from, gap);
    const at = target === null ? null : gapLine(view, gap!);
    line.hidden = !at;
    if (at) Object.assign(line.style, { left: `${at.left}px`, top: `${at.y - 1.5}px`, width: `${Math.max(at.right - at.left, 24)}px` });
  };
  // near the top or bottom of the desk, the sheet scrolls, faster the nearer, also without moving
  const tick = () => {
    if (scroller) {
      const box = scroller.getBoundingClientRect();
      const step = y < box.top + EDGE ? -Math.ceil((box.top + EDGE - y) / 3) : y > box.bottom - EDGE ? Math.ceil((y - (box.bottom - EDGE)) / 3) : 0;
      if (step) {
        const before = scroller.scrollTop;
        scroller.scrollTop += Math.max(-24, Math.min(24, step));
        if (scroller.scrollTop !== before) draw();
      }
    }
    frame = requestAnimationFrame(tick);
  };
  const begin = () => {
    started = true;
    ghost = document.createElement("div");
    ghost.className = `part-drag-ghost ${kindOf(node)}`;
    const text = document.createElement("span");
    text.textContent = labelOf(view, from);
    ghost.append(text);
    line = document.createElement("div");
    line.className = "part-drop-line";
    line.hidden = true;
    document.body.append(ghost, line);
    document.body.classList.add("dragging-part");
    view.dispatch(view.state.tr.setMeta(partDragKey, { dragging: from }).setMeta("addToHistory", false));
    frame = requestAnimationFrame(tick);
  };
  const move = (ev: PointerEvent) => {
    x = ev.clientX;
    y = ev.clientY;
    if (!started) {
      if (Math.hypot(x - x0, y - y0) < THRESHOLD) return;
      begin();
    }
    draw();
  };
  const finish = (drop: boolean) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", key, true);
    window.removeEventListener("blur", cancel);
    cancelAnimationFrame(frame);
    ghost?.remove();
    line?.remove();
    document.body.classList.remove("dragging-part");
    active = null;
    // the part's place, followed through any change while dragging
    const at = started ? partDragKey.getState(view.state)?.dragging ?? null : from;
    if (started) view.dispatch(view.state.tr.setMeta(partDragKey, { dragging: null }).setMeta("addToHistory", false));
    if (at === null) return;
    if (!started) {
      // a click: the whole part selected, as Word's handle selects the whole table
      view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, at)));
      view.focus();
      return;
    }
    if (!drop || gap === null) return;
    const tr = movePart(view.state, at, gap);
    if (tr) view.dispatch(tr);
    view.focus();
  };
  const up = () => finish(true);
  const cancel = () => finish(false);
  const key = (ev: KeyboardEvent) => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cancel(); } };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key, true);
  window.addEventListener("blur", cancel);
  active = cancel;
}

/** The handle's element; `pos` gives the part's position when pressed. */
export function handleElement(view: EditorView, kind: "table" | "figure", pos: () => number | null | undefined): HTMLElement {
  const el = document.createElement("span");
  el.className = "part-handle";
  el.contentEditable = "false";
  el.title = partDrag.title(kind);
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="part-handle-box"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5v13M1.5 8h13M8 1.5 6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2"/></svg></span>';
  el.addEventListener("pointerdown", (e) => {
    const at = pos();
    if (typeof at === "number") pressHandle(view, at, e);
  });
  // a click must not reach the editor (the press already did what it had to)
  el.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
  return el;
}

// ---------------------------------------------------------------- the handles on the sheet

const handles = new WeakMap<PMNode, { titles: string; set: DecorationSet }>();
/** A handle inside each table and figure shown in place, at its start (the places have their own). */
function handleDecorations(doc: PMNode): DecorationSet {
  // the tooltips follow the interface language: a new one draws the handles again
  const titles = partDrag.title("table") + partDrag.title("figure");
  const hit = handles.get(doc);
  if (hit && hit.titles === titles) return hit.set;
  const decos: Decoration[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name !== "tablePart" && node.type.name !== "figurePart") return;
    const kind = kindOf(node);
    decos.push(Decoration.widget(offset + 1, (view, getPos) => handleElement(view, kind, () => { const p = getPos(); return p == null ? null : p - 1; }), {
      side: -1, key: `part-handle-${kind}-${partDrag.title(kind)}`, ignoreSelection: true, stopEvent: () => true,
    }));
  });
  const set = DecorationSet.create(doc, decos);
  handles.set(doc, { titles, set });
  return set;
}

/** The part around the cursor (or selected whole), whose handle stays shown. */
function currentPart(state: EditorState): { pos: number; node: PMNode } | null {
  const sel = state.selection;
  if (sel instanceof NodeSelection && MOVABLE.has(sel.node.type.name) && sel.$from.depth === 0) return { pos: sel.from, node: sel.node };
  const $from = sel.$from;
  if ($from.depth < 1) return null;
  const top = $from.node(1);
  return MOVABLE.has(top.type.name) ? { pos: $from.before(1), node: top } : null;
}

export const PartDrag = Extension.create({
  name: "partDrag",
  addProseMirrorPlugins: () => [
    new Plugin<DragState>({
      key: partDragKey,
      state: {
        init: () => ({ dragging: null }),
        apply(tr, value) {
          const meta = tr.getMeta(partDragKey) as DragState | undefined;
          if (meta) return meta;
          if (value.dragging === null || !tr.docChanged) return value;
          const r = tr.mapping.mapResult(value.dragging, 1);
          return { dragging: r.deleted ? null : r.pos };
        },
      },
      props: {
        decorations(state) {
          let set = handleDecorations(state.doc);
          const extra: Decoration[] = [];
          const current = currentPart(state);
          if (current) extra.push(Decoration.node(current.pos, current.pos + current.node.nodeSize, { class: "part-current" }));
          const dragging = partDragKey.getState(state)?.dragging ?? null;
          const node = dragging === null ? null : state.doc.nodeAt(dragging);
          if (node && dragging !== null) extra.push(Decoration.node(dragging, dragging + node.nodeSize, { class: "part-dragging" }));
          if (extra.length) set = set.add(state.doc, extra);
          return set;
        },
      },
      view: () => ({ destroy: () => active?.() }),
    }),
  ],
});
