// Landscape pages (record 0085, the user's request): any block of the body (a table, a figure,
// a few paragraphs, a whole section) can go on a landscape page, without section breaks: the
// block carries `landscape: true`, and the blocks in a row with it share their landscape
// pages, which start and end on a new page (Word: a section of its own; Typst: a flipped page).
// "Landscape page" on the selection sets it on every block it touches, so several pages at
// once are one selection away; on a table or a figure, on that part.
//
// The editor keeps its portrait sheets (its pages are the browser's CSS columns, all of one
// width): a landscape stretch starts and ends on a new sheet, with a band and a label in the
// margin. The preview, the PDF and the Word show the real landscape pages.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

/** The blocks of the body that can be on a landscape page (not the title nor the abstract). */
export const LANDSCAPE_TYPES = ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "pageBreak", "tablePart", "figurePart", "tableRef", "figureRef"];

/** What the band says, in the language of the interface (set by the window). */
export const landscapeText = { label: "Landscape page" };

/** The top-level blocks the selection touches that can take the attribute, with their positions. */
export function landscapeBlocks(state: EditorState): { pos: number; node: PMNode }[] {
  const { doc, selection } = state;
  const { from, to, empty } = selection;
  const out: { pos: number; node: PMNode }[] = [];
  if (!doc.childCount) return out;
  // only the top-level blocks between the ends (read on every key press)
  const first = Math.min(doc.resolve(from).index(0), doc.childCount - 1);
  let pos = 0;
  for (let i = 0; i < first; i++) pos += doc.child(i).nodeSize;
  for (let i = first; i < doc.childCount; i++) {
    const node = doc.child(i);
    const end = pos + node.nodeSize;
    if (pos >= to && !(empty && pos === from)) break;
    // an empty cursor between two blocks (a whole part selected, or at the end) takes the next one
    const touches = empty ? from >= pos && from < end : from < end && to > pos;
    if (touches && LANDSCAPE_TYPES.includes(node.type.name)) out.push({ pos, node });
    pos = end;
  }
  return out;
}

/** Whether every block of the selection is on a landscape page (null: nothing there can be). */
export function landscapeState(state: EditorState): boolean | null {
  const blocks = landscapeBlocks(state);
  return blocks.length ? blocks.every((b) => !!b.node.attrs.landscape) : null;
}

/** Puts the blocks of the selection on landscape pages (true) or back on portrait (false); by default, the opposite of what they have. */
export function setLandscape(on?: boolean) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const blocks = landscapeBlocks(state);
    if (!blocks.length) return false;
    const value = on ?? !blocks.every((b) => !!b.node.attrs.landscape);
    if (dispatch) {
      const tr = state.tr;
      for (const b of blocks) tr.setNodeAttribute(b.pos, "landscape", value ? true : null);
      dispatch(tr);
    }
    return true;
  };
}

const key = new PluginKey<DecorationSet>("landscape");
const labelWidget = () => {
  const el = document.createElement("div");
  el.className = "landscape-label";
  el.contentEditable = "false";
  el.textContent = landscapeText.label;
  return el;
};
/** The band on the blocks of each stretch, and its label before the first one. */
function decorations(doc: PMNode): DecorationSet {
  const decos: Decoration[] = [];
  let prev = false;
  const kids: { node: PMNode; pos: number }[] = [];
  doc.forEach((node, pos) => kids.push({ node, pos }));
  kids.forEach(({ node, pos }, i) => {
    const on = !!node.attrs.landscape && LANDSCAPE_TYPES.includes(node.type.name);
    if (on) {
      const next = kids[i + 1]?.node;
      const last = !(next && next.attrs.landscape && LANDSCAPE_TYPES.includes(next.type.name));
      decos.push(Decoration.node(pos, pos + node.nodeSize, { class: `landscape${prev ? "" : " landscape-first"}${last ? " landscape-last" : ""}` }));
      // the label opens the stretch on a new sheet (a widget: page breaks use their own ::before)
      if (!prev) decos.push(Decoration.widget(pos, labelWidget, { side: -1, key: `landscape-label:${landscapeText.label}`, ignoreSelection: true }));
    }
    prev = on;
  });
  return DecorationSet.create(doc, decos);
}

export const Landscape = Extension.create({
  name: "landscape",
  addGlobalAttributes: () => [{
    types: LANDSCAPE_TYPES,
    attributes: {
      landscape: {
        default: null,
        // copied blocks keep it (within SciDesk); Word's own HTML never has it
        parseHTML: (el: HTMLElement) => (el.getAttribute("data-landscape") === "true" ? true : null),
        renderHTML: (a: Record<string, unknown>) => (a.landscape ? { "data-landscape": "true" } : {}),
      },
    },
  }],
  addProseMirrorPlugins: () => [new Plugin<DecorationSet>({
    key,
    state: {
      init: (_, state) => decorations(state.doc),
      apply: (tr, old) => (tr.docChanged || tr.getMeta(key) ? decorations(tr.doc) : old.map(tr.mapping, tr.doc)),
    },
    props: { decorations: (state) => key.getState(state) },
  })],
});

/** Draws the labels again (after the language of the interface changes). */
export function refreshLandscapeLabels(view: { state: EditorState; dispatch: (tr: Transaction) => void }) {
  view.dispatch(view.state.tr.setMeta(key, true).setMeta("addToHistory", false));
}
