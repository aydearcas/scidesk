// Identifiers. Every id SciDesk stores is "<kind>-<suffix>": the kind says what it names,
// the suffix is random. The suffix only uses [a-z0-9] so that the DOCX markers (bookmark
// names admit letters, digits and "_", up to 40 characters) can carry it unchanged
// (docx-markers.ts). The project id is the only exception: a UUID.
import Type from "typebox";

export const ID_KINDS = {
  b: "block (paragraph, heading, title, caption, keyword list, list, table, equation)",
  n: "table or figure note",
  t: "table (its part and its tableRef)",
  f: "figure (its part and its figureRef)",
  e: "equation",
  c: "citation",
  ch: "tracked change",
  cm: "comment",
  r: "reference of the library",
  p: "person of the directory",
  af: "affiliation",
  a: "article",
  s: "snapshot of the history",
  rd: "review round",
  cp: "returned copy",
  ps: "proposal set",
  pr: "proposal",
  z: "zone of the three-way merge",
  g: "group of proposals in the same sentence",
} as const;
export type IdKind = keyof typeof ID_KINDS;

const SUFFIX = "[a-z0-9]{1,24}";
export const ID_PATTERN = `^(${Object.keys(ID_KINDS).join("|")})-${SUFFIX}$`;

/** An id of one kind. Generated ids have a 10-character suffix (about 52 random bits). */
export const IdOf = (kind: IdKind, description?: string) =>
  Type.String({ pattern: `^${kind}-${SUFFIX}$`, description: description ?? `Id of a ${ID_KINDS[kind]}.` });

/** Any SciDesk id (for references whose target can be of several kinds). */
export const AnyId = Type.String({ pattern: ID_PATTERN, description: "A SciDesk id: <kind>-<suffix>." });

export const GENERATED_SUFFIX_LENGTH = 10;
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** A new random id. `random` is injectable so that tests and examples are reproducible. */
export function newId(kind: IdKind, random: () => number = cryptoRandom): string {
  let s = "";
  for (let i = 0; i < GENERATED_SUFFIX_LENGTH; i++) s += ALPHABET[Math.floor(random() * 36)];
  return `${kind}-${s}`;
}

function cryptoRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

/** Deterministic generator for examples and tests (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

export const kindOf = (id: string): IdKind | null => {
  const m = /^([a-z]+)-/.exec(id);
  return m && m[1] in ID_KINDS ? (m[1] as IdKind) : null;
};
