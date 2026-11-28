// The citations of a Word document made with EndNote, Zotero or Mendeley Desktop, read from
// the document itself, without the reference manager (prototype 10, record 0028; record 0104):
//   - EndNote ("Cite While You Write"): each citation is a field ADDIN EN.CITE with an XML
//     <EndNote><Cite>…<record>…</record></Cite>…</EndNote>; when the XML is long it is in the
//     nested field ADDIN EN.CITE.DATA, as base64 in the w:fldData of its first character. The
//     identity of a reference is its database id and record number.
//   - Zotero (ADDIN ZOTERO_ITEM CSL_CITATION {json}) and Mendeley Desktop (ADDIN CSL_CITATION
//     {json}): the CSL citation JSON, with each item's data and URI.
//   - The bibliography: a field ADDIN EN.REFLIST or ADDIN ZOTERO_BIBL, one paragraph per entry.
import { DOMParser, type Element, type Node } from "@xmldom/xmldom";

export type CitationManager = "endnote" | "zotero" | "mendeley";
type Csl = Record<string, unknown> & { type: string };

/** One reference cited by a citation field, with what the citation adds to it. */
export interface FieldCite {
  /** Identity in the source: EndNote "<db-id>:<record>", or the item's URI. */
  key: string;
  /** EndNote: the record as read; Zotero and Mendeley: the CSL item. */
  record: Record<string, unknown> | null;
  locator?: string;
  label?: string;
  prefix?: string;
  suffix?: string;
  suppressAuthor?: boolean;
}
export interface FieldCitation { manager: CitationManager; cites: FieldCite[]; citationID?: string }

/** What kind of field an instruction is. */
export function fieldKind(instr: string): "endnote" | "endnote-data" | "zotero" | "mendeley" | "bibliography" | "other" {
  const s = instr.trim();
  if (/^ADDIN EN\.CITE\.DATA/.test(s)) return "endnote-data";
  if (/^ADDIN EN\.CITE/.test(s)) return "endnote";
  if (/^ADDIN ZOTERO_ITEM/.test(s)) return "zotero";
  if (/^ADDIN CSL_CITATION/.test(s)) return "mendeley";
  if (/^ADDIN (EN\.REFLIST|ZOTERO_BIBL)/.test(s)) return "bibliography";
  return "other";
}

