// A table's own tab (record 0021; sheet 8 of the interface proposal, record 0048): the same
// table as in the manuscript, in a second view, with its toolbar in one row (rows, columns,
// merge, split, header row, alignment, note call, general note) and, when it was just pasted
// from Word, what was kept and what was dropped, with "Undo the paste". Its tools work on the
// manuscript too (the context menu and "Details" give the same commands).
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Editor } from "@tiptap/core";
import { saveDocument, type Project } from "@scidesk/core";
import type { PMNode } from "@scidesk/formats";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as PMNodeType } from "@tiptap/pm/model";
import { addColumnAfter, addColumnBefore, addRowAfter, addRowBefore, CellSelection, deleteColumn, deleteRow, mergeCells, splitCell, TableMap, toggleHeaderRow } from "@tiptap/pm/tables";
import { addNote, partAround, PartTab, placed, setAlign } from "./parts.ts";
import { extensions } from "./editor.ts";
import { Icon, type IconName } from "./icons.tsx";
import { TableLinesTools } from "./TableLinesTools.tsx";

export type TableCommand = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

/** The cells selected in a table: rows and columns (from 1) and their alignment. */
export interface CellInfo { rows: [number, number]; cols: [number, number]; align: string | null | "mixed"; tableId: string | null }

/** The table around the selection (in the manuscript or in the table's tab) and the cells selected in it. */
export function cellInfo(state: EditorState): CellInfo | null {
  const sel = state.selection;
  const $a = sel instanceof CellSelection ? sel.$anchorCell : sel.$from;
  let tableDepth = -1;
  for (let d = $a.depth; d >= 0; d--) if ($a.node(d).type.spec.tableRole === "table") { tableDepth = d; break; }
  if (tableDepth < 0) return null;
  const table = $a.node(tableDepth);
  const start = tableDepth === 0 ? 0 : $a.start(tableDepth);
  const map = TableMap.get(table);
  let partId: string | null = null;
  for (let d = tableDepth; d >= 0; d--) if ($a.node(d).type.name === "tablePart") { partId = String($a.node(d).attrs.id); break; }
  const cellPos = (pos: number): number | null => {
    const $p = state.doc.resolve(pos);
    for (let d = $p.depth; d > tableDepth; d--) if (/^table(Cell|Header)$/.test($p.node(d).type.name)) return $p.before(d) - start;
    return null;
  };
  let rect: { left: number; right: number; top: number; bottom: number } | null = null;
  const aligns = new Set<string | null>();
  if (sel instanceof CellSelection) {
    rect = map.rectBetween(sel.$anchorCell.pos - start, sel.$headCell.pos - start);
    sel.forEachCell((n: PMNodeType) => aligns.add((n.attrs.align as string | null) ?? null));
  } else {
    const at = cellPos(sel.from);
    if (at === null) return null;
    rect = map.findCell(at);
    aligns.add((table.nodeAt(at)?.attrs.align as string | null) ?? null);
  }
  return {
    rows: [rect.top + 1, rect.bottom], cols: [rect.left + 1, rect.right],
    align: aligns.size === 1 ? [...aligns][0] : "mixed", tableId: partId,
  };
}

/** Whether the first row of the table around the selection is a header row. */
function firstRowIsHeader(state: EditorState): boolean {
  const $a = state.selection.$from;
  for (let d = $a.depth; d >= 0; d--) {
    const n = $a.node(d);
    if (n.type.spec.tableRole === "table") {
      const row = n.firstChild;
      let all = !!row;
      row?.forEach((c) => { if (c.type.name !== "tableHeader") all = false; });
      return all;
    }
  }
  return false;
}

