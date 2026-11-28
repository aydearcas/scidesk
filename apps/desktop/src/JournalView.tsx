// The "Journal" view (PLAN 5.9, record 0105): on the left, the journals this computer knows
// (the article's, the user's profiles, the project's copies, SciDesk's and the journals
// that only bring their citation style); in the centre, the profile's form with the author
// guide next to it. The form is the way without AI and, later, the screen where what an
// LLM package returns is reviewed: every datum can carry the sentence of the guide it comes
// from (select it in the guide and press the quote button). Profiles are saved on this
// computer; the project's copy is updated only when the user says so.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ARTICLE_TYPES, DECLARATIONS, SECTION_ROLES, type JournalProfileFile } from "@scidesk/formats";
import {
  BUNDLED_STYLES, copyState, guideRead, profileIsOld, profileIssues, sameJson, searchKnownJournals, sectionLabel,
  type CopyState, type KnownJournal,
} from "@scidesk/core";
import { Icon } from "./icons.tsx";
import { AreaPicker } from "./AreaPicker.tsx";
import { inTauri } from "./platform.ts";

/** A datum with its source (journal-profile.ts). */
type S<T> = { value: T; source: string; quote?: string; checked?: string };
type Path = (string | number)[];
const LANGS = ["es", "en"] as const;
const LIMITS = ["words", "wordsIncludeTables", "abstractWords", "references", "tables", "figures", "figuresAndTables", "authors", "authorsAdvised", "keywords", "titleCharacters"] as const;
const PLACEMENTS = ["manuscript", "before-references", "title-page", "separate-file", "submission-form"] as const;
const SOURCE_KINDS = ["author-guide", "publisher", "nlm-catalog", "openalex", "doaj", "csl-repository", "scidesk", "other"] as const;
const OPTIONAL_DOCS = ["highlights", "graphical-abstract", "video-abstract"] as const;
// the roles an abstract or a fixed list of sections uses (not the closing ones)
const BODY_ROLES = SECTION_ROLES.filter((r) => !["references", "appendix"].includes(r));

function getIn(o: unknown, path: Path): any {
  let cur: any = o;
  for (const k of path) { if (cur == null) return undefined; cur = cur[k]; }
  return cur;
}
/** Sets (or, with undefined, removes) a value; empty optional groups go away with their last datum. */
function setIn(o: any, path: Path, v: unknown) {
  const parents: any[] = [];
  let cur = o;
  for (const k of path.slice(0, -1)) {
    parents.push(cur);
    if (cur[k] == null) cur[k] = typeof k === "number" ? [] : {};
    cur = cur[k];
  }
  const last = path[path.length - 1];
  if (v === undefined) delete cur[last]; else cur[last] = v;
  // prune: never the required containers (journal, limits) nor array items
  for (let i = path.length - 2; i >= 0; i--) {
    const k = path[i], parent = parents[i], child = parent[k];
    if (typeof k === "number" || k === "journal" || k === "limits") break;
    if (child && typeof child === "object" && !Array.isArray(child) && Object.keys(child).length === 0) delete parent[k];
    else break;
  }
}

interface Ctx {
  draft: JournalProfileFile;
  edit: (f: (d: JournalProfileFile) => void) => void;
  /** Text selected in the guide, to use as the quote of a datum. */
  selection: string;
  /** Once a quote takes the selection, it is spent. */
  spend: () => void;
  source: string;
  /** Paths (/journal/issnPrint/value…) of what the schema does not accept. */
  invalid: { path: string; message: string }[];
}
const JournalCtx = createContext<Ctx | null>(null);
const useCtx = () => useContext(JournalCtx)!;

/** One datum of the profile: its label, its control and its quote of the guide. */
function Row({ label, path, children, hint }: { label: string; path: Path; children: ReactNode; hint?: string }) {
  const { t } = useTranslation();
  const { draft, edit, selection, spend, invalid } = useCtx();
  const datum = getIn(draft, path) as S<unknown> | undefined;
  const here = `/${path.join("/")}`;
  const bad = invalid.find((x) => x.path === here || x.path.startsWith(`${here}/`));
  const [open, setOpen] = useState(false);
  const quote = datum?.quote;
  const setQuote = (q: string) => edit((d) => { const cur = getIn(d, path); if (!cur) return; if (q) cur.quote = q; else delete cur.quote; });
  const onQuote = () => {
    if (!datum) return;
    if (selection.trim()) { setQuote(selection.trim()); setOpen(true); spend(); } else setOpen((o) => !o);
  };
  return (
    <div className={`jf-row${bad ? " invalid" : ""}`}>
      <span className="jf-label">{label}{hint && <span className="muted small"> · {hint}</span>}</span>
      <span className="jf-control">{children}{bad && <span className="jf-error">{t(/pattern/.test(bad.message) ? "ui.journal.badFormat" : /minimum|greater|>=/.test(bad.message) ? "ui.journal.tooSmall" : /integer/.test(bad.message) ? "ui.journal.notInteger" : "ui.journal.badValue")}</span>}</span>
      <button type="button" className={`icon-button jf-quote${quote ? " has" : ""}`} disabled={!datum}
        title={!datum ? t("ui.journal.quoteNoValue") : selection.trim() ? t("ui.journal.quoteFromGuide") : quote ? t("ui.journal.quoteShow") : t("ui.journal.quoteWrite")}
        aria-label={t("ui.journal.quote")} onClick={onQuote}><Icon name="quote" size={14} /></button>
      {datum && (open || quote) && (
        <textarea className="jf-quote-text" rows={2} value={quote ?? ""} placeholder={t("ui.journal.quotePlaceholder")} onChange={(e) => setQuote(e.target.value)} />
      )}
    </div>
  );
}

