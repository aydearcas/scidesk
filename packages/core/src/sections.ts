// Numbered sections (record 0070). The numbers are computed, never written in the text, as
// those of tables and figures: "1." and "1.1." (as Elsevier) or "1" and "1.1" (as Springer),
// for the headings of levels 1 to 3 of the body. The setting is the article's (article.json
// `sectionNumbering`); null follows the journal profile, and when it does not say, the
// sections are not numbered, as usual in biomedicine. A heading with `numbered: false` is
// never numbered, nor are its subsections; nor are the closing sections (references,
// acknowledgements, funding, declarations, appendices) when they are of level 1.
import type { PMNode } from "@scidesk/formats";
import { saveJson, type Project } from "./project.ts";
import { BODY_ORDER, CLOSING_ORDER, isClosingRole } from "./section-order.ts";

export const SECTION_NUMBERING = ["none", "1.", "1"] as const;
export type SectionNumbering = (typeof SECTION_NUMBERING)[number];

/** Sections that close the article and are not numbered when they are of level 1. */
export const UNNUMBERED_ROLES: ReadonlySet<string> = new Set([
  "references", "acknowledgements", "funding", "conflicts", "ethics", "consent", "data-availability",
  "registration", "ai-use", "contributions", "appendix",
]);

/** The deepest level that is numbered. */
export const NUMBERED_LEVELS = 3;

export interface HeadingInfo { level: number; role?: string | null; numbered?: boolean | null }

/**
 * The number of each heading, in order, or null for those without one. A heading that is
 * not numbered leaves its subsections without numbers too; the next section of its level or
 * higher numbers on.
 */
export function numberHeadings(headings: HeadingInfo[], style: SectionNumbering): (string | null)[] {
  const counters = new Array<number>(NUMBERED_LEVELS).fill(0);
  let skipping = Infinity; // the level of an unnumbered heading whose subsections are skipped
  return headings.map((h) => {
    const level = Math.max(1, h.level);
    if (level <= skipping) skipping = Infinity;
    if (style === "none" || level > NUMBERED_LEVELS || level > skipping) return null;
    if (h.numbered === false || (level === 1 && UNNUMBERED_ROLES.has(h.role ?? ""))) { skipping = level; return null; }
    counters[level - 1]++;
    for (let i = level; i < NUMBERED_LEVELS; i++) counters[i] = 0;
    const n = counters.slice(0, level).join(".");
    return style === "1." ? `${n}.` : n;
  });
}

/** The numbers of the top-level headings of a document tree, by heading id. */
export function sectionNumbers(doc: PMNode, style: SectionNumbering): Map<string, string> {
  const hs = (doc.content ?? []).filter((n) => n.type === "heading" && !(n.marks ?? []).some((m) => m.type === "deletion"));
  const numbers = numberHeadings(hs.map((n) => ({ level: (n.attrs?.level as number) ?? 1, role: headingRole(n), numbered: n.attrs?.numbered as boolean | null })), style);
  const out = new Map<string, string>();
  hs.forEach((n, i) => { if (numbers[i] && n.attrs?.id) out.set(n.attrs.id as string, numbers[i]!); });
  return out;
}

/** The article's numbering and where it comes from: its own setting, its journal, or the default (none). */
export function sectionNumberingOf(project: Project, folder: string): { value: SectionNumbering; from: "article" | "journal" | "default" } {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  const own = art.article.sectionNumbering;
  if (own) return { value: own, from: "article" };
  const journal = art.article.journal ? project.journals.get(art.article.journal) : undefined;
  const says = journal?.manuscriptFormat?.sectionNumbering?.value;
  if (says) return { value: says, from: "journal" };
  return { value: "none", from: "default" };
}

/** Sets the article's numbering; null follows the journal again. */
export async function setSectionNumbering(project: Project, folder: string, value: SectionNumbering | null) {
  const art = project.articles.find((a) => a.folder === folder);
  if (!art) throw new Error(`no article ${folder}`);
  if (value !== null && !SECTION_NUMBERING.includes(value)) throw new Error(`unknown numbering '${value}' (none, 1. or 1)`);
  const { sectionNumbering: _, ...rest } = art.article;
  const article = value === null ? rest : { ...rest, sectionNumbering: value };
  await saveJson(project, `articles/${folder}/article.json`, article);
  art.article = article;
}

// ---------------------------------------------------------------- section types (record 0071)

/**
 * A heading's section type from its name, when it has none of its own: "Agradecimientos",
 * "Funding", "Conflicto de intereses"… The same rules read the headings of a Word document.
 */
