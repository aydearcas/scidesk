// A table's own tab (record 0021): the same table as in the manuscript, in a second view,
// larger and with its tools at hand. Its tools work on the manuscript too (the context
// menu and "Details" give the same commands).
import { useEffect, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { addColumnAfter, addColumnBefore, addRowAfter, addRowBefore, deleteColumn, deleteRow, mergeCells, splitCell, toggleHeaderRow } from "@tiptap/pm/tables";
import { addNote, PartTab, setAlign } from "./parts.ts";

export type TableCommand = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

/** The table's commands, by the key of their label in ui.* */
export const TABLE_COMMANDS: [string, TableCommand][][] = [
  [["rowAbove", addRowBefore], ["rowBelow", addRowAfter], ["colLeft", addColumnBefore], ["colRight", addColumnAfter]],
  [["deleteRow", deleteRow], ["deleteCol", deleteColumn]],
  [["mergeCells", mergeCells], ["splitCell", splitCell], ["headerRow", toggleHeaderRow]],
  [
    ["alignLeft", (s, d) => setAlign(s, d ?? (() => {}), null)],
    ["alignCenter", (s, d) => setAlign(s, d ?? (() => {}), "center")],
    ["alignRight", (s, d) => setAlign(s, d ?? (() => {}), "right")],
    ["alignDecimal", (s, d) => setAlign(s, d ?? (() => {}), "decimal")],
  ],
  [["generalNote", (s, d) => (d ? addNote(s, d, "general") : true)], ["specificNote", (s, d) => (d ? addNote(s, d, "specific") : true)]],
];

const SHORT: Record<string, string> = { alignLeft: "⯇", alignCenter: "≡", alignRight: "⯈", alignDecimal: ",0" };

export function TableTools({ run, state }: { run: (cmd: TableCommand) => void; state: EditorState | null }) {
  const { t } = useTranslation();
  return (
    <div className="table-tools" role="toolbar" aria-label={t("ui.tableTools")}>
      {TABLE_COMMANDS.map((group, i) => (
        <div className="tool-group" key={i}>
          {group.map(([key, cmd]) => (
            <button key={key} className="btn small" title={key === "specificNote" ? `${t(`ui.${key}`)} · ${t("ui.specificNoteHint")}` : t(`ui.${key}`)}
              aria-label={t(`ui.${key}`)} disabled={!state || !cmd(state)} onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd)}>
              {SHORT[key] ?? t(`ui.${key}`)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableTabView({ editor, id, title, onGone }: { editor: Editor; id: string; title: string; onGone: () => void }) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const tab = useRef<PartTab | null>(null);
  const gone = useRef(onGone);
  gone.current = onGone;
  const forceTools = useRef<() => void>(() => {});
  useEffect(() => {
    if (!host.current) return;
    try { tab.current = new PartTab(editor, id, host.current, () => gone.current()); } catch { gone.current(); return; }
    const view = tab.current.view;
    view.dom.setAttribute("aria-label", title);
    const onSel = () => forceTools.current();
    view.dom.addEventListener("keyup", onSel);
    view.dom.addEventListener("mouseup", onSel);
    return () => { tab.current?.destroy(); tab.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one view per table; the title is set below
  }, [editor, id]);
  useEffect(() => { tab.current?.view.dom.setAttribute("aria-label", title); }, [title]);
  return (
    <div className="table-tab-body">
      <div className="table-tab-head">
        <h2>{title}</h2>
        <ToolsFor tab={tab} register={(f) => { forceTools.current = f; }} />
      </div>
      <p className="muted small table-tab-hint">{t("ui.tableTabHint")}</p>
      <div className="desk">
        <div className="paper wide"><div className="page" ref={host} /></div>
      </div>
    </div>
  );
}

/** The tools of the tab, redrawn when its selection moves (what can be done depends on it). */
function ToolsFor({ tab, register }: { tab: React.RefObject<PartTab | null>; register: (f: () => void) => void }) {
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  register(redraw);
  return <TableTools state={tab.current?.view.state ?? null} run={(cmd) => { tab.current?.run(cmd); redraw(); }} />;
}
