// Find and replace in the manuscript (PLAN 5.2, record 0044), instead of the web view's find
// bar, which searches the whole window. Ctrl+B ("Word en español") or Ctrl+F opens it;
// Ctrl+L or Ctrl+H, with replace. Enter and F3 go to the next match, Shift with them to the
// previous one, Esc closes and gives the text back its cursor.
import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { findState, findStep, replaceAll, replaceCurrent, setFind, setFindScope } from "./editor.ts";
import { Icon } from "./icons.tsx";

export function FindBar({ editor, replace, focus, onClose, onReplaced }: {
  editor: Editor;
  /** Show the replace row. */
  replace: boolean;
  /** Changes each time the shortcut is pressed again: the search box takes the focus. */
  focus: number;
  onClose: () => void;
  onReplaced: (count: number) => void;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => {
    const { from, to, empty } = editor.state.selection;
    // the selected words, as in Word, when they fit in one line
    const sel = empty ? "" : editor.state.doc.textBetween(from, to, " ");
    return sel.length <= 80 && !sel.includes("\n") ? sel : "";
  });
  const [caseSensitive, setCaseSensitive] = useState(false);
  // record 0066: only in the section of the cursor; its title, for the button's hint
  const [section, setSection] = useState<string | null>(null);
  const [withReplace, setWithReplace] = useState(replace);
  const [replacement, setReplacement] = useState("");
  const f = useEditorState({ editor, selector: ({ editor: e }) => { const s = findState(e); return { count: s.matches.length, current: s.current }; } });

  useEffect(() => { if (replace) setWithReplace(true); }, [replace, focus]);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, [focus]);
  useEffect(() => { setFind(editor, query, caseSensitive); }, [editor, query, caseSensitive]);
  // closing clears the highlights
  useEffect(() => () => { if (!editor.isDestroyed) { setFindScope(editor, false); setFind(editor, "", false); } }, [editor]);
  const toggleSection = () => {
    const scope = setFindScope(editor, section === null);
    setSection(scope ? scope.title || t("ui.find.thisSection") : null);
  };

  const step = (dir: 1 | -1) => findStep(editor, dir);
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "F3" || (e.key === "Enter" && e.target === input.current)) { e.preventDefault(); e.stopPropagation(); step(e.shiftKey ? -1 : 1); }
  };
  const count = !query ? "" : f.count ? t("ui.find.count", { n: f.current + 1, total: f.count }) : t("ui.find.none");

  return (
    <div className="find-bar" role="search" aria-label={t("ui.find.label")} onKeyDown={keys}>
      <div className="find-row">
        <button className="icon-button" aria-expanded={withReplace} title={t("ui.find.toggleReplace")} aria-label={t("ui.find.toggleReplace")} onClick={() => setWithReplace((v) => !v)}>
          <Icon name={withReplace ? "chevronDown" : "chevronRight"} size={14} />
        </button>
        <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.find.placeholder")} aria-label={t("ui.find.placeholder")} />
        <span className={`find-count${query && !f.count ? " none" : ""}`} aria-live="polite">{count}</span>
        <button className={`icon-button text${caseSensitive ? " on" : ""}`} aria-pressed={caseSensitive} title={t("ui.find.caseSensitive")} aria-label={t("ui.find.caseSensitive")} onClick={() => setCaseSensitive((v) => !v)}>Aa</button>
        <button className={`icon-button text${section !== null ? " on" : ""}`} aria-pressed={section !== null} title={section !== null ? t("ui.find.onlyIn", { section }) : t("ui.find.onlySection")} aria-label={t("ui.find.onlySection")} onClick={toggleSection}>§</button>
        <button className="icon-button" title={t("ui.find.previous")} aria-label={t("ui.find.previous")} disabled={!f.count} onClick={() => step(-1)}><Icon name="chevronDown" size={14} className="flip" /></button>
        <button className="icon-button" title={t("ui.find.next")} aria-label={t("ui.find.next")} disabled={!f.count} onClick={() => step(1)}><Icon name="chevronDown" size={14} /></button>
        <button className="icon-button" title={t("ui.close")} aria-label={t("ui.close")} onClick={onClose}><Icon name="close" size={14} /></button>
      </div>
      {withReplace && (
        <div className="find-row">
          <span className="find-indent" />
          <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={t("ui.find.replaceWith")} aria-label={t("ui.find.replaceWith")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); replaceCurrent(editor, replacement); } }} />
          <button className="btn" disabled={!f.count} onClick={() => replaceCurrent(editor, replacement)}>{t("ui.find.replace")}</button>
          <button className="btn" disabled={!f.count} onClick={() => { onReplaced(replaceAll(editor, replacement)); input.current?.focus(); }}>{t("ui.find.replaceAll")}</button>
        </div>
      )}
    </div>
  );
}