const align = (value: string | null): TableCommand => (s, d) => setAlign(s, d ?? (() => {}), value);
/** A tool shows its icon, its text, or (with `text` and `icon`) its text when the bar has room and its icon when not. */
interface Tool { key: string; cmd: TableCommand; icon?: IconName; text?: string; pressed?: (s: EditorState) => boolean }
/** The toolbar of sheet 8, by groups; a group may have a label before it. */
export const TABLE_TOOLS: { label?: string; tools: Tool[] }[] = [
  { label: "rows", tools: [{ key: "rowAbove", cmd: addRowBefore, icon: "rowAbove" }, { key: "rowBelow", cmd: addRowAfter, icon: "rowBelow" }, { key: "deleteRow", cmd: deleteRow, icon: "deleteRow" }] },
  { label: "columns", tools: [{ key: "colLeft", cmd: addColumnBefore, icon: "colLeft" }, { key: "colRight", cmd: addColumnAfter, icon: "colRight" }, { key: "deleteCol", cmd: deleteColumn, icon: "deleteCol" }] },
  { tools: [{ key: "mergeCells", cmd: mergeCells, text: "merge", icon: "merge" }, { key: "splitCell", cmd: splitCell, text: "split", icon: "split" }] },
  { tools: [{ key: "headerRow", cmd: toggleHeaderRow, text: "headerRow", icon: "headerRow", pressed: firstRowIsHeader }] },
  { tools: [
    { key: "alignLeft", cmd: align(null), icon: "alignLeft", pressed: (s) => cellInfo(s)?.align === null },
    { key: "alignCenter", cmd: align("center"), icon: "alignCenter", pressed: (s) => cellInfo(s)?.align === "center" },
    { key: "alignRight", cmd: align("right"), icon: "alignRight", pressed: (s) => cellInfo(s)?.align === "right" },
    { key: "alignDecimal", cmd: align("decimal"), text: "decimal", pressed: (s) => cellInfo(s)?.align === "decimal" },
  ] },
  { tools: [
    { key: "specificNote", cmd: (s, d) => (d ? addNote(s, d, "specific") : true), text: "noteCall" },
    { key: "generalNote", cmd: (s, d) => (d ? addNote(s, d, "general") : true), text: "generalNoteShort", icon: "generalNote" },
  ] },
];

export function TableTools({ run, state }: { run: (cmd: TableCommand) => void; state: EditorState | null }) {
  const { t } = useTranslation();
  return (
    <div className="table-tools" role="toolbar" aria-label={t("ui.tableTools")}>
      {TABLE_TOOLS.map((group, i) => (
        <div className="tool-group" key={i} role="group" aria-label={group.label ? t(`ui.tableBar.${group.label}`) : undefined}>
          {group.label && <span className="tool-label" aria-hidden="true">{t(`ui.tableBar.${group.label}`)}</span>}
          {group.tools.map(({ key, cmd, icon, text, pressed }) => {
            const on = state && pressed ? pressed(state) : undefined;
            return (
              <button key={key} className={`tool${icon && !text ? " icon-only" : ""}${icon && text ? " both" : ""}${on ? " on" : ""}`} aria-pressed={pressed ? !!on : undefined}
                title={key === "specificNote" ? `${t(`ui.${key}`)} · ${t("ui.specificNoteHint")}` : key === "generalNote" ? t("ui.tableBar.footnoteTitle") : t(`ui.${key}`)}
                aria-label={key === "generalNote" ? t("ui.tableBar.footnoteTitle") : t(`ui.${key}`)} disabled={!state || !cmd(state)} onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd)}>
                {icon && <span className="tool-icon"><Icon name={icon} size={17} /></span>}
                {text === "noteCall" ? <><sup className="note-letter">a</sup><span className="tool-text"> {t("ui.tableBar.noteCall")}</span></> : text === "decimal" ? t("ui.tableBar.decimal") : text ? <span className="tool-text">{t(`ui.tableBar.${text}`)}</span> : null}
              </button>
            );
          })}
        </div>
      ))}
      <TableLinesTools state={state} run={run} />
    </div>
  );
}

/**
 * Record 0075: the table bar in the manuscript, as Word's contextual table tabs: the same
 * tools as the table's tab, shown under the ribbon while the cursor is in a table (its cells,
 * caption or notes). The text does not jump when it shows or goes: the sheet scrolls by its
 * height.
 */