const elements = (n: Node): Element[] => {
  const out: Element[] = [];
  for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) out.push(c as Element);
  return out;
};
const base64 = (s: string) => {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

/**
 * A citation field read: EndNote's XML (in its code or, given `data`, the base64 of its
 * EN.CITE.DATA), or Zotero's and Mendeley's JSON. Null when it carries no reference.
 */
export function readCitationField(instr: string, data: string): FieldCitation | null {
  const kind = fieldKind(instr);
  if (kind === "endnote") {
    let xml = instr.trim().replace(/^ADDIN EN\.CITE\s*/, "").trim();
    if (!xml.startsWith("<") && data) { try { xml = base64(data); } catch { xml = ""; } }
    const cites = xml.startsWith("<") ? endNoteCites(xml) : [];
    return cites.length ? { manager: "endnote", cites } : null;
  }
  if (kind === "zotero" || kind === "mendeley") {
    let json: { citationID?: string; citationItems?: Record<string, unknown>[] } | null = null;
    try { json = JSON.parse(instr.trim().replace(/^ADDIN (ZOTERO_ITEM )?CSL_CITATION\s*/, "")); } catch { return null; }
    const cites = (json?.citationItems ?? []).flatMap((ci): FieldCite[] => {
      const item = ci.itemData as Record<string, unknown> | undefined;
      if (!item) return [];
      const uris = (ci.uris ?? ci.uri) as string[] | string | undefined;
      const key = (Array.isArray(uris) ? uris[0] : uris) ?? String(ci.id ?? item.id ?? "");
      return [{
        key, record: item,
        ...(ci.locator ? { locator: String(ci.locator) } : {}), ...(ci.label ? { label: String(ci.label) } : {}),
        ...(ci.prefix ? { prefix: String(ci.prefix) } : {}), ...(ci.suffix ? { suffix: String(ci.suffix) } : {}),
        ...(ci["suppress-author"] ? { suppressAuthor: true } : {}),
      }];
    });
    return cites.length ? { manager: kind, cites, ...(json?.citationID ? { citationID: String(json.citationID) } : {}) } : null;
  }
  return null;
}

// <EndNote><Cite [ExcludeAuth]><Author/><Year/><RecNum/><Prefix/><Suffix/><Pages/><DisplayText/><record>…</record></Cite>…</EndNote>
function endNoteCites(xml: string): FieldCite[] {
  if (/<!DOCTYPE/i.test(xml)) return [];
  const dom = new DOMParser({ onError: () => {} }).parseFromString(xml, "text/xml");
  const out: FieldCite[] = [];
  for (const cite of [...dom.getElementsByTagName("Cite")]) {
    const get = (tag: string) => elements(cite).find((e) => e.nodeName === tag)?.textContent?.trim() ?? "";
    const record = elements(cite).find((e) => e.nodeName === "record");
    if (!record) continue;
    const fk = record.getElementsByTagName("key")[0];
    const key = fk ? `${fk.getAttribute("db-id")}:${fk.textContent?.trim()}` : `rec:${get("RecNum")}`;
    out.push({
      key, record: recordToObject(record),
      ...(get("Pages") ? { locator: get("Pages"), label: "page" } : {}),
      ...(get("Prefix") ? { prefix: get("Prefix").replace(/`/g, "") } : {}),
      ...(get("Suffix") ? { suffix: get("Suffix").replace(/`/g, "") } : {}),
      ...(cite.getAttribute("ExcludeAuth") === "1" ? { suppressAuthor: true } : {}),
    });
  }
  return out;
}

/** An EndNote XML <record> as element paths to text (lists for repeated authors, keywords and URLs). */
function recordToObject(rec: Element): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  const text = (e: Element) => (e.textContent ?? "").replace(/\s+/g, " ").trim();
  const add = (k: string, v: string) => { if (!v) return; if (o[k] === undefined) o[k] = v; else o[k] = ([] as unknown[]).concat(o[k], v); };
  for (const e of elements(rec)) {
    const n = e.nodeName;
    if (n === "ref-type") { o["ref-type"] = e.getAttribute("name"); continue; }
    if (n === "foreign-keys" || n === "database" || n === "source-app") continue;
    if (["contributors", "titles", "periodical", "alt-periodical", "dates", "urls", "keywords"].includes(n)) {
      for (const g of elements(e)) {
        const leaves = elements(g).filter((x) => x.nodeName !== "style");
        if (leaves.length) for (const l of leaves) {
          if (l.nodeName === "date" || l.nodeName === "url" || l.nodeName === "keyword" || /author$/.test(l.nodeName)) add(`${n}/${g.nodeName}`, text(l));
          else for (const ll of elements(l)) add(`${n}/${g.nodeName}/${l.nodeName}`, text(ll));
        } else add(`${n}/${g.nodeName}`, text(g));
      }
      continue;
    }
    add(n, text(e));
  }
  return o;
}

const TYPES: Record<string, string> = {
  "Journal Article": "article-journal", "Electronic Article": "article-journal", "Book": "book", "Edited Book": "book",
  "Book Section": "chapter", "Electronic Book Section": "chapter", "Web Page": "webpage", "Report": "report",
  "Government Document": "report", "Conference Proceedings": "paper-conference", "Conference Paper": "paper-conference",
  "Thesis": "thesis", "Magazine Article": "article-magazine", "Newspaper Article": "article-newspaper", "Dataset": "dataset",
  "Online Database": "dataset", "Patent": "patent", "Statute": "legislation", "Unpublished Work": "manuscript", "Generic": "document",
};
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const list = (v: unknown): string[] => (v == null ? [] : ([] as unknown[]).concat(v).map(String));

