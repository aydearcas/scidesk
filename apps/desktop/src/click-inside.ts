// A click inside a block puts the cursor in that block (phase 1 test). The browser's caret
// lookup gave, for a click in the empty room of a block with no text there (the keywords
// after their "Palabras clave:" label, a flex box), the position after the block, so the
// cursor and what was typed next went to the following block (the English abstract's heading).
// ProseMirror's own position there is inside the keywords but between two keyword nodes, where
// no text goes, and it leaves the caret to the browser.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** The cursor for a click at (x, y) on `target`, when ProseMirror's `pos` fell outside it; null if it is fine. */
export function insideTarget(view: EditorView, target: Element, pos: number, x: number, y: number): Selection | null {
  if (!view.dom.contains(target) || target === view.dom || target.closest("[contenteditable=false]")) return null;
  let start: number, end: number;
  try {
    start = view.posAtDOM(target, 0);
    end = view.posAtDOM(target, target.childNodes.length);
  } catch { return null; }
  const doc = view.state.doc;
  if (!(start <= end) || start < 0 || end > doc.content.size) return null;
  // fine when the position is in the block and takes text (between two keywords it does not)
  if (pos >= start && pos <= end && pos <= doc.content.size && doc.resolve(pos).parent.inlineContent) return null;
  // after the last line, or to the right of it: the end; otherwise the start
  const last = target.lastElementChild?.getBoundingClientRect() ?? target.getBoundingClientRect();
  const atEnd = y > last.bottom || (y >= last.top && x > last.left);
  const sel = atEnd ? Selection.near(doc.resolve(end), -1) : Selection.near(doc.resolve(start), 1);
  // only a cursor that really is in the block clicked
  if (!(sel instanceof TextSelection) || sel.from < start || sel.to > end) return null;
  return sel;
}

export const ClickInside = Extension.create({
  name: "clickInside",
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("clickInside"),
      props: {
        // on the press, not the click: ProseMirror leaves these clicks to the browser, which
        // puts the caret itself (in the next block); only when the caret would fall outside
        handleDOMEvents: {
          mousedown(view, event) {
            if (event.button !== 0 || event.shiftKey || event.detail > 1 || !(event.target instanceof Element)) return false;
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (!at) return false;
            const sel = insideTarget(view, event.target, at.pos, event.clientX, event.clientY);
            if (!sel) return false;
            event.preventDefault();
            view.focus();
            view.dispatch(view.state.tr.setSelection(sel).setMeta("pointer", true));
            return true;
          },
        },
      },
    })];
  },
});
