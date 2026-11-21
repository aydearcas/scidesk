// A minimal client of Zotero's local API (http://127.0.0.1:23119/api/), as SciDesk's core
// would use it to keep a project library linked to a Zotero collection. Read-only.
//   - every request goes to the local user library (users/0) and checks Zotero-Server-ID,
//     so that versions cached from one Zotero are never mixed with another's;
//   - lists are paginated (100 per request) using Total-Results;
//   - items come with their Zotero JSON (key, version, collections) and CSL-JSON in one call
//     (format=json&include=data,csljson).
export const BASE = "http://127.0.0.1:23119/api";

export class ZoteroLocal {
  serverId = null;
  requests = 0;

  async get(path, params = {}) {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    this.requests++;
    let res;
    try {
      res = await fetch(url, { headers: this.serverId ? { "Zotero-Server-ID": this.serverId } : {} });
    } catch {
      throw Object.assign(new Error("Zotero is not running"), { code: "ZOTERO_CLOSED" });
    }
    if (res.status === 403) throw Object.assign(new Error(await res.text()), { code: "LOCAL_API_DISABLED" });
    if (res.status === 412) throw Object.assign(new Error("another Zotero instance answered"), { code: "OTHER_ZOTERO" });
    if (!res.ok) throw new Error(`${res.status} ${url.pathname}: ${await res.text()}`);
    const id = res.headers.get("Zotero-Server-ID");
    if (this.serverId && id !== this.serverId) throw Object.assign(new Error("another Zotero instance answered"), { code: "OTHER_ZOTERO" });
    this.serverId ??= id;
    return { data: await res.json(), total: Number(res.headers.get("Total-Results") ?? 0), version: Number(res.headers.get("Last-Modified-Version") ?? 0) };
  }

  async all(path, params = {}) {
    const out = [];
    let total = Infinity, version = 0;
    for (let start = 0; start < total; start += 100) {
      const r = await this.get(path, { ...params, limit: 100, start });
      out.push(...r.data);
      total = r.total;
      version = r.version;
      if (!r.data.length) break;
    }
    return { items: out, version };
  }

  collections() { return this.all("/users/0/collections"); }

  // items directly in a collection and, if `deep`, in its subcollections (Zotero lists
  // each level separately); top-level items only, so no notes or attachments
  async collectionItems(key, { deep = true, since } = {}) {
    const keys = [key];
    if (deep) {
      const { items: cols } = await this.collections();
      const children = (k) => cols.filter((c) => c.data.parentCollection === k).flatMap((c) => [c.key, ...children(c.key)]);
      keys.push(...children(key));
    }
    const seen = new Map();
    let version = 0;
    for (const k of keys) {
      const r = await this.all(`/users/0/collections/${k}/items/top`, { format: "json", include: "data,csljson", ...(since != null ? { since } : {}) });
      version = Math.max(version, r.version);
      for (const it of r.items) seen.set(it.key, it);
    }
    return { items: [...seen.values()], version };
  }

  search(q) { return this.get("/users/0/items/top", { q, qmode: "titleCreatorYear", format: "json", include: "data,csljson", limit: 25 }); }
}

// A Zotero item -> an entry of SciDesk's library.json (PLAN.md 4: "biblioteca en CSL-JSON,
// con la clave de Zotero si está vinculada"). SciDesk's own id is stable and independent of
// Zotero; the CSL-JSON keeps Zotero's mapping; `zotero` holds what is needed to stay linked
// and to write Word fields that Zotero recognises (the item URI).
export function toLibraryEntry(item, serverId, makeId) {
  // the local API gives `csljson` as a string holding a one-element array (the web API, as
  // an object): both are accepted
  let c = item.csljson;
  if (typeof c === "string") c = JSON.parse(c);
  if (Array.isArray(c)) c = c[0];
  const { id: uri, ...csl } = c;
  // Zotero writes the journal abbreviation under its old key; CSL's is container-title-short
  if (csl.journalAbbreviation) {
    csl["container-title-short"] ??= csl.journalAbbreviation;
    delete csl.journalAbbreviation;
  }
  // date parts come as strings ("2003"); CSL-JSON numbers
  for (const k of ["issued", "accessed", "original-date", "event-date"]) {
    if (csl[k]?.["date-parts"]) csl[k]["date-parts"] = csl[k]["date-parts"].map((d) => d.map((x) => (/^\d+$/.test(String(x)) ? Number(x) : x)));
  }
  return {
    id: makeId(item),
    csl,
    zotero: { key: item.key, version: item.version, uri, serverId, library: item.library?.type ?? "user", dateModified: item.data.dateModified },
  };
}
