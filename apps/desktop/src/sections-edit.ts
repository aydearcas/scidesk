// Sections edited from the navigator and the heading's menu (record 0071): add one of a
// type where it usually goes (or an untyped one after the cursor's section), add a
// subsection, move a section with its text up or down, change its type, or turn its
// heading back into a paragraph. Each is one undoable step on the manuscript.
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import type { Node as PMNodeType } from "@tiptap/pm/model";
import { placeSection, roleFromName, sectionLabel, sectionSpan, type TopHeading } from "@scidesk/core";

/** A heading's type: its own, or the one its name says. */
export const roleOfNode = (node: PMNodeType): string | null => (node.attrs.role as string | null) ?? roleFromName(node.textContent);

/** The top-level headings, with their effective type, and each child's position. */
export function topHeadings(doc: PMNodeType): { headings: TopHeading[]; pos: number[] } {
  const headings: TopHeading[] = [];
  const pos: number[] = [];
  doc.forEach((node, offset, index) => {
    pos.push(offset);
    if (node.type.name === "heading") headings.push({ index, level: node.attrs.level as number, role: roleOfNode(node) });
  });
  pos.push(doc.content.size);
  return { headings, pos };
}

/** The index of the top-level child around a position. */
export const childIndexAt = (doc: PMNodeType, pos: number) => doc.resolve(Math.min(Math.max(pos, 0), doc.content.size)).index(0);

/** The index of the top-level heading with this id, or -1. */
export function headingIndex(doc: PMNodeType, id: string): number {
  let found = -1;
  doc.forEach((node, _o, index) => { if (found < 0 && node.type.name === "heading" && node.attrs.id === id) found = index; });
  return found;
}

/**
 * Adds a level-1 section: of a type (its usual name in the article's language, where it
 * usually goes), or untyped ("other": "New section", after the section of `after`, with its
 * name selected to be typed over). The cursor goes into its first paragraph.
 */
export function addSection(editor: Editor, role: string, lang: string, after?: number) {
  const { state } = editor;
  const { headings, pos } = topHeadings(state.doc);
  const index = placeSection(headings, state.doc.childCount, role === "other" ? null : role, after);
  insertSection(editor, pos[index], 1, role === "other" ? null : role, sectionLabel(role, lang), role === "other");
}

/** Adds a subsection at the end of a section (its heading's index), with its name selected. */
export function addSubsection(editor: Editor, index: number, lang: string) {
  const { state } = editor;
  const { headings, pos } = topHeadings(state.doc);
  const h = headings.find((x) => x.index === index);
  if (!h) return;
  const span = sectionSpan(headings, state.doc.childCount, index);
  insertSection(editor, pos[span.to], Math.min(h.level + 1, 3), null, lang.startsWith("es") ? "Nueva subsección" : "New subsection", true);
}

function insertSection(editor: Editor, at: number, level: number, role: string | null, name: string, selectName: boolean) {
  const { state, view } = editor;
  const { schema } = state;
  const heading = schema.nodes.heading.create({ level, role }, schema.text(name));
  const paragraph = schema.nodes.paragraph.create();
  const tr = state.tr.insert(at, [heading, paragraph]);
  const sel = selectName
    ? TextSelection.create(tr.doc, at + 1, at + 1 + name.length)
    : TextSelection.create(tr.doc, at + heading.nodeSize + 1);
  view.dispatch(tr.setSelection(sel).scrollIntoView());
  view.focus();
}

/** Whether a section can move up (-1) or down (1) among the sections of its level. */
export function canMoveSection(doc: PMNodeType, index: number, dir: -1 | 1): boolean {
  return swapTarget(doc, index, dir) !== null;
}
function swapTarget(doc: PMNodeType, index: number, dir: -1 | 1): { a: { from: number; to: number }; b: { from: number; to: number } } | null {
  const { headings } = topHeadings(doc);
  const h = headings.find((x) => x.index === index);
  if (!h) return null;
  const n = doc.childCount;
  const self = sectionSpan(headings, n, index);
  if (dir < 0) {
    const prev = [...headings].reverse().find((x) => x.index < index && x.level <= h.level);
    if (!prev || prev.level !== h.level) return null;
    return { a: sectionSpan(headings, n, prev.index), b: self };
  }
  const next = headings.find((x) => x.index >= self.to);
  if (!next || next.index !== self.to || next.level !== h.level) return null;
  return { a: self, b: sectionSpan(headings, n, next.index) };
}

/** Moves a section, with its text, tables and figures, past the previous or next one of its level. */
export function moveSection(editor: Editor, index: number, dir: -1 | 1) {
  const { state, view } = editor;
  const swap = swapTarget(state.doc, index, dir);
  if (!swap) return;
  const { pos } = topHeadings(state.doc);
  // the later section (b) goes before the earlier one (a): one step, undone at once
  const bFrom = pos[swap.b.from], bTo = pos[swap.b.to], aFrom = pos[swap.a.from];
  const moved = state.doc.slice(bFrom, bTo);
  const tr = state.tr.delete(bFrom, bTo).insert(aFrom, moved.content);
  // the cursor stays in the section that was moved
  const headAt = dir < 0 ? aFrom : aFrom + (bTo - bFrom);
  view.dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(headAt + 1))).scrollIntoView());
  view.focus();
}

/** Sets a heading's type (null: as its name says). */
export function setSectionRole(editor: Editor, index: number, role: string | null) {
  const { state, view } = editor;
  const { pos } = topHeadings(state.doc);
  view.dispatch(state.tr.setNodeAttribute(pos[index], "role", role));
  view.focus();
}

/** Turns a section's heading back into a paragraph, keeping its text. */
export function removeHeading(editor: Editor, index: number) {
  const { state, view } = editor;
  const { pos } = topHeadings(state.doc);
  view.dispatch(state.tr.setNodeMarkup(pos[index], state.schema.nodes.paragraph, { id: state.doc.child(index).attrs.id, lang: state.doc.child(index).attrs.lang }));
  view.focus();
}

/**
 * Moves a section (its heading's index), with all it holds, before the section of another
 * heading, or after that section with `after` (record 0071: dragged in the navigator).
 * Nothing happens when the place is inside the section itself.
 */
export function moveSectionTo(editor: Editor, index: number, target: number, after: boolean) {
  const { state, view } = editor;
  const { headings, pos } = topHeadings(state.doc);
  const n = state.doc.childCount;
  const span = sectionSpan(headings, n, index);
  const place = after ? sectionSpan(headings, n, target).to : target;
  if (place >= span.from && place <= span.to) return;
  const from = pos[span.from], to = pos[span.to], at = pos[place];
  const moved = state.doc.slice(from, to);
  const tr = state.tr.delete(from, to);
  const insertAt = tr.mapping.map(at, -1);
  tr.insert(insertAt, moved.content);
  view.dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + 1))).scrollIntoView());
  view.focus();
}
