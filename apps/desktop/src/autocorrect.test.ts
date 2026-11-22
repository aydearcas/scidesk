// Scientific autocorrection (R18, record 0065): the rules, without the editor.
import { describe, expect, it } from "vitest";
import { autocorrectAt } from "./autocorrect.ts";

// the text after applying the rule to what was typed so far
const typed = (text: string, lang = "es") => {
  let out = "";
  for (const ch of text) {
    out += ch;
    const fix = autocorrectAt(out, lang);
    if (fix) out = out.slice(0, out.length - fix.back) + fix.text;
  }
  return out;
};
const N = " ";

describe("scientific autocorrection", () => {
  it("symbols", () => {
    expect(typed("media +- DE, p <= 0,05, edad >= 18 y A -> B")).toBe("media ± DE, p ≤ 0,05, edad ≥ 18 y A → B");
    expect(typed("una matriz de 2 x 2 y 3 x 10")).toBe("una matriz de 2 × 2 y 3 × 10");
    expect(typed("el eje x es")).toBe("el eje x es");
  });
  it("a non-breaking space between a number and its unit", () => {
    expect(typed("5 mg/kg al día, 37 °C, 10 mL. Y 50 % de ellos, 2 h; 3 g)")).toBe(`5${N}mg/kg al día, 37${N}°C, 10${N}mL. Y 50${N}% de ellos, 2${N}h; 3${N}g)`);
    // not a unit: the word goes on
    expect(typed("5 magníficos y 3 grupos")).toBe("5 magníficos y 3 grupos");
  });
  it("the minus sign, and ranges by language", () => {
    expect(typed("cambio de -0,5 (IC: -1,2 a 0,3)")).toBe("cambio de −0,5 (IC: −1,2 a 0,3)");
    expect(typed("entre 5-10 años, en 2019-2020")).toBe("entre 5-10 años, en 2019-2020");
    expect(typed("between 5-10 years, in 2019-2020", "en")).toBe("between 5–10 years, in 2019–2020");
    expect(typed("ard-2023 and NCT0123-45 and COVID-19", "en")).toBe("ard-2023 and NCT0123-45 and COVID-19");
  });
  it("quotation marks by language", () => {
    expect(typed('llamado "brote" (o "recaída")')).toBe("llamado «brote» (o «recaída»)");
    expect(typed('the "flare" and the patient\'s \'view\'', "en-GB")).toBe("the “flare” and the patient’s ‘view’");
    expect(typed("L'hôpital")).toBe("L'hôpital");
  });
});
