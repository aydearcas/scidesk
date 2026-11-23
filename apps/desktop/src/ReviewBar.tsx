// The review bar (record 0091, the user's request): "Revisar" in the title bar is not a menu
// but a toggle that opens this bar under the ribbon, as the table bar, with what the menu had:
// tracked changes (on or off, accept or reject the change at the cursor or all of them, the
// previous and the next one), the warnings, a returned copy and the authors, the spell
// checker, the scientific autocorrection, the language of the text and making the English
// one variety.
import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/core";
import { Icon, type IconName } from "./icons.tsx";
import { changeAt } from "./track-changes.ts";

export interface ReviewBarProps {
  editor: Editor;
  disabled: boolean;
  tracking: boolean;
  onTracking: () => void;
  /** Accepts (true) or rejects the change at the cursor, or all of them. */
  onDecide: (accept: boolean, all: boolean) => void;
  onStep: (dir: 1 | -1) => void;
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
  const lang = p.lang ?? "";
  const isGB = /^en-gb$/i.test(lang);
  const tool = (key: string, onClick: () => void, opts: { icon?: IconName; pressed?: boolean; disabled?: boolean; title?: string } = {}) => (
    <button key={key} className={`tool${opts.icon ? " both" : ""}${opts.pressed ? " on" : ""}`} aria-pressed={opts.pressed} aria-label={t(`ui.reviewBar.${key}`)}
      title={opts.title ?? t(`ui.reviewBar.${key}`)} disabled={p.disabled || opts.disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {opts.icon && <span className="tool-icon"><Icon name={opts.icon} size={16} /></span>}
      <span className="tool-text">{t(`ui.reviewBar.${key}`)}</span>
    </button>
  );
  return (
    <div className="table-tab-head review-bar" role="toolbar" aria-label={t("ui.reviewBar.label")}>
      <div className="tool-group" role="group" aria-label={t("ui.reviewBar.changes")}>
        <span className="tool-label" aria-hidden="true">{t("ui.reviewBar.changes")}</span>
        {tool("track", p.onTracking, { icon: "trackChanges", pressed: p.tracking, title: t("ui.track.statusHint") })}
        {tool("accept", () => p.onDecide(true, false), { icon: "check", disabled: !here })}
        {tool("reject", () => p.onDecide(false, false), { icon: "close", disabled: !here })}
        {tool("previous", () => p.onStep(-1), { icon: "chevronLeft" })}
        {tool("next", () => p.onStep(1), { icon: "chevronRight" })}
        {tool("acceptAll", () => p.onDecide(true, true))}
        {tool("rejectAll", () => p.onDecide(false, true))}
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
        {tool("es", () => p.onLang("es"), { pressed: lang.toLowerCase().startsWith("es"), title: t("ui.lang.hint") })}
        {tool("enUS", () => p.onLang("en-US"), { pressed: lang.toLowerCase().startsWith("en") && !isGB, title: t("ui.lang.hint") })}
        {tool("enGB", () => p.onLang("en-GB"), { pressed: isGB, title: t("ui.lang.hint") })}
        {tool("variants", p.onVariants)}
      </div>
    </div>
  );
}
