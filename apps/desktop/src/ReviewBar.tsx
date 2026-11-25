// The review bar (record 0091, the user's request): "Revisar" in the title bar is not a menu
// but a toggle that opens this bar under the ribbon, across the window, with what the menu
// had: tracked changes (on or off, accept or reject the change at the cursor, the previous
// and the next one, all of them) and how they are shown (record 0092, Word's "Display for
// review"), comments (record 0094: a new one, the previous and the next, delete), the warnings, a returned copy and the authors, the spell checker, the scientific
// autocorrection, the language of the text and making the English one variety.
import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/core";
import { Icon, type IconName } from "./icons.tsx";
import { changeAt, MARKUP_VIEWS, type MarkupView } from "./track-changes.ts";
import { commentAt } from "./comments.ts";

export interface ReviewBarProps {
  editor: Editor;
  disabled: boolean;
  tracking: boolean;
  onTracking: () => void;
  /** Record 0092: how tracked changes are shown, as Word's "Display for review". */
  markup: MarkupView;
  onMarkup: (view: MarkupView) => void;
  /** Accepts (true) or rejects the change at the cursor, or all of them. */
  onDecide: (accept: boolean, all: boolean) => void;
  onStep: (dir: 1 | -1) => void;
  /** Record 0094: a new comment, the previous or next one, and deleting the one at the cursor. */
  onComment: () => void;
  onCommentStep: (dir: 1 | -1) => void;
  onCommentDelete: (id: string) => void;
  onWarnings: () => void;
  onImportCopy: () => void;
  onAuthors: () => void;
  spellcheck: boolean;
  onSpellcheck: () => void;
  autocorrect: boolean;
  onAutocorrect: () => void;
  /** The language at the cursor (a fragment's own, or its paragraph's). */
  lang: string | null;
  onLang: (lang: "es" | "en-US" | "en-GB") => void;
  onVariants: () => void;
}

export function ReviewBar(p: ReviewBarProps) {
  const { t } = useTranslation();
  // the change at the cursor follows every transaction
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => { p.editor.on("transaction", redraw); return () => { p.editor.off("transaction", redraw); }; }, [p.editor]);
  const here = p.editor.isDestroyed ? null : changeAt(p.editor.state);
  const comment = p.editor.isDestroyed ? null : commentAt(p.editor.state);
  const lang = (p.lang ?? "").toLowerCase();
  const langValue = lang.startsWith("es") ? "es" : /^en-gb$/.test(lang) ? "en-GB" : lang.startsWith("en") ? "en-US" : "";
  /** A button; `iconOnly` shows its name only on hover (and to screen readers). */
  const tool = (key: string, onClick: () => void, opts: { icon?: IconName; iconSize?: number; iconOnly?: boolean; pressed?: boolean; disabled?: boolean; title?: string } = {}) => (
    <button key={key} className={`tool${opts.icon && !opts.iconOnly ? " both" : ""}${opts.iconOnly ? " icon-only" : ""}${opts.pressed ? " on" : ""}`} aria-pressed={opts.pressed}
      aria-label={t(`ui.reviewBar.${key}`)} title={opts.title ?? t(`ui.reviewBar.${key}`)} disabled={p.disabled || opts.disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {opts.icon && <span className="tool-icon"><Icon name={opts.icon} size={opts.iconSize ?? 16} /></span>}
      {!opts.iconOnly && <span className="tool-text">{t(`ui.reviewBar.${key}`)}</span>}
    </button>
  );
  return (
    <div className="table-tab-head review-bar" role="toolbar" aria-label={t("ui.reviewBar.label")}>
      <div className="tool-group" role="group" aria-label={t("ui.reviewBar.changes")}>
        {tool("track", p.onTracking, { icon: "trackChanges", pressed: p.tracking, title: t("ui.track.statusHint") })}
        <label className="tool-select" title={t("ui.reviewBar.markupHint")}>
          <span className="sr-only">{t("ui.reviewBar.markup")}</span>
          <select value={p.markup} disabled={p.disabled} onChange={(e) => p.onMarkup(e.target.value as MarkupView)} aria-label={t("ui.reviewBar.markup")}>
            {MARKUP_VIEWS.map((v) => <option key={v} value={v}>{t(`ui.reviewBar.markupViews.${v}`)}</option>)}
          </select>
        </label>
        {tool("accept", () => p.onDecide(true, false), { icon: "check", iconSize: 19, iconOnly: true, disabled: !here })}
        {tool("reject", () => p.onDecide(false, false), { icon: "close", iconSize: 19, iconOnly: true, disabled: !here })}
        {tool("previous", () => p.onStep(-1), { icon: "chevronLeft", iconSize: 22, iconOnly: true })}
        {tool("next", () => p.onStep(1), { icon: "chevronRight", iconSize: 22, iconOnly: true })}
        {tool("acceptAll", () => p.onDecide(true, true))}
        {tool("rejectAll", () => p.onDecide(false, true))}
      </div>
      <div className="tool-group" role="group" aria-label={t("ui.reviewBar.comments")}>
        <span className="tool-label" aria-hidden="true">{t("ui.reviewBar.comments")}</span>
        {tool("newComment", p.onComment, { icon: "comment" })}
        {tool("previousComment", () => p.onCommentStep(-1), { icon: "chevronLeft", iconSize: 22, iconOnly: true })}
        {tool("nextComment", () => p.onCommentStep(1), { icon: "chevronRight", iconSize: 22, iconOnly: true })}
        {tool("deleteComment", () => { if (comment) p.onCommentDelete(comment); }, { icon: "close", iconSize: 19, iconOnly: true, disabled: !comment })}
      </div>
      <div className="tool-group" role="group" aria-label={t("ui.reviewBar.review")}>
        <span className="tool-label" aria-hidden="true">{t("ui.reviewBar.review")}</span>
        {tool("warnings", p.onWarnings, { icon: "review" })}
        {tool("importCopy", p.onImportCopy, { icon: "wordFile" })}
        {tool("authors", p.onAuthors, { icon: "users" })}
      </div>
      <div className="tool-group" role="group" aria-label={t("ui.reviewBar.language")}>
        <span className="tool-label" aria-hidden="true">{t("ui.reviewBar.language")}</span>
        {tool("spellcheck", p.onSpellcheck, { pressed: p.spellcheck })}
        {tool("autocorrect", p.onAutocorrect, { pressed: p.autocorrect, title: t("ui.autocorrect.hint") })}
        <label className="tool-select" title={t("ui.lang.hint")}>
          <span className="sr-only">{t("ui.reviewBar.langSelect")}</span>
          <select value={langValue} disabled={p.disabled} onChange={(e) => p.onLang(e.target.value as "es" | "en-US" | "en-GB")} aria-label={t("ui.reviewBar.langSelect")}>
            {!langValue && <option value="">{p.lang ?? "—"}</option>}
            <option value="es">{t("ui.reviewBar.es")}</option>
            <option value="en-US">{t("ui.reviewBar.enUS")}</option>
            <option value="en-GB">{t("ui.reviewBar.enGB")}</option>
          </select>
        </label>
        {tool("variants", p.onVariants)}
      </div>
    </div>
  );
}
