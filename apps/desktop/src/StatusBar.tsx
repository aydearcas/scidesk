// The status bar (design proposal 3.5): every item informs and is a button. Journal and
// article type, citation style, language, words against the limit, warnings by level and
// saving. The citeproc-js attribution that the CPAL asks for is always visible (record 0026).
import { useTranslation } from "react-i18next";
import { BUNDLED_STYLES, type ArticleData, type CheckReport, type Project } from "@scidesk/core";
import { LevelIcon } from "./icons.tsx";

export function StatusBar({ project, article, report, saving, dirty, lastSaved, onStyle, onChecks, onWords }: {
  project: Project | null;
  article: ArticleData | null;
  report: CheckReport | null;
  saving: boolean;
  dirty: boolean;
  lastSaved: Date | null;
  onStyle: (id: string) => void;
  onChecks: () => void;
  onWords: () => void;
}) {
  const { t, i18n } = useTranslation();
  const attribution = <span className="status-item attribution" title={t("attribution")}>{t("attribution")}</span>;
  if (!project || !article) return <footer className="statusbar">{attribution}</footer>;
  const a = article.article;
  const journal = a.journal ? project.journals.get(a.journal)?.journal.title.value ?? a.journal : null;
  const active = report?.warnings.filter((w) => !w.ignored) ?? [];
  const blocking = active.filter((w) => w.level === "blocking").length;
  const review = active.filter((w) => w.level === "review").length;
  const words = report?.counts.main ?? 0;
  const limit = report?.limits.words;
  const lang = (() => { try { return new Intl.DisplayNames([i18n.language], { type: "language" }).of(a.lang) ?? a.lang; } catch { return a.lang; } })();
  const styleName = BUNDLED_STYLES.find((s) => s.id === a.citationStyle.id)?.name ?? a.citationStyle.id;
  const time = lastSaved?.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });
  return (
    <footer className="statusbar">
      <span className="status-item" title={t("ui.journalLater")}>{journal ?? t("ui.noJournal")} · {t(`ui.articleTypes.${a.articleType}`, { defaultValue: a.articleType })}</span>
      <label className="status-item status-select" title={t("citationStyle")}>
        <span className="sr-only">{t("citationStyle")}</span>
        <span aria-hidden="true">{styleName}</span>
        <select value={a.citationStyle.id} onChange={(e) => onStyle(e.target.value)} aria-label={t("citationStyle")}>
          {!BUNDLED_STYLES.some((s) => s.id === a.citationStyle.id) && <option value={a.citationStyle.id}>{a.citationStyle.id}</option>}
          {BUNDLED_STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <span className="status-item">{lang}</span>
      <button className={`status-item${limit !== undefined && words > limit ? " over" : ""}`} onClick={onWords} title={t("bySection")}>
        {t("ui.wordsOf", { words: words.toLocaleString(i18n.language), limit: limit !== undefined ? ` / ${limit.toLocaleString(i18n.language)}` : "" })}
      </button>
      <button className="status-item" onClick={onChecks} title={t("ui.openWarnings")}>
        <LevelIcon level="blocking" size={14} /> {t("ui.blockingCount", { count: blocking })} · <LevelIcon level="review" size={14} /> {t("ui.reviewCount", { count: review })}
      </button>
      <span className="spacer" />
      <span className="status-item" aria-live="polite">{saving ? t("saving") : dirty ? t("unsaved") : time ? t("savedAt", { time }) : t("saved")}</span>
      {attribution}
    </footer>
  );
}
