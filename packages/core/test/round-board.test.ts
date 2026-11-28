// Record 0102: the round board — to whom a round was sent, who has returned their copy, who is
// missing and how many of their proposals are left to decide.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { exportDocx } from "../src/docx-export.ts";
import { nodeResources } from "../src/node-fs.ts";
import { defaultRecipients, importCopy, noteRound, roundBoard, roundsOf } from "../src/round.ts";
import { trackedProject } from "./tracked-fixture.ts";

describe("the round board (record 0102)", () => {
  it("lists who the round was sent to, who returned a copy and how many proposals each has left", async () => {
    const p = await trackedProject();
    // three people sign: the author and two co-authors
    const person = (id: string, given: string, family: string, email?: string) => ({ id, kind: "person" as const, given, family, affiliations: [], ...(email ? { email } : {}) });
    p.people.people.push(person("p-lucia00001", "Lucía", "Herrera-Gil"), person("p-marta00001", "Marta", "Ríos Navarro", "marta@example.org"), person("p-jorge00001", "Jorge", "Soler"));
    const art = p.articles[0];
    art.authors.authors = ["p-lucia00001", "p-marta00001", "p-jorge00001"].map((id) => ({ person: id, affiliations: [], corresponding: id === "p-lucia00001", credit: [] }));
    const who = defaultRecipients(p, "main", "lucia herrera-gil");
    expect(who).toEqual([
      { name: "Marta Ríos Navarro", person: "p-marta00001", email: "marta@example.org" },
      { name: "Jorge Soler", person: "p-jorge00001" },
    ]);

    // the author notes the sending, with a deadline
    const out = await exportDocx(p, "main", "coauthors", await nodeResources());
    const noted = await noteRound(p, "main", out.snapshot!, new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), { recipients: who, deadline: "2026-12-05" });
    expect(noted.round).toMatchObject({ name: "Ronda 1", deadline: "2026-12-05" });

    // Marta returns hers (her name written without accents), and an editor not on the list too
    const zip = await JSZip.loadAsync(out.bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    zip.file("word/document.xml", xml.replace("Primera mitad.", "Primera mitad, corregida."));
    const copy = await zip.generateAsync({ type: "uint8array" });
    const marta = await importCopy(p, "main", copy, { fileName: "marta.docx", returnedBy: { name: "marta rios navarro" } });
    expect(marta.round).toBe(noted.round.id);
    await importCopy(p, "main", out.bytes, { fileName: "revision-linguistica.docx", returnedBy: { name: "Revisora lingüística" } });

    const [entry] = await roundsOf(p, "main");
    expect(entry.round.recipients).toHaveLength(2);
    expect(entry.round.copies.find((c) => c.file === "copies/marta.docx")!.returnedBy).toEqual({ name: "marta rios navarro", person: "p-marta00001" });
    const pending = new Map([[entry.round.copies[0].id, 1]]);
    const board = roundBoard(entry.round, (id) => pending.get(id) ?? 0);
    expect(board.map((r) => [r.name, r.sent, r.copies.length, r.pending])).toEqual([
      ["Marta Ríos Navarro", true, 1, 1],
      ["Jorge Soler", true, 0, 0],
      ["Revisora lingüística", false, 1, 0],
    ]);

    // the deadline can be taken away; the recipients stay
    const later = await noteRound(p, "main", out.snapshot!, entry.round.sent.date, { deadline: null });
    expect(later.round.deadline).toBeUndefined();
    expect(later.round.recipients).toHaveLength(2);
    expect(later.round.copies).toHaveLength(2);
  });
});
