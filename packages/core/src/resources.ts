// The styles and locales included with SciDesk. Vertical slice: Reumatología Clínica's own
// style (record 0026, CC BY-SA 3.0, derived from Elsevier - Vancouver) and the Spanish and
// English CSL locales (CC BY-SA 3.0). The loader is given the file contents by whoever
// can read them: Node (node-resources.ts) or the app's bundler.
import type { CitationResources } from "./citations.ts";

export const BUNDLED_STYLES: Record<string, string> = {
  "http://www.zotero.org/styles/reumatologia-clinica-scidesk-prototype": "reumatologia-clinica-2026.csl",
};
export const BUNDLED_LOCALES: Record<string, string> = { "es-ES": "locales-es-ES.xml", "en-US": "locales-en-US.xml" };

/** Resources from a function that reads a bundled asset by its file name. */
export function bundledResources(readAsset: (file: string) => Promise<string>): CitationResources {
  return {
    style: async (id) => {
      const f = BUNDLED_STYLES[id];
      if (!f) throw new Error(`style ${id} is not included with SciDesk yet`);
      return readAsset(f);
    },
    locale: async (lang) => readAsset(BUNDLED_LOCALES[lang] ?? BUNDLED_LOCALES["en-US"]),
  };
}
