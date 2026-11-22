// The new-article wizard (sheet 7 of the interface proposal, record 0048): three steps
// (type and languages, journal, library) with what will be created always on the right. The
// plan on the right is the core's articlePlan, the same one that writes the files.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  areaFit, areaName, articlePlan, BUNDLED_STYLES, splitByAreas, folderName, journalSummary, journalTranslations, NEW_ARTICLE_TYPES, searchJournals,
  collectionTree, ZoteroError, ZoteroLocal,
  type CatalogJournal, type JournalSummary, type ZoteroCollectionInfo,
} from "@scidesk/core";
import type { JournalProfileFile } from "@scidesk/formats";
import { Icon } from "./icons.tsx";
import { shortPath } from "./Home.tsx";
import { defaultLocation, folderState, inTauri, journalProfile, pickLocation, zoteroTransport } from "./platform.ts";

export interface NewArticleChoice {
  title: string;
  lang: string;
  translations: string[];
  articleType: string;
  journal: CatalogJournal | null;
  profile: JournalProfileFile | null;
  citationStyle: string;
  /** Where the project's folder goes (the desktop window); null in the browser preview or in the open project. */
  location: string | null;
  /** The new project's folder or, in the open project, the article's folder under articles/. */
  folder: string;
  /** Record 0051: the article goes into the open project, which keeps its library and people. */
  inProject: boolean;
  /** Record 0052: a new project's library linked to this Zotero collection. */
  zotero: ZoteroCollectionInfo | null;
  references: File | null;
}

const TYPE_HINT: Record<string, string> = {
  original: "IMRaD", "brief-original": "imradShort", "systematic-review": "PRISMA", "narrative-review": "bySections", "case-report": "CARE", letter: "noAbstract",
};
const LANGS = ["es", "en"] as const;
const capital = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
const REF_FORMATS = ".ris,.nbib,.txt,.bib,.json";

/** The open project, for a new article in it (record 0051). */
export interface OpenProjectInfo {
  name: string;
  /** Its articles' folders under articles/. */
  folders: string[];
  /** References in its library. */
  references: number;
  /** The Zotero collection its library is linked to, if it is. */
  zotero: string | null;
}

type ZoteroState =
  | { status: "loading" }
  | { status: "ok"; collections: ReturnType<typeof collectionTree> }
  | { status: "closed" | "disabled" | "other-zotero" | "http"; message: string };

