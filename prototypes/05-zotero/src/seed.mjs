// Fills the TEST Zotero (tools/start-test-zotero.ps1) with the 50 references of prototype 2,
// through the connector's import endpoint, as a browser connector would. The local API is
// read-only, so this is the way in. The endpoint does not recognise CSL-JSON (no import
// translator matches it there), so the references go in as RIS, the usual way into Zotero.
//   node src/seed.mjs
import { items } from "../../02-citeproc/src/library.mjs";

const BASE = "http://127.0.0.1:23119";
const ping = await fetch(`${BASE}/connector/ping`).then((r) => r.text()).catch(() => "");
if (!ping.includes("Zotero is running")) throw new Error("the test Zotero is not running");
const count = await fetch(`${BASE}/api/users/0/items?limit=1`).then((r) => r.headers.get("Total-Results"));
if (Number(count) > 0) throw new Error(`the test library already has ${count} items; delete private/zotero-data to start again`);

const TY = { "article-journal": "JOUR", book: "BOOK", chapter: "CHAP", webpage: "ELEC", dataset: "DATA", report: "RPRT", article: "JOUR" };
const name = (n) => (n.literal ? n.literal : `${n.family}, ${n.given ?? ""}${n.suffix ? `, ${n.suffix}` : ""}`);
const date = (d) => d?.["date-parts"]?.[0]?.map((x, i) => (i ? String(x).padStart(2, "0") : x)).join("/");
function ris(it) {
  const L = [`TY  - ${TY[it.type] ?? "GEN"}`];
  const add = (tag, v) => v != null && v !== "" && L.push(`${tag}  - ${v}`);
  for (const a of it.author ?? []) add("AU", name(a));
  for (const e of it.editor ?? []) add("A2", name(e));
  add("TI", it.title);
  add("T2", it.type === "article" ? it.publisher : it["container-title"]);
  add("J2", it["container-title-short"]);
  add("PY", it.issued?.["date-parts"]?.[0]?.[0]);
  add("DA", date(it.issued));
  add("VL", it.volume);
  add("IS", it.issue);
  const [sp, ep] = (it.page ?? "").split("-");
  add("SP", sp); add("EP", ep);
  add("ET", it.edition);
  add("PB", it.type === "article" ? undefined : it.publisher);
  add("CY", it["publisher-place"]);
  add("DO", it.DOI);
  add("UR", it.URL);
  add("Y2", date(it.accessed));
  add("AN", it.PMID);
  add("N1", it.status ? `Status: ${it.status}` : undefined);
  add("M3", it.genre);
  add("C1", `SciDesk test id: ${it.id}`); // to match each Zotero item with its source
  L.push("ER  - ");
  return L.join("\n");
}
const body = Object.values(items).map(ris).join("\n\n") + "\n";
const t = performance.now();
const res = await fetch(`${BASE}/connector/import?session=seed-${Date.now()}`, { method: "POST", headers: { "Content-Type": "text/plain" }, body });
const text = await res.text();
let imported;
try { imported = JSON.parse(text).length; } catch { imported = text.slice(0, 300); }
console.log(JSON.stringify({ status: res.status, ms: Math.round(performance.now() - t), imported }));