const NAME_RULES: [RegExp, string][] = [
  [/^(introducci[oó]n|introduction|background)$/i, "introduction"],
  [/^(objetivos?|objectives?|aims?)$/i, "objective"],
  [/^((material(es)?|pacientes|sujetos)( y | o )?(m[eé]todos?)?|m[eé]todos?|metodolog[ií]a|methods?|materials? and methods|patients and methods)$/i, "methods"],
  [/^(presentaci[oó]n del caso|descripci[oó]n del caso|caso cl[ií]nico|case (presentation|report|description))$/i, "case-presentation"],
  [/^(resultados|results)$/i, "results"],
  [/^(discusi[oó]n|discussion)$/i, "discussion"],
  [/^(conclusi[oó]n(es)?|conclusions?)$/i, "conclusions"],
  [/^(discusi[oó]n y conclusi[oó]n(es)?|discussion and conclusions?)$/i, "discussion-conclusions"],
  [/^(bibliograf[ií]a|referencias( bibliogr[aá]ficas)?|references|bibliography)$/i, "references"],
  [/^(agradecimientos?|acknowledge?ments?)$/i, "acknowledgements"],
  [/^(financiaci[oó]n|fuentes? de financiaci[oó]n|funding( sources?)?)$/i, "funding"],
  [/^(conflictos? de inter[eé]s(es)?|conflicts? of interests?|declaraci[oó]n de conflictos.*|competing interests)$/i, "conflicts"],
  [/^(responsabilidades [eé]ticas|aspectos [eé]ticos|consideraciones [eé]ticas|ethics.*|ethical (considerations|approval))$/i, "ethics"],
  [/^(consentimiento( informado)?|(informed |patient )?consent( for publication)?)$/i, "consent"],
  [/^(disponibilidad de (los )?datos|data availability( statement)?|availability of data( and materials?)?)$/i, "data-availability"],
  [/^(registro( del (ensayo|estudio))?|(trial )?registration)$/i, "registration"],
  [/^(uso de (la )?(inteligencia artificial|ia)|declaration of generative ai.*|use of (ai|artificial intelligence).*)$/i, "ai-use"],
  [/^(contribuci[oó]n(es)? de (los )?autores|contribuciones|authors?'? contributions?|author contributions?|contributors)$/i, "contributions"],
  [/^(ap[eé]ndices?|anexos?|appendix|appendices)( [a-z0-9]+)?$/i, "appendix"],
];
export function roleFromName(text: string): string | null {
  const name = text.trim().replace(/\s+/g, " ").replace(/[.:]$/, "");
  return NAME_RULES.find(([re]) => re.test(name))?.[1] ?? null;
}

const textOf = (n: PMNode): string => (n.type === "text" ? ((n.marks ?? []).some((m) => m.type === "deletion") ? "" : n.text ?? "") : (n.content ?? []).map(textOf).join(""));
/** A heading's section type: its own, or the one its name says. */
export function headingRole(n: PMNode): string | null {
  return (n.attrs?.role as string | null) ?? roleFromName(textOf(n));
}

/** The usual order of the sections, for where a new one goes (section-order.ts). */
export { BODY_ORDER, CLOSING_ORDER, isClosingRole } from "./section-order.ts";
const RANK = new Map<string, number>([...BODY_ORDER, ...CLOSING_ORDER].map((r, i) => [r, i]));

/** A top-level heading of the document, by its index among the document's children. */
export interface TopHeading { index: number; level: number; role: string | null }

/**
 * Where a new level-1 section goes, as the index of the document child to insert before
 * (`childCount` for the end):
 * - a known type: before the first section that comes after it in the usual order;
 * - any other ("other", or no type): after the section of `after` (an index of a child,
 *   usually where the cursor is), before the closing sections when it would fall among them.
 */
export function placeSection(headings: TopHeading[], childCount: number, role: string | null, after?: number): number {
  const top = headings.filter((h) => h.level === 1);
  const rank = role ? RANK.get(role) : undefined;
  if (rank !== undefined) {
    const next = top.find((h) => h.role !== null && (RANK.get(h.role) ?? -1) > rank);
    return next ? next.index : childCount;
  }
  const firstClosing = top.find((h) => isClosingRole(h.role))?.index ?? childCount;
  if (after === undefined) return firstClosing;
  const next = top.find((h) => h.index > after)?.index ?? childCount;
  return Math.min(next, firstClosing);
}

/** The children a section spans: from its heading to the next heading of the same level or higher. */
export function sectionSpan(headings: TopHeading[], childCount: number, index: number): { from: number; to: number } {
  const h = headings.find((x) => x.index === index);
  if (!h) return { from: index, to: index + 1 };
  const next = headings.find((x) => x.index > index && x.level <= h.level);
  return { from: index, to: next ? next.index : childCount };
}
