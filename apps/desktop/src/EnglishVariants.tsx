// Review › Make the English British or American (record 0063): choose the variety, see what
// would change (word, new spelling, how many times), untick what should stay, and apply it
// in one step. Quoted text and names in the middle of a sentence come unticked.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/core";
import type { EnglishVariety } from "@scidesk/spell";
import { applyEnglishPlan, englishPlan, type VariantRow } from "./variants.ts";

export function EnglishVariants({ editor, initial, onApplied, onClose }: {
  editor: Editor;
  initial: EnglishVariety;
  /** After applying: how many words changed, the variety and whether the English was tagged with it. */
  onApplied: (changed: number, to: EnglishVariety, tagged: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [to, setTo] = useState<EnglishVariety>(initial);
  const [rows, setRows] = useState<VariantRow[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [quoted, setQuoted] = useState(false);
  const [tag, setTag] = useState(true);

  useEffect(() => {
    let live = true;
    setRows(null);
    void englishPlan(editor.state, to).then((r) => {
      if (!live) return;
      setRows(r);
      setChosen(new Set(r.filter((x) => x.suggested).map((x) => x.key)));
    });
    return () => { live = false; };
  }, [editor, to]);

  const toggle = (key: string) => setChosen((old) => { const n = new Set(old); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const picked = rows?.filter((r) => chosen.has(r.key)) ?? [];
  const count = picked.reduce((n, r) => n + r.places.filter((p) => quoted || !p.quoted).length, 0);
  const apply = () => {
    const changed = applyEnglishPlan(editor, picked, { quoted, tag: tag ? (to === "GB" ? "en-GB" : "en-US") : null });
    onApplied(changed, to, tag);
  };

  return (
    <div className="overlay" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="recovery-dialog variants-dialog" role="dialog" aria-modal="true" aria-labelledby="variants-title">
        <h2 id="variants-title">{t("ui.variants.title")}</h2>
        <p className="muted">{t("ui.variants.intro")}</p>
        <div className="variants-choice" role="radiogroup" aria-label={t("ui.variants.to")}>
          {(["GB", "US"] as const).map((v) => (
            <label key={v}><input type="radio" name="variety" checked={to === v} onChange={() => setTo(v)} /> {t(`ui.variants.${v}`)}</label>
          ))}
        </div>
        <div className="variants-list" aria-busy={rows === null}>
          {rows === null && <p className="muted">{t("ui.variants.looking")}</p>}
          {rows?.length === 0 && <p className="muted">{t("ui.variants.none")}</p>}
          {rows?.map((r) => (
            <label key={r.key} className="variants-row">
              <input type="checkbox" checked={chosen.has(r.key)} onChange={() => toggle(r.key)} />
              <span className="variants-word">{r.word}</span>
              <span aria-hidden="true">→</span>
              <span className="variants-word">{r.replacement}</span>
              <span className="muted">×{r.places.length}</span>
              {r.proper && <span className="variants-note">{t("ui.variants.name")}</span>}
              {r.quoted > 0 && <span className="variants-note">{t("ui.variants.quotedN", { count: r.quoted })}</span>}
            </label>
          ))}
        </div>
        <label><input type="checkbox" checked={quoted} onChange={(e) => setQuoted(e.target.checked)} /> {t("ui.variants.quoted")}</label>
        <label><input type="checkbox" checked={tag} onChange={(e) => setTag(e.target.checked)} /> {t(`ui.variants.tag${to}`)}</label>
        <div className="dialog-actions">
          <span className="muted">{rows ? t("ui.variants.count", { count }) : ""}</span>
          <button className="btn primary" onClick={apply} disabled={!rows || (!count && !tag)} autoFocus>{t("ui.variants.apply")}</button>
          <button className="btn" onClick={onClose}>{t("ui.variants.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
