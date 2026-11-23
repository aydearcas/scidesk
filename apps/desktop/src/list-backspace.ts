// Backspace at the start of the paragraph right after a list (phase 1 final test, record 0085).
// ProseMirror's joinBackward wraps the paragraph in a new list item, so an empty paragraph left
// after leaving a list became an empty bullet. As Word: the paragraph's text goes to the end of
// the list's last item (nothing, when it is empty) and the cursor stays at the join.
import { Extension } from "@tiptap/core";
import { TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";

const isList = (n: PMNode | null | undefined) => !!n && (n.type.name === "bulletList" || n.type.name === "orderedList");

/** Joins the paragraph at the cursor to the list above it; false when the cursor is not at the start of one. */
export function joinToListAbove(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { selection } = state;
  const $from = selection.$from;
  if (!selection.empty || $from.parentOffset !== 0 || $from.parent.type.name !== "paragraph") return false;
  const depth = $from.depth;
  const index = $from.index(depth - 1);
  if (index === 0) return false;
  const list = $from.node(depth - 1).child(index - 1);
  if (!isList(list)) return false;
  // the end of the list's last text block, however deep (a nested list in the last item)
  const listEnd = $from.before(depth);
  let target = listEnd;
  let node: PMNode = list;
  while (!node.isTextblock) {
    const last = node.lastChild;
    if (!last) return false;
    target -= 1; // the closing token of `node`
    node = last;
  }
  target -= 1; // into the text block, at its end
  if (dispatch) {
    const para = $from.parent;
    const tr = state.tr.delete($from.before(depth), $from.after(depth));
    if (para.content.size) tr.insert(target, para.content);
    dispatch(tr.setSelection(TextSelection.create(tr.doc, target)).scrollIntoView());
  }
  return true;
}

export const ListBackspace = Extension.create({
  name: "listBackspace",
  // after the indent's own Backspace (200): an indented paragraph first loses its indent
  priority: 150,
  addKeyboardShortcuts() {
    return { Backspace: () => joinToListAbove(this.editor.state, this.editor.view.dispatch) };
  },
});
