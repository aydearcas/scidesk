// The minimal checks panel (PLAN 5.8, R12, R43, record 0041): word counts against the
// journal's limits, by section; warnings in three levels, each taking to its place; and
// marking a warning "correct" or "not applicable", with an optional note, so that it does
// not come back (it stays listed among the ignored ones, and can be restored). Since record
// 0044 it is the "Warnings" tab of the right panel, grouped by level, each level with its
// colour and its shape (blocking: octagon; worth checking: triangle; information: circle).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CheckLevel, CheckReport, CheckWarning } from "@scidesk/core";
import { LevelIcon } from "./icons.tsx";

export function ChecksPanel({ report, onGo, onIgnore, onRestore, showSections = false }: {
  report: CheckReport | null;
  /** Open the words by section (from the status bar). */
  showSections?: boolean;
  onGo: (w: CheckWarning) => void;
  onIgnore: (w: CheckWarning, status: "correct" | "not-applicable", note: string) => Promise<void>;
  onRestore: (w: CheckWarning) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [marking, setMarking] = useState<{ id: string; status: "correct" | "not-applicable"; note: string } | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  if (!report) return <p className="muted">{t("checksPending")}</p>;
  const { counts, limits } = report;
  const active = report.warnings.filter((w) => !w.ignored);
  const ignored = report.warnings.filter((w) => w.ignored);
  const of = (value: number, limit?: number) => (limit !== undefined ? <span className={value > limit ? "over" : ""}>{value} / {limit}</span> : <span>{value}</span>);
  const message = (w: CheckWarning) => t(`checks.${w.code === "no-limits" && !w.params.journal ? "no-journal" : w.code}`, w.params as Record<string, string>);
  const canGo = (w: CheckWarning) => !!w.where && w.where.path !== "manuscript/abstract.scidoc";
  const place = (w: CheckWarning) => (w.where?.path === "manuscript/abstract.scidoc" ? t("inAbstract") : w.where && w.where.path !== "manuscript/article.scidoc" ? t("inPart", { path: w.where.path }) : "");

  const item = (w: CheckWarning) => (
    <li key={w.id} className={`check ${w.level}`}>
      <div className="check-text"><LevelIcon level={w.level} /><span><span className="sr-only">{t(`levels.${w.level}`)}: </span>{message(w)}{place(w) && <span className="muted"> · {place(w)}</span>}</span></div>
      {w.ignored ? (
        <div className="check-actions">
          <span className="muted">{t(`ignoredAs.${w.ignored.status}`)}{w.ignored.note ? `: ${w.ignored.note}` : ""}</span>
          <button onClick={() => void onRestore(w)}>{t("restoreWarning")}</button>
        </div>
      ) : marking?.id === w.id ? (
        <form className="check-actions" onSubmit={(e) => { e.preventDefault(); void onIgnore(w, marking.status, marking.note).then(() => setMarking(null)); }}>
          <input autoFocus value={marking.note} onChange={(e) => setMarking({ ...marking, note: e.target.value })} placeholder={t("ignoreNote")} aria-label={t("ignoreNote")} />
          <button type="submit">{t(`ignoreAs.${marking.status}`)}</button>
          <button type="button" onClick={() => setMarking(null)}>{t("cancel")}</button>
        </form>
      ) : (
        <div className="check-actions">
          {canGo(w) && <button className="btn" onClick={() => onGo(w)}>{t("goTo")}</button>}
          <button className="btn quiet" onClick={() => setMarking({ id: w.id, status: "correct", note: "" })}>{t("ignoreAs.correct")}</button>
          <button className="btn quiet" onClick={() => setMarking({ id: w.id, status: "not-applicable", note: "" })}>{t("ignoreAs.not-applicable")}</button>
        </div>
      )}
    </li>
  );

  return (
    <div className="checks">
      <table className="counts">
        <tbody>
          <tr><th>{t("countText")}</th><td>{of(counts.main, limits.words)}</td></tr>
          {counts.abstract.map((a) => <tr key={a.lang}><th>{t("countAbstract", { lang: a.lang })}</th><td>{of(a.words, limits.abstractWords)}</td></tr>)}
          <tr><th>{t("countReferences")}</th><td>{of(counts.references, limits.references)}</td></tr>
          <tr><th>{t("countTablesFigures")}</th><td>{of(counts.tables, limits.tables)} · {of(counts.figures, limits.figures)}</td></tr>
        </tbody>
      </table>
      <details open={showSections || undefined}>
        <summary>{t("bySection")}</summary>
        <ul className="sections">
          {counts.sections.map((s, i) => <li key={i} className={s.counted ? "" : "muted"}><span>{s.heading || t("beforeFirstHeading")}</span><span>{s.words}{s.counted ? "" : ` (${t("notCounted")})`}</span></li>)}
        </ul>
      </details>
      {active.length === 0 ? <p className="muted">{t("noWarnings")}</p> : (["blocking", "review", "info"] as CheckLevel[]).map((level) => {
        const list = active.filter((w) => w.level === level);
        return list.length ? (
          <section key={level} className={`check-group ${level}`}>
            <h4><LevelIcon level={level} size={14} /> {t(`levels.${level}`)} · {list.length}</h4>
            <ul className="check-list">{list.map(item)}</ul>
          </section>
        ) : null;
      })}
      {ignored.length > 0 && (
        <>
          <button className="link" onClick={() => setShowIgnored((v) => !v)}>{t("ignoredCount", { count: ignored.length })}</button>
          {showIgnored && <ul className="check-list">{ignored.map(item)}</ul>}
        </>
      )}
    </div>
  );
}
