// The editor the tables are pasted into: Tiptap with the table pieces SciDesk will use
// (prosemirror-tables through @tiptap/extension-table) and the inline formatting that
// matters in a scientific table.
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";

export function createEditor(element, { transformPastedHTML } = {}) {
  return new Editor({
    element,
    extensions: [
      StarterKit.configure({ link: false, trailingNode: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Superscript,
      Subscript,
    ],
    content: "<p></p>",
    editorProps: transformPastedHTML ? { transformPastedHTML } : {},
  });
}
