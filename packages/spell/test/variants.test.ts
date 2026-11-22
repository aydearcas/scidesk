// British and American spelling (record 0063), with the dictionaries shipped.
import { describe, expect, it } from "vitest";
import { englishVariantFixes, varietyCandidates, withCaseOf } from "../src/index.ts";
import { nodeCheckDict } from "../src/node.ts";

const fixes = async (words: string[], to: "GB" | "US") => Object.fromEntries(await englishVariantFixes(words, to, nodeCheckDict));

describe("British and American spelling", () => {
  it("to American: general words and medical ones", async () => {
    expect(await fixes(["colour", "Behaviour", "randomised", "organisation", "analysed", "haemoglobin", "oedema", "oesophageal", "manoeuvre", "centre", "catalogue", "defence", "travelled", "programme", "judgement", "ageing", "grey", "paediatric", "leukaemia", "hyperuricaemia", "dyspnoea", "COLOUR"], "US")).toEqual({
      colour: "color", Behaviour: "Behavior", randomised: "randomized", organisation: "organization", analysed: "analyzed", haemoglobin: "hemoglobin", oedema: "edema",
      oesophageal: "esophageal", manoeuvre: "maneuver", centre: "center", catalogue: "catalog", defence: "defense", travelled: "traveled", programme: "program",
      judgement: "judgment", ageing: "aging", grey: "gray", paediatric: "pediatric", leukaemia: "leukemia", hyperuricaemia: "hyperuricemia", dyspnoea: "dyspnea", COLOUR: "COLOR",
    });
  });
  it("to British", async () => {
    expect(await fixes(["color", "randomized", "hemoglobin", "edema", "esophagus", "maneuver", "center", "catalog", "defense", "traveled", "judgment", "aging", "gray", "pediatric", "hyperuricemia", "fulfill", "skillful"], "GB")).toEqual({
      color: "colour", randomized: "randomised", hemoglobin: "haemoglobin", edema: "oedema", esophagus: "oesophagus", maneuver: "manoeuvre", center: "centre", catalog: "catalogue",
      defense: "defence", traveled: "travelled", judgment: "judgement", aging: "ageing", gray: "grey", pediatric: "paediatric", hyperuricemia: "hyperuricaemia", fulfill: "fulfil", skillful: "skilful",
    });
  });
  it("leaves alone what both varieties accept, other words and typos", async () => {
    expect(await fixes(["sulfur", "fetal", "program", "practice", "license", "dialogue", "four", "hour", "doctor", "promise", "exercise", "more", "water", "methotrexate", "colur"], "GB")).toEqual({});
    expect(await fixes(["fetal", "program", "dialogue", "four", "hour", "doctor", "promise", "exercise", "presence", "spondyloarthritis", "tofacitinib", "colur"], "US")).toEqual({});
  });
  it("candidates and case", () => {
    expect(varietyCandidates("manoeuvre", "US")).toContain("maneuver");
    expect(varietyCandidates("maneuver", "GB")).toContain("manoeuvre");
    expect([withCaseOf("Colour", "color"), withCaseOf("COLOUR", "color"), withCaseOf("colour", "color")]).toEqual(["Color", "COLOR", "color"]);
  });
});
