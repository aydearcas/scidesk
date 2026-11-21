// Importing references into the project's own library (record 0007, PLAN 5.6): RIS, BibTeX
// and CSL-JSON through citation-js (MIT), always with the format given so that it never
// guesses a URL and goes to the network (PLAN 6.6); NBIB (PubMed's MEDLINE format) with a
// reader of our own (PLAN 6.1). Everything is normalised to SciDesk's CSL-JSON (record
// 0027): known variables only, dates as numbers, the journal abbreviation in
// container-title-short; what does not fit is kept in `source.unmapped`, never dropped in
// silence. Duplicates (same DOI or PMID, or same first author, year and title) are not
// added. A copy of each imported file goes to references/imports/.
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-ris";
import "@citation-js/plugin-bibtex";
import {
  CSL_DATE_VARIABLES, CSL_NAME_VARIABLES, CSL_STANDARD_VARIABLES, CSL_TYPES, newId, validate,
  type LibraryFile,
} from "@scidesk/formats";
import { now, saveJson, type Project } from "./project.ts";

export type ReferenceFormat = "ris" | "nbib" | "bibtex" | "csl-json";
type Csl = Record<string, unknown> & { type: string };
export interface ParsedReference { csl: Csl; unmapped: Record<string, string>; key?: string }

const STANDARD = new Set<string>(CSL_STANDARD_VARIABLES);
const NAMES = new Set<string>(CSL_NAME_VARIABLES);
const DATES = new Set<string>(CSL_DATE_VARIABLES);
const TYPES = new Set<string>(CSL_TYPES);
const NAME_KEYS = new Set(["family", "given", "dropping-particle", "non-dropping-particle", "suffix", "comma-suffix", "static-ordering", "literal", "parse-names"]);

