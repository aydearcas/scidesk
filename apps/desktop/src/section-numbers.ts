// Numbered sections in the editor (record 0070): each number drawn before its heading as a
// decoration, never as text, computed by the core's rules (levels 1 to 3, the closing
// sections and headings marked "without number" left out) on every change of the text.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNodeType } from "@tiptap/pm/model";
import { NUMBERED_LEVELS, numberHeadings, roleFromName, UNNUMBERED_ROLES, type SectionNumbering } from "@scidesk/core";

/** A heading's type: its own, or the one its name says (record 0071). */
const roleOf = (node: PMNodeType) => (node.attrs.role as string | null) ?? roleFromName(node.textContent);

/** The article's numbering, set by the window (as spellOptions). */
export const sectionNumbering: { style: SectionNumbering } = { style: "none" };
export const sectionNumbersKey = new PluginKey<DecorationSet>("sectionNumbers");

function decorations(doc: PMNodeType): DecorationSet {
  if (sectionNumbering.style === "none") return DecorationSet.empty;
  const hs: { pos: number; node: PMNodeType }[] = [];
  doc.forEach((node, offset) => { if (node.type.name === "heading") hs.push({ pos: offset, node }); });
  const numbers = numberHeadings(hs.map(({ node }) => ({ level: node.attrs.level as number, role: roleOf(node), numbered: node.attrs.numbered as boolean | null })), sectionNumbering.style);
  const out: Decoration[] = [];
  hs.forEach(({ pos }, i) => {
    const n = numbers[i];
    if (!n) return;
    out.push(Decoration.widget(pos + 1, () => {
      const span = document.createElement("span");
      span.className = "section-number";
      span.textContent = n;
      span.contentEditable = "false";
      return span;
    }, { side: -1, key: `sn-${n}`, ignoreSelection: true }));
  });
  return DecorationSet.create(doc, out);
}

export const SectionNumbers = Extension.create({
  name: "sectionNumbers",
  addProseMirrorPlugins: () => [new Plugin<DecorationSet>({
    key: sectionNumbersKey,
    state: {
      init: (_, state) => decorations(state.doc),
      apply: (tr, old, _o, state) => (tr.docChanged || tr.getMeta(sectionNumbersKey) ? decorations(state.doc) : old),
    },
    props: { decorations: (state) => sectionNumbersKey.getState(state) },
  })],
});

/** Sets the numbering and redraws the numbers. */
export function setSectionNumberStyle(view: { state: EditorState; dispatch: (tr: import("@tiptap/pm/state").Transaction) => void }, style: SectionNumbering) {
  if (sectionNumbering.style === style) return;
  sectionNumbering.style = style;
  view.dispatch(view.state.tr.setMeta(sectionNumbersKey, true).setMeta("addToHistory", false));
}

/** Whether a heading can carry a number (to offer "Number this section" on it). */
export const numberable = (node: PMNodeType) =>
  node.type.name === "heading" && (node.attrs.level as number) <= NUMBERED_LEVELS && !((node.attrs.level as number) === 1 && UNNUMBERED_ROLES.has(roleOf(node) ?? ""));
