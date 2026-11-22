// Scientific autocorrection (R18, record 0065): rules applied while typing, each its own step
// in the undo history (Ctrl+Z, or Backspace right after, gives back what was typed):
//   +- → ±, <= → ≤, >= → ≥, -> → →, "2 x 2" → 2 × 2;
//   a non-breaking space between a number and its unit (5 mg, 37 °C, 50 %);
//   a minus sign before a negative number (−0,5);
//   in English, an en dash in a range of numbers (5–10); Spanish keeps the hyphen (RAE);
//   quotation marks by the fragment's language: «» in Spanish, “” and ‘’ in English.
import { Extension, InputRule } from "@tiptap/core";
import { langAtCursor } from "./lang.ts";

export const autocorrectOptions = { enabled: true };

/** What to put instead of the last `back` characters of the text before the cursor (typed character included). */
export interface Fix { back: number; text: string }

const NBSP = " ";
// units after a number; the longest first, so that "mg/kg" wins over "mg"
const UNITS = [
  "mg/kg/día", "mg/kg/d", "mg/kg", "mg/dL", "mg/dl", "mg/L", "mg/l", "g/dL", "g/dl", "g/L", "g/l", "mmol/L", "mmol/l", "µmol/L", "μmol/L", "nmol/L", "UI/L", "U/L", "UI/mL", "kg/m2", "kg/m²", "mL/min", "ml/min", "mL/min/1,73 m2",
  "mg", "µg", "μg", "mcg", "ng", "pg", "kg", "g", "mL", "ml", "µL", "μL", "dL", "dl", "L",
  "mmol", "µmol", "μmol", "nmol", "mEq", "mmHg", "cmH2O", "cm", "mm", "µm", "μm", "nm", "km", "m",
  "ms", "min", "h", "s", "kDa", "Da", "UI", "IU", "U", "°C", "ºC", "Gy", "mGy", "mSv", "kcal", "Hz", "kHz", "MHz",
].sort((a, b) => b.length - a.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const UNIT_AFTER_NUMBER = new RegExp(`(\\d) (${UNITS.map(esc).join("|")})([\\s.,;:)\\]])$`, "u");
const OPENS_QUOTE = /[\s(\[{«“‘—–\-/]/u;

/** The rule that applies to the text before the cursor, which ends with what was just typed. */
export function autocorrectAt(before: string, lang: string): Fix | null {
  const english = lang.toLowerCase().startsWith("en");
  if (before.endsWith("+-")) return { back: 2, text: "±" };
  if (before.endsWith("<=")) return { back: 2, text: "≤" };
  if (before.endsWith(">=")) return { back: 2, text: "≥" };
  if (before.endsWith("->")) return { back: 2, text: "→" };
  let m = /\d x (\d)$/.exec(before);
  if (m) return { back: 3, text: `× ${m[1]}` };
  if (/\d %$/.test(before)) return { back: 2, text: `${NBSP}%` };
  m = UNIT_AFTER_NUMBER.exec(before);
  if (m) return { back: m[2].length + 2, text: `${NBSP}${m[2]}${m[3]}` };
  m = /(?:^|[\s(\[=:;,<>≤≥±])-(\d)$/u.exec(before);
  if (m) return { back: 2, text: `−${m[1]}` };
  // a range of numbers (not dates or identifiers with letters, slashes or more hyphens)
  if (english) {
    m = /(?:^|[\s(\[])[\d.,]+-(\d)$/u.exec(before);
    if (m) return { back: 2, text: `–${m[1]}` };
  }
  const typed = before.slice(-1);
  const prev = before.slice(-2, -1);
  const opening = !prev || OPENS_QUOTE.test(prev);
  if (typed === '"') return { back: 1, text: english ? (opening ? "“" : "”") : (opening ? "«" : "»") };
  if (typed === "'" && english) return { back: 1, text: opening ? "‘" : "’" };
  return null;
}

export const Autocorrect = Extension.create({
  name: "autocorrect",
  addInputRules() {
    return [new InputRule({
      // every character typed; most of the time nothing changes
      find: /[\s\S]$/,
      handler: ({ state, range, match }) => {
        if (!autocorrectOptions.enabled) return null;
        const before = match.input ?? "";
        const fix = autocorrectAt(before, langAtCursor(state).lang);
        if (!fix) return null;
        const to = range.to;
        // only plain text in the stretch replaced (a citation or a break has another length)
        if (to - fix.back < 0 || state.doc.textBetween(to - fix.back, to) !== before.slice(-fix.back)) return null;
        state.tr.insertText(fix.text, to - fix.back, to);
      },
    })];
  },
});