/** Sets the value of a datum, keeping its source and quote; undefined removes it. */
function useSet() {
  const { edit, source } = useCtx();
  return (path: Path, v: unknown) => edit((d) => {
    const cur = getIn(d, path) as S<unknown> | undefined;
    setIn(d, path, v === undefined ? undefined : { ...(cur ?? { source }), value: v });
  });
}

function Num({ path, decimal, min = 0 }: { path: Path; decimal?: boolean; min?: number }) {
  const { draft } = useCtx();
  const set = useSet();
  const v = getIn(draft, path)?.value as number | undefined;
  return <input className="num" type="number" min={min} step={decimal ? 0.1 : 1} value={v ?? ""}
    onChange={(e) => set(path, e.target.value === "" ? undefined : decimal ? Number(e.target.value) : Math.round(Number(e.target.value)))} />;
}
function Text({ path, required, placeholder, wide }: { path: Path; required?: boolean; placeholder?: string; wide?: boolean }) {
  const { draft } = useCtx();
  const set = useSet();
  const v = getIn(draft, path)?.value as string | undefined;
  return <input className={wide ? "wide" : undefined} type="text" value={v ?? ""} placeholder={placeholder}
    onChange={(e) => set(path, e.target.value === "" && !required ? undefined : e.target.value)} />;
}
function Bool({ path, required }: { path: Path; required?: boolean }) {
  const { t } = useTranslation();
  const { draft } = useCtx();
  const set = useSet();
  const v = getIn(draft, path)?.value as boolean | undefined;
  return (
    <select value={v === undefined ? "" : String(v)} onChange={(e) => set(path, e.target.value === "" ? undefined : e.target.value === "true")}>
      {!required && <option value="">{t("ui.journal.unknown")}</option>}
      <option value="true">{t("ui.journal.yes")}</option>
      <option value="false">{t("ui.journal.no")}</option>
    </select>
  );
}
function Choice({ path, options, label, required }: { path: Path; options: readonly string[]; label: (o: string) => string; required?: boolean }) {
  const { t } = useTranslation();
  const { draft } = useCtx();
  const set = useSet();
  const v = getIn(draft, path)?.value as string | undefined;
  return (
    <select value={v ?? ""} onChange={(e) => set(path, e.target.value === "" ? undefined : e.target.value)}>
      {(!required || v === undefined) && <option value="">{t("ui.journal.unknown")}</option>}
      {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
    </select>
  );
}

function Section({ title, children, open = true, note }: { title: string; children: ReactNode; open?: boolean; note?: string }) {
  return (
    <details className="jf-section" open={open}>
      <summary>{title}</summary>
      {note && <p className="muted small jf-note">{note}</p>}
      {children}
    </details>
  );
}

/** The rules of an abstract: structured or not, its headings, the keywords. */
function AbstractRules({ path, langs, addLabel }: { path: Path; langs: string[]; addLabel: string }) {
  const { t, i18n } = useTranslation();
  const { draft, edit, source } = useCtx();
  const rules = getIn(draft, path);
  if (!rules) {
    return <button type="button" className="btn quiet" onClick={() => edit((d) => setIn(d, path, { structured: { value: true, source } }))}><Icon name="plus" size={14} /> {addLabel}</button>;
  }
  const sections = (rules.sections?.value ?? []) as { role: string; label: Record<string, string> }[];
  const setSections = (next: typeof sections) => edit((d) => {
    const cur = getIn(d, [...path, "sections"]);
    setIn(d, [...path, "sections"], next.length ? { ...(cur ?? { source }), value: next } : undefined);
  });
  const move = (i: number, by: number) => { const n = [...sections]; const [x] = n.splice(i, 1); n.splice(i + by, 0, x); setSections(n); };
  return (
    <div className="jf-group">
      <Row label={t("ui.journal.f.structured")} path={[...path, "structured"]}><Bool path={[...path, "structured"]} required /></Row>
      {rules.structured?.value && (
        <Row label={t("ui.journal.f.abstractSections")} path={[...path, "sections"]}>
          <span className="jf-list">
            {sections.map((s, i) => (
              <span key={i} className="jf-list-item">
                <select value={s.role} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                  {BODY_ROLES.map((r) => <option key={r} value={r}>{sectionLabel(r, i18n.language)}</option>)}
                </select>
                {langs.map((l) => (
                  <input key={l} type="text" aria-label={t("ui.journal.headingIn", { lang: t(`ui.journal.langs.${l}`) })} placeholder={`${l} · ${sectionLabel(s.role, l)}`} value={s.label[l] ?? ""}
                    onChange={(e) => { const label = { ...s.label }; if (e.target.value) label[l] = e.target.value; else delete label[l]; setSections(sections.map((x, j) => (j === i ? { ...x, label } : x))); }} />
                ))}
                <button type="button" className="icon-button" disabled={i === 0} aria-label={t("ui.journal.up")} onClick={() => move(i, -1)}><Icon name="chevronUp" size={14} /></button>
                <button type="button" className="icon-button" disabled={i === sections.length - 1} aria-label={t("ui.journal.down")} onClick={() => move(i, 1)}><Icon name="chevronDown" size={14} /></button>
                <button type="button" className="icon-button" aria-label={t("ui.journal.remove")} onClick={() => setSections(sections.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
              </span>
            ))}
            <button type="button" className="btn quiet" onClick={() => setSections([...sections, { role: "methods", label: {} }])}><Icon name="plus" size={14} /> {t("ui.journal.addHeading")}</button>
          </span>
        </Row>
      )}
      <Row label={t("ui.journal.f.keywordsMin")} path={[...path, "keywordsMin"]}><Num path={[...path, "keywordsMin"]} /></Row>
      <button type="button" className="btn quiet jf-remove" onClick={() => edit((d) => setIn(d, path, undefined))}>{t("ui.journal.removeAbstract")}</button>
    </div>
  );
}

/** A fixed list of sections, in order. */
function RoleList({ path }: { path: Path }) {
  const { t, i18n } = useTranslation();
  const { draft, edit, source } = useCtx();
  const roles = (getIn(draft, path)?.value ?? []) as string[];
  const put = (next: string[]) => edit((d) => { const cur = getIn(d, path); setIn(d, path, next.length ? { ...(cur ?? { source }), value: next } : undefined); });
  return (
    <span className="jf-list">
      <span className="jf-chips">
        {roles.map((r, i) => (
          <span key={i} className="jf-chip">{sectionLabel(r, i18n.language)}
            <button type="button" className="icon-button" aria-label={t("ui.journal.remove")} onClick={() => put(roles.filter((_, j) => j !== i))}><Icon name="close" size={12} /></button>
          </span>
        ))}
      </span>
      <select value="" aria-label={t("ui.journal.addSection")} onChange={(e) => { if (e.target.value) put([...roles, e.target.value]); }}>
        <option value="">{t("ui.journal.addSection")}</option>
        {SECTION_ROLES.map((r) => <option key={r} value={r}>{sectionLabel(r, i18n.language)}</option>)}
      </select>
    </span>
  );
}

function LangChecks({ path, langs, min }: { path: Path; langs: readonly string[]; min?: number }) {
  const { t } = useTranslation();
  const { draft, edit } = useCtx();
  const chosen = (getIn(draft, path) ?? []) as string[];
  return (
    <span className="jf-checks">
      {langs.map((l) => (
        <label key={l} className="check">
          <input type="checkbox" checked={chosen.includes(l)} disabled={!!min && chosen.length <= min && chosen.includes(l)}
            onChange={(e) => edit((d) => { const next = e.target.checked ? [...chosen, l] : chosen.filter((x) => x !== l); setIn(d, path, next.length || min ? next : undefined); })} />
          {t(`ui.journal.langs.${l}`)}
        </label>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- the form

function ProfileForm() {
  const { t, i18n } = useTranslation();
  const { draft, edit, source } = useCtx();
  const set = useSet();
  const langs = draft.languages.value.manuscript;
  const allLangs = [...new Set([...langs, ...(draft.languages.value.abstractAlso ?? [])])];
  const typeName = (a: string) => t(`ui.articleTypes.${a}`, { defaultValue: a });
  const missingTypes = ARTICLE_TYPES.filter((a) => !draft.articleTypes.some((x) => x.articleType === a));
  const declarations = draft.declarations ?? [];
  const missingDeclarations = DECLARATIONS.filter((k) => !declarations.some((x) => x.kind === k));
  const docs = draft.optionalDocuments ?? [];
  const style = draft.citationStyle.value;

  return (
    <div className="jf-form">
      <Section title={t("ui.journal.s.journal")}>
        <Row label={t("ui.journal.f.title")} path={["journal", "title"]}><Text path={["journal", "title"]} required wide /></Row>
        <Row label={t("ui.journal.f.abbreviation")} path={["journal", "nlmAbbreviation"]} hint={t("ui.journal.h.abbreviation")}><Text path={["journal", "nlmAbbreviation"]} /></Row>
        <Row label={t("ui.journal.f.issnPrint")} path={["journal", "issnPrint"]}><Text path={["journal", "issnPrint"]} placeholder="0000-0000" /></Row>
        <Row label={t("ui.journal.f.issnElectronic")} path={["journal", "issnElectronic"]}><Text path={["journal", "issnElectronic"]} placeholder="0000-0000" /></Row>
        <Row label={t("ui.journal.f.publisher")} path={["journal", "publisher"]}><Text path={["journal", "publisher"]} /></Row>
        <Row label={t("ui.journal.f.homepage")} path={["journal", "homepage"]}><Text path={["journal", "homepage"]} placeholder="https://" wide /></Row>
        <Row label={t("ui.journal.f.openAccess")} path={["journal", "openAccess"]}><Bool path={["journal", "openAccess"]} /></Row>
        <details className="jf-areas">
          <summary>{t("ui.journal.f.areas")}{draft.areas?.length ? ` (${draft.areas.length})` : ""}</summary>
          <p className="muted small">{t("ui.journal.h.areas")}</p>
          <AreaPicker value={draft.areas ?? []} onChange={(areas) => edit((d) => { if (areas.length) d.areas = areas; else delete d.areas; })} />
        </details>
      </Section>

      <Section title={t("ui.journal.s.sources")} note={t("ui.journal.h.sources")}>
        {draft.sources.map((s, i) => (
          <div key={i} className="jf-source">
            <select value={s.kind} aria-label={t("ui.journal.f.sourceKind")} onChange={(e) => edit((d) => { d.sources[i].kind = e.target.value as never; })}>
              {SOURCE_KINDS.map((k) => <option key={k} value={k}>{t(`ui.journal.sourceKinds.${k}`)}</option>)}
            </select>
            <input type="url" className="wide" aria-label={t("ui.journal.f.url")} placeholder="https://" value={s.url} onChange={(e) => edit((d) => { d.sources[i].url = e.target.value; })} />
            <label className="jf-inline">{t("ui.journal.f.accessed")}
              <input type="date" value={s.accessed} onChange={(e) => edit((d) => { if (e.target.value) d.sources[i].accessed = e.target.value; })} />
            </label>
            {draft.sources.length > 1 && (
              <button type="button" className="icon-button" aria-label={t("ui.journal.remove")} disabled={JSON.stringify(draft).includes(`"source":"${s.id}"`)}
                title={JSON.stringify(draft).includes(`"source":"${s.id}"`) ? t("ui.journal.sourceUsed") : undefined}
                onClick={() => edit((d) => { d.sources.splice(i, 1); })}><Icon name="close" size={14} /></button>
            )}
          </div>
        ))}
        <button type="button" className="btn quiet" onClick={() => edit((d) => {
          let n = d.sources.length + 1;
          while (d.sources.some((x) => x.id === `s${n}`)) n++;
          d.sources.push({ id: `s${n}`, kind: "publisher", url: "https://", accessed: new Date().toISOString().slice(0, 10) });
        })}><Icon name="plus" size={14} /> {t("ui.journal.addSource")}</button>
      </Section>

      <Section title={t("ui.journal.s.styleLangs")}>
        <Row label={t("ui.journal.f.citationStyle")} path={["citationStyle"]}>
          <select value={style.id} onChange={(e) => edit((d) => {
            const old = d.citationStyle.value;
            // the profile's own style file goes with its own id only
            d.citationStyle.value = e.target.value === old.id ? old : { id: e.target.value };
          })}>
            {!BUNDLED_STYLES.some((s) => s.id === style.id) && <option value={style.id}>{style.id}</option>}
            {BUNDLED_STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Row>
        <Row label={t("ui.journal.f.referenceTermsLang")} path={["referenceTermsLang"]} hint={t("ui.journal.h.referenceTermsLang")}>
          <Choice path={["referenceTermsLang"]} options={LANGS} label={(l) => t(`ui.journal.langs.${l}`)} />
        </Row>
        <Row label={t("ui.journal.f.manuscriptLangs")} path={["languages"]}><LangChecks path={["languages", "value", "manuscript"]} langs={LANGS} min={1} /></Row>
        <div className="jf-row"><span className="jf-label">{t("ui.journal.f.titleAlso")}</span><span className="jf-control"><LangChecks path={["languages", "value", "titleAlso"]} langs={LANGS} /></span></div>
        <div className="jf-row"><span className="jf-label">{t("ui.journal.f.abstractAlso")}</span><span className="jf-control"><LangChecks path={["languages", "value", "abstractAlso"]} langs={LANGS} /></span></div>
        <div className="jf-row"><span className="jf-label">{t("ui.journal.f.keywordsAlso")}</span><span className="jf-control"><LangChecks path={["languages", "value", "keywordsAlso"]} langs={LANGS} /></span></div>
      </Section>

      <Section title={t("ui.journal.s.abstract")} note={t("ui.journal.h.abstract")}>
        <AbstractRules path={["abstract"]} langs={allLangs} addLabel={t("ui.journal.addAbstract")} />
      </Section>

      <Section title={t("ui.journal.s.types")} note={t("ui.journal.h.types")}>
        {draft.articleTypes.map((at, i) => {
          const base: Path = ["articleTypes", i];
          const name = at.journalName[i18n.language.slice(0, 2)] ?? Object.values(at.journalName)[0];
          return (
            <details key={at.articleType} className="jf-type" open={draft.articleTypes.length < 3}>
              <summary><b>{typeName(at.articleType)}</b>{name && name !== typeName(at.articleType) ? <span className="muted"> · «{name}»</span> : null}
                <span className="muted small"> {Object.entries(at.limits).filter(([, v]) => typeof v?.value === "number").map(([k, v]) => `${t(`ui.journal.limits.${k}`)} ${v!.value}`).join(" · ")}</span>
              </summary>
              <div className="jf-row">
                <span className="jf-label">{t("ui.journal.f.typeName")}</span>
                <span className="jf-control">
                  {allLangs.map((l) => (
                    <input key={l} type="text" aria-label={t("ui.journal.nameIn", { lang: t(`ui.journal.langs.${l}`) })} placeholder={`${l} · ${typeName(at.articleType)}`} value={at.journalName[l] ?? ""}
                      onChange={(e) => edit((d) => { const n = d.articleTypes[i].journalName; if (e.target.value) n[l] = e.target.value; else delete n[l]; })} />
                  ))}
                </span>
              </div>
              <div className="jf-limits">
                {LIMITS.map((k) => (
                  <Row key={k} label={t(`ui.journal.limits.${k}`)} path={[...base, "limits", k]}>
                    {k === "wordsIncludeTables" ? <Bool path={[...base, "limits", k]} /> : <Num path={[...base, "limits", k]} />}
                  </Row>
                ))}
              </div>
              <Row label={t("ui.journal.f.fixedSections")} path={[...base, "sections"]} hint={t("ui.journal.h.fixedSections")}><RoleList path={[...base, "sections"]} /></Row>
              <Row label={t("ui.journal.f.opening")} path={[...base, "opening"]} hint={t("ui.journal.h.opening")}><Text path={[...base, "opening"]} /></Row>
              <div className="jf-subhead">{t("ui.journal.typeAbstract")}</div>
              <AbstractRules path={[...base, "abstract"]} langs={allLangs} addLabel={t("ui.journal.addTypeAbstract")} />
              <button type="button" className="btn quiet jf-remove" onClick={() => edit((d) => { d.articleTypes.splice(i, 1); })}>{t("ui.journal.removeType", { type: typeName(at.articleType) })}</button>
            </details>
          );
        })}
        {missingTypes.length > 0 && (
          <select value="" aria-label={t("ui.journal.addType")} onChange={(e) => { const a = e.target.value; if (a) edit((d) => { d.articleTypes.push({ articleType: a as never, journalName: {}, limits: {} }); }); }}>
            <option value="">{t("ui.journal.addType")}</option>
            {missingTypes.map((a) => <option key={a} value={a}>{typeName(a)}</option>)}
          </select>
        )}
      </Section>

      <Section title={t("ui.journal.s.format")} open={false}>
        <Row label={t("ui.journal.f.lineSpacing")} path={["manuscriptFormat", "lineSpacing"]} hint={t("ui.journal.h.lineSpacing")}><Num path={["manuscriptFormat", "lineSpacing"]} decimal min={1} /></Row>
        <Row label={t("ui.journal.f.font")} path={["manuscriptFormat", "font"]}><Text path={["manuscriptFormat", "font"]} placeholder="Times New Roman" /></Row>
        <Row label={t("ui.journal.f.fontSize")} path={["manuscriptFormat", "fontSizePt"]}><Num path={["manuscriptFormat", "fontSizePt"]} decimal min={6} /></Row>
        <Row label={t("ui.journal.f.margins")} path={["manuscriptFormat", "sideMarginsCm"]}>
          <MarginInputs />
        </Row>
        <Row label={t("ui.journal.f.lineNumbers")} path={["manuscriptFormat", "lineNumbers"]}><Bool path={["manuscriptFormat", "lineNumbers"]} /></Row>
        <Row label={t("ui.journal.f.pageNumbers")} path={["manuscriptFormat", "pageNumbers"]}><Bool path={["manuscriptFormat", "pageNumbers"]} /></Row>
        <Row label={t("ui.journal.f.justified")} path={["manuscriptFormat", "justified"]}><Bool path={["manuscriptFormat", "justified"]} /></Row>
        <Row label={t("ui.journal.f.hyphenation")} path={["manuscriptFormat", "hyphenation"]}><Bool path={["manuscriptFormat", "hyphenation"]} /></Row>
        <Row label={t("ui.journal.f.tables")} path={["manuscriptFormat", "tables"]}><Choice path={["manuscriptFormat", "tables"]} options={["in-text", "end"]} label={(o) => t(`ui.journal.tablesAt.${o}`)} /></Row>
        <Row label={t("ui.journal.f.captionsList")} path={["manuscriptFormat", "figureCaptionsList"]}><Bool path={["manuscriptFormat", "figureCaptionsList"]} /></Row>
        <Row label={t("ui.journal.f.tableStyle")} path={["manuscriptFormat", "tableStyle"]}><Choice path={["manuscriptFormat", "tableStyle"]} options={["three-line", "rows", "grid", "none"]} label={(o) => t(`ui.journal.tableStyles.${o}`)} /></Row>
        <Row label={t("ui.journal.f.sectionNumbering")} path={["manuscriptFormat", "sectionNumbering"]}><Choice path={["manuscriptFormat", "sectionNumbering"]} options={["none", "1.", "1"]} label={(o) => t(`ui.journal.numbering.${o === "1." ? "dot" : o === "1" ? "plain" : "none"}`)} /></Row>
        <Row label={t("ui.journal.f.englishVariant")} path={["manuscriptFormat", "englishVariant"]}><Choice path={["manuscriptFormat", "englishVariant"]} options={["british", "american"]} label={(o) => t(`ui.journal.english.${o}`)} /></Row>
      </Section>

      <Section title={t("ui.journal.s.review")} open={false}>
        <Row label={t("ui.journal.f.blind")} path={["review", "blind"]}>
          <select value={draft.review?.blind.value ?? ""} onChange={(e) => edit((d) => {
            if (!e.target.value) { delete d.review; return; }
            d.review = { ...(d.review ?? {}), blind: { ...(d.review?.blind ?? { source }), value: e.target.value as never } };
          })}>
            <option value="">{t("ui.journal.unknown")}</option>
            {["double", "single", "open", "none"].map((o) => <option key={o} value={o}>{t(`ui.journal.blind.${o}`)}</option>)}
          </select>
        </Row>
        {draft.review && <Row label={t("ui.journal.f.separateTitlePage")} path={["review", "separateTitlePage"]}><Bool path={["review", "separateTitlePage"]} /></Row>}
      </Section>

      <Section title={t("ui.journal.s.declarations")} open={false} note={t("ui.journal.h.declarations")}>
        {declarations.map((x, i) => (
          <div key={x.kind} className="jf-declaration">
            <b className="jf-label">{t(`ui.journal.declarations.${x.kind}`)}</b>
            <Row label={t("ui.journal.f.required")} path={["declarations", i, "required"]}><Bool path={["declarations", i, "required"]} required /></Row>
            <Row label={t("ui.journal.f.placement")} path={["declarations", i, "placement"]}><Choice path={["declarations", i, "placement"]} options={PLACEMENTS} label={(o) => t(`ui.journal.placements.${o}`)} /></Row>
            <button type="button" className="icon-button" aria-label={t("ui.journal.remove")} onClick={() => edit((d) => { d.declarations!.splice(i, 1); if (!d.declarations!.length) delete d.declarations; })}><Icon name="close" size={14} /></button>
          </div>
        ))}
        {missingDeclarations.length > 0 && (
          <select value="" aria-label={t("ui.journal.addDeclaration")} onChange={(e) => { const k = e.target.value; if (k) edit((d) => { (d.declarations ??= []).push({ kind: k as never, required: { value: true, source } }); }); }}>
            <option value="">{t("ui.journal.addDeclaration")}</option>
            {missingDeclarations.map((k) => <option key={k} value={k}>{t(`ui.journal.declarations.${k}`)}</option>)}
          </select>
        )}
        <Row label={t("ui.journal.f.contributions")} path={["contributionsFormat"]}><Choice path={["contributionsFormat"]} options={["credit", "initials-sentence", "icmje"]} label={(o) => t(`ui.journal.contributions.${o}`)} /></Row>
      </Section>

      <Section title={t("ui.journal.s.optional")} open={false}>
        {OPTIONAL_DOCS.map((k) => {
          const i = docs.findIndex((x) => x.kind === k);
          return (
            <div key={k} className="jf-row">
              <label className="jf-label check">
                <input type="checkbox" checked={i >= 0} onChange={(e) => edit((d) => {
                  if (e.target.checked) (d.optionalDocuments ??= []).push({ kind: k, rules: { value: {}, source } });
                  else { d.optionalDocuments = d.optionalDocuments!.filter((x) => x.kind !== k); if (!d.optionalDocuments.length) delete d.optionalDocuments; }
                })} />
                {t(`ui.journal.optionalDocs.${k}`)}
              </label>
              {i >= 0 && <span className="jf-control"><DocRules index={i} /></span>}
            </div>
          );
        })}
      </Section>

      <Section title={t("ui.journal.s.figures")} open={false}>
        <Row label={t("ui.journal.f.separateFiles")} path={["figures", "separateFiles"]}><Bool path={["figures", "separateFiles"]} /></Row>
        <Row label={t("ui.journal.f.formats")} path={["figures", "formats"]} hint={t("ui.journal.h.formats")}>
          <input type="text" value={(draft.figures?.formats?.value ?? []).join(", ")} placeholder="TIFF, EPS, PDF"
            onChange={(e) => { const list = e.target.value.split(/[,;]\s*/).map((x) => x.trim()).filter(Boolean); set(["figures", "formats"], list.length ? list : undefined); }} />
        </Row>
        <Row label={t("ui.journal.f.minDpi")} path={["figures", "minDpi"]}><DpiInputs /></Row>
      </Section>

      <Section title={t("ui.journal.s.submission")} open={false}>
        <Row label={t("ui.journal.f.system")} path={["submission", "system"]}>
          <input type="text" value={draft.submission?.system.value ?? ""} placeholder="Editorial Manager"
            onChange={(e) => edit((d) => {
              if (!e.target.value) { delete d.submission; return; }
              d.submission = { ...(d.submission ?? {}), system: { ...(d.submission?.system ?? { source }), value: e.target.value } };
            })} />
        </Row>
        {draft.submission && <Row label={t("ui.journal.f.submissionUrl")} path={["submission", "url"]}><Text path={["submission", "url"]} placeholder="https://" wide /></Row>}
      </Section>

      <Section title={t("ui.journal.s.notes")} open={false} note={t("ui.journal.h.notes")}>
        {(draft.notes ?? []).map((n, i) => (
          <div key={i} className="jf-note-row">
            <Row label={t("ui.journal.f.note", { n: i + 1 })} path={["notes", i]}>
              <textarea rows={2} value={n.value} onChange={(e) => edit((d) => { d.notes![i].value = e.target.value; })} />
            </Row>
            <button type="button" className="icon-button" aria-label={t("ui.journal.remove")} onClick={() => edit((d) => { d.notes!.splice(i, 1); if (!d.notes!.length) delete d.notes; })}><Icon name="close" size={14} /></button>
          </div>
        ))}
        <button type="button" className="btn quiet" onClick={() => edit((d) => { (d.notes ??= []).push({ value: "", source }); })}><Icon name="plus" size={14} /> {t("ui.journal.addNote")}</button>
      </Section>
    </div>
  );
}

function MarginInputs() {
  const { t } = useTranslation();
  const { draft } = useCtx();
  const set = useSet();
  const v = draft.manuscriptFormat?.sideMarginsCm?.value;
  const put = (min: number | undefined, max: number | undefined) => set(["manuscriptFormat", "sideMarginsCm"], min === undefined ? undefined : { min, ...(max !== undefined ? { max } : {}) });
  const num = (s: string) => (s === "" ? undefined : Number(s));
  return (
    <span className="jf-inline-group">
      <label className="jf-inline">{t("ui.journal.from")} <input className="num" type="number" min={0} step={0.1} value={v?.min ?? ""} onChange={(e) => put(num(e.target.value), v?.max)} /></label>
      <label className="jf-inline">{t("ui.journal.to")} <input className="num" type="number" min={0} step={0.1} value={v?.max ?? ""} disabled={v?.min === undefined} onChange={(e) => put(v?.min, num(e.target.value))} /></label>
    </span>
  );
}

function DpiInputs() {
  const { t } = useTranslation();
  const { draft } = useCtx();
  const set = useSet();
  const v = draft.figures?.minDpi?.value ?? {};
  const put = (k: "photo" | "lineArt" | "combination", s: string) => {
    const next = { ...v } as Record<string, number>;
    if (s === "") delete next[k]; else next[k] = Math.round(Number(s));
    set(["figures", "minDpi"], Object.keys(next).length ? next : undefined);
  };
  return (
    <span className="jf-inline-group">
      {(["photo", "lineArt", "combination"] as const).map((k) => (
        <label key={k} className="jf-inline">{t(`ui.journal.dpi.${k}`)} <input className="num" type="number" min={0} step={1} value={v[k] ?? ""} onChange={(e) => put(k, e.target.value)} /></label>
      ))}
    </span>
  );
}

function DocRules({ index }: { index: number }) {
  const { t } = useTranslation();
  const { draft, edit } = useCtx();
  const v = (draft.optionalDocuments![index].rules.value ?? {}) as Record<string, number>;
  const put = (k: string, s: string) => edit((d) => {
    const r = d.optionalDocuments![index].rules.value as Record<string, number>;
    if (s === "") delete r[k]; else r[k] = Math.round(Number(s));
  });
  return (
    <span className="jf-inline-group">
      {(["min", "max", "maxCharacters"] as const).map((k) => (
        <label key={k} className="jf-inline">{t(`ui.journal.docRules.${k}`)} <input className="num" type="number" min={0} value={v[k] ?? ""} onChange={(e) => put(k, e.target.value)} /></label>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- the tab

export type ProfileOrigin = "mine" | "project" | "bundled" | "new";

export interface JournalTabProps {
  base: JournalProfileFile;
  origin: ProfileOrigin;
  guide: string;
  /** The project's copy of this profile, if it has one. */
  projectCopy: JournalProfileFile | null;
  /** This computer's profile of the same id. */
  stored: JournalProfileFile | null;
  /** The article on screen has it as its journal. */
  isCurrent: boolean;
  articleTitle: string;
  onSave: (profile: JournalProfileFile, guide: string) => Promise<JournalProfileFile | null>;
  onUse: (profile: JournalProfileFile) => Promise<void>;
  onUpdateCopy: (profile: JournalProfileFile) => Promise<void>;
  onForget: (id: string) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}

export function JournalTab({ base, origin, guide: baseGuide, projectCopy, stored, isCurrent, articleTitle, onSave, onUse, onUpdateCopy, onForget, onDirty }: JournalTabProps) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState(base);
  const [guide, setGuide] = useState(baseGuide);
  const [selection, setSelection] = useState("");
  const [forgetting, setForgetting] = useState(false);
  const [busy, setBusy] = useState(false);
  const guideRef = useRef<HTMLTextAreaElement>(null);
  const edit = (f: (d: JournalProfileFile) => void) => setDraft((cur) => { const d = structuredClone(cur); f(d); return d; });
  const issues = useMemo(() => profileIssues(draft), [draft]);
  const dirty = !sameJson(draft, base) || guide !== baseGuide;
  useEffect(() => { onDirty(dirty); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  const source = draft.sources.find((s) => s.id === "guide")?.id ?? draft.sources.find((s) => s.kind === "author-guide")?.id ?? draft.sources[0].id;
  const guideSource = draft.sources.find((s) => s.id === source)!;
  const state: CopyState | null = projectCopy ? copyState(projectCopy, stored) : null;
  const old = profileIsOld(draft);
  const read = guideRead(draft);
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" });
  // a new profile and a project's copy are not on this computer yet: saved even unchanged;
  // SciDesk's is used as it is, and becomes the user's only when it changes
  const unsaved = origin === "new" || origin === "project" || dirty;

  const readSelection = () => {
    const el = guideRef.current;
    if (!el) return;
    setSelection(el.value.slice(el.selectionStart, el.selectionEnd));
  };
  const save = async () => {
    setBusy(true);
    try { const saved = await onSave(draft, guide); if (saved) { setDraft(saved); } } finally { setBusy(false); }
  };
  const use = async () => {
    setBusy(true);
    try {
      let p: JournalProfileFile | null = draft;
      // what is used is what is kept on this computer (or SciDesk's, unchanged)
      if (unsaved) p = await onSave(draft, guide);
      if (p) await onUse(p);
    } finally { setBusy(false); }
  };

  return (
    <JournalCtx.Provider value={{ draft, edit, selection, spend: () => setSelection(""), source, invalid: issues.map((x) => ({ path: x.path ?? "/", message: x.message })) }}>
      <div className="journal-tab">
        <div className="journal-head">
          <div className="journal-title">
            <h2>{draft.journal.title.value || t("ui.journal.untitled")}</h2>
            <span className={`badge${origin === "mine" ? " correct" : ""}`}>{t(`ui.journal.origin.${origin}`)}</span>
            {isCurrent && <span className="badge accent">{t("ui.journal.thisArticle")}</span>}
            <span className="muted small">{t("ui.journal.idLine", { id: draft.id })}</span>
          </div>
          <div className="journal-actions">
            <button className="btn primary" disabled={busy || issues.length > 0 || !unsaved} onClick={() => void save()}>{t("ui.journal.save")}</button>
            {!isCurrent && <button className="btn" title={articleTitle} disabled={busy || issues.length > 0} onClick={() => void use()}>{t("ui.journal.use")}</button>}
            {dirty && origin !== "new" && <button className="btn quiet" disabled={busy} onClick={() => { setDraft(base); setGuide(baseGuide); }}>{t("ui.journal.discard")}</button>}
            {origin === "mine" && (forgetting
              ? <><button className="btn danger" onClick={() => void onForget(draft.id)}>{t("ui.journal.forgetConfirm")}</button><button className="btn quiet" onClick={() => setForgetting(false)}>{t("cancel")}</button></>
              : <button className="btn quiet" onClick={() => setForgetting(true)}>{t("ui.journal.forget")}</button>)}
          </div>
        </div>

        {origin === "bundled" && <p className="journal-banner">{t("ui.journal.bundledNote")}</p>}
        {origin === "new" && <p className="journal-banner">{t("ui.journal.newNote")}</p>}
        {origin === "project" && <p className="journal-banner">{t("ui.journal.projectNote")}</p>}
        {state && (state === "computer-newer" || state === "differs") && (
          <p className="journal-banner warn">{t(state === "differs" ? "ui.journal.copyDiffers" : "ui.journal.copyOlder")}
            <button className="btn" disabled={busy || !stored} onClick={() => void onUpdateCopy(stored!)}>{t("ui.journal.updateCopy")}</button></p>
        )}
        {state === "project-newer" && (
          <p className="journal-banner warn">{t("ui.journal.copyNewer")}
            <button className="btn" disabled={busy} onClick={() => { setDraft(projectCopy!); }}>{t("ui.journal.showProjectCopy")}</button></p>
        )}
        {state === "same" && <p className="journal-banner quiet">{t("ui.journal.copySame")}</p>}
        {old && read && <p className="journal-banner warn">{t("ui.journal.old", { date: fmt(read) })}</p>}
        {issues.length > 0 && (
          <p className="journal-banner error" role="alert">
            {t("ui.journal.invalid", { count: issues.length })}
            <button className="btn" onClick={() => {
              const row = document.querySelector<HTMLElement>(".journal-tab .jf-row.invalid");
              if (!row) return;
              for (let d = row.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
              const sc = row.closest<HTMLElement>(".journal-form-scroll");
              if (sc) sc.scrollTop += row.getBoundingClientRect().top - sc.getBoundingClientRect().top - 80;
              row.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
            }}>{t("ui.journal.goFirst")}</button>
          </p>
        )}

        <div className="journal-body">
          <div className="journal-form-scroll"><ProfileForm /></div>
          <aside className="journal-guide" aria-label={t("ui.journal.guide")}>
            <div className="journal-guide-head">
              <b>{t("ui.journal.guide")}</b>
              <span className="muted small">{read ? t("ui.journal.readOn", { date: fmt(read) }) : null}</span>
            </div>
            <div className="journal-guide-link">
              {!inTauri && /^https?:\/\/\S+$/.test(guideSource.url)
                ? <a href={guideSource.url} target="_blank" rel="noreferrer">{guideSource.url}</a>
                : <span className="small">{guideSource.url}</span>}
              <button className="btn quiet" onClick={() => void navigator.clipboard?.writeText(guideSource.url).catch(() => {})}>{t("ui.journal.copyLink")}</button>
            </div>
            <textarea ref={guideRef} className="journal-guide-text" value={guide} placeholder={t("ui.journal.guidePlaceholder")}
              onChange={(e) => setGuide(e.target.value)} onSelect={readSelection} onMouseUp={readSelection} onKeyUp={readSelection} />
            <p className="muted small">{selection.trim() ? t("ui.journal.selected", { count: selection.trim().length }) : t("ui.journal.guideHint")}</p>
          </aside>
        </div>
      </div>
    </JournalCtx.Provider>
  );
}

// ---------------------------------------------------------------- the list on the left

export interface JournalListProps {
  known: KnownJournal[];
  /** Copies in the project that this computer does not know. */
  projectOnly: JournalProfileFile[];
  /** The article's journal: its id and title, or null. */
  current: { id: string; title: string; state: CopyState | null } | null;
  selected: string | null;
  onSelect: (id: string) => void;
  onNew: (title: string, url: string) => void;
  onClear: () => void;
}

export function JournalList({ known, projectOnly, current, selected, onSelect, onNew, onClear }: JournalListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const shown = searchKnownJournals(known, query);
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const mineProject = projectOnly.filter((p) => fold(p.journal.title.value).includes(fold(query.trim())));
  const item = (id: string, name: string, detail: string | null, badge?: ReactNode) => (
    <button key={id} className={`journal-item${selected === id ? " selected" : ""}`} aria-current={selected === id} onClick={() => onSelect(id)}>
      <span className="journal-item-name">{name}{badge}</span>
      {detail && <span className="muted small">{detail}</span>}
    </button>
  );
  const styleName = (id: string) => BUNDLED_STYLES.find((s) => s.id === id)?.name ?? id;
  const group = (key: string, list: KnownJournal[]) => list.length > 0 && (
    <div className="journal-group" key={key}>
      <h3 className="band">{t(`ui.journal.groups.${key}`)}</h3>
      {list.map((j) => item(j.id, j.title, [j.publisher, key === "style-only" ? t("ui.journal.styleOnly", { style: styleName(j.styleId) }) : null].filter(Boolean).join(" · ") || null))}
    </div>
  );
  const stateBadge = (s: CopyState | null) => s && s !== "same" && s !== "not-stored" ? <span className="badge warn" title={t(`ui.journal.states.${s}`)}>{t("ui.journal.copyBadge")}</span> : null;
  return (
    <div className="journal-list-panel">
      <div className="journal-group">
        <h3 className="band">{t("ui.journal.groups.article")}</h3>
        {current ? item(current.id, current.title, null, stateBadge(current.state)) : <p className="muted small journal-none">{t("ui.journal.none")}</p>}
        {current && <button className="btn quiet small" onClick={onClear}>{t("ui.journal.clear")}</button>}
      </div>
      <label className="search-field">
        <Icon name="search" size={15} />
        <span className="sr-only">{t("ui.journal.search")}</span>
        <input className="bare" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.journal.search")} />
      </label>
      {adding ? (
        <form className="journal-new" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onNew(title.trim(), url.trim()); setAdding(false); setTitle(""); setUrl(""); } }}>
          <label>{t("ui.journal.newTitle")}<input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>{t("ui.journal.newUrl")}<input type="url" value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)} /></label>
          <span className="journal-new-actions">
            <button className="btn primary" type="submit" disabled={!title.trim()}>{t("ui.journal.create")}</button>
            <button className="btn quiet" type="button" onClick={() => setAdding(false)}>{t("cancel")}</button>
          </span>
        </form>
      ) : (
        <button className="btn journal-add" onClick={() => { setAdding(true); setTitle(query.trim()); }}><Icon name="plus" size={14} /> {t("ui.journal.new")}</button>
      )}
      <div className="journal-groups">
        {group("mine", shown.filter((j) => j.origin === "mine"))}
        {mineProject.length > 0 && (
          <div className="journal-group">
            <h3 className="band">{t("ui.journal.groups.project")}</h3>
            {mineProject.map((p) => item(p.id, p.journal.title.value, p.journal.publisher?.value ?? null))}
          </div>
        )}
        {group("bundled", shown.filter((j) => j.origin === "bundled"))}
        {group("style-only", shown.filter((j) => j.origin === "style-only"))}
        {shown.length + mineProject.length === 0 && <p className="muted small">{t("ui.journal.noMatch")}</p>}
      </div>
    </div>
  );
}