const ANCHORS = typeof CSS !== "undefined" && CSS.supports("overflow-anchor", "auto");
export function TableContextBar({ editor, label, onOpenTab, scroller }: {
  editor: Editor;
  /** "Tabla 2", by the table's id. */
  label: (id: string) => string;
  onOpenTab: (id: string) => void;
  /** The sheet's scrolling box, kept still when the bar shows or goes. */
  scroller: React.RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation();
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => { editor.on("transaction", redraw); return () => { editor.off("transaction", redraw); }; }, [editor]);
  const part = editor.isDestroyed ? null : partAround(editor.state.selection.$from);
  const id = part && part.node.type.name === "tablePart" ? String(part.node.attrs.id) : null;
  const bar = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  useLayoutEffect(() => {
    // Chromium keeps the text still by itself (scroll anchoring); WebKit needs the sheet scrolled
    const box = ANCHORS ? null : scroller.current;
    if (id && bar.current) { height.current = bar.current.offsetHeight; if (box) box.scrollTop += height.current; }
    else if (!id && height.current && box) { box.scrollTop -= height.current; height.current = 0; }
  }, [id !== null]); // eslint-disable-line react-hooks/exhaustive-deps -- only when it shows or goes
  if (!id) return null;
  return (
    <div ref={bar} className="table-tab-head table-context-bar" role="region" aria-label={label(id)}>
      <span className="table-context-label"><Icon name="table" size={15} /> {label(id)}</span>
      <TableTools state={editor.state} run={(cmd) => { cmd(editor.state, editor.view.dispatch); editor.view.focus(); }} />
      <button className="btn quiet table-context-open" onMouseDown={(e) => e.preventDefault()} onClick={() => onOpenTab(id)}>{t("ui.openInTab")}</button>
    </div>
  );
}

/** What a paste from Word kept and dropped (sheet 8), shown in the tab until it is closed. */
export interface PasteNotice { tables: string[]; number: number | null; path: string; kept: string; dropped: string }

export function TableTabView({ editor, id, title, onGone, onCells, notice, onUndoPaste, onDismissNotice, onView, onContextMenu, hint }: {
  editor: Editor; id: string; title: string; onGone: () => void;
  /** The line under the table (an unplaced table says where what is written goes). */
  hint?: string;
  /** Record 0067: the tab's view while it exists (the quick citation goes into it), and its right-click menu. */
  onView: (view: EditorView | null) => void;
  onContextMenu: (e: React.MouseEvent, view: EditorView) => void;
  onCells: (info: CellInfo | null) => void;
  notice: PasteNotice | null;
  onUndoPaste: () => void;
  onDismissNotice: () => void;
}) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const tab = useRef<PartTab | null>(null);
  const gone = useRef(onGone);
  gone.current = onGone;
  const cells = useRef(onCells);
  cells.current = onCells;
  const forceTools = useRef<() => void>(() => {});
  const viewSeen = useRef(onView);
  viewSeen.current = onView;
  useEffect(() => {
    if (!host.current) return;
    try { tab.current = new PartTab(editor, id, host.current, () => gone.current()); } catch { gone.current(); return; }
    const view = tab.current.view;
    view.dom.setAttribute("aria-label", title);
    viewSeen.current(view);
    const onSel = () => { forceTools.current(); cells.current(cellInfo(view.state)); };
    view.dom.addEventListener("keyup", onSel);
    view.dom.addEventListener("mouseup", onSel);
    view.dom.addEventListener("focus", onSel);
    return () => { viewSeen.current(null); tab.current?.destroy(); tab.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one view per table; the title is set below
  }, [editor, id]);
  useEffect(() => { tab.current?.view.dom.setAttribute("aria-label", title); }, [title]);
  return (
    <div className="table-tab-body">
      <div className="table-tab-head">
        <ToolsFor tab={tab} register={(f) => { forceTools.current = f; }} onRun={() => tab.current && cells.current(cellInfo(tab.current.view.state))} />
      </div>
      {notice && (
        <div className="paste-notice" role="status">
          <Icon name="info" size={18} />
          <div>
            <p><b>{notice.number ? t("ui.pasteNotice.titleN", { n: notice.number, path: notice.path }) : t("ui.pasteNotice.title", { path: notice.path })}</b></p>
            {notice.kept && <p><span className="kept">{t("ui.pasteNotice.kept")}</span> {notice.kept}</p>}
            {notice.dropped && <p><span className="dropped">{t("ui.pasteNotice.dropped")}</span> {notice.dropped}</p>}
          </div>
          <button className="btn" onClick={onUndoPaste}>{t("ui.pasteNotice.undo")}</button>
          <button className="icon-button" aria-label={t("ui.close")} onClick={onDismissNotice}><Icon name="close" size={14} /></button>
        </div>
      )}
      <div className="desk">
        <div className="paper wide" onContextMenu={(e) => { if (tab.current) onContextMenu(e, tab.current.view); }}><div className="page" ref={host} /></div>
      </div>
      <p className="muted small table-tab-hint">{hint ?? t("ui.tableTabHint")}</p>
    </div>
  );
}

