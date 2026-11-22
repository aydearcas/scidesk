// What the spell checker looks at in a piece of text (record 0023, record 0057): words of
// letters (with an inner apostrophe or hyphen split into its parts), never acronyms, words
// with digits, single letters, web addresses, e-mails or DOIs. Shared by the editor and Node.

/** Languages with a dictionary, and the file of each; a regional tag falls back to its language. */
export const SPELL_LANGS: Record<string, string> = { es: "es_ES", en: "en_US" };
/** The dictionary for a language tag ("es-ES" → es_ES, "en-GB" → en_US for now), or null. */
export const dictionaryFor = (lang: string | null | undefined): string | null => (lang ? SPELL_LANGS[lang.toLowerCase().split(/[-_]/)[0]] ?? null : null);

// a hyphenated word is one token: Hunspell checks each part (anti-inflamatorio, doble-ciego)
const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;
// web addresses, e-mails and DOIs are blanked out (same length) before looking for words
const NOT_WORDS = /\b(?:https?:\/\/|www\.)\S+|\b10\.\d{4,9}\/\S+|\S+@\S+\.\S+/giu;

/** Words not worth checking: acronyms (two capitals or more: DAS28, TNF, IgG), one letter. */
export function skipWord(w: string): boolean {
  if (w.length < 2) return true;
  // more than one capital: an acronym or a gene, drug or unit name (IgG, mRNA, HbA)
  if ((w.match(/\p{Lu}/gu)?.length ?? 0) > 1) return true;
  return false;
}

export interface WordAt { word: string; index: number }

/** The words to check in a text, with their offsets. A word glued to a digit (DAS28, 5mg) is skipped. */
export function wordsIn(text: string): WordAt[] {
  const clean = text.replace(NOT_WORDS, (m) => " ".repeat(m.length));
  const out: WordAt[] = [];
  for (const m of clean.matchAll(WORD)) {
    const before = clean[m.index! - 1] ?? "";
    const after = clean[m.index! + m[0].length] ?? "";
    if (/\d/.test(before) || /\d/.test(after)) continue;
    if (skipWord(m[0])) continue;
    out.push({ word: m[0], index: m.index! });
  }
  return out;
}

/** The project dictionary (resources/dictionary.txt): one word per line, # starts a comment. */
export function parseDictionary(text: string | null | undefined): string[] {
  return [...new Set((text ?? "").split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim()).filter(Boolean))];
}
/** The file again, sorted and without repeats, with the comments at its top kept. */
export function formatDictionary(words: Iterable<string>, previous?: string | null): string {
  const header = (previous ?? "").split(/\r?\n/).filter((l) => l.startsWith("#"));
  const list = [...new Set([...words].map((w) => w.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  return [...(header.length ? header : ["# Project dictionary of SciDesk: one word per line. Every language accepts them."]), ...list].join("\n") + "\n";
}
