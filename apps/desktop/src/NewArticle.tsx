// The new-article wizard (sheet 7 of the interface proposal, record 0048): three steps
// (type and languages, journal, library) with what will be created always on the right. The
// plan on the right is the core's articlePlan, the same one that writes the files.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  articlePlan, BUNDLED_STYLES, folderName, journalSummary, journalTranslations, NEW_ARTICLE_TYPES, searchJournals,
  type CatalogJournal, type JournalSummary,
} from "@scidesk/core";
import type { JournalProfileFile } from "@scidesk/formats";
import { Icon } from "./icons.tsx";
import { shortPath } from "./Home.tsx";
import { defaultLocation, folderState, inTauri, journalProfile, pickLocation } from "./platform.ts";

export interface NewArticleChoice {
  title: string;
  lang: string;
  translations: string[];
  articleType: string;
  journal: CatalogJournal | null;
  profile: JournalProfileFile | null;
  citationStyle: string;
  /** Where the project's folder goes (the desktop window); null in the browser preview. */
  location: string | null;
  folder: string;
  references: File | null;
}

const TYPE_HINT: Record<string, string> = {
  original: "IMRaD", "brief-original": "imradShort", "systematic-review": "PRISMA", "narrative-review": "bySections", "case-report": "CARE", letter: "noAbstract",
};
const LANGS = ["es", "en"] as const;
const capital = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
const REF_FORMATS = ".ris,.nbib,.txt,.bib,.json";

