// Authors and affiliations (PLAN 5.3, record 0038): the project's directory of people
// (people/people.json, shared by every article) and who signs each article
// (articles/<article>/authors.json): order, printed affiliations, correspondence, equal
// contribution, CRediT roles, conflicts of interest and acknowledgements. The window edits
// copies of both files and saves them together: everything is checked first (the schema,
// the same cross-file rules as the validator, and friendly checks of ORCID, e-mail, country
// and ROR), so that a refused save writes nothing. Files only through ProjectFs.
import {
  CREDIT_ROLES, newId, orcidChecksumOk, stableStringify, validate,
  type AuthorsFile, type PeopleFile,
} from "@scidesk/formats";
import { saveJson, type Project } from "./project.ts";

export type PersonEntry = PeopleFile["people"][number];
export type PersonOnly = Extract<PersonEntry, { kind: "person" }>;
export type GroupEntry = Extract<PersonEntry, { kind: "group" }>;
export type AffiliationEntry = PeopleFile["affiliations"][number];
export type ArticleAuthor = AuthorsFile["authors"][number];
export type CreditRoleName = (typeof CREDIT_ROLES)[number];
export type CreditDegree = "lead" | "equal" | "supporting";

// ------------------------------------------------------------------ names

const PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "i", "e", "da", "do", "dos", "das", "van", "von", "der", "den", "di", "du", "le"]);

/**
 * The form of citation (Vancouver) when none is given: "Lucía Herrera Gil" -> "Herrera-Gil
 * L"; two Spanish surnames are joined with a hyphen so that indexes keep them together
 * (record 0038); particles stay as they are ("García de la Fuente A"). Initials of every
 * given name, also of hyphenated ones ("José Luis" -> "JL", "Ana-María" -> "AM").
 */
export function defaultCitationName(given: string, family: string): string {
  const parts = family.trim().split(/\s+/).filter(Boolean);
  const fam = parts.length === 2 && !parts.some((w) => PARTICLES.has(w.toLowerCase())) ? parts.join("-") : parts.join(" ");
  const initials = given.trim().split(/[\s-]+/).filter(Boolean).filter((w) => !PARTICLES.has(w.toLowerCase())).map((w) => w[0]!.toUpperCase()).join("");
  return [fam, initials].filter(Boolean).join(" ");
}

export const displayName = (p: PersonEntry) => (p.kind === "group" ? p.name : `${p.given} ${p.family}`.trim());

/** "https://orcid.org/0000-0002-1825-0097" or "0000000218250097" -> "0000-0002-1825-0097". */
export function normalizeOrcid(text: string): string {
  const d = text.trim().replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").replace(/[\s-]/g, "").toUpperCase();
  return /^\d{15}[\dX]$/.test(d) ? d.match(/.{4}/g)!.join("-") : text.trim();
}

// ------------------------------------------------------------------ new entries and edits

export const newAffiliation = (institution = ""): AffiliationEntry => ({ id: newId("af"), institution });
export const newPerson = (given = "", family = ""): PersonOnly => ({ id: newId("p"), kind: "person", given, family, affiliations: [] });
export const newGroup = (name = ""): GroupEntry => ({ id: newId("p"), kind: "group", name, members: [], affiliations: [] });

/** Adds a person of the directory to the end of the author list, with all their affiliations. */
export function addAuthor(authors: AuthorsFile, person: PersonEntry): AuthorsFile {
  if (authors.authors.some((a) => a.person === person.id)) return authors;
  return {
    ...authors,
    authors: [...authors.authors, { person: person.id, affiliations: [...person.affiliations], corresponding: false, credit: [] }],
    acknowledged: authors.acknowledged?.filter((id) => id !== person.id),
  };
}

export function moveAuthor(authors: AuthorsFile, index: number, delta: -1 | 1): AuthorsFile {
  const to = index + delta;
  if (to < 0 || to >= authors.authors.length) return authors;
  const list = [...authors.authors];
  [list[index], list[to]] = [list[to]!, list[index]!];
  return { ...authors, authors: list };
}

