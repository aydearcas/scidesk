// What a new article starts with (the "new article" wizard, sheet 7 of the interface
// proposal, record 0048): the titles and abstracts by language, the sections of its type,
// and what the journal profile changes (structured abstract, fixed sections, a letter's
// opening). The same plan is shown on the right of the wizard and written to disk, so what
// the user sees is what gets created. Also the journals the wizard offers.
import { newId, type JournalProfileFile, type PMNode } from "@scidesk/formats";
import { REUMATOLOGIA_CLINICA } from "./resources.ts";

/** Article types the wizard offers, in its order (the format has more: record 0031). */
export const NEW_ARTICLE_TYPES = ["original", "brief-original", "systematic-review", "narrative-review", "case-report", "letter"] as const;

/** Types written as IMRaD, whose abstract is structured unless the journal says otherwise. */
const IMRAD = new Set(["original", "brief-original", "systematic-review", "clinical-trial", "observational", "qualitative", "protocol", "guideline", "other"]);

/** The sections of each type, in order; References always closes the body. */
const TYPE_SECTIONS: Record<string, string[]> = {
  "narrative-review": ["introduction", "conclusions"],
  "case-report": ["introduction", "case-presentation", "discussion", "conclusions"],
  letter: [],
};
const IMRAD_SECTIONS = ["introduction", "methods", "results", "discussion"];
const ABSTRACT_SECTIONS = ["objective", "methods", "results", "conclusions"];

/** Headings by role, for a new article and for a structured abstract the journal does not name. */
export const SECTION_LABELS: Record<string, Record<string, string>> = {
  es: {
    introduction: "Introducción", background: "Antecedentes", objective: "Objetivo", "background-objective": "Antecedentes y objetivo",
    methods: "Métodos", "patients-methods": "Pacientes y métodos", results: "Resultados", discussion: "Discusión", conclusions: "Conclusiones",
    "discussion-conclusions": "Discusión y conclusiones", "case-presentation": "Presentación del caso", references: "Bibliografía",
  },
  en: {
    introduction: "Introduction", background: "Background", objective: "Objective", "background-objective": "Background and objective",
    methods: "Methods", "patients-methods": "Patients and methods", results: "Results", discussion: "Discussion", conclusions: "Conclusions",
    "discussion-conclusions": "Discussion and conclusions", "case-presentation": "Case presentation", references: "References",
  },
};
const sectionLabel = (role: string, lang: string) => (SECTION_LABELS[lang.slice(0, 2)] ?? SECTION_LABELS.en)[role] ?? role;

export interface NewArticleOptions {
  title: string;
  /** Language of the manuscript. */
  lang: string;
  /** Other languages of the title, the abstract and the keywords. */
  translations?: string[];
  articleType: string;
  /** The target journal's profile, if it has one. */
  journal?: JournalProfileFile | null;
}

export interface ArticlePlan {
  /** One title per language, the manuscript's first. */
  titles: { lang: string; text: string }[];
  /** One abstract per language (none for a letter); `sections` when it is structured. */
  abstracts: { lang: string; sections: { role: string; label: string }[] | null; keywords: boolean }[];
  /** A fixed opening, before the body (a letter's "Señor editor:"). */
  opening: string | null;
  /** Sections of the body, References last. */
  sections: { role: string; label: string }[];
}

/** What a new article will have, from its type, its languages and its journal. */
export function articlePlan(opts: NewArticleOptions): ArticlePlan {
  const langs = [opts.lang, ...(opts.translations ?? []).filter((l) => l !== opts.lang)];
  const rules = opts.journal?.articleTypes.find((t) => t.articleType === opts.articleType);
  const letter = opts.articleType === "letter";
  // the type's own abstract rules first; the journal's general ones apply to IMRaD types
  const abstractRules = rules?.abstract ?? (IMRAD.has(opts.articleType) ? opts.journal?.abstract : undefined);
  const structured = abstractRules ? abstractRules.structured.value : IMRAD.has(opts.articleType);
  const abstractRoles = abstractRules?.sections?.value ?? ABSTRACT_SECTIONS.map((role) => ({ role, label: {} as Record<string, string> }));
  const roles = rules?.sections?.value ?? TYPE_SECTIONS[opts.articleType] ?? IMRAD_SECTIONS;
  return {
    titles: langs.map((lang, i) => ({ lang, text: i === 0 ? opts.title : "" })),
    abstracts: letter ? [] : langs.map((lang) => ({
      lang,
      sections: structured ? abstractRoles.map((s) => ({ role: s.role, label: s.label[lang] ?? sectionLabel(s.role, lang) })) : null,
      keywords: true,
    })),
    opening: letter && rules?.opening ? rules.opening.value : null,
    sections: [...roles.filter((r) => r !== "references"), "references"].map((role) => ({ role, label: sectionLabel(role, opts.lang) })),
  };
}

const paragraph = (text = "", lang: string | null = null): PMNode => ({ type: "paragraph", attrs: { id: newId("b"), lang }, ...(text ? { content: [{ type: "text", text }] } : {}) });
const text = (s: string) => (s ? { content: [{ type: "text", text: s }] } : {});