export function NewArticle({ onCancel, onCreate, uiLang }: { onCancel: () => void; onCreate: (c: NewArticleChoice) => Promise<void>; uiLang: string }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<string>(uiLang.startsWith("en") ? "en" : "es");
  const [also, setAlso] = useState(false);
  const [articleType, setArticleType] = useState("original");
  const [location, setLocation] = useState<string | null>(null);
  const [folder, setFolder] = useState("");
  const folderEdited = useRef(false);
  const [state, setState] = useState<"free" | "empty" | "used" | "bad" | null>(null);
  const [query, setQuery] = useState("");
  const [journal, setJournal] = useState<CatalogJournal | null>(null);
  const [profile, setProfile] = useState<JournalProfileFile | null>(null);
  const [library, setLibrary] = useState<"own" | "file">("own");
  const [refsFile, setRefsFile] = useState<File | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const other = lang === "es" ? "en" : "es";
  const langName = (l: string) => { try { return new Intl.DisplayNames([i18n.language], { type: "language" }).of(l) ?? l; } catch { return l; } };

  // the folder: Documents by default, its name from the title until the user writes one
  useEffect(() => { if (inTauri) void defaultLocation().then((l) => setLocation((cur) => cur ?? l)); }, []);
  useEffect(() => { if (!folderEdited.current) setFolder(folderName(title)); }, [title]);
  useEffect(() => {
    if (!inTauri || !location || !folder) { setState(null); return; }
    let live = true;
    void folderState(location, folder).then((s) => live && setState(s));
    return () => { live = false; };
  }, [location, folder]);

  const chooseJournal = async (j: CatalogJournal | null) => {
    setJournal(j);
    setStyle(null);
    const p = j?.profile ? await journalProfile(j.profile) : null;
    setProfile(p);
    // the languages the journal asks for, besides the manuscript's
    if (p) setAlso(journalTranslations(p, lang).includes(other));
  };

  const translations = also ? [other] : [];
  const plan = useMemo(() => articlePlan({ title, lang, translations, articleType, journal: profile }), [title, lang, also, articleType, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary: JournalSummary | null = profile ? journalSummary(profile, articleType, lang) : null;
  const citationStyle = style ?? journal?.styleId ?? BUNDLED_STYLES[0].id;
  const styleName = (id: string) => BUNDLED_STYLES.find((s) => s.id === id)?.name ?? id;
  const journals = searchJournals(query);

  const folderOk = !inTauri || (!!location && !!folder && (state === "free" || state === "empty"));
  const stepOk = [title.trim().length > 0 && folderOk, true, library === "own" || !!refsFile];
  const steps = [
    { name: t("ui.wizard.step1"), detail: `${t(`ui.articleTypes.${articleType}`)} · ${langName(lang)}${also ? ` + ${langName(other)}` : ""}` },
    { name: t("ui.wizard.step2"), detail: journal?.title ?? t("ui.wizard.noJournal") },
    { name: t("ui.wizard.step3"), detail: library === "own" ? t("ui.wizard.ownEmpty") : refsFile?.name ?? t("ui.wizard.fromFile") },
  ];
  const next = async () => {
    if (!stepOk[step]) return;
    if (step < 2) { setStep(step + 1); return; }
    setCreating(true);
    setError("");
    try {
      await onCreate({ title: title.trim(), lang, translations, articleType, journal, profile, citationStyle, location: inTauri ? location : null, folder, references: library === "file" ? refsFile : null });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCreating(false);
    }
  };
  const limitsText = (s: JournalSummary) => {
    const n = (x: number) => x.toLocaleString(i18n.language);
    const out: string[] = [];
    if (s.limits.words !== undefined) out.push(t("ui.wizard.req.words", { n: n(s.limits.words) }));
    if (s.structuredAbstract !== null) out.push(s.limits.abstractWords !== undefined
      ? t(s.structuredAbstract ? "ui.wizard.req.structuredOf" : "ui.wizard.req.abstractOf", { n: n(s.limits.abstractWords) })
      : t(s.structuredAbstract ? "ui.wizard.req.structured" : "ui.wizard.req.abstract"));
    if (s.limits.figuresAndTables !== undefined) out.push(t("ui.wizard.req.figuresAndTables", { count: s.limits.figuresAndTables }));
    else {
      if (s.limits.tables !== undefined) out.push(t("ui.wizard.req.tables", { count: s.limits.tables }));
      if (s.limits.figures !== undefined) out.push(t("ui.wizard.req.figures", { count: s.limits.figures }));
    }
    if (s.limits.references !== undefined) out.push(t("ui.wizard.req.references", { count: s.limits.references }));
    if (s.blind) out.push(t(`ui.wizard.req.blind.${s.blind}`) + (s.separateTitlePage ? t("ui.wizard.req.titlePageApart") : ""));
    return out.join(" · ");
  };

  return (
    <div className="wizard-backdrop" onKeyDown={(e) => { if (e.key === "Escape" && !creating) onCancel(); }}>
      <div className="wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <header className="wizard-head">
          <h2 id="wizard-title">{t("ui.wizard.title")}</h2>
          <button className="icon-button" aria-label={t("ui.close")} onClick={onCancel} disabled={creating}><Icon name="close" size={16} /></button>
        </header>
        <div className="wizard-body">
          <ol className="wizard-steps">
            {steps.map((s, i) => (
              <li key={s.name}>
                <button className={i === step ? "current" : ""} aria-current={i === step ? "step" : undefined} disabled={creating || (i > step && !stepOk.slice(0, i).every(Boolean))} onClick={() => setStep(i)}>
                  <span className={`step-dot${i < step ? " done" : ""}`}>{i < step ? <Icon name="check" size={13} /> : i + 1}</span>
                  <span><b>{s.name}</b><span className="muted small">{s.detail}</span></span>
                </button>
              </li>
            ))}
          </ol>

          <div className="wizard-main">
            {step === 0 && <>
              <label className="field">
                <span className="field-label">{t("ui.wizard.provisionalTitle")}</span>
                <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("ui.wizard.titlePlaceholder")} onKeyDown={(e) => { if (e.key === "Enter") void next(); }} />
                <span className="muted small">{t("ui.wizard.titleHint")}</span>
              </label>
              <div className="field">
                <span className="field-label">{t("ui.wizard.folder")}</span>
                {inTauri ? <>
                  <div className="folder-row">
                    <span className="folder-path" title={location ?? ""}>{location ? shortPath(location) : t("ui.wizard.noLocation")}</span>
                    <span className="muted">›</span>
                    <input aria-label={t("ui.wizard.folderName")} value={folder} onChange={(e) => { folderEdited.current = true; setFolder(e.target.value); }} />
                    <button className="btn" onClick={() => void pickLocation().then((l) => l && setLocation(l))}>{t("ui.wizard.change")}</button>
                  </div>
                  <span className={`small${state === "used" || state === "bad" ? " field-error" : " muted"}`}>
                    {state === "used" ? t("ui.wizard.folderUsed") : state === "bad" ? t("ui.wizard.folderBad") : t("ui.wizard.folderHint")}
                  </span>
                </> : <span className="muted small">{t("ui.wizard.previewFolder")}</span>}
              </div>
              <fieldset className="field">
                <legend className="field-label">{t("ui.wizard.articleType")}</legend>
                <div className="type-grid">
                  {NEW_ARTICLE_TYPES.map((k) => (
                    <button key={k} className={`choice${articleType === k ? " selected" : ""}`} aria-pressed={articleType === k} onClick={() => setArticleType(k)}>
                      <b>{t(`ui.articleTypes.${k}`)}</b>
                      <span className="muted small">{t(`ui.wizard.typeHints.${TYPE_HINT[k]}`, { defaultValue: TYPE_HINT[k] })}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="field">
                <legend className="field-label">{t("ui.wizard.language")}</legend>
                <div className="lang-row">
                  <div className="segmented" role="radiogroup" aria-label={t("ui.wizard.language")}>
                    {LANGS.map((l) => <button key={l} role="radio" aria-checked={lang === l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>{capital(langName(l))}</button>)}
                  </div>
                  <label className="inline"><input type="checkbox" checked={also} onChange={(e) => setAlso(e.target.checked)} />{t(articleType === "letter" ? "ui.wizard.titleAlsoIn" : "ui.wizard.alsoIn", { lang: langName(other).toLowerCase() })}</label>
                </div>
              </fieldset>
            </>}

            {step === 1 && <>
              <div className="field">
                <span className="field-label">{t("ui.wizard.journal")}</span>
                <span className="muted">{t("ui.wizard.journalText")}</span>
                <label className="search-field wide">
                  <Icon name="search" size={15} />
                  <span className="sr-only">{t("ui.wizard.searchJournal")}</span>
                  <input className="bare" autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.wizard.searchJournal")} />
                </label>
              </div>
              <div className="journal-list" role="listbox" aria-label={t("ui.wizard.journal")}>
                {journals.map((j) => (
                  <button key={j.id} role="option" aria-selected={journal?.id === j.id} className={`choice journal${journal?.id === j.id ? " selected" : ""}`} onClick={() => void chooseJournal(j)}>
                    <span className="journal-name"><b>{j.title}</b>{j.profile ? <span className="badge correct">{t("ui.wizard.withProfile")}</span> : <span className="badge">{t("ui.wizard.noProfile")}</span>}</span>
                    <span className="muted small">{[j.publisher, j.profile ? t("ui.wizard.profileText", { style: styleName(j.styleId) }) : t("ui.wizard.noProfileText", { style: styleName(j.styleId) })].filter(Boolean).join(" · ")}</span>
                  </button>
                ))}
                {journals.length === 0 && <p className="muted small">{t("ui.wizard.noJournalMatch")}</p>}
                <button role="option" aria-selected={!journal} className={`choice journal${!journal ? " selected" : ""}`} onClick={() => void chooseJournal(null)}>
                  <b>{t("ui.wizard.noJournalYet")}</b>
                  <span className="muted small">{t("ui.wizard.noJournalYetText")}</span>
                </button>
              </div>
              {summary && (
                <div className="requirements">
                  <b>{summary.typeMissing ? t("ui.wizard.typeMissing", { type: t(`ui.articleTypes.${articleType}`).toLowerCase() }) : t("ui.wizard.asks", { type: (summary.typeName ?? t(`ui.articleTypes.${articleType}`)).toLowerCase() })}</b>
                  {!summary.typeMissing && <p>{limitsText(summary)}</p>}
                  {summary.checked && <p className="muted small">{t("ui.wizard.checked", { date: new Date(summary.checked).toLocaleDateString(i18n.language) })}</p>}
                </div>
              )}
            </>}

            {step === 2 && <>
              <fieldset className="field">
                <legend className="field-label">{t("ui.wizard.references")}</legend>
                <label className={`choice radio${library === "own" ? " selected" : ""}`}>
                  <input type="radio" name="library" checked={library === "own"} onChange={() => setLibrary("own")} />
                  <span><b>{t("ui.wizard.ownEmpty")}</b><span className="muted small">{t("ui.wizard.ownEmptyText")}</span></span>
                </label>
                <label className={`choice radio${library === "file" ? " selected" : ""}`}>
                  <input type="radio" name="library" checked={library === "file"} onChange={() => setLibrary("file")} />
                  <span>
                    <b>{t("ui.wizard.fromFile")}</b>
                    <span className="muted small">{t("ui.wizard.fromFileText")}</span>
                    {library === "file" && <input className="file-input" type="file" accept={REF_FORMATS} aria-label={t("ui.wizard.fromFile")} onChange={(e) => setRefsFile(e.target.files?.[0] ?? null)} />}
                  </span>
                </label>
                <label className="choice radio disabled">
                  <input type="radio" name="library" disabled />
                  <span><b>{t("ui.wizard.zotero")}</b><span className="muted small">{t("ui.wizard.zoteroLater")}</span></span>
                </label>
              </fieldset>
              <label className="field">
                <span className="field-label">{t("citationStyle")}</span>
                <select value={citationStyle} onChange={(e) => setStyle(e.target.value)}>
                  {BUNDLED_STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}{journal && s.id === journal.styleId ? ` — ${t("ui.wizard.journalStyle")}` : ""}</option>)}
                </select>
                <span className="muted small">{journal ? t("ui.wizard.styleHintJournal") : t("ui.wizard.styleHint")}</span>
              </label>
            </>}
            {error && <p className="field-error" role="alert">{error}</p>}
          </div>

          <aside className="wizard-plan" aria-labelledby="plan-title">
            <h3 id="plan-title">{t("ui.wizard.willCreate")}</h3>
            <div className="plan-tree">
              <b>{t("ui.manuscript")}</b>
              <ul>
                {plan.titles.map((x) => <li key={`t-${x.lang}`}>{t("ui.wizard.titleIn", { lang: x.lang.toUpperCase() })}</li>)}
                {plan.abstracts.map((a) => (
                  <li key={`a-${a.lang}`}>{t("ui.wizard.abstractIn", { lang: a.lang.toUpperCase() })}
                    {a.sections && <span className="plan-sub">{a.sections.map((s) => s.label).join(" · ")}</span>}
                    {a.keywords && <span className="plan-sub">{t("ui.keywords")}</span>}
                  </li>
                ))}
                {plan.opening && <li className="muted">«{plan.opening}»</li>}
                {plan.sections.map((s) => <li key={s.role}>{s.label}</li>)}
              </ul>
            </div>
            <dl className="plan-facts">
              <dt>{t("ui.wizard.journal")}</dt><dd>{journal ? `${journal.title}${summary && !summary.typeMissing ? ` · ${summary.typeName ?? ""}` : ""}` : t("ui.wizard.noJournal")}</dd>
              <dt>{t("citationStyle")}</dt><dd>{styleName(citationStyle)}</dd>
              <dt>{t("ui.wizard.references")}</dt><dd>{library === "own" ? t("ui.wizard.own") : refsFile?.name ?? "—"}</dd>
              <dt>{t("ui.authorsGroup")}</dt><dd>{t("ui.wizard.authorsLater")}</dd>
              <dt>{t("ui.wizard.titlePageAndCredit")}</dt><dd>{t("ui.wizard.automatic")}</dd>
            </dl>
            <p className="muted small">{t("ui.wizard.nothingLeaves")}</p>
          </aside>
        </div>
        <footer className="wizard-foot">
          <button className="btn quiet" onClick={onCancel} disabled={creating}>{t("cancel")}</button>
          <span className="spacer" />
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)} disabled={creating}>{t("ui.wizard.back")}</button>}
          <button className="btn primary" onClick={() => void next()} disabled={!stepOk[step] || creating}>
            {step < 2 ? t("ui.wizard.next") : creating ? t("ui.wizard.creating") : t("ui.wizard.create")}
          </button>
        </footer>
      </div>
    </div>
  );
}
