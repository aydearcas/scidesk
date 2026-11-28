// Citations and bibliography with citeproc-js (record 0026), included from its repository
// at a fixed commit, unmodified. The style and locale files come from a loader, so that the
// core works the same in Node and in the app.
//
// citeproc-js implements the Citation Style Language. (c) Frank Bennett.
// https://citationstyles.org/ — SciDesk shows this attribution (CPAL, exhibit B).
import CSL from "citeproc";
import type { LibraryFile, PMNode } from "@scidesk/formats";

export interface CitationResources {
  style(id: string): Promise<string>;
  locale(lang: string): Promise<string>;
}

export interface Run {
  text: string; bold?: boolean; italic?: boolean; sup?: boolean; sub?: boolean;
  /** Record 0043: underline, colour of the text (#RRGGBB) and Word's highlight colour. */
  underline?: boolean; color?: string; highlight?: string;
  /** Record 0047: the font and size of a fragment, in points (free font mode). */
  font?: string; size?: number;
  /** Record 0060: the language of a fragment (a `lang` mark), as a BCP 47 tag. */
  lang?: string;
  /** Record 0104: in a Word document read, a citation field (its number among the fields read). */
  cite?: number;
}

/** The marks of a text node as a run's format (the same in every export). */
export function runFormat(marks: { type: string; attrs?: Record<string, unknown> }[] = []): Omit<Run, "text"> {
  const f: Omit<Run, "text"> = {};
  for (const m of marks) {
    if (m.type === "bold") f.bold = true;
    else if (m.type === "italic") f.italic = true;
    else if (m.type === "underline") f.underline = true;
    else if (m.type === "superscript") f.sup = true;
    else if (m.type === "subscript") f.sub = true;
    else if (m.type === "textColor") f.color = String(m.attrs?.color);
    else if (m.type === "highlight") f.highlight = String(m.attrs?.color);
    else if (m.type === "fontFamily") f.font = String(m.attrs?.family);
    else if (m.type === "fontSize") f.size = Number(m.attrs?.size);
    else if (m.type === "lang") f.lang = String(m.attrs?.lang);
  }
  return f;
}
export interface RenderedCitation { html: string; runs: Run[]; plain: string; refs: string[] }
export interface Rendering {
  citations: Map<string, RenderedCitation>;
  bibliography: { label: string; runs: Run[]; ref: string }[];
  /** Reference ids in order of first citation. */
  order: string[];
  /**
   * The style's citation-format (record 0067): "author-date" and "author" print the author,
   * so "omit author" (suppress-author) only changes something with them.
   */
  format: CitationFormat | null;
}

export type CitationFormat = "author-date" | "author" | "numeric" | "label" | "note";
/** The citation-format of a CSL style, from its <category>, or null when it does not say. */
export function citationFormat(styleXml: string): CitationFormat | null {
  const m = /<category [^>]*citation-format="([a-z-]+)"/.exec(styleXml);
  return m && ["author-date", "author", "numeric", "label", "note"].includes(m[1]) ? (m[1] as CitationFormat) : null;
}
/** Whether "omit author" shows in a citation with this style. */
export const omitsAuthor = (format: CitationFormat | null) => format === "author-date" || format === "author";

const LOCALES: Record<string, string> = { es: "es-ES", en: "en-US" };

const decode = (s: string) => s
  .replace(/&#38;|&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

/** citeproc-js' HTML as formatted runs. */
export function htmlRuns(html: string): Run[] {
  const runs: Run[] = [];
  const f: Omit<Run, "text"> = {};
  for (const tok of html.split(/(<[^>]+>)/)) {
    if (!tok) continue;
    const tag = /^<(\/?)(\w+)/.exec(tok);
    const key = tag && ({ i: "italic", em: "italic", b: "bold", strong: "bold", sup: "sup", sub: "sub" } as const)[tag[2] as "i"];
    if (!tag) runs.push({ text: decode(tok), ...f });
    else if (key) f[key] = !tag[1];
  }
  return runs.filter((r) => r.text);
}

/** Citations of a document tree in reading order. */
export function citationsOf(doc: PMNode): PMNode[] {
  const out: PMNode[] = [];
  const visit = (n: PMNode) => { if (n.type === "citation") out.push(n); n.content?.forEach(visit); };
  visit(doc);
  return out;
}

/**
 * Renders every citation of the given trees (in order) and the bibliography.
 * `termsLang`: language of the fixed words of the references (record 0026).
 */
export async function renderCitations(library: LibraryFile, trees: PMNode[], styleId: string, termsLang: string, res: CitationResources): Promise<Rendering> {
  const byId = new Map(library.references.map((r) => [r.id, r]));
  const citations = trees.flatMap(citationsOf);
  const order: string[] = [];
  for (const c of citations) for (const item of c.attrs!.items as { ref: string }[]) if (!order.includes(item.ref)) order.push(item.ref);
  const locale = LOCALES[termsLang] ?? termsLang;
  const localeXml = await res.locale(locale);
  const styleXml = await res.style(styleId);
  const engine = new CSL.Engine({
    retrieveLocale: () => localeXml,
    retrieveItem: (id: string) => {
      const r = byId.get(id);
      if (!r) throw new Error(`reference ${id} is not in the library`);
      return { id, ...r.csl };
    },
  }, styleXml, locale, true);
  engine.updateItems(order);
  const rendered = new Map<string, RenderedCitation>();
  for (const c of citations) {
    const items = c.attrs!.items as { ref: string; locator?: string; label?: string; prefix?: string; suffix?: string; suppressAuthor?: boolean }[];
    const html: string = engine.makeCitationCluster(items.map((i) => ({
      id: i.ref, locator: i.locator, label: i.label, prefix: i.prefix, suffix: i.suffix, "suppress-author": i.suppressAuthor,
    })));
    const runs = htmlRuns(html);
    rendered.set(c.attrs!.id as string, { html, runs, plain: runs.map((r) => r.text).join(""), refs: items.map((i) => i.ref) });
  }
  const bibliography: Rendering["bibliography"] = [];
  if (order.length) {
    const [meta, entries] = engine.makeBibliography() as [{ entry_ids: string[][] }, string[]];
    entries.forEach((e, i) => {
      const label = decode(/csl-left-margin">([^<]*)</.exec(e)?.[1] ?? "").trim();
      const html = (/csl-right-inline">([\s\S]*)<\/div>\s*<\/div>/.exec(e)?.[1] ?? e.replace(/<\/?div[^>]*>/g, "")).trim();
      bibliography.push({ label, runs: htmlRuns(html), ref: meta.entry_ids[i][0] });
    });
  }
  return { citations: rendered, bibliography, order, format: citationFormat(styleXml) };
}
