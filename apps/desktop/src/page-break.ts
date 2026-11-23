// Page breaks and blank pages (record 0078), as Word's Insert › Page break (Ctrl+Enter) and
// Insert › Blank page. A page break is a block of its own between two blocks of the body;
// on the sheet it is a dashed line with "Page break", and what follows starts on the next
// page. A blank page is two page breaks with an empty paragraph between them, where the
// cursor goes. A break is never put inside a list, a quotation, the abstract, a table or a
// figure: it goes after them.
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection, Selection, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";

export const PageBreak = Node.create({
  name: "pageBreak",
  atom: true,
  selectable: true,
  addAttributes: () => ({
    id: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-id"), renderHTML: (a: Record<string, unknown>) => (a.id ? { "data-id": a.id } : {}) },
  }),
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  // the label is drawn by the stylesheet, in the interface language (--page-break-label)
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-page-break": "", class: "page-break", contenteditable: "false" }), ["span", { class: "page-break-label" }]],
});

/** The gap between two top-level blocks where a break goes, splitting the paragraph or heading at the cursor if needed. */
function breakGap(state: EditorState, tr: Transaction): number {
  const sel = state.selection;
  const $from = sel.$from;
  if ($from.depth === 0) return sel instanceof NodeSelection ? sel.to : $from.pos;
  const top = $from.node(1);
  if ($from.depth === 1 && (top.type.name === "paragraph" || top.type.name === "heading")) {
    if ($from.parentOffset === 0) return $from.before(1);
    if ($from.parentOffset === top.content.size) return $from.after(1);
    // in the middle: the text after the cursor goes to the next page, as in Word
    tr.split($from.pos);
    return $from.pos + 1;
  }
  // a title, a list, a quotation, the abstract, a table or a figure: after it
  return $from.after(1);
}

/** Inserts a page break (or a blank page) at the cursor. */
export function insertPageBreak(blank = false) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const { schema } = state;
    if (!schema.nodes.pageBreak) return false;
    if (!dispatch) return true;
    const tr = state.tr;
    const at = breakGap(state, tr);
    const brk = () => schema.nodes.pageBreak.create();
    const nodes = blank ? [brk(), schema.nodes.paragraph.create(), brk()] : [brk()];
    tr.insert(at, nodes);
    if (blank) tr.setSelection(TextSelection.create(tr.doc, at + nodes[0].nodeSize + 1));
    else {
      const after = at + nodes[0].nodeSize;
      // at the end of the text, a paragraph to write on the new page; otherwise, the start of what follows
      if (!tr.doc.resolve(after).nodeAfter) tr.insert(after, schema.nodes.paragraph.create());
      tr.setSelection(Selection.near(tr.doc.resolve(after), 1));
    }
    dispatch(tr.scrollIntoView());
    return true;
  };
}
