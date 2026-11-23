// The minimal checks panel (PLAN 5.8, R12, R43, record 0041): word counts against the
// journal's limits, by section; warnings in three levels, each taking to its place; and
// marking a warning "correct" or "not applicable", with an optional note, so that it does
// not come back (it stays listed among the ignored ones, and can be restored). Since record
// 0044 it is the "Warnings" tab of the right panel, grouped by level, each level with its
// colour and its shape (blocking: octagon; worth checking: triangle; information: circle).
// Record 0088: what may give the authors away under double-blind review can be changed only
// in the blinded version (the text replaced everywhere, or the section taken to the title
// page); those are listed apart, and can be undone.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BLIND_REPLACEABLE, defaultBlindReplacement, sectionLabel, type CheckLevel, type CheckReport, type CheckWarning } from "@scidesk/core";
import { LevelIcon } from "./icons.tsx";

export function ChecksPanel({ report, onGo, onIgnore, onRestore, onTableWords, journalSays, showSections = false, onAddSection, onBlind, articleLang }: {
  /** Record 0088: replaces the warning's text in the blinded version (a string), or takes its section to the title page (null). */
  onBlind: (w: CheckWarning, replacement: string | null) => Promise<void>;
  /** The article's language, for what the blinded version says instead. */
  articleLang: string;
  /** Record 0072: adds a section the journal asks for, in its place. */
  onAddSection: (role: string) => void;
  /** Record 0056: whether the tables' words count (null: as the journal says). */
  onTableWords: (value: boolean | null) => Promise<void>;
  /** What the journal's profile says about the tables' words, if it says anything. */
  journalSays: boolean | null;
  report: CheckReport | null;
  /** Open the words by section (from the status bar). */
  showSections?: boolean;
  onGo: (w: CheckWarning) => void;
  /** Ignores one warning, or several at once (record 0085: every "not cited" of a kind). */
  onIgnore: (w: CheckWarning | CheckWarning[], status: "correct" | "not-applicable", note: string) => Promise<void>;
  onRestore: (w: CheckWarning) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [marking, setMarking] = useState<{ id: string; status: "correct" | "not-applicable"; note: string } | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [showBlinded, setShowBlinded] = useState(false);
  const [replacing, setReplacing] = useState<{ id: string; text: string } | null>(null);
  if (!report) return <p className="muted">{t("checksPending")}</p>;
  const { counts, limits } = report;
  const active = report.warnings.filter((w) => !w.ignored);
  const isBlinded = (w: CheckWarning) => w.ignored?.status === "replaced" || w.ignored?.status === "omitted";
  const ignored = report.warnings.filter((w) => w.ignored && !isBlinded(w));
  const blinded = report.warnings.filter(isBlinded);
  const of = (value: number, limit?: number) => (limit !== undefined ? <span className={value > limit ? "over" : ""}>{value} / {limit}</span> : <span>{value}</span>);
  // record 0072: sections by their name in the interface's language
  const sectionName = (role: string) => sectionLabel(role, i18n.language);
  const message = (w: CheckWarning) => t(`checks.${w.code === "no-limits" && !w.params.journal ? "no-journal" : w.code}`, {
    ...(w.params as Record<string, string>),
    ...(w.params.role ? { section: sectionName(String(w.params.role)) } : {}),
    ...(w.params.roles ? { order: String(w.params.roles).split(",").map(sectionName).join(" · ") } : {}),
    where: w.params.placement === "before-references" ? t("beforeReferences") : "",
  });
  const canAdd = (w: CheckWarning) => (w.code === "missing-declaration" || w.code === "missing-section") && !!w.params.role;
  const canGo = (w: CheckWarning) => !!w.where && w.where.path !== "manuscript/abstract.scidoc";
  const place = (w: CheckWarning) => (w.where?.path === "manuscript/abstract.scidoc" ? t("inAbstract") : w.where && w.where.path !== "manuscript/article.scidoc" ? t("inPart", { path: w.where.path }) : "");

  const item = (w: CheckWarning) => (
    <li key={w.id} className={`check ${w.level}`}>
      <div className="check-text"><LevelIcon level={w.level} /><span><span className="sr-only">{t(`levels.${w.level}`)}: </span>{message(w)}{place(w) && <span className="muted"> · {place(w)}</span>}</span></div>
      {w.ignored?.status === "replaced" || w.ignored?.status === "omitted" ? (
        <div className="check-actions">
          <span className="muted">{w.ignored.status === "replaced" ? t("blinding.replacedAs", { text: w.params.match, replacement: w.ignored.replacement }) : t("blinding.omitted")}</span>
          <button onClick={() => void onRestore(w)}>{t("ui.undo")}</button>
        </div>
      ) : w.ignored ? (
        <div className="check-actions">
          <span className="muted">{t(`ignoredAs.${w.ignored.status}`)}{w.ignored.note ? `: ${w.ignored.note}` : ""}</span>
          <button onClick={() => void onRestore(w)}>{t("restoreWarning")}</button>
        </div>
      ) : replacing?.id === w.id ? (
        <form className="check-actions blind-replace" onSubmit={(e) => { e.preventDefault(); void onBlind(w, replacing.text).then(() => setReplacing(null)); }}>
          <span className="muted">{t("blinding.replaceLabel", { text: w.params.match })}</span>
          <input autoFocus value={replacing.text} onChange={(e) => setReplacing({ ...replacing, text: e.target.value })} aria-label={t("blinding.replacement")} />
          <button type="submit">{t("blinding.replace")}</button>
          <button type="button" onClick={() => setReplacing(null)}>{t("cancel")}</button>
        </form>
      ) : marking?.id === w.id ? (
        <form className="check-actions" onSubmit={(e) => { e.preventDefault(); void onIgnore(w, marking.status, marking.note).then(() => setMarking(null)); }}>
          <input autoFocus value={marking.note} onChange={(e) => setMarking({ ...marking, note: e.target.value })} placeholder={t("ignoreNote")} aria-label={t("ignoreNote")} />
          <button type="submit">{t(`ignoreAs.${marking.status}`)}</button>
          <button type="button" onClick={() => setMarking(null)}>{t("cancel")}</button>
        </form>
      ) : (
        <div className="check-actions">
          {canAdd(w) && <button className="btn" onClick={() => onAddSection(String(w.params.role))}>{t("addNamed", { section: sectionName(String(w.params.role)) })}</button>}
          {canGo(w) && <button className="btn" onClick={() => onGo(w)}>{t("goTo")}</button>}
          {BLIND_REPLACEABLE.has(w.code) && typeof w.params.match === "string" && (
            <button className="btn quiet" title={t("blinding.replaceTip")} onClick={() => setReplacing({ id: w.id, text: defaultBlindReplacement(w.code, articleLang) })}>{t("blinding.replaceButton")}</button>
          )}
          {w.code === "blind-section" && <button className="btn quiet" title={t("blinding.omitTip")} onClick={() => void onBlind(w, null)}>{t("blinding.omitButton")}</button>}
          <button className="btn quiet" onClick={() => setMarking({ id: w.id, status: "correct", note: "" })}>{t("ignoreAs.correct")}</button>
          <button className="btn quiet" onClick={() => setMarking({ id: w.id, status: "not-applicable", note: "" })}>{t("ignoreAs.not-applicable")}</button>
        </div>
      )}
    </li>
  );

  // record 0085: the "not cited" of one kind, all at once, when there are several
  const BULK = ["uncited-reference", "uncited-table", "uncited-figure"] as const;
  const bulk = (list: CheckWarning[]) => BULK.map((code) => {
    const ws = list.filter((w) => w.code === code);
    if (ws.length < 2) return null;
    const key = `all:${code}`;
    return (
      <li key={key} className="check bulk">
        <div className="check-text"><span>{t(`checks.bulk.${code}`, { count: ws.length })}</span></div>
        {marking?.id === key ? (
          <form className="check-actions" onSubmit={(e) => { e.preventDefault(); void onIgnore(ws, marking.status, marking.note).then(() => setMarking(null)); }}>
            <input autoFocus value={marking.note} onChange={(e) => setMarking({ ...marking, note: e.target.value })} placeholder={t("ignoreNote")} aria-label={t("ignoreNote")} />
            <button type="submit">{t(`ignoreAllAs.${marking.status}`, { count: ws.length })}</button>
            <button type="button" onClick={() => setMarking(null)}>{t("cancel")}</button>
          </form>
        ) : (
          <div className="check-actions">
            <button className="btn quiet" onClick={() => setMarking({ id: key, status: "correct", note: "" })}>{t("ignoreAllAs.correct", { count: ws.length })}</button>
            <button className="btn quiet" onClick={() => setMarking({ id: key, status: "not-applicable", note: "" })}>{t("ignoreAllAs.not-applicable", { count: ws.length })}</button>
          </div>
        )}
      </li>
    );
  });

  return (
    <div className="checks">
      <table className="counts">
        <tbody>
          <tr><th>{t("countText")}{counts.tableWords > 0 && <span className="muted small"> · {t(counts.tableWordsCounted ? "tableWords.withTables" : "tableWords.withoutTables")}</span>}</th><td>{of(counts.main, limits.words)}</td></tr>
          {counts.abstract.map((a) => <tr key={a.lang}><th>{t("countAbstract", { lang: a.lang })}</th><td>{of(a.words, limits.abstractWords)}</td></tr>)}
          <tr><th>{t("countReferences")}</th><td>{of(counts.references, limits.references)}</td></tr>
          <tr><th>{t("countTablesFigures")}</th><td>{of(counts.tables, limits.tables)} · {of(counts.figures, limits.figures)}</td></tr>
        </tbody>
      </table>
      {counts.tables > 0 && (
        <label className="table-words">
          <span>{t("tableWords.label", { count: counts.tableWords })}</span>
          <select value={counts.tableWordsBy === "article" ? String(counts.tableWordsCounted) : "journal"}
            onChange={(e) => void onTableWords(e.target.value === "journal" ? null : e.target.value === "true")}>
            <option value="journal">{t(journalSays === null ? "tableWords.journalUnknown" : journalSays ? "tableWords.journalYes" : "tableWords.journalNo")}</option>
            <option value="true">{t("tableWords.yes")}</option>
            <option value="false">{t("tableWords.no")}</option>
          </select>
        </label>
      )}
      <details open={showSections || undefined}>
        <summary>{t("bySection")}</summary>
        <ul className="sections">
          {counts.sections.map((s, i) => <li key={i} className={s.counted ? "" : "muted"}><span>{s.heading || t("beforeFirstHeading")}</span><span>{s.words}{s.counted ? "" : ` (${t("notCounted")})`}{s.tableWords > 0 && s.counted ? <span className="muted"> {t(counts.tableWordsCounted ? "tableWords.sectionIn" : "tableWords.sectionOut", { count: s.tableWords })}</span> : null}</span></li>)}
        </ul>
      </details>
      {active.length === 0 ? <p className="muted">{t("noWarnings")}</p> : (["blocking", "review", "info"] as CheckLevel[]).map((level) => {
        const list = active.filter((w) => w.level === level);
        return list.length ? (
          <section key={level} className={`check-group ${level}`}>
            <h4><LevelIcon level={level} size={14} /> {t(`levels.${level}`)} · {list.length}</h4>
            <ul className="check-list">{bulk(list)}{list.map(item)}</ul>
          </section>
        ) : null;
      })}
      {blinded.length > 0 && (
        <>
          <button className="link" onClick={() => setShowBlinded((v) => !v)}>{t("blinding.count", { count: blinded.length })}</button>
          {showBlinded && <ul className="check-list">{blinded.map(item)}</ul>}
        </>
      )}
      {ignored.length > 0 && (
        <>
          <button className="link" onClick={() => setShowIgnored((v) => !v)}>{t("ignoredCount", { count: ignored.length })}</button>
          {showIgnored && <ul className="check-list">{ignored.map(item)}</ul>}
        </>
      )}
    </div>
  );
}
