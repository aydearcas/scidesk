// What appears next to the text (design proposal 4.3, record 0044): the selection bubble,
// with format and cite, and the cross-reference picker (Ctrl+Shift+R).
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import type { OutlinePart } from "@scidesk/core";
import { Icon } from "./icons.tsx";
import { SCHEMES, shortcutLabel, type SchemeId } from "./shortcuts.ts";

export function SelectionBubble({ editor, scheme, onCite }: { editor: Editor; scheme: SchemeId; onCite: () => void }) {
  const { t, i18n } = useTranslation();
  const [pointerDown, setPointerDown] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const dom = editor.view.dom;
    const down = () => setPointerDown(true);
    const up = () => setPointerDown(false);
    // the bubble follows the text when the page scrolls
    const scrolled = () => setTick((n) => n + 1);
    dom.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    document.addEventListener("scroll", scrolled, true);
    return () => { dom.removeEventListener("mousedown", down); window.removeEventListener("mouseup", up); document.removeEventListener("scroll", scrolled, true); };
  }, [editor]);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { from, to, empty } = e.state.selection;
      const text = !empty && e.state.doc.textBetween(from, to, " ").trim().length > 0;
      return { show: text && e.isFocused, from, bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline") };
    },
  });
  if (!s.show || pointerDown) return null;
  let at: { left: number; top: number };
  try { at = editor.view.coordsAtPos(s.from); } catch { return null; }
  const letters = scheme === "word-es" ? ["N", "K", "S"] : ["B", "I", "U"];
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const tip = (label: string, a: "bold" | "italic" | "underline" | "cite") => `${label} (${shortcutLabel(SCHEMES[scheme][a], i18n.language)})`;
  return (
    <div className="bubble" role="toolbar" aria-label={t("ui.bubble")} style={{ left: Math.max(8, at.left - 8), top: Math.max(8, at.top - 42) }} onMouseDown={keep}>
      <button className={`tool${s.bold ? " on" : ""}`} aria-pressed={s.bold} title={tip(t("ui.bold"), "bold")} onClick={() => editor.chain().focus().toggleMark("bold").run()}><b>{letters[0]}</b></button>
      <button className={`tool${s.italic ? " on" : ""}`} aria-pressed={s.italic} title={tip(t("ui.italic"), "italic")} onClick={() => editor.chain().focus().toggleMark("italic").run()}><i className="serif">{letters[1]}</i></button>
      <button className={`tool${s.underline ? " on" : ""}`} aria-pressed={s.underline} title={tip(t("ui.underline"), "underline")} onClick={() => editor.chain().focus().toggleMark("underline").run()}><u>{letters[2]}</u></button>
      <span className="tool-sep" />
      <button className="tool accent" title={tip(t("ui.cite"), "cite")} onClick={onCite}><Icon name="quote" size={16} /> {t("ui.citeShort")}</button>
    </div>
  );
}

/** The cross-reference picker: a table or figure by number or caption; Enter inserts. */
export function XrefPicker({ targets, onPick, onClose }: { targets: { tables: OutlinePart[]; figures: OutlinePart[] }; onPick: (p: OutlinePart, kind: "table" | "figure") => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const all = useMemo(() => [
    ...targets.tables.map((p) => ({ p, kind: "table" as const, label: t("ui.tableN", { n: p.number }) })),
    ...targets.figures.map((p) => ({ p, kind: "figure" as const, label: t("ui.figureN", { n: p.number }) })),
  ], [targets, t]);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const hits = all.filter((x) => norm(`${x.label} ${x.p.caption}`).includes(norm(query.trim())));
  useEffect(() => setActive(0), [query]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="quick-cite" role="dialog" aria-modal="true" aria-label={t("ui.xref")}>
        <div className="chips">
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.xrefPlaceholder")} aria-label={t("ui.xrefPlaceholder")}
            role="combobox" aria-expanded={hits.length > 0} aria-controls="xref-results" aria-activedescendant={hits[active] ? `xr-${hits[active].p.id}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onClose(); }
              else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && hits[active]) { e.preventDefault(); onPick(hits[active].p, hits[active].kind); }
            }} />
        </div>
        {all.length === 0 ? <p className="muted">{t("ui.noXrefTargets")}</p> : (
          <ul id="xref-results" className="results" role="listbox">
            {hits.length === 0 && <li className="muted">{t("noMatches")}</li>}
            {hits.map((x, i) => (
              <li key={x.p.id} id={`xr-${x.p.id}`} role="option" aria-selected={i === active} className={i === active ? "active" : ""}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); onPick(x.p, x.kind); }}>
                <b>{x.label}</b> {x.p.caption && <span className="muted">· {x.p.caption}</span>}
              </li>
            ))}
          </ul>
        )}
        <div className="dialog-actions"><span className="muted">{t("ui.xrefHelp")}</span><button className="btn" onClick={onClose}>{t("cancel")}</button></div>
      </div>
    </div>
  );
}