/** "Last, First M." as a CSL name; a name with no comma (or ending in one: an organisation), literal. */
export function parseName(s: string): Record<string, string> {
  const t = s.trim();
  if (!t.includes(",") || /,\s*$/.test(t)) return { literal: t.replace(/,\s*$/, "") };
  const [family, ...rest] = t.split(",");
  const given = rest.join(",").trim();
  const words = given.split(/\s+/);
  const suffix = words.length > 1 && /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(words.at(-1)!) ? words.at(-1)! : null;
  return { family: family.trim(), given: suffix ? words.slice(0, -1).join(" ") : given, ...(suffix ? { suffix } : {}) };
}

/** An EndNote record as CSL-JSON, and what it has that CSL does not take. */
export function endnoteToCsl(rec: Record<string, unknown>): { csl: Csl; unmapped: Record<string, string> } {
  const r: Record<string, unknown> = { ...rec };
  const take = (k: string) => { const v = r[k]; delete r[k]; return v; };
  const first = (v: unknown) => list(v)[0];
  const type = TYPES[String(take("ref-type"))] ?? "document";
  const csl: Record<string, unknown> = { type };
  const authors = list(take("contributors/authors"));
  const editors = list(take("contributors/secondary-authors"));
  if (authors.length) csl.author = authors.map(parseName);
  if (editors.length) csl[type === "chapter" || type === "paper-conference" || type === "book" ? "editor" : "container-author"] = editors.map(parseName);
  csl.title = first(take("titles/title"));
  const secondary = first(take("titles/secondary-title"));
  const full = first(take("periodical/full-title"));
  const abbr = first(take("periodical/abbr-1")) ?? first(take("alt-periodical/abbr-1"));
  const alt = first(take("titles/alt-title"));
  csl["container-title"] = full ?? secondary;
  if (abbr) csl["container-title-short"] = abbr;
  else if (alt && type === "article-journal") csl["container-title-short"] = alt;
  const year = first(take("dates/year"));
  const pub = first(take("dates/pub-dates"));
  if (year && /\d{4}/.test(year)) {
    const parts = [Number(year.match(/\d{4}/)![0])];
    const m = pub ? /([A-Za-z]{3})[a-z]*\.?(?:\s+(\d{1,2}))?/.exec(pub) : null;
    if (m && MONTHS[m[1].toLowerCase()]) { parts.push(MONTHS[m[1].toLowerCase()]); if (m[2]) parts.push(Number(m[2])); }
    csl.issued = { "date-parts": [parts] };
  }
  for (const [from, to] of [["volume", "volume"], ["number", "issue"], ["pages", "page"], ["publisher", "publisher"], ["pub-location", "publisher-place"], ["language", "language"]]) {
    const v = first(take(from));
    if (v) csl[to] = v;
  }
  const edition = first(take("edition"));
  // in journal articles EndNote (from PubMed) puts the publication status in "edition"
  if (edition && type !== "article-journal") csl.edition = edition;
  const doi = first(take("electronic-resource-num"));
  if (doi) { const d = /10\.\d{4,9}\/\S+/.exec(doi); if (d) csl.DOI = d[0].replace(/[.,;]$/, ""); }
  const acc = first(take("accession-num"));
  const provider = first(take("remote-database-provider"));
  if (acc && /^\d{5,9}$/.test(acc) && (!provider || /nlm|pubmed/i.test(provider))) csl.PMID = acc;
  for (const k of ["custom1", "custom2", "custom6"]) { const v = first(take(k)); const p = v && /PMC\d+/.exec(v); if (p) csl.PMCID = p[0]; else if (v) r[k] = v; }
  const urls = list(take("urls/related-urls"));
  if (urls[0] && (type !== "article-journal" || !csl.DOI)) csl.URL = urls[0];
  const isbn = first(take("isbn"));
  if (isbn) csl[type === "article-journal" ? "ISSN" : "ISBN"] = isbn.split(/[\s;]+/)[0];
  // what is not a reference's data (it stays in EndNote)
  for (const k of ["rec-number", "auth-address", "keywords/keyword", "abstract", "notes", "label", "research-notes", "work-type"]) delete r[k];
  for (const k of Object.keys(csl)) if (csl[k] == null || csl[k] === "") delete csl[k];
  const unmapped: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) if (v != null && v !== "") unmapped[k] = list(v).join("; ");
  return { csl: csl as Csl, unmapped };
}
