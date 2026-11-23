// Alignment and block quotes (record 0073). A paragraph, heading or title has its own
// alignment (center, right or justify; left or the journal's when it has none); in a table,
// the same buttons and keys set the cells' alignment. A block quotation is a blockquote node
// around whole paragraphs, set in on both sides.
import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { lift, wrapIn } from "@tiptap/pm/commands";
import type { EditorState } from "@tiptap/pm/state";
import { isInTable } from "@tiptap/pm/tables";
import { setAlign as setCellAlign } from "./parts.ts";

export type BlockAlign = "left" | "center" | "right" | "justify";
const ALIGNABLE = new Set(["paragraph", "heading", "title"]);

/** The alignment attribute of the text blocks, drawn with a class (the sheet's own text-align rules). */
export const alignAttribute = {
  default: null,
  parseHTML: (el: HTMLElement) => { const a = el.getAttribute("data-align"); return a === "center" || a === "right" || a === "justify" ? a : null; },
  renderHTML: (a: Record<string, unknown>) => (a.align ? { "data-align": a.align } : {}),
};

/** The alignment where the cursor is: of the cell in a table, else of the text block. */
export function alignAt(state: EditorState): BlockAlign | null {
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d);
    if (/^table(Cell|Header)$/.test(n.type.name)) return ((n.attrs.align as string | null) === "decimal" ? "right" : (n.attrs.align as BlockAlign | null)) ?? "left";
  }
  const block = $from.parent;
  return ALIGNABLE.has(block.type.name) ? ((block.attrs.align as BlockAlign | null) ?? "left") : null;
}

/** Aligns the text blocks of the selection (left removes their own alignment), or the cells in a table. */
export function setBlockAlign(editor: Editor, align: BlockAlign) {
  const { state, view } = editor;
  if (isInTable(state)) {
    if (align !== "justify") setCellAlign(state, view.dispatch, align === "left" ? null : align);
    view.focus();
    return;
  }
  const tr = state.tr;
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (ALIGNABLE.has(node.type.name)) { tr.setNodeAttribute(pos, "align", align === "left" ? null : align); return false; }
    return !/^(tablePart|figurePart|abstractPart)$/.test(node.type.name);
  });
  if (tr.docChanged) view.dispatch(tr);
  view.focus();
}

/** Whether the cursor is in a block quotation. */
export function inBlockquote(state: EditorState): boolean {
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "blockquote") return true;
  return false;
}

/** Puts the paragraphs of the selection in a block quotation, or takes them out of it. */
export function toggleBlockquote(editor: Editor) {
  const { state, view } = editor;
  const type = state.schema.nodes.blockquote;
  if (inBlockquote(state)) lift(state, view.dispatch);
  else wrapIn(type)(state, view.dispatch);
  view.focus();
}
/** Whether a block quotation can be made here (top-level paragraphs only). */
export const canBlockquote = (state: EditorState) => inBlockquote(state) || wrapIn(state.schema.nodes.blockquote)(state);

/** A block quotation (JATS disp-quote): paragraphs set in on both sides. */
export const Blockquote = Node.create({
  name: "blockquote",
  group: "block",
  content: "paragraph+",
  defining: true,
  addAttributes: () => ({ id: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-id"), renderHTML: (a: Record<string, unknown>) => (a.id == null ? {} : { "data-id": a.id }) } }),
  parseHTML: () => [{ tag: "blockquote" }],
  renderHTML: ({ HTMLAttributes }) => ["blockquote", mergeAttributes(HTMLAttributes, { class: "block-quote" }), 0],
});
