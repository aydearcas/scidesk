// The styles and locales included with SciDesk (record 0037). Reumatología Clínica's own
// style (record 0026, CC BY-SA 3.0, derived from Elsevier - Vancouver), styles of the
// official CSL repository, unmodified (CC BY-SA 3.0; each file keeps its authors and
// licence), the Spanish and English CSL locales (CC BY-SA 3.0) and the reference template
// (reference.dotx, made with Word in prototype 3, without personal data). The loader is
// given the file contents by whoever can read them: Node (node-fs.ts) or the app's bundler.
import type { ExportResources } from "./docx-export.ts";

export type StyleFormat = "numeric" | "author-date";

export interface BundledStyle {
  /** The <id> of the style: what article.json stores. */
  id: string;
  /** File under assets/styles/. */
  file: string;
  /** Short name shown in the style menu (the same in both languages). */
  name: string;
  format: StyleFormat;
  /** For a dependent style (a journal that uses another style as is): the parent's id. */
  parent?: string;
}

const Z = "http://www.zotero.org/styles/";
export const REUMATOLOGIA_CLINICA = `${Z}reumatologia-clinica-scidesk-prototype`;

/** In menu order: biomedicine first (P3), then general styles. */
export const BUNDLED_STYLES: BundledStyle[] = [
  { id: REUMATOLOGIA_CLINICA, file: "reumatologia-clinica-2026.csl", name: "Reumatología Clínica", format: "numeric" },
  { id: `${Z}nlm-citation-sequence`, file: "nlm-citation-sequence.csl", name: "Vancouver (NLM, ICMJE)", format: "numeric" },
  { id: `${Z}nlm-citation-sequence-superscript`, file: "nlm-citation-sequence-superscript.csl", name: "Vancouver (NLM), superíndice", format: "numeric" },
  { id: `${Z}elsevier-vancouver`, file: "elsevier-vancouver.csl", name: "Elsevier Vancouver", format: "numeric" },
  { id: `${Z}medicina-clinica`, file: "medicina-clinica.csl", name: "Medicina Clínica", format: "numeric" },
  { id: `${Z}american-medical-association`, file: "american-medical-association.csl", name: "AMA 11", format: "numeric" },
  { id: `${Z}jama`, file: "jama.csl", name: "JAMA", format: "numeric", parent: `${Z}american-medical-association` },
  { id: `${Z}the-new-england-journal-of-medicine`, file: "the-new-england-journal-of-medicine.csl", name: "NEJM", format: "numeric" },
  { id: `${Z}the-lancet`, file: "the-lancet.csl", name: "The Lancet", format: "numeric" },
  { id: `${Z}bmj`, file: "bmj.csl", name: "BMJ", format: "numeric" },
  { id: `${Z}nature`, file: "nature.csl", name: "Nature", format: "numeric" },
  { id: `${Z}science`, file: "science.csl", name: "Science", format: "numeric" },
  { id: `${Z}cell`, file: "cell.csl", name: "Cell", format: "numeric" },
  { id: `${Z}ieee`, file: "ieee.csl", name: "IEEE", format: "numeric" },
  { id: `${Z}apa`, file: "apa.csl", name: "APA 7", format: "author-date" },
  { id: `${Z}harvard-cite-them-right`, file: "harvard-cite-them-right.csl", name: "Harvard (Cite Them Right)", format: "author-date" },
  { id: `${Z}elsevier-harvard`, file: "elsevier-harvard.csl", name: "Elsevier Harvard", format: "author-date" },
  { id: `${Z}chicago-author-date`, file: "chicago-author-date.csl", name: "Chicago (autor-año)", format: "author-date" },
];

export const bundledStyle = (id: string) => BUNDLED_STYLES.find((s) => s.id === id);

/** A style by its id, its file name without .csl, or its name (any case). */
export function findStyle(key: string): BundledStyle | undefined {
  const k = key.trim().toLowerCase();
  return BUNDLED_STYLES.find((s) => s.id.toLowerCase() === k || s.file.replace(/\.csl$/, "") === k || s.name.toLowerCase() === k);
}

export const BUNDLED_LOCALES: Record<string, string> = { "es-ES": "locales-es-ES.xml", "en-US": "locales-en-US.xml" };

export const TEMPLATE_FILE = "reference.dotx";

/**
 * Resources from functions that read a bundled asset by its path under assets/ (styles go
 * in assets/styles/). A dependent style is given as its parent, which is what citeproc-js
 * formats with.
 */
export function bundledResources(readAsset: (file: string) => Promise<string>, readBytes: (file: string) => Promise<Uint8Array>): ExportResources {
  return {
    template: () => readBytes(TEMPLATE_FILE),
    style: async (id) => {
      let s = bundledStyle(id);
      if (s?.parent) s = bundledStyle(s.parent);
      if (!s) throw new Error(`style ${id} is not included with SciDesk`);
      return readAsset(`styles/${s.file}`);
    },
    locale: async (lang) => readAsset(BUNDLED_LOCALES[lang] ?? BUNDLED_LOCALES["en-US"]),
  };
}
