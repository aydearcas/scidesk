// Prototype 11's own pages (paste.html, bench.html), on localhost only: Safari reaches them
// through src/proxy.mjs. Small API:
//   POST /api/paste   {cleaned, raw, types, html, ua}  -> which table, and the comparison (done here)
//   POST /api/bench   {...}                             -> saved to out/bench-<engine>.json
//   GET  /p9/<file>   prototype 9's dictionaries and WebAssembly build (whitelisted names)
import { defineConfig } from "vite";
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { identify, compareGrid } from "./src/compare-grids.mjs";

const P1 = resolve("../01-paste-word-tables");
const P9 = resolve("../09-spellcheck");
const P9_FILES = {
  "spellwasm.wasm": `${P9}/rust-wasm/target/wasm32-unknown-unknown/release/spellwasm.wasm`,
  ...Object.fromEntries(["es_ES", "en_US", "en_GB"].flatMap((l) => [[`${l}.aff`, `${P9}/dicts/${l}.aff`], [`${l}.dic`, `${P9}/dicts/${l}.dic`]])),
};
const body = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => ok(s ? JSON.parse(s) : {})); });

export default defineConfig({
  server: {
    host: "localhost", port: 5191, strictPort: true,
    fs: { allow: [resolve("."), `${P1}/src`, `${P1}/node_modules`, `${P9}/src`], deny: ["**/private/**", ".env", ".env.*"] },
    watch: { ignored: ["**/private/**", "**/out/**"] },
  },
  plugins: [{
    name: "proto11-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // the tables to paste on the Mac (the user's content: only through the gateway,
        // which only lets the Mac in)
        const DOWNLOADS = { "/descargar/tablas.docx": "tablas-para-pegar.docx", "/descargar/citas.docx": "citas-para-pegar.docx" };
        if (DOWNLOADS[req.url]) {
          res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
          res.setHeader("content-disposition", `attachment; filename="${DOWNLOADS[req.url]}"`);
          return res.end(readFileSync(`private/${DOWNLOADS[req.url]}`));
        }
        // replay of the HTML that arrived from the Mac, for this PC's own browser only: it needs
        // a secret header that the Mac does not know and the gateway does not add
        if (req.url.startsWith("/api/replay")) {
          const secret = readFileSync("private/replay-key.txt", "utf8").trim();
          if (req.headers["x-replay-key"] !== secret) { res.statusCode = 403; return res.end(); }
          const files = readdirSync("private/pastes").filter((f) => f.endsWith(".html") && statSync(`private/pastes/${f}`).size > 0).sort();
          const nParam = new URL(req.url, "http://x").searchParams.get("n");
          res.setHeader("content-type", "application/json");
          if (nParam === null) return res.end(JSON.stringify(files.length));
          const n = Number(nParam);
          if (!Number.isInteger(n) || !files[n]) { res.statusCode = 404; return res.end("{}"); }
          return res.end(JSON.stringify({ html: readFileSync(`private/pastes/${files[n]}`, "utf8") }));
        }
        if (req.url.startsWith("/p9/")) {
          const f = P9_FILES[req.url.slice(4)];
          if (!f || !existsSync(f)) { res.statusCode = 404; return res.end(); }
          res.setHeader("content-type", f.endsWith(".wasm") ? "application/wasm" : "text/plain; charset=utf-8");
          return res.end(readFileSync(f));
        }
        if (!req.url.startsWith("/api/")) return next();
        mkdirSync("out", { recursive: true });
        mkdirSync("private/pastes", { recursive: true });
        res.setHeader("content-type", "application/json");
        if (req.url === "/api/paste" && req.method === "POST") {
          const b = await body(req);
          const result = (grids) => grids.map((g) => { const { truth, score } = identify(g); const c = compareGrid(truth, g); return { table: truth.index, match: +score.toFixed(2), ok: c.ok, checks: c.checks, problems: c.problems }; });
          const r = { at: new Date().toISOString(), ua: b.ua, types: b.types, htmlLength: b.html?.length ?? 0, cleaned: result(b.cleaned ?? []), raw: result(b.raw ?? []) };
          // the pasted HTML (the user's content) stays in private/, the scores in out/
          const n = Date.now();
          if (b.html) writeFileSync(`private/pastes/${n}.html`, b.html);
          if (b.rtf) writeFileSync(`private/pastes/${n}.rtf`, b.rtf);
          appendFileSync("out/pastes.jsonl", JSON.stringify(r) + "\n");
          return res.end(JSON.stringify(r));
        }
        if (req.url === "/api/bench" && req.method === "POST") {
          const b = await body(req);
          writeFileSync(`out/bench-${b.engine}.json`, JSON.stringify(b, null, 1));
          return res.end(JSON.stringify({ saved: true }));
        }
        if (req.url === "/api/note" && req.method === "POST") {
          const b = await body(req);
          appendFileSync("out/notes.jsonl", JSON.stringify({ at: new Date().toISOString(), ...b }) + "\n");
          return res.end(JSON.stringify({ saved: true }));
        }
        res.statusCode = 404;
        res.end("{}");
      });
    },
  }],
});
