// Spelling outside the editor (record 0061): the report scidesk check prints, and the
// words ignored in an article.
import { describe, expect, it } from "vitest";
import { validate, type PMNode } from "@scidesk/formats";
import { nodeCheck } from "@scidesk/spell/node";
import { MemoryFs } from "../src/fs.ts";
import { createDemoProject } from "../src/demo.ts";
import { saveDocument } from "../src/project.ts";
import { ignoreWord, inWordList, spellingReport, unignoreWord } from "../src/spelling.ts";

const text = (t: string, marks?: unknown[]) => (marks ? { type: "text", text: t, marks } : { type: "text", text: t });

describe("spelling report", () => {
  it("finds the words the dictionaries do not know, as the editor underlines them", async () => {
    const fs = new MemoryFs();
    const p = await createDemoProject(fs);
    const art = p.articles[0];
    const body = structuredClone(art.documents.get("manuscript/article.scidoc")!);
    (body.doc as PMNode).content!.splice(3, 0, {
      type: "paragraph", attrs: { id: "b-spelltest1", lang: null },
      content: [
        text("La artrtis y la artrtis, el DAS28, la IgG, Herrera-Gil y Zubizarreta-Ugalde con "),
        text("Rheumatoid Arthritis", [{ type: "lang", attrs: { lang: "en" } }]),
        text(" y "),
        text("diseese", [{ type: "lang", attrs: { lang: "en" } }]),
        text(", texto borado", [{ type: "deletion", attrs: { id: "ch-delete0001" } }]),
        text(" en Quebec."),
      ],
    } as PMNode);
    await saveDocument(p, art, "manuscript/article.scidoc", body);
    await fs.write("resources/dictionary.txt", "# project\nZubizarreta\nUgalde\n");

    const r = await spellingReport(p, "main", nodeCheck);
    expect(r.issues.map((i) => [i.word, i.lang, i.count])).toEqual([["artrtis", "es", 2], ["diseese", "en", 1], ["Quebec", "es", 1]]);
    expect(r.issues[0].places).toEqual([{ path: "manuscript/article.scidoc", block: "b-spelltest1" }, { path: "manuscript/article.scidoc", block: "b-spelltest1" }]);
    expect(r.unchecked).toEqual([]);

    // ignored in this article: kept in article.json, valid, and the report leaves it out
    await ignoreWord(p, "main", "Quebec");
    await ignoreWord(p, "main", "artrtis");
    expect(art.article.ignoredWords).toEqual(["artrtis", "Quebec"]);
    expect(validate("article", JSON.parse((await fs.readText("articles/main/article.json"))!))).toEqual([]);
    expect((await spellingReport(p, "main", nodeCheck)).issues.map((i) => i.word)).toEqual(["diseese"]);
    await unignoreWord(p, "main", "artrtis");
    await unignoreWord(p, "main", "Quebec");
    expect(art.article.ignoredWords).toBeUndefined();
    expect(JSON.parse((await fs.readText("articles/main/article.json"))!).ignoredWords).toBeUndefined();

    // what is on screen replaces what is saved
    const live = { "manuscript/article.scidoc": { type: "doc", content: [{ type: "paragraph", attrs: { id: "b-spelltest2", lang: "fr" }, content: [text("Bonjour")] }] } as PMNode };
    const l = await spellingReport(p, "main", nodeCheck, live);
    expect(l.unchecked).toEqual(["fr"]);
  });

  it("a word list accepts a word as it is, or capitalised when it is in lower case", () => {
    const list = new Set(["metotrexato", "DAS"]);
    expect([inWordList(list, "metotrexato"), inWordList(list, "Metotrexato"), inWordList(list, "METOTREXATO"), inWordList(list, "das")]).toEqual([true, true, false, false]);
  });
});
