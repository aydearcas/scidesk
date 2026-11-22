// A library linked to a Zotero collection, against a simulated local API (record 0052).
import { describe, expect, it } from "vitest";
import { MemoryFs } from "../src/fs.ts";
import { createProject, loadProject } from "../src/project.ts";
import { collectionTree, syncZoteroLibrary, ZoteroError, ZoteroLocal, zoteroLibraryMode, type ZoteroResponse, type ZoteroTransport } from "../src/zotero.ts";

const URI = (k: string) => `http://zotero.org/users/local/abcd1234/items/${k}`;
const item = (key: string, title: string, version = 1, extra: Record<string, unknown> = {}) => ({
  key, version, library: { type: "user", id: 0 }, data: { dateModified: "2026-11-20T10:00:00Z", itemType: "journalArticle" },
  // the local API gives csljson as text holding a one-element list
  csljson: JSON.stringify([{ id: URI(key), type: "article-journal", title, author: [{ family: "Ríos", given: "Ana" }], issued: { "date-parts": [["2024"]] }, journalAbbreviation: "Reumatol Clin", ...extra }]),
});

/** A tiny local API: two collections (one inside the other) and their items. */
function fakeZotero(serverId = "server-1") {
  const state = {
    serverId,
    status: 200,
    collections: [
      { key: "AAAAAAAA", data: { name: "Artritis", parentCollection: false }, meta: { numItems: 2 } },
      { key: "BBBBBBBB", data: { name: "Ecografía", parentCollection: "AAAAAAAA" }, meta: { numItems: 1 } },
      { key: "CCCCCCCC", data: { name: "Otra", parentCollection: false }, meta: { numItems: 0 } },
    ],
    items: { AAAAAAAA: [item("KEY22222", "Uno"), item("KEY33333", "Dos")], BBBBBBBB: [item("KEY44444", "Tres"), item("KEY22222", "Uno")] } as Record<string, ReturnType<typeof item>[]>,
    closed: false,
  };
  const transport: ZoteroTransport = async (path) => {
    if (state.closed) throw new Error("connection refused");
    const reply = (data: unknown[]): ZoteroResponse => ({ status: state.status, headers: { "zotero-server-id": state.serverId, "total-results": String(data.length), "last-modified-version": "7" }, body: state.status === 200 ? JSON.stringify(data) : "Local API is not enabled" });
    const url = new URL(`http://x${path}`);
    const start = Number(url.searchParams.get("start") ?? 0);
    if (url.pathname === "/users/0/collections") return reply(state.collections.slice(start));
    const m = /^\/users\/0\/collections\/(\w+)\/items\/top$/.exec(url.pathname);
    if (m) return reply((state.items[m[1]] ?? []).slice(start));
    return { status: 404, headers: {}, body: "not found" };
  };
  return { state, transport };
}

describe("Zotero's local API", () => {
  it("lists the collections as a tree, and reads a collection with its subcollections once per item", async () => {
    const z = new ZoteroLocal(fakeZotero().transport);
    const tree = collectionTree(await z.collections());
    expect(tree.map((c) => `${"  ".repeat(c.depth)}${c.name}`)).toEqual(["Artritis", "  Ecografía", "Otra"]);
    expect(tree[1].path).toEqual(["Artritis"]);
    expect((await z.collectionItems("AAAAAAAA")).map((i) => i.key).sort()).toEqual(["KEY22222", "KEY33333", "KEY44444"]);
    expect(z.serverId).toBe("server-1");
  });

  it("tells a closed Zotero, a disabled local API and another Zotero apart", async () => {
    const f = fakeZotero();
    const z = new ZoteroLocal(f.transport);
    f.state.closed = true;
    await expect(z.collections()).rejects.toMatchObject({ code: "closed" });
    f.state.closed = false;
    f.state.status = 403;
    await expect(z.collections()).rejects.toMatchObject({ code: "disabled" });
    f.state.status = 200;
    await z.collections();
    f.state.serverId = "server-2";
    await expect(z.collections()).rejects.toBeInstanceOf(ZoteroError);
  });
});

describe("a project linked to a collection", () => {
  it("is filled by syncing, keeps SciDesk's ids, and never drops a cited reference", async () => {
    const f = fakeZotero();
    const fs = new MemoryFs();
    let p = await createProject(fs, { name: "Z", fileName: "z", title: "T", library: zoteroLibraryMode({ key: "AAAAAAAA", name: "Artritis", parent: null, items: 2 }) });
    expect(p.manifest.library).toMatchObject({ mode: "zotero", zotero: { collection: "AAAAAAAA", name: "Artritis" } });
    const first = await syncZoteroLibrary(p, new ZoteroLocal(f.transport));
    expect(first).toMatchObject({ total: 3, changed: true, serverId: "server-1" });
    p = await loadProject(fs);
    const uno = p.library.references.find((r) => r.zotero?.key === "KEY22222")!;
    // normalised like any import, and linked for good
    expect(uno.csl).toMatchObject({ title: "Uno", "container-title-short": "Reumatol Clin", issued: { "date-parts": [[2024]] } });
    expect(uno.csl).not.toHaveProperty("journalAbbreviation");
    expect(uno.zotero).toMatchObject({ key: "KEY22222", uri: URI("KEY22222"), library: "user" });
    expect(uno.source).toMatchObject({ kind: "zotero" });

    // nothing changed in Zotero: nothing is written
    expect(await syncZoteroLibrary(p, new ZoteroLocal(f.transport))).toMatchObject({ changed: false, added: [], updated: [], removed: [] });

    // "Uno" is edited in Zotero, "Dos" leaves the collection (not cited), "Tres" too (cited on screen)
    const tres = p.library.references.find((r) => r.zotero?.key === "KEY44444")!;
    f.state.items.AAAAAAAA = [item("KEY22222", "Uno, corregido", 2), item("KEY55555", "Cuatro")];
    f.state.items.BBBBBBBB = [];
    const live = { "main/manuscript/article.scidoc": { type: "doc", content: [{ type: "paragraph", content: [{ type: "citation", attrs: { id: "c-aaaaaaaaaa", items: [{ ref: tres.id }] } }] }] } };
    const r = await syncZoteroLibrary(p, new ZoteroLocal(f.transport), live);
    expect(r.updated).toEqual([{ id: uno.id, title: "Uno, corregido" }]);
    expect(r.added.map((x) => x.title)).toEqual(["Cuatro"]);
    expect(r.removed.map((x) => x.title)).toEqual(["Dos"]);
    expect(r.keptCited).toEqual([{ id: tres.id, title: "Tres" }]);
    const after = (await loadProject(fs)).library.references;
    expect(after.map((x) => x.csl.title)).toEqual(["Uno, corregido", "Tres", "Cuatro"]);
    expect(after[0].id).toBe(uno.id);
  });

  it("an own library cannot be synced", async () => {
    const p = await createProject(new MemoryFs(), { name: "X", fileName: "x", title: "T" });
    await expect(syncZoteroLibrary(p, new ZoteroLocal(fakeZotero().transport))).rejects.toThrow(/not linked/);
  });
});