/** A folder under articles/ from the title, not used yet (as the core's articleFolder). */
const freeFolder = (title: string, taken: string[]) => {
  const used = new Set(taken.map((f) => f.toLowerCase()));
  const base = folderName(title);
  let f = base;
  for (let n = 2; used.has(f); n++) f = `${base}-${n}`;
  return f;
};
// eslint-disable-next-line no-control-regex
const BAD_FOLDER = /[\\/:*?"<>|\u0000-\u001f]|^\.|\.$/;

export function NewArticle({ onCancel, onCreate, uiLang, areas = [], openProject = null }: {
  onCancel: () => void; onCreate: (c: NewArticleChoice) => Promise<void>; uiLang: string; areas?: string[];
  /** With a project open, the article can go into it (the default) or into a new project. */
  openProject?: OpenProjectInfo | null;
}) {
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
  const [library, setLibrary] = useState<"own" | "file" | "zotero">("own");
  const [zotero, setZotero] = useState<ZoteroState | null>(null);
  const [collection, setCollection] = useState<ZoteroCollectionInfo | null>(null);
  /** Asks Zotero for its collections (record 0052). */
  const connectZotero = async () => {
    setZotero({ status: "loading" });
    try {
      setZotero({ status: "ok", collections: collectionTree(await new ZoteroLocal(zoteroTransport).collections()) });
    } catch (e) {
      setZotero(e instanceof ZoteroError ? { status: e.code, message: e.message } : { status: "http", message: e instanceof Error ? e.message : String(e) });
    }
  };
  const chooseZotero = () => { setLibrary("zotero"); if (zotero?.status !== "ok") void connectZotero(); };
  const [refsFile, setRefsFile] = useState<File | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [where, setWhere] = useState<"project" | "new">(openProject ? "project" : "new");
  const inProject = where === "project" && !!openProject;
  const [artFolder, setArtFolder] = useState("");
  const artFolderEdited = useRef(false);
  const [error, setError] = useState("");
  const other = lang === "es" ? "en" : "es";
  const langName = (l: string) => { try { return new Intl.DisplayNames([i18n.language], { type: "language" }).of(l) ?? l; } catch { return l; } };

  // the folder: Documents by default, its name from the title until the user writes one
  useEffect(() => { if (inTauri) void defaultLocation().then((l) => setLocation((cur) => cur ?? l)); }, []);
  useEffect(() => { if (!folderEdited.current) setFolder(folderName(title)); }, [title]);
  useEffect(() => { if (!artFolderEdited.current && openProject) setArtFolder(freeFolder(title, openProject.folders)); }, [title, openProject]);
  const artFolderProblem = !inProject ? null
    : !artFolder.trim() || BAD_FOLDER.test(artFolder.trim()) ? "bad"
    : openProject!.folders.some((f) => f.toLowerCase() === artFolder.trim().toLowerCase()) ? "taken" : null;
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
  // the journals of the user's areas first (record 0050)
  const { suggested, others } = splitByAreas(searchJournals(query), areas);
  const journalButton = (j: CatalogJournal) => (
    <button key={j.id} role="option" aria-selected={journal?.id === j.id} className={`choice journal${journal?.id === j.id ? " selected" : ""}`} onClick={() => void chooseJournal(j)}>
      <span className="journal-name"><b>{j.title}</b>{j.profile ? <span className="badge correct">{t("ui.wizard.withProfile")}</span> : <span className="badge">{t("ui.wizard.noProfile")}</span>}</span>
      <span className="muted small">{[j.publisher, areas.length && areaFit(j.areas, areas) === 1 ? t("ui.wizard.generalJournal") : null, j.profile ? t("ui.wizard.profileText", { style: styleName(j.styleId) }) : t("ui.wizard.noProfileText", { style: styleName(j.styleId) })].filter(Boolean).join(" · ")}</span>
    </button>
  );

  const folderOk = inProject ? !artFolderProblem : !inTauri || (!!location && !!folder && (state === "free" || state === "empty"));
  const stepOk = [title.trim().length > 0 && folderOk, true, library === "own" || (library === "file" && !!refsFile) || (library === "zotero" && !inProject && !!collection)];
  const steps = [
    { name: t("ui.wizard.step1"), detail: `${t(`ui.articleTypes.${articleType}`)} · ${langName(lang)}${also ? ` + ${langName(other)}` : ""}` },
    { name: t("ui.wizard.step2"), detail: journal?.title ?? t("ui.wizard.noJournal") },
    { name: t("ui.wizard.step3"), detail: library === "zotero" ? (collection ? `Zotero · ${collection.name}` : "Zotero") : library === "own" ? t(inProject ? "ui.wizard.projectLibrary" : "ui.wizard.ownEmpty") : refsFile?.name ?? t(inProject ? "ui.wizard.addFromFile" : "ui.wizard.fromFile") },
  ];
  const next = async () => {
    if (!stepOk[step]) return;
    if (step < 2) { setStep(step + 1); return; }
    setCreating(true);
    setError("");
    try {
      await onCreate({
        title: title.trim(), lang, translations, articleType, journal, profile, citationStyle, inProject, zotero: library === "zotero" && !inProject ? collection : null,
        location: inTauri && !inProject ? location : null, folder: inProject ? artFolder.trim() : folder, references: library === "file" ? refsFile : null,
      });
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
          <h2 id="wizard-title">{t("ui.wizard.title")}{inProject && <span className="muted wizard-subtitle"> · {openProject!.name}</span>}</h2>
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
              {openProject && (
                <fieldset className="field">
                  <legend className="field-label">{t("ui.wizard.where")}</legend>
                  <div className="where-grid">
                    <button className={`choice${inProject ? " selected" : ""}`} aria-pressed={inProject} onClick={() => setWhere("project")}>
                      <b>{t("ui.wizard.whereProject")}</b>
                      <span className="muted small">{t("ui.wizard.whereProjectText", { name: openProject.name })}</span>
                    </button>
                    <button className={`choice${!inProject ? " selected" : ""}`} aria-pressed={!inProject} onClick={() => setWhere("new")}>
                      <b>{t("ui.wizard.whereNew")}</b>
                      <span className="muted small">{t("ui.wizard.whereNewText")}</span>
                    </button>
                  </div>
                </fieldset>
              )}
              {inProject ? (
                <label className="field">
                  <span className="field-label">{t("ui.wizard.articleFolder")}</span>
                  <div className="folder-row">
                    <span className="folder-path">articles</span>
                    <span className="muted">›</span>
                    <input value={artFolder} onChange={(e) => { artFolderEdited.current = true; setArtFolder(e.target.value); }} />
                  </div>
                  <span className={`small${artFolderProblem ? " field-error" : " muted"}`}>
                    {artFolderProblem === "taken" ? t("ui.wizard.articleFolderTaken") : artFolderProblem === "bad" ? t("ui.wizard.folderBad") : t("ui.wizard.articleFolderHint")}
                  </span>
                </label>
              ) : <div className="field">
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
              </div>}
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
                {areas.length === 0 && <span className="muted small">{t("ui.wizard.noAreasHint")}</span>}
                <label className="search-field wide">
                  <Icon name="search" size={15} />
                  <span className="sr-only">{t("ui.wizard.searchJournal")}</span>
                  <input className="bare" autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.wizard.searchJournal")} />
                </label>
              </div>
              <div className="journal-list" role="listbox" aria-label={t("ui.wizard.journal")}>
                {suggested.length > 0 && <>
                  <h3 className="journal-group" title={t("ui.wizard.suggestedFor", { areas: areas.map((a) => areaName(a, i18n.language)).join(", ") })}>{t("ui.wizard.suggested")}</h3>
                  {suggested.map(journalButton)}
                </>}
                {suggested.length > 0 && others.length > 0 && <h3 className="journal-group">{t("ui.wizard.otherJournals")}</h3>}
                {others.map(journalButton)}
                {suggested.length + others.length === 0 && <p className="muted small">{t("ui.wizard.noJournalMatch")}</p>}
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
                  {inProject
                    ? <span><b>{t("ui.wizard.projectLibrary")}</b><span className="muted small">{openProject!.zotero ? t("ui.wizard.projectZoteroText", { name: openProject!.zotero, count: openProject!.references }) : t("ui.wizard.projectLibraryText", { count: openProject!.references })}</span></span>
                    : <span><b>{t("ui.wizard.ownEmpty")}</b><span className="muted small">{t("ui.wizard.ownEmptyText")}</span></span>}
                </label>
                {!(inProject && openProject!.zotero) && <label className={`choice radio${library === "file" ? " selected" : ""}`}>
                  <input type="radio" name="library" checked={library === "file"} onChange={() => setLibrary("file")} />
                  <span>
                    <b>{t(inProject ? "ui.wizard.addFromFile" : "ui.wizard.fromFile")}</b>
                    <span className="muted small">{t(inProject ? "ui.wizard.addFromFileText" : "ui.wizard.fromFileText")}</span>
                    {library === "file" && <input className="file-input" type="file" accept={REF_FORMATS} aria-label={t("ui.wizard.fromFile")} onChange={(e) => setRefsFile(e.target.files?.[0] ?? null)} />}
                  </span>
                </label>}
                {!inProject && <label className={`choice radio${library === "zotero" ? " selected" : ""}`}>
                  <input type="radio" name="library" checked={library === "zotero"} onChange={chooseZotero} />
                  <span>
                    <b>{t("ui.wizard.zotero")}</b>
                    <span className="muted small">{t("ui.wizard.zoteroText")}</span>
                  </span>
                </label>}
                {!inProject && library === "zotero" && zotero && (
                  <div className="zotero-box" aria-live="polite">
                    {zotero.status === "loading" && <p className="muted small">{t("ui.wizard.zoteroLoading")}</p>}
                    {zotero.status !== "loading" && zotero.status !== "ok" && <>
                      <p className="small"><b>{t(`ui.wizard.zoteroProblem.${zotero.status}`)}</b></p>
                      <p className="muted small">{t(`ui.wizard.zoteroHelp.${zotero.status}`)}</p>
                      <button className="btn" onClick={() => void connectZotero()}>{t("ui.wizard.zoteroRetry")}</button>
                    </>}
                    {zotero.status === "ok" && (zotero.collections.length === 0
                      ? <p className="muted small">{t("ui.wizard.zoteroNoCollections")}</p>
                      : <div className="zotero-collections" role="radiogroup" aria-label={t("ui.wizard.zoteroCollection")}>
                        <span className="field-label">{t("ui.wizard.zoteroCollection")}</span>
                        {zotero.collections.map((c) => (
                          <label key={c.key} className="zotero-collection" style={{ paddingLeft: `${8 + c.depth * 18}px` }}>
                            <input type="radio" name="zotero-collection" checked={collection?.key === c.key} onChange={() => setCollection(c)} />
                            <span>{c.name}</span><span className="muted small">{t("ui.wizard.zoteroItems", { count: c.items })}</span>
                          </label>
                        ))}
                        <span className="muted small">{t("ui.wizard.zoteroSubcollections")}</span>
                      </div>)}
                  </div>
                )}
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
              <dt>{t("ui.wizard.references")}</dt><dd>{library === "zotero" && !inProject ? `Zotero · ${collection?.name ?? "—"}` : inProject ? (library === "own" ? t("ui.wizard.ofProject") : t("ui.wizard.ofProjectPlus", { file: refsFile?.name ?? "—" })) : library === "own" ? t("ui.wizard.own") : refsFile?.name ?? "—"}</dd>
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
