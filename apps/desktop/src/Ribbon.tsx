// The editor's toolbar, one row (design proposal 4.3, record 0044): undo and redo, paragraph
// style, bold, italic, underline, superscript, subscript, font colour and highlight with
// Word's colours (record 0043), and the insertions: citation, cross-reference, table,
// figure and special character. Bold and italic read N and K in "Word en español", as in
// Word, and B and I in the international scheme.
import { useEditorState, type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import type { OutlinePart } from "@scidesk/core";
import { Icon } from "./icons.tsx";
import { MenuButton, Popover } from "./Menus.tsx";
import { SCHEMES, shortcutLabel, type Action, type SchemeId } from "./shortcuts.ts";

/** Word's standard colours (the row under the theme colours) and the usual highlights. */
export const TEXT_COLORS: [string, string][] = [["#C00000", "darkRed"], ["#FF0000", "red"], ["#FFC000", "orange"], ["#00B050", "green"], ["#0070C0", "blue"], ["#002060", "darkBlue"], ["#7030A0", "purple"], ["#7F7F7F", "gray"]];
export const HIGHLIGHTS = ["yellow", "green", "cyan", "magenta", "red", "blue", "lightGray"] as const;
const HIGHLIGHT_CSS: Record<string, string> = { yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", red: "#ff0000", blue: "#0000ff", lightGray: "#c0c0c0" };
/** The scientific characters of PLAN 5.2. */
export const SYMBOLS = ["±", "≤", "≥", "×", "µ", "°", "→", "–", "—", " ", "α", "β", "γ", "δ", "κ", "λ", "χ", "Δ", "σ", "τ"];

/** Letters on the bold, italic and underline buttons in each scheme. */
const LETTERS: Record<SchemeId, [string, string, string]> = { "word-es": ["N", "K", "S"], international: ["B", "I", "U"] };

export function Ribbon({ editor, scheme, targets, onCite, onXref, onTable, onFigure, disabled }: {
  editor: Editor;
  scheme: SchemeId;
  targets: { tables: OutlinePart[]; figures: OutlinePart[] };
  onCite: () => void;
  onXref: (part: OutlinePart, kind: "table" | "figure") => void;
  onTable: () => void;
  onFigure: () => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
      sup: e.isActive("superscript"), sub: e.isActive("subscript"),
      color: (e.getAttributes("textColor").color as string | undefined) ?? null,
      canUndo: e.can().undo(), canRedo: e.can().redo(),
      block: e.isActive("title") ? "title" : e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : e.isActive("paragraph") ? "p" : "other",
    }),
  });
  const keys = (a: Action) => shortcutLabel(SCHEMES[scheme][a], i18n.language);
  const tip = (label: string, a?: Action) => (a ? `${label} (${keys(a)})` : label);
  const keep = (e: React.MouseEvent) => e.preventDefault(); // the editor keeps its selection
  const [b, k, u] = LETTERS[scheme];
  const toggle = (mark: string, on: boolean, label: string, a: Action, content: React.ReactNode) => (
    <button className={`tool${on ? " on" : ""}`} aria-pressed={on} title={tip(label, a)} aria-label={label} onMouseDown={keep} disabled={disabled}
      onClick={() => editor.chain().focus().toggleMark(mark).run()}>{content}</button>
  );
  const setBlock = (v: string) => {
    const c = editor.chain().focus();
    if (v === "p") c.setParagraph().run();
    else c.setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
  };

  return (
    <div className="ribbon" role="toolbar" aria-label={t("ui.ribbon")}>
      <button className="tool" title={tip(t("ui.undo"), "undo")} aria-label={t("ui.undo")} onMouseDown={keep} disabled={disabled || !s.canUndo} onClick={() => editor.chain().focus().undo().run()}><Icon name="undo" /></button>
      <button className="tool" title={tip(t("ui.redo"), "redo")} aria-label={t("ui.redo")} onMouseDown={keep} disabled={disabled || !s.canRedo} onClick={() => editor.chain().focus().redo().run()}><Icon name="redo" /></button>
      <span className="tool-sep" />
      <select className="block-style" aria-label={t("ui.paragraphStyle")} title={t("ui.paragraphStyle")} value={s.block} disabled={disabled || s.block === "title" || s.block === "other"} onChange={(e) => setBlock(e.target.value)}>
        {s.block === "title" && <option value="title">{t("ui.styles.title")}</option>}
        {s.block === "other" && <option value="other">—</option>}
        <option value="p">{t("ui.styles.p")}</option>
        <option value="h1">{t("ui.styles.h1")}</option>
        <option value="h2">{t("ui.styles.h2")}</option>
        <option value="h3">{t("ui.styles.h3")}</option>
      </select>
      <span className="tool-sep" />
      {toggle("bold", s.bold, t("ui.bold"), "bold", <b>{b}</b>)}
      {toggle("italic", s.italic, t("ui.italic"), "italic", <i className="serif">{k}</i>)}
      {toggle("underline", s.underline, t("ui.underline"), "underline", <u>{u}</u>)}
      {toggle("superscript", s.sup, t("ui.superscript"), "superscript", <span>x<sup>2</sup></span>)}
      {toggle("subscript", s.sub, t("ui.subscript"), "subscript", <span>x<sub>2</sub></span>)}
      <Popover id="tool-color" label={t("textColor")} className="tool" disabled={disabled} button={<span className="color-tool"><Icon name="textColor" /><span className="color-bar" style={{ background: s.color ?? "var(--text)" }} /></span>}>
        {(close) => (
          <div className="swatches" onMouseDown={keep}>
            <button className="swatch-row" onClick={() => { editor.chain().focus().unsetMark("textColor").run(); close(); }}><span className="swatch" style={{ background: "var(--text)" }} />{t("colorAuto")}</button>
            <div className="swatch-grid">
              {TEXT_COLORS.map(([hex, key]) => (
                <button key={hex} className={`swatch${s.color === hex ? " on" : ""}`} style={{ background: hex }} title={t(`colors.${key}`)} aria-label={t(`colors.${key}`)}
                  onClick={() => { editor.chain().focus().setMark("textColor", { color: hex }).run(); close(); }} />
              ))}
            </div>
          </div>
        )}
      </Popover>
      <Popover id="tool-highlight" label={t("highlightColor")} className="tool" disabled={disabled} button={<span className="color-tool"><Icon name="highlight" /><span className="color-bar" style={{ background: HIGHLIGHT_CSS.yellow }} /></span>}>
        {(close) => (
          <div className="swatches" onMouseDown={keep}>
            <button className="swatch-row" onClick={() => { editor.chain().focus().unsetMark("highlight").run(); close(); }}><span className="swatch none" />{t("highlightNone")}</button>
            <div className="swatch-grid">
              {HIGHLIGHTS.map((h) => (
                <button key={h} className="swatch" style={{ background: HIGHLIGHT_CSS[h] }} title={t(`highlights.${h}`)} aria-label={t(`highlights.${h}`)}
                  onClick={() => { editor.chain().focus().setMark("highlight", { color: h }).run(); close(); }} />
              ))}
            </div>
          </div>
        )}
      </Popover>
      <span className="tool-sep" />
      <button className="tool accent" title={tip(t("ui.cite"), "cite")} onMouseDown={keep} disabled={disabled} onClick={onCite}><Icon name="quote" /> {t("ui.citeShort")}</button>
      <MenuButton id="tool-xref" label={t("ui.xref")} className="tool" disabled={disabled} title={tip(t("ui.xref"), "xref")} items={[
        ...targets.tables.map((p) => ({ label: `${t("ui.tableN", { n: p.number })}${p.caption ? ` · ${p.caption}` : ""}`, onSelect: () => onXref(p, "table") as void })),
        ...targets.figures.map((p) => ({ label: `${t("ui.figureN", { n: p.number })}${p.caption ? ` · ${p.caption}` : ""}`, onSelect: () => onXref(p, "figure") as void })),
        ...(targets.tables.length + targets.figures.length ? [] : [{ label: t("ui.noXrefTargets"), onSelect: () => {}, disabled: true }]),
      ]}>
        <Icon name="link" /> <span className="tool-text">{t("ui.xref")}</span>
      </MenuButton>
      <button className="tool" title={t("ui.insertTable")} aria-label={t("ui.insertTable")} onMouseDown={keep} disabled={disabled} onClick={onTable}><Icon name="table" /></button>
      <button className="tool" title={t("ui.insertFigure")} aria-label={t("ui.insertFigure")} onMouseDown={keep} disabled={disabled} onClick={onFigure}><Icon name="figure" /></button>
      <Popover id="tool-symbol" label={t("ui.symbol")} className="tool" disabled={disabled} button={<Icon name="omega" />}>
        {(close) => (
          <div className="symbols" onMouseDown={keep}>
            {SYMBOLS.map((c) => (
              <button key={c} className="symbol" title={c === " " ? t("ui.nbsp") : c} aria-label={c === " " ? t("ui.nbsp") : c}
                onClick={() => { editor.chain().focus().insertContent(c).run(); close(); }}>{c === " " ? "⍽" : c}</button>
            ))}
          </div>
        )}
      </Popover>
    </div>
  );
}
