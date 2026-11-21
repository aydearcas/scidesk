// HTTPS gateway so that Safari on the MacBook can reach the prototypes running on this PC,
// on a shared network, without exposing them to anyone else:
//   - listens only on the given LAN address, over TLS (self-signed certificate in private/);
//   - a random key in the first link (?k=...) sets an HttpOnly, Secure, SameSite=Strict
//     cookie; without it nothing is served;
//   - the first device that presents the key fixes the only client address accepted;
//   - any path containing "/private/" is refused, even for that device;
//   - forwards to Vite servers that listen on localhost only (HTTP and WebSocket).
//   node src/proxy.mjs <lan-address>   (ports: 5443 -> 5191, 5444 -> 5178, 5445 -> 5180)
import https from "node:https";
import http from "node:http";
import net from "node:net";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const LAN = process.argv[2];
if (!LAN || !/^\d+\.\d+\.\d+\.\d+$/.test(LAN)) throw new Error("usage: node src/proxy.mjs <lan-address>");
const ROUTES = { 5443: 5191, 5444: 5178, 5445: 5180 };
const KEY = randomBytes(18).toString("base64url");
writeFileSync("private/key.txt", KEY);
let clientIp = null;
const tls = { key: readFileSync("private/cert/key.pem"), cert: readFileSync("private/cert/cert.pem") };
const log = (m) => appendFileSync("private/proxy.log", `${new Date().toISOString()} ${m}\n`);
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cookieKey = (req) => /(?:^|;\s*)sd11=([^;]+)/.exec(req.headers.cookie ?? "")?.[1] ?? "";
const ip = (req) => (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");

// returns null if allowed, or the reason
function check(req, url) {
  if (decodeURIComponent(url.pathname).toLowerCase().includes("/private/")) return "private path";
  const keyInUrl = url.searchParams.get("k");
  const ok = (keyInUrl && same(keyInUrl, KEY)) || same(cookieKey(req), KEY);
  if (!ok) return "no key";
  if (!clientIp) { clientIp = ip(req); log(`client fixed: ${clientIp}`); console.log(`client fixed: ${clientIp}`); }
  if (ip(req) !== clientIp) return `other address ${ip(req)}`;
  return null;
}

for (const [port, upstream] of Object.entries(ROUTES)) {
  const server = https.createServer(tls, (req, res) => {
    const url = new URL(req.url, `https://${LAN}:${port}`);
    const why = check(req, url);
    if (why) { log(`refused ${ip(req)} ${req.method} ${url.pathname}: ${why}`); res.writeHead(403, { "content-type": "text/plain" }); return res.end("403"); }
    if (url.searchParams.has("k")) {
      // Safari does not send back a SameSite=Strict cookie set on a redirect: set it (Lax)
      // on a normal page that then moves on without the key in the address
      url.searchParams.delete("k");
      const next = (url.pathname + url.search).replace(/"/g, "");
      res.writeHead(200, { "set-cookie": `sd11=${KEY}; Path=/; HttpOnly; Secure; SameSite=Lax`, "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${next}"><p>Entrando…</p>`);
    }
    const headers = { ...req.headers, host: `localhost:${upstream}` };
    delete headers.cookie; // the key never reaches the prototypes
    const up = http.request({ host: "localhost", port: upstream, method: req.method, path: req.url, headers }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on("error", (e) => { res.writeHead(502); res.end(String(e.message)); });
    req.pipe(up);
  });
  // WebSocket (Vite's live channel): same checks, then a raw pipe to the upstream server
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `https://${LAN}:${port}`);
    const why = check(req, url);
    if (why) { log(`refused upgrade ${ip(req)} ${url.pathname}: ${why}`); return socket.destroy(); }
    const up = net.connect(upstream, "localhost", () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (const [k, v] of Object.entries({ ...req.headers, host: `localhost:${upstream}` })) if (k !== "cookie") lines.push(`${k}: ${v}`);
      up.write(lines.join("\r\n") + "\r\n\r\n");
      if (head?.length) up.write(head);
      socket.pipe(up).pipe(socket);
    });
    up.on("error", () => socket.destroy());
    socket.on("error", () => up.destroy());
  });
  server.listen(Number(port), LAN, () => console.log(`https://${LAN}:${port}/?k=${KEY}  ->  localhost:${upstream}`));
}
