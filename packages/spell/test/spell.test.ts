// The spell checker in Node with the dictionaries it ships with (records 0023 and 0057).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dicFlags, formatDictionary, loadSpellbook, parseDictionary, parseSpecialtySource, wordsIn, dictionaryFor, withSpecialty, SPECIALTY } from "../src/index.ts";

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
    expect([dictionaryFor("es"), dictionaryFor("es-MX"), dictionaryFor("en-GB"), dictionaryFor("en_gb"), dictionaryFor("en-US"), dictionaryFor("en"), dictionaryFor("fr"), dictionaryFor(null)])
      .toEqual(["es_ES", "es_ES", "en_GB", "en_GB", "en_US", "en_US", null, null]);
  });
  it("reads and writes the project dictionary", () => {
    expect(parseDictionary("# comment\nmetotrexato\n\nDAS\nmetotrexato # again\n")).toEqual(["metotrexato", "DAS"]);
    expect(formatDictionary(["zeta", "ácido", "zeta"], "# mine\nold")).toBe("# mine\nácido\nzeta\n");
  });
});

describe("specialty dictionary (record 0059)", () => {
  const read = (p: string) => readFileSync(asset(p), "utf8");
  const esDic = read("dicts/es_ES.dic");
  const esMed = sb.dictionary(read("dicts/es_ES.aff"), withSpecialty(esDic, read(`dicts/${SPECIALTY.es_ES}`)));
  const enMed = sb.dictionary(read("dicts/en_US.aff"), withSpecialty(read("dicts/en_US.dic"), read(`dicts/${SPECIALTY.en_US}`)));

  it("accepts the vocabulary of the specialty, with plurals, feminine and verb forms", () => {
    const words = ["metotrexato", "espondiloartritis", "reumatólogas", "psoriásicas", "aleatorizados", "aleatorizaron",
      "metaanálisis", "intercuartílico", "multicéntricos", "inmunosupresoras", "adalimumab", "Sjögren", "SJÖGREN", "p-valor"];
    expect(Object.fromEntries(words.map((w) => [w, esMed.check(w)]))).toEqual(Object.fromEntries(words.map((w) => [w, true])));
    expect(enMed.checkMany(["spondyloarthritis", "rheumatologists", "randomised", "interquartile", "tofacitinib", "autoantibodies"])).toEqual([true, true, true, true, true, true]);
  });
  it("still underlines typos, and suggests the specialty word", () => {
    expect(esMed.checkMany(["metotrexto", "espondiloartrits", "sjögren", "dsfiunción"])).toEqual([false, false, false, false]);
    expect(esMed.suggest("metotrexto")).toContain("metotrexato");
    expect(enMed.suggest("hydroxychloroqine")).toContain("hydroxychloroquine");
  });
  it("joins the files and counts their entries", () => {
    expect(withSpecialty("2\nuno\ndos\n", "1\ntres\n")).toBe("3\nuno\ndos\ntres\n");
    expect(withSpecialty("1\nuno", null)).toBe("1\nuno");
  });
  it("reads the source lists: flags, models and mistakes", () => {
    const flags = dicFlags(esDic);
    const source = "# comment\nmetotrexato\npsoriásico/GS # adjective\naleatorizar ~realizar\nx ~nopalabra\ndos palabras\nzz/S ~realizar\n";
    const { entries, errors } = parseSpecialtySource(source, "t.txt", (m) => flags.get(m) ?? null);
    expect(entries.map((e) => e.line)).toEqual(["metotrexato", "psoriásico/GS", `aleatorizar/${flags.get("realizar")}`]);
    expect(errors).toEqual([
      "t.txt:5: the model «nopalabra» is not in the general dictionary",
      "t.txt:6: cannot read «dos palabras»",
      "t.txt:7: flags and a model at once in «zz/S ~realizar»",
    ]);
  });
});

describe("British English (record 0062)", () => {
  const read = (p: string) => readFileSync(asset(p), "utf8");
  const gb = sb.dictionary(read("dicts/en_GB.aff"), withSpecialty(read("dicts/en_GB.dic"), read(`dicts/${SPECIALTY.en_GB}`)));
  it("checks British spelling, with the specialty list", () => {
    expect(gb.checkMany(["colour", "randomised", "haematology", "tumour", "behaviour", "spondyloarthritis", "tofacitinib", "rheumatologists"])).toEqual([true, true, true, true, true, true, true, true]);
    expect(gb.checkMany(["color", "behavior", "diseese"])).toEqual([false, false, false]);
    expect(gb.suggest("colur")).toContain("colour");
  });
});