/** The body and the abstract of a new article (the `doc` of each .scidoc). */
export function articleDocs(opts: NewArticleOptions): { body: PMNode; abstract: PMNode; plan: ArticlePlan } {
  const plan = articlePlan(opts);
  const body: PMNode[] = plan.titles.map((t) => ({ type: "title", attrs: { id: newId("b"), lang: t.lang }, ...text(t.text) }));
  if (plan.opening) body.push(paragraph(/[:,]$/.test(plan.opening) ? plan.opening : `${plan.opening}:`));
  // a letter is one body of text before its references
  if (opts.articleType === "letter") body.push(paragraph());
  for (const s of plan.sections) {
    body.push({ type: "heading", attrs: { id: newId("b"), level: 1, role: s.role, lang: null }, content: [{ type: "text", text: s.label }] });
    if (s.role !== "references") body.push(paragraph());
  }
  const abstract: PMNode[] = plan.abstracts.map((a) => ({
    type: "abstractSection", attrs: { id: newId("b"), lang: a.lang },
    content: [
      ...(a.sections ?? [null]).flatMap((s) => s ? [{ type: "heading", attrs: { id: newId("b"), level: 2, role: s.role, lang: null }, content: [{ type: "text", text: s.label }] }, paragraph()] : [paragraph()]),
      ...(a.keywords ? [{ type: "keywords", attrs: { id: newId("b") }, content: [{ type: "keyword" }] }] : []),
    ],
  }));
  return { body: { type: "doc", content: body }, abstract: { type: "doc", content: abstract }, plan };
}

// ---------------------------------------------------------------- journals the wizard offers

export interface CatalogJournal {
  id: string;
  title: string;
  publisher?: string;
  /** CSL id of its citation style (one of the bundled styles). */
  styleId: string;
  /** Its profile, a file under assets/journals/, when SciDesk includes one. */
  profile?: string;
  /** Its areas (ids of areas.ts), to suggest it to whoever works in them. */
  areas: string[];
}

const Z = "http://www.zotero.org/styles/";
/**
 * Journals SciDesk knows today: Reumatología Clínica with its profile (the test journal,
 * record 0013), and journals whose style is bundled (record 0037), which bring only their
 * citation style; their limits and requirements will come with the package for an LLM.
 */
export const JOURNAL_CATALOG: CatalogJournal[] = [
  { id: "reumatologia-clinica", title: "Reumatología Clínica", publisher: "Elsevier", styleId: REUMATOLOGIA_CLINICA, profile: "reumatologia-clinica.json", areas: ["rheumatology"] },
  { id: "medicina-clinica", title: "Medicina Clínica", publisher: "Elsevier", styleId: `${Z}medicina-clinica`, areas: ["general-medicine", "internal-medicine"] },
  { id: "the-lancet", title: "The Lancet", publisher: "Elsevier", styleId: `${Z}the-lancet`, areas: ["general-medicine"] },
  { id: "the-new-england-journal-of-medicine", title: "The New England Journal of Medicine", styleId: `${Z}the-new-england-journal-of-medicine`, areas: ["general-medicine"] },
  { id: "bmj", title: "BMJ", styleId: `${Z}bmj`, areas: ["general-medicine"] },
  { id: "jama", title: "JAMA", styleId: `${Z}jama`, areas: ["general-medicine"] },
  { id: "nature", title: "Nature", styleId: `${Z}nature`, areas: ["multidisciplinary"] },
  { id: "science", title: "Science", styleId: `${Z}science`, areas: ["multidisciplinary"] },
  { id: "cell", title: "Cell", styleId: `${Z}cell`, areas: ["biochemistry-genetics"] },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** Journals whose name or publisher has every word of the query (without accents); all for an empty query. */
export function searchJournals(query: string): CatalogJournal[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return JOURNAL_CATALOG.filter((j) => words.every((w) => fold(`${j.title} ${j.publisher ?? ""}`).includes(w)));
}

export interface JournalSummary {
  /** The type as the journal calls it, in the manuscript's language if it has it. */
  typeName: string | null;
  limits: Record<string, number>;
  structuredAbstract: boolean | null;
  blind: string | null;
  separateTitlePage: boolean;
  /** When the author guide was read. */
  checked: string | null;
  /** The profile does not have this article type. */
  typeMissing: boolean;
}

/** What a journal asks of an article type, for the wizard ("3000 words · structured abstract…"). */
export function journalSummary(profile: JournalProfileFile, articleType: string, lang: string): JournalSummary {
  const rules = profile.articleTypes.find((t) => t.articleType === articleType);
  const limits: Record<string, number> = {};
  for (const [k, v] of Object.entries(rules?.limits ?? {})) if (v) limits[k] = v.value;
  const abstract = rules?.abstract ?? (IMRAD.has(articleType) ? profile.abstract : undefined);
  const guide = profile.sources.find((s) => s.kind === "author-guide") ?? profile.sources[0];
  return {
    typeName: rules ? rules.journalName[lang] ?? Object.values(rules.journalName)[0] ?? null : null,
    limits,
    structuredAbstract: articleType === "letter" ? null : abstract ? abstract.structured.value : null,
    blind: profile.review?.blind.value ?? null,
    separateTitlePage: profile.review?.separateTitlePage?.value ?? false,
    checked: guide?.accessed ?? null,
    typeMissing: !rules,
  };
}

/** Languages a journal asks for besides the manuscript's (Reumatología Clínica: the title, abstract and keywords also in English). */
export function journalTranslations(profile: JournalProfileFile, lang: string): string[] {
  const l = profile.languages.value;
  return [...new Set([...(l.titleAlso ?? []), ...(l.abstractAlso ?? []), ...(l.keywordsAlso ?? [])])].filter((x) => x !== lang);
}

// ---------------------------------------------------------------- the project folder

const STOP = new Set(["a", "al", "de", "del", "el", "en", "la", "las", "los", "por", "para", "con", "y", "o", "un", "una", "the", "of", "in", "on", "and", "or", "for", "with", "an", "to"]);
/** A folder name from a title: "Remisión sostenida en la artritis…" → "remision-sostenida-artritis-reumatoide". */
export function folderName(title: string): string {
  const words = fold(title).replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !STOP.has(w));
  return words.slice(0, 4).join("-").slice(0, 48).replace(/-+$/, "") || "articulo";
}
