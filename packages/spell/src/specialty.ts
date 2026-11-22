// The specialty dictionary (record 0059): biomedical and clinical words the general
// dictionaries lack (drugs, diseases, methods and statistics…), written for SciDesk in
// specialty/<lang>/*.txt and built by tools/build-specialty.ts into one extra .dic per
// language, with the affix flags of that language's .aff (plurals, feminine, verb forms).

/** The specialty .dic that goes with each general dictionary. */
export const SPECIALTY: Record<string, string> = { es_ES: "biomed_es.dic", en_US: "biomed_en.dic" };

/** A general .dic with the specialty one after it: one dictionary, so suggestions use both. */
export function withSpecialty(dic: string, specialty: string | null | undefined): string {
  if (!specialty) return dic;
  const lines = specialty.split(/\r?\n/);
  // both files start with their number of entries; the result gets the sum
  const count = (s: string) => Number(s.trim()) || 0;
  const head = dic.slice(0, dic.search(/\r?\n/));
  const body = dic.slice(head.length).replace(/\s+$/, "");
  return `${count(head) + count(lines[0])}${body}\n${lines.slice(1).filter((l) => l.trim()).join("\n")}\n`;
}

export interface SpecialtyEntry {
  /** The word as it goes in the .dic, with its flags ("psoriásico/GS"). */
  line: string;
  /** File and line of the source, for messages. */
  at: string;
}

/**
 * Reads one source list: one entry per line, "#" starts a comment. An entry is a word, a
 * word with Hunspell flags ("espondiloartritis", "psoriásico/GS"), or a word followed by
 * "~model": the flags of the model word in the general dictionary ("aleatorizar ~realizar").
 */
export function parseSpecialtySource(text: string, file: string, flagsOf: (model: string) => string | null): { entries: SpecialtyEntry[]; errors: string[] } {
  const entries: SpecialtyEntry[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const at = `${file}:${i + 1}`;
    const l = raw.replace(/#.*/, "").trim();
    if (!l) return;
    const m = /^(\S+?)(?:\/(\S+))?(?:\s+~(\S+))?$/u.exec(l);
    if (!m) { errors.push(`${at}: cannot read «${l}»`); return; }
    const [, word, flags, model] = m;
    if (flags && model) { errors.push(`${at}: flags and a model at once in «${l}»`); return; }
    if (!/^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$/u.test(word)) { errors.push(`${at}: «${word}» is not a word`); return; }
    if (model) {
      const f = flagsOf(model);
      if (f === null) { errors.push(`${at}: the model «${model}» is not in the general dictionary`); return; }
      entries.push({ line: f ? `${word}/${f}` : word, at });
    } else entries.push({ line: flags ? `${word}/${flags}` : word, at });
  });
  return { entries, errors };
}

/** The flags of each word of a .dic (several lines for one word are joined), for "~model". */
export function dicFlags(dic: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of dic.split(/\r?\n/).slice(1)) {
    const m = /^([^/\s]+)(?:\/(\S+))?/u.exec(line);
    if (!m) continue;
    const prev = out.get(m[1]) ?? "";
    const merged = [...new Set([...prev, ...(m[2] ?? "")])].join("");
    out.set(m[1], merged);
  }
  return out;
}