/** Sets (or, with null, removes) an author's degree in a CRediT role. */
export function setCredit(author: ArticleAuthor, role: CreditRoleName, degree: CreditDegree | "yes" | null): ArticleAuthor {
  const credit = author.credit.filter((c) => c.role !== role);
  if (degree) credit.push(degree === "yes" ? { role } : { role, degree });
  credit.sort((a, b) => CREDIT_ROLES.indexOf(a.role) - CREDIT_ROLES.indexOf(b.role));
  return { ...author, credit };
}

/**
 * A person removed from the directory: their affiliations stay (other people may use
 * them); they leave the groups they were members of. Refused by the check while they still
 * sign or are thanked in an article.
 */
export function removePerson(people: PeopleFile, id: string): PeopleFile {
  return {
    ...people,
    people: people.people.filter((p) => p.id !== id).map((p) => (p.kind === "group" ? { ...p, members: p.members.filter((m) => m !== id) } : p)),
  };
}

/** An affiliation removed from the directory and from every person (see also withoutAffiliation). */
export function removeAffiliation(people: PeopleFile, id: string): PeopleFile {
  return {
    ...people,
    affiliations: people.affiliations.filter((a) => a.id !== id),
    people: people.people.map((p) => ({ ...p, affiliations: p.affiliations.filter((a) => a !== id) })),
  };
}

/** The same affiliation removed from an article's author list. */
export function withoutAffiliation(authors: AuthorsFile, id: string): AuthorsFile {
  return { ...authors, authors: authors.authors.map((a) => ({ ...a, affiliations: a.affiliations.filter((x) => x !== id) })) };
}

// ------------------------------------------------------------------ checks

export type AuthorshipCode =
  // errors: the save is refused
  | "schema" | "empty-name" | "empty-institution" | "orcid-format" | "orcid-checksum" | "email-format" | "country-format" | "ror-format"
  | "unknown-person" | "unknown-affiliation" | "affiliation-not-persons" | "unknown-member" | "duplicate-author" | "person-in-use"
  // warnings: saved, and shown
  | "no-authors" | "no-corresponding" | "corresponding-no-email" | "author-no-affiliation" | "equal-single" | "author-no-credit" | "acknowledged-signs";

export interface AuthorshipIssue {
  level: "error" | "warning";
  code: AuthorshipCode;
  /** The person or affiliation it is about. */
  id?: string;
  /** Article folder, for rules about authors.json. */
  article?: string;
  detail?: string;
}

/**
 * Checks a directory and the author list of one article together, plus the author lists
 * of the project's other articles (a person removed from the directory may still sign
 * there).
 */
