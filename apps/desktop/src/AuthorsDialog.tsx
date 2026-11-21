// Authors and affiliations (PLAN 5.3, record 0038): who signs the article and in what
// order, with which affiliations, correspondence, equal contribution and conflicts; the
// project's directory of people and groups; the shared affiliations; and the CRediT
// matrix. It edits copies of people.json and authors.json and saves both at once, after the
// core's check. A plain dialog: its final place and look wait for the interface decisions.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addAuthor, AuthorshipError, checkAuthorship, defaultCitationName, displayName, moveAuthor, newAffiliation, newGroup, newPerson,
  normalizeOrcid, removeAffiliation, removePerson, saveAuthorship, setCredit, withoutAffiliation,
  type AffiliationEntry, type ArticleAuthor, type AuthorshipIssue, type CreditDegree, type PersonEntry, type Project,
} from "@scidesk/core";
import { CREDIT_ROLES, type AuthorsFile, type PeopleFile } from "@scidesk/formats";

type Tab = "authors" | "people" | "affiliations" | "credit";
const EQUAL_TOKENS = ["e1", "e2", "e3"];

/** ISO 3166-1 alpha-2 codes the browser can name, sorted by their name in the interface language. */
function countries(lang: string): [string, string][] {
  const names = new Intl.DisplayNames([lang], { type: "region", fallback: "none" });
  const out: [string, string][] = [];
  for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    // not countries of ISO 3166-1 (CLDR also names these)
    if (["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ", "AQ", "IC", "EA", "DG", "CP", "AC", "TA", "CQ"].includes(code)) continue;
    // old codes (DD, UK, SU…) that are aliases of a current one
    try { if (Intl.getCanonicalLocales(`und-${code}`)[0] !== `und-${code}`) continue; } catch { continue; }
    const name = names.of(code);
    if (name && name !== code) out.push([code, name]);
  }
  return out.sort((x, y) => x[1].localeCompare(y[1], lang));
}

/** Sets an optional string field, leaving it out when empty. */
function opt<T extends object>(o: T, key: string, value: string | string[] | undefined): T {
  const next = { ...o } as Record<string, unknown>;
  if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) delete next[key];
  else next[key] = value;
  return next as T;
}

