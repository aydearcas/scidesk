// The editor's toolbar, one row (design proposal 4.3, record 0044): save now, undo and redo, paragraph
// style, bold, italic, underline, superscript, subscript, font colour and highlight with
// Word's colours (record 0043), and the insertions: citation, cross-reference, table,
// figure and special character. Bold and italic read N and K in "Word en español", as in
// Word, and B and I in the international scheme. Record 0069: bullets, numbering and the
// level of a list item or a paragraph's left indent (Tab and Shift+Tab in the text do the same),
// as Word's Paragraph group.
import { useEditorState, type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import type { OutlinePart } from "@scidesk/core";
import { Icon } from "./icons.tsx";
import { changeIndent } from "./indent.ts";
import { alignAt, canBlockquote, inBlockquote, setBlockAlign, toggleBlockquote, type BlockAlign } from "./align.ts";
import { MenuButton, Popover } from "./Menus.tsx";
import { SCHEMES, shortcutLabel, type Action, type SchemeId } from "./shortcuts.ts";

/** Word's standard colours (the row under the theme colours) and the usual highlights. */
export const TEXT_COLORS: [string, string][] = [["#C00000", "darkRed"], ["#FF0000", "red"], ["#FFC000", "orange"], ["#00B050", "green"], ["#0070C0", "blue"], ["#002060", "darkBlue"], ["#7030A0", "purple"], ["#7F7F7F", "gray"]];
export const HIGHLIGHTS = ["yellow", "green", "cyan", "magenta", "red", "blue", "lightGray"] as const;
const HIGHLIGHT_CSS: Record<string, string> = { yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", red: "#ff0000", blue: "#0000ff", lightGray: "#c0c0c0" };
/** The scientific characters of PLAN 5.2. */
export const SYMBOLS = ["±", "≤", "≥", "×", "µ", "°", "→", "–", "—", " ", "α", "β", "γ", "δ", "κ", "λ", "χ", "Δ", "σ", "τ"];

/** The list nearest the cursor, if any (record 0069). */
function innermostList(e: Editor): "bulletList" | "orderedList" | null {
  const $from = e.state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "bulletList" || name === "orderedList") return name;
  }
  return null;
}

/** Letters on the bold, italic and underline buttons in each scheme. */
const LETTERS: Record<SchemeId, [string, string, string]> = { "word-es": ["N", "K", "S"], international: ["B", "I", "U"] };

/** Fonts offered in the free font mode: Word's usual ones and Roboto (record 0011); the document's is the default. */
export const FONTS = ["Arial", "Aptos", "Calibri", "Cambria", "Courier New", "Garamond", "Georgia", "Roboto", "Times New Roman", "Verdana"];
export const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36];

