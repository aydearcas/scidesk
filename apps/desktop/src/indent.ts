// A paragraph's left indent (record 0069), as Word's "Increase indent" and "Decrease indent":
// steps of 1.25 cm, kept as the paragraph's `indent` attribute (1 to 8). In a list the same
// buttons and keys change the item's level instead. Tab never leaves the text: at the start
// of a paragraph (or over several) it indents; elsewhere it does nothing. Shift+Tab, and
// Backspace at the start of an indented paragraph, take one step back.
import { Extension } from "@tiptap/core";
import { liftListItem, sinkListItem } from "@tiptap/pm/schema-list";
import type { EditorState, Transaction } from "@tiptap/pm/state";

export const MAX_INDENT = 8;

/** Whether the selection is inside a list item (the list's own level applies there). */
function inList(state: EditorState): boolean {
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "listItem") return true;
  return false;
}

/** The paragraphs of the selection that can take an indent: in the body or the abstract, not in tables or lists. */
function paragraphs(state: EditorState): { pos: number; indent: number }[] {
  const out: { pos: number; indent: number }[] = [];
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (node.type.name === "paragraph") {
      const p = parent?.type.name ?? "doc";
      if (p === "doc" || p === "abstractSection") out.push({ pos, indent: (node.attrs.indent as number | null) ?? 0 });
      return false;
    }
    // into the abstract; not into tables, figures or lists
    return !/^(tablePart|figurePart|bulletList|orderedList|table)$/.test(node.type.name);
  });
  return out;
}

/** One step more (1) or less (-1); false when nothing would change. */
export function changeIndent(delta: 1 | -1) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const item = state.schema.nodes.listItem;
    if (item && inList(state)) return (delta > 0 ? sinkListItem(item) : liftListItem(item))(state, dispatch);
    const ps = paragraphs(state).filter((p) => (delta > 0 ? p.indent < MAX_INDENT : p.indent > 0));
    if (!ps.length) return false;
    if (dispatch) {
      const tr = state.tr;
      for (const p of ps) {
        const next = p.indent + delta;
        tr.setNodeAttribute(p.pos, "indent", next > 0 ? next : null);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/** Whether the cursor is at the very start of a paragraph's text. */
const atStart = (state: EditorState) => state.selection.empty && state.selection.$from.parentOffset === 0 && state.selection.$from.parent.type.name === "paragraph";

export const Indent = Extension.create({
  name: "paragraphIndent",
  // after the tables' and the lists' own Tab (they come first and say whether they took it)
  priority: 50,
  addKeyboardShortcuts() {
    const run = (delta: 1 | -1) => changeIndent(delta)(this.editor.state, this.editor.view.dispatch);
    return {
      Tab: () => {
        const { state } = this.editor;
        if (!inList(state) && (atStart(state) || paragraphs(state).length > 1)) run(1);
        return true; // never out of the text
      },
      "Shift-Tab": () => { run(-1); return true; },
    };
  },
});

/** Backspace at the start of an indented paragraph: one step back, before the editor joins it to the one above. */
export const IndentBackspace = Extension.create({
  name: "paragraphIndentBackspace",
  priority: 200,
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor;
        if (!atStart(state) || inList(state) || !state.selection.$from.parent.attrs.indent) return false;
        return changeIndent(-1)(state, this.editor.view.dispatch);
      },
    };
  },
});
