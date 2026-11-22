// The spell checker in Node with the dictionaries it ships with (records 0023 and 0057).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatDictionary, loadSpellbook, parseDictionary, wordsIn, dictionaryFor } from "../src/index.ts";

const asset = (p: string) => new URL(`../assets/${p}`, import.meta.url);
const sb = await loadSpellbook(readFileSync(asset("spellwasm.wasm")));
const es = sb.dictionary(readFileSync(asset("dicts/es_ES.aff"), "utf8"), readFileSync(asset("dicts/es_ES.dic"), "utf8"));
const en = sb.dictionary(readFileSync(asset("dicts/en_US.aff"), "utf8"), readFileSync(asset("dicts/en_US.dic"), "utf8"));

describe("dictionaries", () => {
  it("check Spanish and English, and suggest", () => {
    expect(es.checkMany(["artritis", "tratamiento", "pacientes", "artrtis", "inflamatoria"])).toEqual([true, true, true, false, true]);
    expect(en.checkMany(["disease", "activity", "diseese"])).toEqual([true, true, false]);
    expect(es.suggest("artrtis")).toContain("artritis");
    expect(en.suggest("diseese")).toContain("disease");
  });
  it("words added for the project are accepted", () => {
    expect(es.check("metotrexato")).toBe(false);
    es.add("metotrexato");
    expect(es.check("metotrexato")).toBe(true);
  });
  it("hyphenated words: each part is checked", () => {
    expect(es.checkMany(["ensayo-control", "ensayo-contrl"])).toEqual([true, false]);
  });
});

describe("words to check", () => {
  it("skips acronyms, words glued to digits, addresses, e-mails and DOIs", () => {
    const text = "El DAS28 y la IgG en 5mg; véase https://doi.org/10.1136/ard-2023 o 10.1136/ard.2023.1 y a@b.org. L'hôpital, anti-inflamatorio";
    expect(wordsIn(text).map((w) => w.word)).toEqual(["El", "la", "en", "véase", "L'hôpital", "anti-inflamatorio"]);
    const w = wordsIn("Hola mundo")[1];
    expect(w).toEqual({ word: "mundo", index: 5 });
  });
  it("chooses the dictionary by language tag", () => {
    expect([dictionaryFor("es"), dictionaryFor("es-MX"), dictionaryFor("en-GB"), dictionaryFor("fr"), dictionaryFor(null)]).toEqual(["es_ES", "es_ES", "en_US", null, null]);
  });
  it("reads and writes the project dictionary", () => {
    expect(parseDictionary("# comment\nmetotrexato\n\nDAS\nmetotrexato # again\n")).toEqual(["metotrexato", "DAS"]);
    expect(formatDictionary(["zeta", "ácido", "zeta"], "# mine\nold")).toBe("# mine\nácido\nzeta\n");
  });
});