/**
 * A table not placed in the text, in its tab (the user's request after record 0084): the tab of
 * a table is a second view of the table in the text, and this one is not there, so it gets an
 * editor of its own over its file. Each change is written to the .scitable after a short pause
 * and when the tab closes; `register` gives the app that writing, to do it before the table
 * goes back into the text.
 */
export function UnplacedTableTab({ project, folder, src, title, onCells, onView, onContextMenu, onSaved, register }: {
  project: Project; folder: string; src: string; title: string;
  onCells: (info: CellInfo | null) => void;
  onView: (view: EditorView | null) => void;
  onContextMenu: (e: React.MouseEvent, view: EditorView) => void;
  onSaved: () => void;
  register: (src: string, flush: (() => Promise<void>) | null) => void;
}) {
  const [own, setOwn] = useState<{ editor: Editor; id: string } | null>(null);
  const saved = useRef(onSaved);
  saved.current = onSaved;
  useEffect(() => {
    const art = project.articles.find((a) => a.folder === folder);
    const file = art?.documents.get(src);
    if (!art || !file) return;
    const part = file.doc as PMNode;
    const editor = new Editor({ element: document.createElement("div"), extensions, content: { type: "doc", content: [placed(part as never, src) as never] } });
    let timer = 0;
    let pending = false;
    const flush = async () => {
      window.clearTimeout(timer);
      if (!pending) return;
      pending = false;
      const node = editor.state.doc.firstChild?.toJSON() as PMNode | undefined;
      if (!node) return;
      const { src: _src, ...attrs } = node.attrs ?? {};
      await saveDocument(project, art, src, { ...art.documents.get(src)!, doc: { ...node, attrs } } as never);
      saved.current();
    };
    editor.on("update", () => { pending = true; window.clearTimeout(timer); timer = window.setTimeout(() => void flush(), 800); });
    register(src, flush);
    setOwn({ editor, id: String(part.attrs?.id) });
    return () => {
      register(src, null);
      setOwn(null);
      void flush().finally(() => editor.destroy());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one editor per file
  }, [project, folder, src]);
  const { t } = useTranslation();
  if (!own) return null;
  return (
    <TableTabView editor={own.editor} id={own.id} title={title} onGone={() => {}} hint={t("ui.unplacedTabHint", { path: src })} onCells={onCells} onView={onView} onContextMenu={onContextMenu}
      notice={null} onUndoPaste={() => {}} onDismissNotice={() => {}} />
  );
}

/** The tools of the tab, redrawn when its selection moves (what can be done depends on it). */
function ToolsFor({ tab, register, onRun }: { tab: React.RefObject<PartTab | null>; register: (f: () => void) => void; onRun: () => void }) {
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  register(redraw);
  return <TableTools state={tab.current?.view.state ?? null} run={(cmd) => { tab.current?.run(cmd); redraw(); onRun(); }} />;
}