/** Any CSL-like object -> SciDesk's CSL-JSON, plus what did not fit. */
export function normalizeCsl(input: Record<string, unknown>): { csl: Csl; unmapped: Record<string, string> } {
  const csl: Csl = { type: TYPES.has(String(input.type)) ? String(input.type) : "article-journal" };
  const unmapped: Record<string, string> = {};
  if (input.type && !TYPES.has(String(input.type))) unmapped.type = String(input.type);
  for (const [k0, v] of Object.entries(input)) {
    if (k0 === "type" || k0 === "id" || k0.startsWith("_") || v === undefined || v === null || v === "") continue;
    const k = k0 === "journalAbbreviation" || k0 === "shortTitle" ? (k0 === "shortTitle" ? "title-short" : "container-title-short") : k0;
    if (NAMES.has(k) && Array.isArray(v)) {
      csl[k] = v.map((n: Record<string, unknown>) => Object.fromEntries(Object.entries(n).filter(([nk, nv]) => NAME_KEYS.has(nk) && nv !== undefined && nv !== "")));
    } else if (DATES.has(k) && typeof v === "object") {
      const d = v as { "date-parts"?: unknown[][]; raw?: string; literal?: string; season?: unknown; circa?: unknown };
      const out: Record<string, unknown> = {};
      if (Array.isArray(d["date-parts"])) {
        const parts = d["date-parts"].map((p) => (p as unknown[]).map((x) => Number(x)).filter((x) => Number.isInteger(x))).filter((p) => p.length);
        if (parts.length) out["date-parts"] = parts.slice(0, 2).map((p) => p.slice(0, 3));
      }
      for (const extra of ["raw", "literal", "season", "circa"] as const) if (d[extra] !== undefined) out[extra] = d[extra];
      if (Object.keys(out).length) csl[k] = out;
    } else if (STANDARD.has(k) && (typeof v === "string" || typeof v === "number")) {
      if (k === "container-title-short" && csl[k]) continue;
      csl[k] = typeof v === "string" ? v.trim() : v;
    } else if (k === "categories" && Array.isArray(v)) {
      csl.categories = v.map(String);
    } else {
      unmapped[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  if (typeof csl.DOI === "string") csl.DOI = csl.DOI.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  return { csl, unmapped };
}

// ------------------------------------------------------------------ NBIB (MEDLINE)

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const PT_TYPES: [RegExp, string][] = [[/^Book$/i, "book"], [/Chapter/i, "chapter"], [/Preprint/i, "article"], [/Dataset/i, "dataset"]];

/** PubMed's MEDLINE/NBIB format: "TAG - value" lines, values continued on indented lines. */
export function parseNbib(text: string): ParsedReference[] {
  const records: [string, string][][] = [];
  let cur: [string, string][] = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    if (!line.trim()) { if (cur.length) { records.push(cur); cur = []; } continue; }
    const m = /^([A-Z]{2,4})\s*-\s(.*)$/.exec(line);
    if (m) cur.push([m[1], m[2].trim()]);
    else if (/^\s{2,}/.test(line) && cur.length) cur[cur.length - 1][1] += " " + line.trim();
  }
  if (cur.length) records.push(cur);
  return records.filter((r) => r.some(([t]) => t === "PMID" || t === "TI")).map((r) => {
    const all = (tag: string) => r.filter(([t]) => t === tag).map(([, v]) => v);
    const one = (tag: string) => all(tag)[0];
    const unmapped: Record<string, string> = {};
    const fau = all("FAU");
    const author = (fau.length ? fau : all("AU")).map((a) => {
      if (fau.length) { const [family, given] = a.split(/,\s*/); return given ? { family, given } : { literal: a }; }
      const m = /^(.+?)\s+([A-Z]{1,4})$/.exec(a);
      return m ? { family: m[1], given: m[2].split("").join(" ") } : { literal: a };
    });
    for (const cn of all("CN")) author.push({ literal: cn });
    const dp = one("DP") ?? "";
    const dm = /^(\d{4})(?:\s+([A-Za-z]{3}))?(?:\s+(\d{1,2}))?/.exec(dp);
    const issued = dm ? { "date-parts": [[Number(dm[1]), ...(dm[2] && MONTHS[dm[2].toLowerCase()] ? [MONTHS[dm[2].toLowerCase()]] : []), ...(dm[2] && dm[3] ? [Number(dm[3])] : [])]] } : undefined;
    const ids = [...all("AID"), ...all("LID")];
    const doi = ids.find((x) => /\[doi\]$/.test(x))?.replace(/\s*\[doi\]$/, "");
    const pt = all("PT");
    const type = PT_TYPES.find(([re]) => pt.some((p) => re.test(p)))?.[1] ?? "article-journal";
    const page = one("PG");
    const csl: Csl = {
      type,
      ...(one("TI") ? { title: one("TI")!.replace(/\.$/, "") } : {}),
      ...(author.length ? { author } : {}),
      ...(one("JT") ? { "container-title": one("JT") } : {}),
      ...(one("TA") ? { "container-title-short": one("TA") } : {}),
      ...(issued ? { issued } : {}),
      ...(one("VI") ? { volume: one("VI") } : {}),
      ...(one("IP") ? { issue: one("IP") } : {}),
      ...(page ? { page } : {}),
      ...(doi ? { DOI: doi } : {}),
      ...(one("PMID") ? { PMID: one("PMID") } : {}),
      ...(one("PMC") ? { PMCID: one("PMC") } : {}),
      ...(one("AB") ? { abstract: one("AB") } : {}),
      ...(one("LA") ? { language: one("LA") } : {}),
      ...(one("IS") ? { ISSN: one("IS")!.replace(/\s*\(.*\)$/, "") } : {}),
    };
    if (pt.length) unmapped.PT = pt.join("; ");
    if (/Retracted Publication/i.test(unmapped.PT ?? "")) unmapped.warning = "retracted publication";
    return { csl, unmapped, key: one("PMID") ? `PMID:${one("PMID")}` : undefined };
  });
}

// ------------------------------------------------------------------ dispatch

export function detectFormat(fileName: string, text: string): ReferenceFormat | null {
  const ext = /\.([a-z]+)$/i.exec(fileName)?.[1]?.toLowerCase();
  if (ext === "ris") return "ris";
  if (ext === "nbib" || ext === "medline") return "nbib";
  if (ext === "bib" || ext === "bibtex") return "bibtex";
  if (ext === "json") return "csl-json";
  const t = text.trimStart();
  if (/^TY\s{2}-/m.test(t)) return "ris";
  if (/^PMID-\s/m.test(t)) return "nbib";
  if (/^@\w+\s*\{/.test(t)) return "bibtex";
  if (/^[[{]/.test(t)) return "csl-json";
  return null;
}

const FORCE: Record<Exclude<ReferenceFormat, "nbib">, string> = { ris: "@ris/file", bibtex: "@biblatex/text", "csl-json": "@csl/list+object" };

export function parseReferences(text: string, format: ReferenceFormat): ParsedReference[] {
  if (format === "nbib") return parseNbib(text);
  let input: unknown = text;
  if (format === "csl-json") {
    const v = JSON.parse(text);
    input = Array.isArray(v) ? v : [v];
  }
  // generateGraph: false keeps citation-js from attaching its parse graph (_graph)
  const data = new Cite(input, { forceType: FORCE[format], generateGraph: false } as never).data as Record<string, unknown>[];
  return data.map((item) => {
    const { csl, unmapped } = normalizeCsl(item);
    const key = typeof item["citation-key"] === "string" ? String(item["citation-key"]) : csl.DOI ? `DOI:${csl.DOI}` : csl.PMID ? `PMID:${csl.PMID}` : undefined;
    return { csl, unmapped, key };
  });
}

// ------------------------------------------------------------------ duplicates

const fold = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Keys under which two references are the same work. */
export function identityKeys(csl: Record<string, unknown>): string[] {
  const keys: string[] = [];
  if (csl.DOI) keys.push(`doi:${String(csl.DOI).toLowerCase()}`);
  if (csl.PMID) keys.push(`pmid:${csl.PMID}`);
  const first = (csl.author as { family?: string; literal?: string }[] | undefined)?.[0];
  const year = (csl.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]?.[0];
  if (csl.title && year) keys.push(`t:${fold(first?.family ?? first?.literal)}|${year}|${fold(csl.title).slice(0, 80)}`);
  return keys;
}

export interface ImportReport {
  format: ReferenceFormat;
  added: { id: string; title: string }[];
  duplicates: { title: string; existing: string }[];
  /** Fields that were kept aside, by reference title. */
  unmapped: { title: string; fields: string[] }[];
  importedCopy: string;
}

/** Imports a file of references into the project's own library. */
export async function importReferences(project: Project, file: { name: string; text: string }): Promise<ImportReport> {
  if (project.manifest.library.mode !== "own") throw new Error("this project's library is Zotero: add references in Zotero");
  const format = detectFormat(file.name, file.text);
  if (!format) throw new Error(`${file.name}: not a RIS, NBIB, BibTeX or CSL-JSON file`);
  const parsed = parseReferences(file.text, format);
  if (!parsed.length) throw new Error(`${file.name}: no references found`);
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").replace(/^\.+/, "") || `import.${format}`;
  let copyPath = `references/imports/${safeName}`;
  if ((await project.fs.readText(copyPath)) !== null) copyPath = copyPath.replace(/(\.\w+)?$/, `-${now().replace(/[-:TZ]/g, "").slice(0, 14)}$1`);
  const library: LibraryFile = structuredClone(project.library);
  const seen = new Map<string, string>();
  for (const r of library.references) for (const k of identityKeys(r.csl)) seen.set(k, r.id);
  const report: ImportReport = { format, added: [], duplicates: [], unmapped: [], importedCopy: copyPath };
  const date = now();
  for (const p of parsed) {
    const title = String(p.csl.title ?? "(sin título)");
    const dup = identityKeys(p.csl).map((k) => seen.get(k)).find(Boolean);
    if (dup) { report.duplicates.push({ title, existing: dup }); continue; }
    const id = newId("r");
    const kind = format === "csl-json" ? "csl-json" : format;
    const entry = {
      id, csl: p.csl as never, added: date,
      source: { kind: kind as "ris", file: copyPath, ...(p.key ? { key: p.key } : {}), date, ...(Object.keys(p.unmapped).length ? { unmapped: p.unmapped } : {}) },
    };
    const issues = validate("library", { schemaVersion: 1, references: [entry] });
    if (issues.length) { report.unmapped.push({ title, fields: [`not imported: ${issues[0].path} ${issues[0].message}`] }); continue; }
    library.references.push(entry);
    for (const k of identityKeys(p.csl)) seen.set(k, id);
    report.added.push({ id, title });
    if (Object.keys(p.unmapped).length) report.unmapped.push({ title, fields: Object.keys(p.unmapped) });
  }
  await project.fs.write(copyPath, file.text);
  await saveJson(project, "references/library.json", library);
  project.library = library;
  return report;
}
