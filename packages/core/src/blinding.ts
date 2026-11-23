// Checks of the blinded manuscript (R9, PLAN 5.8, record 0087). Removing the title page is
// not enough for a double-blind review: the text itself can say who wrote it. SciDesk knows
// who signs and where they work (people.json, authors.json), so it looks in the text that goes
// to the journal (manuscript, abstract, tables and figures) for:
// - the surname, e-mail or ORCID of someone who signs, or the name of a signing group;
// - the name of their institution, or a distinctive word of it, and their city;
// - self-citations in the first person ("nuestro estudio previo", "as we previously reported");
// - the ethics committee with an approval code;
// - sections that go on the title page under double-blind review (acknowledgements…);
// - figure files named after an author.
// Only warnings "worth checking": nothing is changed, and each one can be marked correct
// (a third-person self-citation, another hospital that is not the authors').
// Only when the journal's review is double-blind.
import type { JournalProfileFile, PMNode } from "@scidesk/formats";
import type { CheckWarning } from "./checks.ts";
import type { ArticleData, Project } from "./project.ts";
import { headingRole } from "./sections.ts";

/** Lower case without accents, one character for one (so that indices still point into the original). */
export function fold(text: string): string {
  let out = "";
  for (const c of text) {
    const f = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    // keep the length: astral characters are two units, and a few lower cases are longer
    out += f.length === c.length ? f : f.slice(0, c.length).padEnd(c.length, " ");
  }
  return out;
}

const WORD = /[\p{L}\p{N}]/u;
/** Every whole-word occurrence of `term` (already folded) in the folded text. */
function occurrences(folded: string, term: string): number[] {
  const out: number[] = [];
  if (!term) return out;
  for (let i = folded.indexOf(term); i >= 0; i = folded.indexOf(term, i + 1)) {
    if ((i > 0 && WORD.test(folded[i - 1])) || WORD.test(folded[i + term.length] ?? "")) continue;
    out.push(i);
  }
  return out;
}
const capital = (text: string, i: number) => text[i] !== text[i].toLowerCase();

/** Words that do not identify an institution by themselves. */
const GENERIC = new Set(fold(`
  hospital hospitales universitario universitaria universitari universidad university universite clinico clinica clinic clinics general
  centro center centre centres centers instituto institute institut fundacion foundation complejo complexo consorcio consortium servicio service
  department departamento seccion section unidad unit school escuela facultad faculty medicine medicina medical medico health salud sanitario
  sanitaria research investigacion investigaciones biomedica biomedical area comarcal regional provincial nacional national materno infantil
  children doctor dr dra san santa santo norte sur este oeste central north south east west nuestra senora sra hospitalario red network grupo group laboratorio laboratory division program
  programa de del la las los el y e the of and for in at a con por para en sciences ciencias science ciencia reumatologia rheumatology
  medicina interna internal
`).split(/\s+/).filter(Boolean));

/** What to look for of an institution: its name, the name without its generic opening, and its distinctive words. */
export function institutionTerms(institution: string): string[] {
  const words = institution.split(/[\s,()]+/).filter(Boolean);
  const terms = new Set<string>([institution]);
  let first = words.findIndex((w) => !GENERIC.has(fold(w)));
  // "Hospital Universitario La Paz": the article goes with the name
  if (first > 0 && /^(?:la|el|las|los|les|le|the)$/i.test(words[first - 1]) && capital(words[first - 1], 0)) first--;
  if (first > 0) {
    const core = words.slice(first).join(" ");
    if (core.split(" ").length > 1 || core.length >= 5) terms.add(core);
  }
  for (const w of words) {
    const clean = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    // a distinctive word: not generic, long enough, a name (capital) or an acronym
    if (clean.length >= 5 && !GENERIC.has(fold(clean)) && capital(clean, 0)) terms.add(clean);
    else if (clean.length >= 3 && /^[\p{Lu}\p{N}]+$/u.test(clean) && /\p{Lu}/u.test(clean) && !GENERIC.has(fold(clean))) terms.add(clean);
  }
  return [...terms];
}