export function AuthorsDialog({ project, folder, onClose, onSaved }: { project: Project; folder: string; onClose: () => void; onSaved: (warnings: number) => void }) {
  const { t, i18n } = useTranslation();
  const art = project.articles.find((a) => a.folder === folder)!;
  const [tab, setTab] = useState<Tab>("authors");
  const [people, setPeople] = useState<PeopleFile>(() => structuredClone(project.people));
  const [authors, setAuthors] = useState<AuthorsFile>(() => structuredClone(art.authors));
  const [personSel, setPersonSel] = useState<string | null>(null);
  const [affSel, setAffSel] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<AuthorshipIssue[] | null>(null);
  const countryList = useMemo(() => countries(i18n.language), [i18n.language]);
  const byId = useMemo(() => new Map(people.people.map((p) => [p.id, p])), [people]);
  const affById = useMemo(() => new Map(people.affiliations.map((a) => [a.id, a])), [people]);
  const issues = useMemo(() => checkAuthorship(project, folder, people, authors), [project, folder, people, authors]);
  const signs = (id: string) => authors.authors.some((a) => a.person === id);

  const issueText = (i: AuthorshipIssue) => {
    const who = i.id ? (byId.get(i.id) ? displayName(byId.get(i.id)!) : affById.get(i.id)?.institution ?? i.id) : "";
    return t(`authorIssues.${i.code}`, { who, detail: i.detail ?? "", article: i.article ?? "" });
  };
  const affLabel = (a: AffiliationEntry | undefined) => (a ? [a.department, a.institution].filter(Boolean).join(", ") : "?");

  const updPerson = (id: string, f: (p: PersonEntry) => PersonEntry) => setPeople((ps) => ({ ...ps, people: ps.people.map((p) => (p.id === id ? f(p) : p)) }));
  const updAff = (id: string, f: (a: AffiliationEntry) => AffiliationEntry) => setPeople((ps) => ({ ...ps, affiliations: ps.affiliations.map((a) => (a.id === id ? f(a) : a)) }));
  const updAuthor = (i: number, f: (a: ArticleAuthor) => ArticleAuthor) => setAuthors((as) => ({ ...as, authors: as.authors.map((a, j) => (j === i ? f(a) : a)) }));

  const save = async () => {
    setSaveError(null);
    try {
      const warnings = await saveAuthorship(project, folder, people, authors);
      onSaved(warnings.length);
    } catch (e) {
      if (e instanceof AuthorshipError) setSaveError(e.issues);
      else setSaveError([{ level: "error", code: "schema", detail: e instanceof Error ? e.message : String(e) }]);
    }
  };

  // ---------------------------------------------------------------- tabs

  const authorsTab = () => {
    const notSigning = people.people.filter((p) => !signs(p.id));
    return (
      <>
        {authors.authors.length === 0 && <p className="muted">{t("noAuthorsYet")}</p>}
        <ul className="author-list">
          {authors.authors.map((a, i) => {
            const p = byId.get(a.person);
            return (
              <li key={a.person} className="author-row">
                <div className="author-head">
                  <b>{i + 1}. {p ? displayName(p) : a.person}</b>
                  <span className="spacer" />
                  <button onClick={() => setAuthors((x) => moveAuthor(x, i, -1))} disabled={i === 0} aria-label={t("moveUp")}>↑</button>
                  <button onClick={() => setAuthors((x) => moveAuthor(x, i, 1))} disabled={i === authors.authors.length - 1} aria-label={t("moveDown")}>↓</button>
                  <button onClick={() => setAuthors((x) => ({ ...x, authors: x.authors.filter((_, j) => j !== i) }))}>{t("removeAuthor")}</button>
                </div>
                <div className="author-fields">
                  <label className="inline"><input type="checkbox" checked={a.corresponding} onChange={(e) => updAuthor(i, (x) => ({ ...x, corresponding: e.target.checked }))} />{t("corresponding")}</label>
                  <label className="inline">{t("equalContribution")}
                    <select value={a.equalContribution ?? ""} onChange={(e) => updAuthor(i, (x) => opt(x, "equalContribution", e.target.value))}>
                      <option value="">—</option>
                      {EQUAL_TOKENS.map((k, n) => <option key={k} value={k}>{t("equalGroup", { n: n + 1 })}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset className="checks">
                  <legend>{t("printedAffiliations")}</legend>
                  {(p?.affiliations ?? []).length === 0 && <span className="muted">{t("personHasNoAffiliations")}</span>}
                  {(p?.affiliations ?? []).map((af) => (
                    <label key={af} className="inline">
                      <input type="checkbox" checked={a.affiliations.includes(af)}
                        onChange={(e) => updAuthor(i, (x) => ({ ...x, affiliations: e.target.checked ? [...x.affiliations, af] : x.affiliations.filter((y) => y !== af) }))} />
                      {affLabel(affById.get(af))}
                    </label>
                  ))}
                </fieldset>
                <label>{t("conflicts")}<input value={a.conflicts ?? ""} onChange={(e) => updAuthor(i, (x) => ({ ...x, conflicts: e.target.value }))} placeholder={t("conflictsPlaceholder")} /></label>
              </li>
            );
          })}
        </ul>
        <div className="dialog-actions">
          <select value="" onChange={(e) => { const p = byId.get(e.target.value); if (p) setAuthors((x) => addAuthor(x, p)); }} aria-label={t("addAuthor")} disabled={!notSigning.length}>
            <option value="">{notSigning.length ? t("addAuthor") : people.people.length ? t("everyoneSigns") : t("emptyDirectory")}</option>
            {notSigning.map((p) => <option key={p.id} value={p.id}>{displayName(p)}</option>)}
          </select>
          <button onClick={() => { setTab("people"); const p = newPerson(); setPeople((x) => ({ ...x, people: [...x.people, p] })); setPersonSel(p.id); }}>{t("newPerson")}</button>
        </div>
        {notSigning.length > 0 && (
          <fieldset className="checks">
            <legend>{t("acknowledged")}</legend>
            {notSigning.map((p) => (
              <label key={p.id} className="inline">
                <input type="checkbox" checked={(authors.acknowledged ?? []).includes(p.id)}
                  onChange={(e) => setAuthors((x) => ({ ...x, acknowledged: e.target.checked ? [...(x.acknowledged ?? []), p.id] : (x.acknowledged ?? []).filter((y) => y !== p.id) }))} />
                {displayName(p)}
              </label>
            ))}
          </fieldset>
        )}
      </>
    );
  };

  const personForm = (p: PersonEntry) => (
    <div className="entry-form">
      {p.kind === "person" ? (
        <>
          <div className="row2">
            <label>{t("given")}<input value={p.given} onChange={(e) => updPerson(p.id, (x) => ({ ...x, given: e.target.value }) as PersonEntry)} /></label>
            <label>{t("family")}<input value={p.family} onChange={(e) => updPerson(p.id, (x) => ({ ...x, family: e.target.value }) as PersonEntry)} /></label>
          </div>
          <div className="row2">
            <label>{t("citationName")}<input value={p.citationName ?? ""} placeholder={defaultCitationName(p.given, p.family)} onChange={(e) => updPerson(p.id, (x) => opt(x, "citationName", e.target.value))} /></label>
            <label>{t("degrees")}<input value={(p.degrees ?? []).join(", ")} placeholder="MD, PhD" onChange={(e) => updPerson(p.id, (x) => opt(x, "degrees", e.target.value.split(",").map((s) => s.trim()).filter(Boolean)))} /></label>
          </div>
          <label>ORCID<input value={p.orcid ?? ""} placeholder="0000-0002-1825-0097" onChange={(e) => updPerson(p.id, (x) => opt(x, "orcid", e.target.value.trim()))} onBlur={(e) => updPerson(p.id, (x) => opt(x, "orcid", normalizeOrcid(e.target.value)))} /></label>
        </>
      ) : (
        <>
          <label>{t("groupName")}<input value={p.name} onChange={(e) => updPerson(p.id, (x) => ({ ...x, name: e.target.value }) as PersonEntry)} /></label>
          <fieldset className="checks">
            <legend>{t("members")}</legend>
            {people.people.filter((m) => m.kind === "person").map((m) => (
              <label key={m.id} className="inline">
                <input type="checkbox" checked={p.members.includes(m.id)} onChange={(e) => updPerson(p.id, (x) => ({ ...x, members: e.target.checked ? [...(x as typeof p).members, m.id] : (x as typeof p).members.filter((y) => y !== m.id) }) as PersonEntry)} />
                {displayName(m)}
              </label>
            ))}
          </fieldset>
        </>
      )}
      <label>{t("email")}<input type="email" value={p.email ?? ""} onChange={(e) => updPerson(p.id, (x) => opt(x, "email", e.target.value.trim()))} /></label>
      <fieldset className="checks">
        <legend>{t("affiliations")}</legend>
        {people.affiliations.length === 0 && <span className="muted">{t("noAffiliationsYet")}</span>}
        {people.affiliations.map((a) => (
          <label key={a.id} className="inline">
            <input type="checkbox" checked={p.affiliations.includes(a.id)} onChange={(e) => {
              updPerson(p.id, (x) => ({ ...x, affiliations: e.target.checked ? [...x.affiliations, a.id] : x.affiliations.filter((y) => y !== a.id) }));
              // an affiliation the person no longer has cannot be printed for them
              if (!e.target.checked) setAuthors((x) => ({ ...x, authors: x.authors.map((au) => (au.person === p.id ? { ...au, affiliations: au.affiliations.filter((y) => y !== a.id) } : au)) }));
            }} />
            {affLabel(a)}
          </label>
        ))}
      </fieldset>
      <label>{t("notes")}<input value={p.notes ?? ""} onChange={(e) => updPerson(p.id, (x) => opt(x, "notes", e.target.value))} /></label>
      <div className="dialog-actions">
        {!signs(p.id) && <button onClick={() => setAuthors((x) => addAuthor(x, p))}>{t("makeAuthor")}</button>}
        <span className="spacer" />
        <button onClick={() => { setPeople((x) => removePerson(x, p.id)); setAuthors((x) => ({ ...x, acknowledged: x.acknowledged?.filter((y) => y !== p.id) })); setPersonSel(null); }}
          disabled={signs(p.id)} title={signs(p.id) ? t("personSigns") : undefined}>{t("deletePerson")}</button>
      </div>
    </div>
  );

  const peopleTab = () => {
    const sel = personSel ? byId.get(personSel) : undefined;
    return (
      <div className="master-detail">
        <div className="master">
          <ul className="ref-list">
            {people.people.map((p) => (
              <li key={p.id}><button className={`ref-item${p.id === personSel ? " selected" : ""}`} onClick={() => setPersonSel(p.id)}>
                <span><b>{displayName(p) || t("unnamed")}</b>{p.kind === "group" ? <span className="muted"> · {t("group")}</span> : null}{signs(p.id) ? <span className="cited"> · {t("signs")}</span> : null}</span>
              </button></li>
            ))}
          </ul>
          <div className="dialog-actions">
            <button onClick={() => { const p = newPerson(); setPeople((x) => ({ ...x, people: [...x.people, p] })); setPersonSel(p.id); }}>{t("newPerson")}</button>
            <button onClick={() => { const g = newGroup(); setPeople((x) => ({ ...x, people: [...x.people, g] })); setPersonSel(g.id); }}>{t("newGroup")}</button>
          </div>
        </div>
        <div className="detail">{sel ? personForm(sel) : <p className="muted">{t("choosePerson")}</p>}</div>
      </div>
    );
  };

  const affiliationsTab = () => {
    const a = affSel ? affById.get(affSel) : undefined;
    return (
      <div className="master-detail">
        <div className="master">
          <ul className="ref-list">
            {people.affiliations.map((x) => (
              <li key={x.id}><button className={`ref-item${x.id === affSel ? " selected" : ""}`} onClick={() => setAffSel(x.id)}>
                <span><b>{x.institution || t("unnamed")}</b>{x.department ? <span className="muted"> · {x.department}</span> : null}</span>
              </button></li>
            ))}
          </ul>
          <div className="dialog-actions">
            <button onClick={() => { const x = newAffiliation(); setPeople((ps) => ({ ...ps, affiliations: [...ps.affiliations, x] })); setAffSel(x.id); }}>{t("newAffiliation")}</button>
          </div>
        </div>
        <div className="detail">{!a ? <p className="muted">{t("chooseAffiliation")}</p> : (
          <div className="entry-form">
            <label>{t("institution")}<input value={a.institution} onChange={(e) => updAff(a.id, (x) => ({ ...x, institution: e.target.value }))} /></label>
            <label>{t("department")}<input value={a.department ?? ""} onChange={(e) => updAff(a.id, (x) => opt(x, "department", e.target.value))} /></label>
            <div className="row2">
              <label>{t("city")}<input value={a.city ?? ""} onChange={(e) => updAff(a.id, (x) => opt(x, "city", e.target.value))} /></label>
              <label>{t("country")}
                <select value={a.country ?? ""} onChange={(e) => updAff(a.id, (x) => opt(x, "country", e.target.value))}>
                  <option value="">—</option>
                  {countryList.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </label>
            </div>
            <label>ROR<input value={a.ror ?? ""} placeholder="https://ror.org/0…" onChange={(e) => updAff(a.id, (x) => opt(x, "ror", e.target.value.trim()))} /></label>
            <p className="muted">{t("usedBy", { names: people.people.filter((p) => p.affiliations.includes(a.id)).map(displayName).join(", ") || "—" })}</p>
            <div className="dialog-actions">
              <span className="spacer" />
              <button onClick={() => { setPeople((x) => removeAffiliation(x, a.id)); setAuthors((x) => withoutAffiliation(x, a.id)); setAffSel(null); }}>{t("deleteAffiliation")}</button>
            </div>
          </div>
        )}</div>
      </div>
    );
  };

  const creditTab = () => (
    authors.authors.length === 0 ? <p className="muted">{t("noAuthorsYet")}</p> : (
      <div className="credit-wrap">
        <table className="credit">
          <thead><tr><th>{t("creditRole")}</th>{authors.authors.map((a) => {
            const p = byId.get(a.person);
            const short = p?.kind === "person" ? p.citationName ?? defaultCitationName(p.given, p.family) : p ? displayName(p) : a.person;
            return <th key={a.person} title={p ? displayName(p) : ""}>{short}</th>;
          })}</tr></thead>
          <tbody>
            {CREDIT_ROLES.map((role) => (
              <tr key={role}>
                <th scope="row">{t(`credit.${role}`)}</th>
                {authors.authors.map((a, i) => {
                  const c = a.credit.find((x) => x.role === role);
                  const value = c ? c.degree ?? "yes" : "";
                  return (
                    <td key={a.person}>
                      <select value={value} aria-label={`${t(`credit.${role}`)} · ${byId.get(a.person) ? displayName(byId.get(a.person)!) : ""}`}
                        onChange={(e) => updAuthor(i, (x) => setCredit(x, role, (e.target.value || null) as CreditDegree | "yes" | null))}>
                        <option value="">—</option>
                        <option value="yes">✓</option>
                        <option value="lead">{t("degree.lead")}</option>
                        <option value="equal">{t("degree.equal")}</option>
                        <option value="supporting">{t("degree.supporting")}</option>
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">{t("creditNote")}</p>
      </div>
    )
  );

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  return (
    <div className="overlay">
      <div className="authors-dialog" role="dialog" aria-modal="true" aria-label={t("authorsTitle")}>
        <h2>{t("authorsTitle")}</h2>
        <div className="tabs" role="tablist">
          {(["authors", "people", "affiliations", "credit"] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t(`authorTabs.${k}`)}</button>
          ))}
        </div>
        <div className="authors-body">
          {tab === "authors" ? authorsTab() : tab === "people" ? peopleTab() : tab === "affiliations" ? affiliationsTab() : creditTab()}
        </div>
        {(errors.length > 0 || warnings.length > 0 || saveError) && (
          <ul className="issues">
            {(saveError ?? errors).map((i, n) => <li key={`e${n}`} className="field-error">{issueText(i)}</li>)}
            {warnings.map((i, n) => <li key={`w${n}`} className="muted">⚠ {issueText(i)}</li>)}
          </ul>
        )}
        <div className="dialog-actions">
          <span className="muted">{t("authorsSaveNote")}</span>
          <button onClick={onClose}>{t("cancel")}</button>
          <button onClick={() => void save()} disabled={errors.length > 0}>{t("saveAuthors")}</button>
        </div>
      </div>
    </div>
  );
}