export function Ribbon({ editor, scheme, targets, onCite, onXref, onTable, onFigure, disabled, freeFonts, onAdapt, onSave, saveState, docFont }: {
  /** Record 0074: the font and size the article is written in; choosing them removes a fragment's own. */
  docFont: { family: string; size: number };
  /** Save now (Ctrl+G or Ctrl+S): it works in every tab, as the menu and the shortcut do. */
  onSave: () => void;
  saveState: { dirty: boolean; saving: boolean; lastSaved: Date | null };
  /** The free font mode (record 0047): font, size and "Adapt to the journal". */
  freeFonts: boolean;
  onAdapt: () => void;
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
      font: (e.getAttributes("fontFamily").family as string | undefined) ?? "",
      size: e.getAttributes("fontSize").size != null ? String(e.getAttributes("fontSize").size) : "",
      canUndo: e.can().undo(), canRedo: e.can().redo(),
      list: innermostList(e),
      canBullets: e.can().toggleBulletList(), canNumbers: e.can().toggleOrderedList(),
      canSink: changeIndent(1)(e.state), canLift: changeIndent(-1)(e.state),
      align: alignAt(e.state), quote: inBlockquote(e.state), canQuote: canBlockquote(e.state),
      block: e.isActive("title") ? "title" : e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : e.isActive("paragraph") ? "p" : "other",
    }),
  });
  const keys = (a: Action) => shortcutLabel(SCHEMES[scheme][a], i18n.language);
  const tip = (label: string, a?: Action) => (a ? `${label} (${keys(a)})` : label);
  const keep = (e: React.MouseEvent) => e.preventDefault(); // the editor keeps its selection
  const [b, k, u] = LETTERS[scheme];
  // the document's font and size in their place in each list (record 0047), whatever they are
  const DOC_FONT = docFont.family, DOC_SIZE = docFont.size;
  const fontList = FONTS.includes(DOC_FONT) ? FONTS : [...FONTS, DOC_FONT].sort((a, c) => a.localeCompare(c));
  const sizeList = SIZES.includes(DOC_SIZE) ? SIZES : [...SIZES, DOC_SIZE].sort((a, c) => a - c);
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
    <div className={`ribbon${freeFonts ? " free-fonts" : ""}`} role="toolbar" aria-label={t("ui.ribbon")}>
      <button className={`tool save-tool${saveState.dirty ? " dirty" : ""}`} onMouseDown={keep} onClick={onSave} disabled={saveState.saving} aria-label={t("ui.saveNow")}
        title={`${tip(t("ui.saveNow"), "save")} · ${saveState.saving ? t("saving") : saveState.dirty ? t("unsaved") : saveState.lastSaved ? t("savedAt", { time: saveState.lastSaved.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" }) }) : t("saved")}`}>
        <Icon name="save" size={21} />{saveState.dirty && <span className="unsaved-dot" aria-hidden="true" />}
      </button>
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
      {freeFonts && <>
        <select className="font-family" aria-label={t("ui.font")} title={s.font ? t("ui.font") : t("ui.documentFont")} value={s.font} disabled={disabled}
          onChange={(e) => { const v = e.target.value; const c = editor.chain().focus(); (v ? c.setMark("fontFamily", { family: v }) : c.unsetMark("fontFamily")).run(); }}>
          {s.font && !fontList.filter((f) => f !== DOC_FONT).includes(s.font) && <option value={s.font}>{s.font}</option>}
          {/* the document's font in its place in the list: choosing it removes a fragment's own */}
          {fontList.map((f) => (f === DOC_FONT
            ? <option key={f} value="" title={t("ui.documentFont")}>{f}</option>
            : <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>))}
        </select>
        <select className="font-size" aria-label={t("ui.fontSize")} title={s.size ? t("ui.fontSize") : t("ui.documentSize")} value={s.size} disabled={disabled}
          onChange={(e) => { const v = e.target.value; const c = editor.chain().focus(); (v ? c.setMark("fontSize", { size: Number(v) }) : c.unsetMark("fontSize")).run(); }}>
          {s.size && !sizeList.filter((n) => n !== DOC_SIZE).map(String).includes(s.size) && <option value={s.size}>{s.size}</option>}
          {sizeList.map((n) => (n === DOC_SIZE
            ? <option key={n} value="" title={t("ui.documentSize")}>{n.toLocaleString(i18n.language)}</option>
            : <option key={n} value={String(n)}>{n.toLocaleString(i18n.language)}</option>))}
        </select>
        <button className="tool" title={`${t("ui.adaptFonts")}: ${t("ui.adaptFontsHint")}`} onMouseDown={keep} disabled={disabled} onClick={onAdapt} aria-label={t("ui.adaptFonts")}><Icon name="adapt" size={21} /></button>
      </>}
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
      {/* record 0069: the list around the cursor decides which button is on (bullets inside a numbered list show bullets) */}
      <button className={`tool${s.list === "bulletList" ? " on" : ""}`} aria-pressed={s.list === "bulletList"} title={t("ui.bulletList")} aria-label={t("ui.bulletList")} onMouseDown={keep}
        disabled={disabled || !s.canBullets} onClick={() => editor.chain().focus().toggleBulletList().run()}><Icon name="bulletList" /></button>
      <button className={`tool${s.list === "orderedList" ? " on" : ""}`} aria-pressed={s.list === "orderedList"} title={t("ui.orderedList")} aria-label={t("ui.orderedList")} onMouseDown={keep}
        disabled={disabled || !s.canNumbers} onClick={() => editor.chain().focus().toggleOrderedList().run()}><Icon name="orderedList" /></button>
      <button className="tool" title={`${t("ui.indentLess")} (${shortcutLabel("Shift-Tab", i18n.language)})`} aria-label={t("ui.indentLess")} onMouseDown={keep}
        disabled={disabled || !s.canLift} onClick={() => { changeIndent(-1)(editor.state, editor.view.dispatch); editor.commands.focus(); }}><Icon name="indentLess" /></button>
      <button className="tool" title={`${t("ui.indentMore")} (${shortcutLabel("Tab", i18n.language)})`} aria-label={t("ui.indentMore")} onMouseDown={keep}
        disabled={disabled || !s.canSink} onClick={() => { changeIndent(1)(editor.state, editor.view.dispatch); editor.commands.focus(); }}><Icon name="indentMore" /></button>
      <span className="tool-sep" />
      {/* record 0073: alignment (of the cells in a table) and block quotation */}
      {([["left", "alignLeft", "alignLeft"], ["center", "alignCenter", "alignCenter"], ["right", "alignRight", "alignRight"], ["justify", "alignJustify", "justify"]] as const).map(([a, icon, action]) => (
        <button key={a} className={`tool${s.align === a ? " on" : ""}`} aria-pressed={s.align === a} title={tip(t(`ui.actions.${action}`), action)} aria-label={t(`ui.actions.${action}`)} onMouseDown={keep}
          disabled={disabled || s.align === null} onClick={() => setBlockAlign(editor, a as BlockAlign)}><Icon name={icon} /></button>
      ))}
      <button className={`tool${s.quote ? " on" : ""}`} aria-pressed={s.quote} title={`${t("ui.blockquote")}: ${t("ui.blockquoteHint")}`} aria-label={t("ui.blockquote")} onMouseDown={keep}
        disabled={disabled || !s.canQuote} onClick={() => toggleBlockquote(editor)}><Icon name="blockquote" /></button>
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