// Self-citations in the first person, on folded text (lower case, no accents).
const SELF_CITATION: RegExp[] = [
  // "nuestro estudio previo", "nuestra experiencia previa", "nuestros resultados publicados"
  /\bnuestr[oa]s? (?:\p{L}+ )?(?:estudios?|trabajos?|articulos?|series?|publicacion(?:es)?|analisis|investigacion(?:es)?|resultados|datos|experiencia|cohortes?|ensayos?|revision(?:es)?|registros?) (?:\p{L}+ )?(?:previ[oa]s?|anterior(?:es)?|precedentes?|publicad[oa]s?)\b/u,
  // "un estudio previo de nuestro grupo", "trabajos anteriores de nuestra unidad"
  /\b(?:estudios?|trabajos?|articulos?|publicacion(?:es)?|series?|analisis) (?:previ[oa]s?|anterior(?:es)?) (?:de|del) nuestr[oa] (?:grupo|equipo|servicio|centro|hospital|unidad|departamento|laboratorio)\b/u,
  // "nuestro grupo ha descrito", "nuestro equipo publicó"
  /\bnuestro (?:grupo|equipo|laboratorio) (?:ya |previamente |anteriormente )?(?:(?:ha|habia) (?:descrito|publicado|demostrado|mostrado|comunicado|informado|observado|desarrollado|validado|propuesto)|publico|describio|demostro|mostro|comunico|observo|encontro|informo|desarrollo|valido)\b/u,
  // "como describimos", "como ya hemos publicado" (not "como describimos en los métodos")
  /\bcomo (?:ya |previamente |anteriormente )?(?:describimos|publicamos|demostramos|mostramos|comunicamos|informamos|senalamos|propusimos|(?:hemos|habiamos) (?:descrito|publicado|demostrado|mostrado|comunicado|informado|propuesto))\b(?! (?:(?:en|a) )?(?:(?:el|la|los|las) )?(?:metodos|resultados|apartado|seccion|tabla|figura|anexo|material|introduccion|mas (?:arriba|abajo)|arriba|abajo))/u,
  // "hemos descrito previamente", "habíamos publicado en un estudio"
  /\b(?:hemos|habiamos) (?:descrito|publicado|demostrado|mostrado|comunicado|informado|propuesto|validado|desarrollado) (?:previamente|anteriormente|antes|con anterioridad|en (?:un|una|otro|otra) (?:estudio|trabajo|articulo|publicacion))\b/u,
  // "previamente hemos", "anteriormente publicamos"
  /\b(?:previamente|anteriormente|con anterioridad),? (?:hemos|habiamos|describimos|publicamos|demostramos|mostramos|comunicamos)\b/u,
  // "our previous study", "my earlier work"
  /\b(?:our|my) (?:own )?(?:previous|prior|earlier|former|preliminary|published|recent) (?:\p{L}+ )?(?:study|studies|work|works|paper|papers|report|reports|article|articles|publication|publications|research|trial|trials|analysis|analyses|series|cohort|data|findings|results|review|experience)\b/u,
  // "we previously reported", "we have recently shown"
  /\bwe (?:have |had )?(?:previously|earlier|already|recently) (?:described|reported|published|showed|shown|demonstrated|proposed|validated|developed)\b/u,
  // "as we have described before", "as we reported elsewhere"
  /\b(?:as|which) we (?:have |had )?(?:described|reported|published|shown|showed|demonstrated) (?:previously|before|elsewhere|earlier)\b/u,
  // "our group has reported"
  /\bour (?:group|team|research group|laboratory|lab) (?:has |had )?(?:previously |recently |already )?(?:described|reported|published|showed|shown|demonstrated|developed|validated)\b/u,
];

/** The first-person self-citations of a text, with where they start. */
export function selfCitations(text: string): { index: number; length: number }[] {
  const folded = fold(text);
  const out: { index: number; length: number }[] = [];
  for (const re of SELF_CITATION) for (const m of folded.matchAll(new RegExp(re.source, "gu"))) out.push({ index: m.index!, length: m[0].length });
  // overlapping or close together ("como describimos en nuestro estudio previo"): one
  const merged: { index: number; length: number }[] = [];
  for (const m of out.sort((a, b) => a.index - b.index)) {
    const last = merged.at(-1);
    if (last && m.index <= last.index + last.length + 40) last.length = Math.max(last.length, m.index + m.length - last.index);
    else merged.push({ ...m });
  }
  return merged;
}

