// View › Document font (record 0074): the font and size the article is written in, each one
// its own or "as the journal" (then Calibri 12 where the journal says nothing). The journal
// always gets its own; the dialog says which.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DocumentFonts } from "@scidesk/core";
import { FONTS, SIZES } from "./Ribbon.tsx";

export function DocumentFontDialog({ fonts, onSave, onClose }: {
  fonts: DocumentFonts;
  onSave: (value: { family: string | null; size: number | null }) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [family, setFamily] = useState(fonts.own.family ?? "");
  const [size, setSize] = useState(fonts.own.size ? String(fonts.own.size) : "");
  // what "as the journal" gives: the journal's, or Calibri 12 when it says nothing
  const asJournal = { family: fonts.journalSays.family ?? "Calibri", size: fonts.journalSays.size ?? 12 };
  const families = [...new Set([...FONTS, ...(fonts.own.family ? [fonts.own.family] : [])])].sort((a, b) => a.localeCompare(b));
  const n = (v: number) => v.toLocaleString(i18n.language);
  return (
    <div className="overlay" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="recovery-dialog doc-font-dialog" role="dialog" aria-modal="true" aria-labelledby="doc-font-title"
        onSubmit={(e) => { e.preventDefault(); onSave({ family: family || null, size: size ? Number(size) : null }); }}>
        <h2 id="doc-font-title">{t("ui.docFont.title")}</h2>
        <p className="muted">{t("ui.docFont.intro")}</p>
        <div className="doc-font-fields">
          <label>{t("ui.font")}
            <select autoFocus value={family} onChange={(e) => setFamily(e.target.value)} style={{ fontFamily: family || asJournal.family }}>
              <option value="">{t(fonts.journalSays.family ? "ui.docFont.asJournal" : "ui.docFont.asJournalNone", { value: asJournal.family })}</option>
              {families.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
          </label>
          <label>{t("ui.fontSize")}
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="">{t(fonts.journalSays.size ? "ui.docFont.asJournal" : "ui.docFont.asJournalNone", { value: n(asJournal.size) })}</option>
              {SIZES.map((s) => <option key={s} value={String(s)}>{n(s)}</option>)}
            </select>
          </label>
        </div>
        <p className="doc-font-sample" style={{ fontFamily: `"${family || asJournal.family}", sans-serif`, fontSize: `${size || asJournal.size}pt` }}>{t("ui.docFont.sample")}</p>
        <p className="muted small">{t("ui.docFont.journalGets", { family: fonts.journal.family, size: n(fonts.journal.size) })}</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>{t("cancel")}</button>
          <button type="submit" className="btn primary">{t("ui.docFont.save")}</button>
        </div>
      </form>
    </div>
  );
}
