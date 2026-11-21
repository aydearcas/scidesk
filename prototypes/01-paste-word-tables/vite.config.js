// Dev server plus a tiny signal API for the real Ctrl+V check (paste.html):
//   GET  /api/ready        -> table numbers that tools/hold-tables-on-clipboard.ps1 has put on the clipboard
//   POST /api/done?t=N     -> the page has pasted table N (the script moves on to the next one)
//   POST /api/result?t=N   -> the page's measurement, saved to out/real-paste-N.json
import { defineConfig } from "vite";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

const SIGNAL = "out/signal";

export default defineConfig({
  server: { watch: { ignored: ["**/private/**", "**/out/**"] } },
  plugins: [
    {
      name: "signal-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url.startsWith("/api/")) return next();
          const url = new URL(req.url, "http://x");
          const t = Number(url.searchParams.get("t"));
          mkdirSync(SIGNAL, { recursive: true });
          if (url.pathname === "/api/ready") {
            const ready = existsSync(SIGNAL) ? readdirSync(SIGNAL).filter((f) => f.startsWith("ready-")).map((f) => Number(f.slice(6))) : [];
            const done = readdirSync(SIGNAL).filter((f) => f.startsWith("done-")).map((f) => Number(f.slice(5)));
            res.setHeader("content-type", "application/json");
            return res.end(JSON.stringify(ready.filter((n) => !done.includes(n))));
          }
          if (url.pathname === "/api/done" && Number.isInteger(t)) {
            writeFileSync(`${SIGNAL}/done-${t}`, "");
            return res.end("ok");
          }
          if (url.pathname === "/api/result" && Number.isInteger(t)) {
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", () => {
              writeFileSync(`out/real-paste-${t}.json`, body);
              res.end("ok");
            });
            return;
          }
          res.statusCode = 404;
          res.end();
        });
      },
    },
  ],
});