const COMMITTEE = /\b(?:comite (?:de etica|etico)|comision de etica|cei|ceic|ceim|ceis|ethics committee|ethical committee|ethics board|institutional review board|irb|research ethics board|reb)\b/u;
const CODE_AFTER_WORD = /\b(?:codigo|code|numero|number|n\s?º|n\.?\s?º|no\.|num\.|ref\.?|referencia|reference|protocolo|protocol|acta|approval|aprobacion|dictamen)\s*(?:de aprobacion\s*|n\s?º\s*|no\.\s*|number\s*|numero\s*)?[:#]?\s*[a-z0-9][\w/.-]*\d/u;
const CODE_TOKEN = /(?<![\p{L}\p{N}])(?:[A-Z][A-Za-z]*[-/ ]?\d[\w/-]*|\d{1,5}\/\d{1,5})(?![\p{L}\p{N}/])/gu;
const NOT_A_CODE = /^(?:COVID|SARS|IL|CD|HLA|TNF|HbA|DAS|SF|EQ|ACR|EULAR|ICD|CIE|IC|CI|OR|HR|RR)\b/;

/** Sentences of a text that name an ethics committee with an approval code. */
export function ethicsWithCode(text: string): { index: number; length: number }[] {
  const out: { index: number; length: number }[] = [];
  // sentences end before a capital letter: "no. 2020-118" and "nº. 45" do not end one
  let start = 0;
  const sentences: { index: number; text: string }[] = [];
  for (const m of text.matchAll(/(?<=[.!?;])\s+(?=[\p{Lu}¿¡«"“(])/gu)) { sentences.push({ index: start, text: text.slice(start, m.index) }); start = m.index! + m[0].length; }
  sentences.push({ index: start, text: text.slice(start) });
  for (const s of sentences) {
    const sentence = s.text;
    const folded = fold(sentence);
    if (!COMMITTEE.test(folded)) continue;
    const coded = CODE_AFTER_WORD.test(folded) || [...sentence.matchAll(CODE_TOKEN)].some((m) => !NOT_A_CODE.test(m[0]) && (m[0].match(/\d/g) ?? []).length >= 2);
    if (coded) out.push({ index: s.index, length: sentence.length });
  }
  return out;
}

/** A piece of the text around a match, for the message, with "…" where it is cut. */
function around(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 30);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

interface Term { term: string; folded: string; capital: boolean }
const term = (t: string, needsCapital: boolean): Term => ({ term: t, folded: fold(t.trim()), capital: needsCapital });

/** Sections that go on the title page under double-blind review, by their type. */
function titlePageRoles(journal: JournalProfileFile): Set<string> {
  const roles = new Set(["acknowledgements", "contributions"]);
  for (const d of journal.declarations ?? []) if (d.placement?.value === "title-page") roles.add(d.kind);
  return roles;
}

/**
 * The warnings of the blinded manuscript, for `checkArticle`. `documents` is the article's
 * documents with what is on screen, `tree` the composite body, `blockText` and `figures` as
 * the checks compute them.
 */
export function blindingWarnings(project: Project, art: ArticleData, documents: ArticleData["documents"], tree: PMNode,
  blockText: (n: PMNode) => string, figures: Map<string, PMNode>, figureNo: Map<string, number>): Omit<CheckWarning, "ignored">[] {
  const journal = art.article.journal ? project.journals.get(art.article.journal) : undefined;
  if (journal?.review?.blind?.value !== "double") return [];
  const out: Omit<CheckWarning, "ignored">[] = [];

  // ---------------------------------------------------------------- what identifies the authors
  const people = new Map(project.people.people.map((p) => [p.id, p]));
  const affiliations = new Map(project.people.affiliations.map((a) => [a.id, a]));
  const byPerson: { id: string; name: string; terms: Term[] }[] = [];
  const affIds = new Set<string>();
  for (const a of art.authors.authors) {
    const p = people.get(a.person);
    if (!p) continue;
    const terms: Term[] = [];
    if (p.kind === "person") {
      terms.push(term(p.family, true));
      // a double surname written alone: its first part, if it is not a particle
      const parts = p.family.split(/[\s-]+/).filter((w) => !/^(?:de|del|la|las|los|y|e|i|van|von|der|da|do|dos|das|di|le|du)$/i.test(w));
      if (parts.length > 1 && parts[0].length >= 4) terms.push(term(parts[0], true));
      if (p.citationName) terms.push(term(p.citationName, true));
      if (p.orcid) terms.push(term(p.orcid, false));
    } else {
      terms.push(term(p.name, false));
    }
    if (p.email) terms.push(term(p.email, false));
    byPerson.push({ id: p.id, name: p.kind === "person" ? `${p.given} ${p.family}` : p.name, terms });
    for (const af of a.affiliations.length ? a.affiliations : p.affiliations) affIds.add(af);
  }
  const byInstitution = [...affIds].map((id) => affiliations.get(id)).filter((a) => !!a).map((a) => ({
    id: a.id, name: a.institution,
    terms: institutionTerms(a.institution).map((t) => term(t, t !== a.institution)),
    city: a.city?.trim() ? term(a.city, true) : null,
  }));
  // the same city or word of two affiliations: one warning
  const seenCity = new Set<string>();
  for (const a of byInstitution) if (a.city) { if (seenCity.has(a.city.folded)) a.city = null; else seenCity.add(a.city.folded); }

  const find = (text: string, folded: string, terms: Term[]) => {
    for (const t of terms) for (const i of occurrences(folded, t.folded)) if (!t.capital || capital(text, i)) return { term: text.slice(i, i + t.folded.length), index: i, length: t.folded.length };
    return null;
  };

  // ---------------------------------------------------------------- the text that goes to the journal
  const TEXT = new Set(["paragraph", "heading", "title", "tableCaption", "tableNote", "figureCaption", "figureNote", "keyword", "tableCell", "tableHeader"]);
  for (const [path, file] of documents) {
    if (!/^(?:manuscript\/.*\.scidoc|tables\/.*\.scitable|figures\/.*\.scifigure)$/.test(path)) continue;
    const visit = (n: PMNode, block: string | null) => {
      if ((n.marks ?? []).some((m) => m.type === "deletion")) return;
      const id = typeof n.attrs?.id === "string" ? (n.attrs.id as string) : block;
      if (TEXT.has(n.type) && !(n.content ?? []).some((c) => TEXT.has(c.type) || c.type === "paragraph")) {
        const text = blockText(n);
        if (!text.trim()) return;
        const folded = fold(text);
        const where = id ? { path, block: id } : undefined;
        const key = `${path}:${id}`;
        for (const p of byPerson) {
          const hit = find(text, folded, p.terms);
          if (hit) out.push({ id: `blind-author:${key}:${p.id}`, code: "blind-author", level: "review", params: { term: hit.term, name: p.name, text: around(text, hit.index, hit.length) }, where });
        }
        // the longest name first; a word two institutions share is said once
        const hits = byInstitution.map((a) => ({ a, hit: find(text, folded, a.terms) })).filter((h) => !!h.hit).sort((x, y) => y.hit!.length - x.hit!.length);
        const taken: { index: number; length: number }[] = [];
        for (const { a, hit } of hits) {
          if (taken.some((t) => hit!.index < t.index + t.length && t.index < hit!.index + hit!.length)) continue;
          taken.push(hit!);
          out.push({ id: `blind-institution:${key}:${a.id}`, code: "blind-institution", level: "review", params: { term: hit!.term, institution: a.name, text: around(text, hit!.index, hit!.length) }, where });
        }
        for (const a of byInstitution) {
          const city = a.city && find(text, folded, [a.city]);
          if (city && !taken.some((t) => city.index < t.index + t.length && t.index < city.index + city.length)) out.push({ id: `blind-city:${key}:${a.city!.folded}`, code: "blind-city", level: "review", params: { term: city.term, institution: a.name, text: around(text, city.index, city.length) }, where });
        }
        selfCitations(text).forEach((m, i) => out.push({ id: `blind-self-citation:${key}:${i}`, code: "blind-self-citation", level: "review", params: { text: around(text, m.index, m.length) }, where }));
        ethicsWithCode(text).forEach((m, i) => out.push({ id: `blind-ethics:${key}:${i}`, code: "blind-ethics", level: "review", params: { text: text.slice(m.index, m.index + m.length).replace(/\s+/g, " ").trim().slice(0, 160) }, where }));
        return;
      }
      n.content?.forEach((c) => visit(c, id));
    };
    visit(file.doc as PMNode, null);
  }

  // ---------------------------------------------------------------- sections that go on the title page
  const onTitlePage = titlePageRoles(journal);
  for (const n of tree.content ?? []) {
    if (n.type !== "heading" || ((n.attrs!.level as number) ?? 1) !== 1 || (n.marks ?? []).some((m) => m.type === "deletion")) continue;
    const role = headingRole(n);
    if (role && onTitlePage.has(role)) out.push({ id: `blind-section:${n.attrs!.id}`, code: "blind-section", level: "review", params: { heading: blockText(n).trim(), role }, where: { path: "manuscript/article.scidoc", block: n.attrs!.id as string } });
  }

  // ---------------------------------------------------------------- figure files named after an author
  for (const [id, part] of figures) {
    const image = String(part.attrs?.image ?? "");
    const name = image.replace(/^.*\//, "");
    const folded = fold(name);
    for (const p of byPerson) {
      const hit = p.terms.map((t) => t.folded).find((t) => t.length >= 3 && folded.replace(/[_.-]+/g, " ").split(" ").some((w) => w === t || w === t.replace(/[\s-]+/g, "")));
      if (hit) { out.push({ id: `blind-file-name:${id}:${p.id}`, code: "blind-file-name", level: "review", params: { number: figureNo.get(id) ?? "?", file: name, name: p.name }, where: { path: "manuscript/article.scidoc", block: id } }); break; }
    }
  }
  return out;
}