export function checkAuthorship(project: Project, folder: string, people: PeopleFile, authors: AuthorsFile): AuthorshipIssue[] {
  const out: AuthorshipIssue[] = [];
  const err = (code: AuthorshipCode, id?: string, detail?: string, article?: string) => out.push({ level: "error", code, id, detail, article });
  const warn = (code: AuthorshipCode, id?: string, detail?: string) => out.push({ level: "warning", code, id, detail, article: folder });
  const affIds = new Set(people.affiliations.map((a) => a.id));
  const byId = new Map(people.people.map((p) => [p.id, p]));

  for (const a of people.affiliations) {
    if (!a.institution.trim()) err("empty-institution", a.id);
    if (a.country && !/^[A-Z]{2}$/.test(a.country)) err("country-format", a.id, a.country);
    if (a.ror && !/^https:\/\/ror\.org\/0[a-z0-9]{8}$/.test(a.ror)) err("ror-format", a.id, a.ror);
  }
  for (const p of people.people) {
    if (p.kind === "person" ? !p.given.trim() || !p.family.trim() : !p.name.trim()) err("empty-name", p.id);
    if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) err("email-format", p.id, p.email);
    if (p.kind === "person" && p.orcid) {
      if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(p.orcid)) err("orcid-format", p.id, p.orcid);
      else if (!orcidChecksumOk(p.orcid)) err("orcid-checksum", p.id, p.orcid);
    }
    for (const af of p.affiliations) if (!affIds.has(af)) err("unknown-affiliation", p.id, af);
    if (p.kind === "group") for (const m of p.members) if (!byId.has(m)) err("unknown-member", p.id, m);
  }
  // the schemas catch the rest (and anything above, in other words): only when nothing friendlier was said
  if (!out.length) {
    for (const i of validate("people", people, "people/people.json")) err("schema", undefined, `${i.path ?? ""} ${i.message}`);
    for (const i of validate("authors", authors, `articles/${folder}/authors.json`)) err("schema", undefined, `${i.path ?? ""} ${i.message}`);
  }

  const lists = new Map(project.articles.map((a) => [a.folder, a.authors]));
  lists.set(folder, authors);
  for (const [art, list] of lists) {
    const seen = new Set<string>();
    for (const a of list.authors) {
      const p = byId.get(a.person);
      if (!p) { err(art === folder ? "unknown-person" : "person-in-use", a.person, undefined, art); continue; }
      if (seen.has(a.person)) err("duplicate-author", a.person, undefined, art);
      seen.add(a.person);
      for (const af of a.affiliations) if (!p.affiliations.includes(af)) err("affiliation-not-persons", a.person, af, art);
    }
    for (const id of list.acknowledged ?? []) if (!byId.has(id)) err(art === folder ? "unknown-person" : "person-in-use", id, undefined, art);
  }

  // warnings about this article
  if (!authors.authors.length) warn("no-authors");
  else if (!authors.authors.some((a) => a.corresponding)) warn("no-corresponding");
  for (const a of authors.authors) {
    const p = byId.get(a.person);
    if (!p) continue;
    if (a.corresponding && !p.email) warn("corresponding-no-email", a.person);
    if (!a.affiliations.length) warn("author-no-affiliation", a.person);
  }
  const tokens = new Map<string, number>();
  for (const a of authors.authors) if (a.equalContribution) tokens.set(a.equalContribution, (tokens.get(a.equalContribution) ?? 0) + 1);
  for (const [t, n] of tokens) if (n === 1) warn("equal-single", authors.authors.find((a) => a.equalContribution === t)!.person, t);
  if (authors.authors.some((a) => a.credit.length)) for (const a of authors.authors) if (!a.credit.length) warn("author-no-credit", a.person);
  for (const id of authors.acknowledged ?? []) if (authors.authors.some((a) => a.person === id)) warn("acknowledged-signs", id);
  return out;
}

export class AuthorshipError extends Error {
  readonly issues: AuthorshipIssue[];
  constructor(issues: AuthorshipIssue[]) {
    super(`refusing to save the authors: ${issues.map((i) => `${i.code}${i.id ? ` (${i.id})` : ""}${i.detail ? `: ${i.detail}` : ""}`).join("; ")}`);
    this.issues = issues;
  }
}

/**
 * Saves the directory and the article's author list together. Nothing is written if there
 * is an error; the warnings are returned. Unchanged files are not rewritten.
 */
export async function saveAuthorship(project: Project, folder: string, people: PeopleFile, authors: AuthorsFile): Promise<AuthorshipIssue[]> {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  // empty optional fields are left out, not written as ""
  const clean: AuthorsFile = structuredClone(authors);
  if (!clean.acknowledged?.length) delete clean.acknowledged;
  for (const a of clean.authors) {
    if (!a.equalContribution) delete a.equalContribution;
    if (!a.conflicts?.trim()) delete a.conflicts;
  }
  const issues = checkAuthorship(project, folder, people, clean);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length) throw new AuthorshipError(errors);
  if (stableStringify(people) !== stableStringify(project.people)) {
    await saveJson(project, "people/people.json", people);
    project.people = people;
  }
  if (stableStringify(clean) !== stableStringify(art.authors)) {
    await saveJson(project, `articles/${folder}/authors.json`, clean);
    art.authors = clean;
  }
  return issues;
}
