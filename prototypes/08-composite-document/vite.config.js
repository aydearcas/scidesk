// Dev server with a tiny file API that stands in for Tauri's file system:
//   GET  /api/project        -> every file of the working copy (fixture-work/), path -> text
//   POST /api/save {files}   -> atomic write (temp file + rename) of the given files
//   POST /api/reset          -> fresh copy of fixture-project/ into fixture-work/
import { defineConfig } from "vite";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const WORK = resolve("fixture-work");
const FIXTURE = resolve("fixture-project");

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}
function insideWork(path) {
  const full = resolve(WORK, path);
  if (!full.startsWith(WORK + sep)) throw new Error(`path outside the project: ${path}`);
  return full;
}
const readBody = (req) =>
  new Promise((ok, fail) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => ok(s ? JSON.parse(s) : {}));
    req.on("error", fail);
  });

function fileApi() {
  return {
    name: "file-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();
        try {
          if (req.url === "/api/reset" || !existsSync(WORK)) {
            rmSync(WORK, { recursive: true, force: true });
            cpSync(FIXTURE, WORK, { recursive: true });
          }
          if (req.url === "/api/project" || req.url === "/api/reset") {
            const files = {};
            for (const f of listFiles(WORK)) files[relative(WORK, f).split(sep).join("/")] = readFileSync(f, "utf8");
            res.setHeader("content-type", "application/json");
            return res.end(JSON.stringify(files));
          }
          if (req.url === "/api/save" && req.method === "POST") {
            const { files } = await readBody(req);
            for (const [path, text] of Object.entries(files)) {
              const full = insideWork(path);
              mkdirSync(dirname(full), { recursive: true });
              writeFileSync(full + ".tmp", text);
              renameSync(full + ".tmp", full);
            }
            res.setHeader("content-type", "application/json");
            return res.end(JSON.stringify({ written: Object.keys(files) }));
          }
          res.statusCode = 404;
          res.end("not found");
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
    },
  };
}

export default defineConfig({ plugins: [fileApi()], server: { watch: { ignored: ["**/fixture-work/**"] } } });
