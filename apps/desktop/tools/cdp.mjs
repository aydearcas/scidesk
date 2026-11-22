// Drives the real Tauri window through WebView2's debugging protocol (Chrome DevTools
// Protocol on port 9333), to test what the browser preview cannot: folder dialogs, the
// Rust commands, the window itself. Start the window with
//   $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9333"; npx tauri dev
// (in apps/desktop; add --config '{"build":{"beforeDevCommand":""}}' if Vite already runs on
// port 1420). Native dialogs must be answered by a person. Development only; not shipped.
//   node tools/cdp.mjs eval "<js>"          evaluates (await allowed) and prints the result as JSON
//   node tools/cdp.mjs shot <file.png>      screenshot of the window
//   node tools/cdp.mjs key <combo>...       e.g. ctrl+u, shift+ArrowRight, Escape, Enter
//   node tools/cdp.mjs type "<text>"        inserts text as typed
//   node tools/cdp.mjs click <x> <y>        a real mouse click at CSS pixels
//   node tools/cdp.mjs file "<css>" <path>  sets a file input's file, as if chosen
//   node tools/cdp.mjs size <w> <h> | off   emulates a window size
import { writeFileSync } from "node:fs";

const [cmd, ...args] = process.argv.slice(2);
const targets = await (await fetch("http://127.0.0.1:9333/json")).json();
const page = targets.find((t) => t.type === "page" && /localhost:1420|tauri/.test(t.url)) ?? targets.find((t) => t.type === "page");
if (!page) { console.error("no page", targets); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

const KEYS = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, End: 35, Home: 36 };
async function key(combo) {
  const parts = combo.split("+");
  const k = parts.pop();
  const mods = (parts.includes("alt") ? 1 : 0) | (parts.includes("ctrl") ? 2 : 0) | (parts.includes("meta") ? 4 : 0) | (parts.includes("shift") ? 8 : 0);
  const named = KEYS[k];
  const key = named ? k : k.length === 1 ? (parts.includes("shift") ? k.toUpperCase() : k) : k;
  const code = named ? k : `Key${k.toUpperCase()}`;
  const vk = named ?? k.toUpperCase().charCodeAt(0);
  const text = !named && !(mods & 2) && k.length === 1 ? key : undefined;
  await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", modifiers: mods, key, code, windowsVirtualKeyCode: vk, text });
  await send("Input.dispatchKeyEvent", { type: "keyUp", modifiers: mods, key, code, windowsVirtualKeyCode: vk });
}

if (cmd === "eval") {
  const r = await send("Runtime.evaluate", { expression: `(async () => { ${args[0].includes("return") ? args[0] : `return (${args[0]})`} })()`, awaitPromise: true, returnByValue: true });
  console.log(JSON.stringify(r.result.result?.value ?? r.result.exceptionDetails?.exception?.description ?? r.result, null, 1));
} else if (cmd === "shot") {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(args[0], Buffer.from(r.result.data, "base64"));
  console.log("saved", args[0]);
} else if (cmd === "key") {
  for (const c of args) await key(c);
} else if (cmd === "type") {
  await send("Input.insertText", { text: args[0] });
} else if (cmd === "file") {
  // node cdp.mjs file "<css selector>" <path>: sets a file input's file, as if chosen
  const doc = await send("DOM.getDocument", {});
  const q = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: args[0] });
  const r = await send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [args[1]] });
  console.log(r.error ? JSON.stringify(r.error) : "file set");
} else if (cmd === "size") {
  // node cdp.mjs size <width> <height> | node cdp.mjs size off
  if (args[0] === "off") await send("Emulation.clearDeviceMetricsOverride", {});
  else await send("Emulation.setDeviceMetricsOverride", { width: Number(args[0]), height: Number(args[1]), deviceScaleFactor: 1, mobile: false });
  console.log("size", args.join(" "));
} else if (cmd === "click") {
  const [x, y] = args.map(Number);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
}
ws.close();
