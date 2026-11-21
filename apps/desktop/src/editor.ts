// The editor's ProseMirror schema, as Tiptap extensions. Node and mark names and their
// attributes are those of the .scidoc format (packages/formats, record 0031): the editor's
// JSON is saved as it is (R34). Vertical slice: title, headings, paragraphs, bold, italic,
// superscript, subscript and citations.
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { newId } from "@scidesk/formats";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import Paragraph from "@tiptap/extension-paragraph";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Text from "@tiptap/extension-text";
import { UndoRedo } from "@tiptap/extensions";

const plain = (name: string) => ({ default: null, parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`), renderHTML: (a: Record<string, unknown>) => (a[name] == null ? {} : { [`data-${name}`]: a[name] }) });

const Title = Node.create({
  name: "title",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes: () => ({ id: plain("id"), lang: plain("lang") }),
  parseHTML: () => [{ tag: "h1.title" }],
  renderHTML: ({ HTMLAttributes }) => ["h1", mergeAttributes(HTMLAttributes, { class: "title" }), 0],
});

/** Labels of the citations ("1", "1,2"), computed by citeproc-js; never stored. */
export const citationLabels = new Map<string, string>();
const citationViews = new Map<string, Set<HTMLElement>>();
export function refreshCitationLabels() {
  for (const [id, els] of citationViews) for (const el of els) el.textContent = citationLabels.get(id) ?? "?";
}

const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({ id: { default: null }, items: { default: [] } }),
  parseHTML: () => [{ tag: "sup[data-citation]" }],
  renderHTML: ({ node }) => ["sup", { "data-citation": node.attrs.id, class: "citation" }, citationLabels.get(node.attrs.id) ?? "?"],
  // a plain DOM node view, not a React component (PLAN 6.6: hundreds of citations)
  addNodeView: () => ({ node }) => {
    const dom = document.createElement("sup");
    dom.className = "citation";
    const id = node.attrs.id as string;
    dom.textContent = citationLabels.get(id) ?? "?";
    if (!citationViews.has(id)) citationViews.set(id, new Set());
    citationViews.get(id)!.add(dom);
    return { dom, destroy: () => citationViews.get(id)?.delete(dom) };
  },
});

/**
 * Every block keeps a unique id (R34, record 0021 rule 1): a block that arrives without one
 * or with one already used (Enter splits a paragraph and copies its attributes; paste
 * copies them too) gets a new one, in the same transaction.
 */
const BlockIds = Extension.create({
  name: "blockIds",
  addProseMirrorPlugins: () => [
    new Plugin({
      key: new PluginKey("blockIds"),
      appendTransaction: (trs, _old, state) => {
        if (!trs.some((t) => t.docChanged)) return null;
        const seen = new Set<string>();
        let tr = state.tr;
        let changed = false;
        state.doc.descendants((node, pos) => {
          if (!["paragraph", "heading", "title", "citation"].includes(node.type.name)) return;
          const id = node.attrs.id as string | null;
          if (id && !seen.has(id)) { seen.add(id); return; }
          const fresh = newId(node.type.name === "citation" ? "c" : "b");
          seen.add(fresh);
          tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: fresh });
          changed = true;
        });
        return changed ? tr.setMeta("addToHistory", false) : null;
      },
    }),
  ],
});

export const extensions = [
  BlockIds,
  // paragraph first: it is the type ProseMirror creates on Enter (the first of the expression)
  Document.extend({ content: "(paragraph | heading | title)*" }),
  Text,
  Paragraph.extend({ addAttributes: () => ({ id: plain("id"), lang: plain("lang") }) }),
  Heading.extend({
    addAttributes() {
      return { ...this.parent?.(), id: plain("id"), role: plain("role"), lang: plain("lang") };
    },
  }).configure({ levels: [1, 2, 3, 4, 5, 6] }),
  Title,
  Citation,
  Bold,
  Italic,
  Superscript,
  Subscript,
  UndoRedo,
];
