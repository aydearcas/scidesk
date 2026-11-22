// British and American spelling (record 0063): the spelling of a word in the other variety,
// from a few rules (colour/color, randomise/randomize, haemoglobin/hemoglobin, centre/center,
// travelled/traveled, catalogue/catalog…) whose candidates the dictionaries decide. A word
// changes only if the target variety rejects it, the other one knows it, and the target
// accepts the candidate; scientific spellings both accept (sulfur, fetal, program) stay.

export type EnglishVariety = "GB" | "US";
/** Which words a dictionary accepts: "en_GB", "en_US", or ":general" for the general ones without the specialty list. */
export type DictCheck = (dict: string, words: string[]) => Promise<boolean[]>;

type Rule = (w: string) => string[];

/** Every result of replacing one match of `re` by `to` (one occurrence at a time). */
function each(re: RegExp, to: string): Rule {
  return (w) => {
    const out: string[] = [];
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of w.matchAll(g)) {
      // $1… from the match's groups (the lookaheads need the whole word, not the match)
      const rep = to.replace(/\$(\d)/g, (_, n: string) => m[Number(n)] ?? "");
      out.push(w.slice(0, m.index) + rep + w.slice(m.index! + m[0].length));
    }
    return out;
  };
}
const whole = (pairs: [string, string][]): Rule => (w) => pairs.filter(([a]) => w === a || w.startsWith(a)).map(([a, b]) => b + w.slice(a.length));

// irregular pairs (British, American); a prefix carries its derived forms (greyish, moulded)
const IRREGULAR: [string, string][] = [["grey", "gray"], ["mould", "mold"], ["plough", "plow"], ["aluminium", "aluminum"], ["artefact", "artifact"], ["pyjama", "pajama"], ["smoulder", "smolder"], ["moult", "molt"]];

const TO_US: Rule[] = [
  each(/our/, "or"), // colour, behaviour, tumour, favourite
  each(/is(?=e|ation|ing|ed|er|es)/, "iz"), // randomise, organisation
  each(/ys(?=e|ing)/, "yz"), // analyse
  each(/ae/, "e"), each(/oe/, "e"), // haemoglobin, oedema, oesophagus, manoeuvre
  each(/([^aeiou])re(?=$|s$|d$)/, "$1er"), // centre, fibre, litre
  each(/ogue(?=$|s$)/, "og"), // catalogue
  each(/ence(?=$|s$)/, "ense"), // defence, licence, offence
  each(/is(?=e$|ed$|es$|ing$)/, "ic"), // practise
  each(/ll(?=ed$|ing$|er$|ers$|ation)/, "l"), // travelled, modelling, labelled
  each(/l(?=$|s$|ment|ments$|ful)/, "ll"), // fulfil, enrolment, skilful
  each(/mme(?=$|s$|d$)/, "m"), // programme
  each(/gement/, "gment"), // judgement
  each(/geing/, "ging"), // ageing
  whole(IRREGULAR),
];
const TO_GB: Rule[] = [
  each(/or(?=$|s$|ed$|ing$|ite|ful|less|able|ably|al|ism|ist|er|y)/, "our"),
  each(/iz(?=e|ation|ing|ed|er|es)/, "is"),
  each(/yz(?=e|ing)/, "ys"),
  each(/e/, "ae"), each(/e/, "oe"), // hemoglobin, edema, esophagus, maneuver
  each(/([^aeiou])er(?=$|s$|ed$)/, "$1re"),
  each(/og(?=$|s$)/, "ogue"),
  each(/ense(?=$|s$)/, "ence"),
  each(/l(?=ed$|ing$|er$|ers$|ation)/, "ll"),
  each(/ll(?=$|s$|ment|ments$|ful)/, "l"),
  each(/gment/, "gement"),
  each(/ging$/, "geing"),
  whole(IRREGULAR.map(([a, b]) => [b, a])),
];

/** Candidate spellings of a word (lower case) in a variety: up to two rules at a time (manoeuvre → maneuver). */
export function varietyCandidates(word: string, to: EnglishVariety): string[] {
  const rules = to === "US" ? TO_US : TO_GB;
  const step = (ws: string[]) => ws.flatMap((w) => rules.flatMap((r) => r(w)));
  const one = step([word]);
  const two = step(one);
  return [...new Set([...one, ...two])].filter((c) => c !== word).slice(0, 400);
}

/** The word's case on another spelling: Colour → Color, COLOUR → COLOR. */
export function withCaseOf(model: string, word: string): string {
  if (model === model.toUpperCase() && model.length > 1) return word.toUpperCase();
  if (model[0] === model[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}

/**
 * The words of a list that change to reach a variety, with their new spelling. A word
 * changes if the target's general dictionary rejects it, the other variety (with the
 * specialty list) accepts it, and a candidate is accepted by the target; a candidate the
 * other variety rejects (a true pair, colour/color) is preferred.
 */
export async function englishVariantFixes(words: string[], to: EnglishVariety, check: DictCheck): Promise<Map<string, string>> {
  const target = to === "GB" ? "en_GB" : "en_US", source = to === "GB" ? "en_US" : "en_GB";
  const distinct = [...new Set(words)];
  const lower = distinct.map((w) => w.toLowerCase());
  const rejected = await check(`${target}:general`, lower);
  const maybe = lower.filter((_, i) => !rejected[i]);
  const known = maybe.length ? await check(source, maybe) : [];
  const fixes = new Map<string, string>();
  const todo = maybe.filter((_, i) => known[i]);
  if (!todo.length) return fixes;
  const cands = todo.map((w) => varietyCandidates(w, to));
  const flat = [...new Set(cands.flat())];
  const [okTarget, okSource] = await Promise.all([check(target, flat), check(`${source}:general`, flat)]);
  const tOk = new Map(flat.map((c, i) => [c, okTarget[i]]));
  const sOk = new Map(flat.map((c, i) => [c, okSource[i]]));
  todo.forEach((w, k) => {
    const good = cands[k].filter((c) => tOk.get(c));
    if (!good.length) return;
    // a true pair first, then the closest
    good.sort((a, b) => Number(sOk.get(a)) - Number(sOk.get(b)) || Math.abs(a.length - w.length) - Math.abs(b.length - w.length));
    fixes.set(w, good[0]);
  });
  // back to each word as written
  const out = new Map<string, string>();
  for (const w of distinct) { const f = fixes.get(w.toLowerCase()); if (f) out.set(w, withCaseOf(w, f)); }
  return out;
}
