// Prototype 9 page: Tiptap with the spell-check plugin, a language per fragment and a
// project dictionary.
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { createSpellcheck, Lang, BlockLang } from "./spellcheck.js";

const $ = (id) => document.getElementById(id);
const log = (s) => ($("log").textContent = `${s}\n${$("log").textContent}`.slice(0, 4000));
const worker = new Worker(new URL("./spell-worker.js", import.meta.url), { type: "module" });
const timings = [];
const spell = createSpellcheck({
  worker,
  defaultLang: "es_ES",
  onTiming: (t) => {
    timings.push(t);
    window.__timings = timings;
    log(`comprobadas ${t.words} palabras nuevas: ${t.workerMs.toFixed(1)} ms en el worker, ${t.totalMs.toFixed(0)} ms desde la última tecla (incluye 150 ms de espera)`);
  },
});
const init = await spell.init(["es_ES", "en_US"]);
log(`worker listo: ${JSON.stringify(init)}`);

const content = `
<h2>Introducción</h2>
<p>La artrosis de rodilla acelerada se caracteriza por una progresión radiográfica rápida. El término <span lang="en_US">accelerated knee osteoarthritis</span> se usa en la literatura anglosajona, y algunos autores hablan de <span lang="en_US">rapidly progressive disease</span>.</p>
<p>Este parrafo tiene herrores a proposito: artrosis, rodila, progresion y tratamiento.</p>
<p lang="en_US">This paragraph is in English and has a mistake in the word knee osteoartritis and in progresive.</p>
<p>Términos del proyecto: DAS28, AKOA, metotrexato, sarilumab y Kellgren-Lawrence.</p>`;

const editor = new Editor({ element: $("editor"), extensions: [StarterKit, Lang, BlockLang, spell.extension], content });
window.__editor = editor;
window.__spell = spell;

// right-click menu: suggestions in the word's language and "add to the project dictionary"
const menu = $("menu");
editor.view.dom.addEventListener("contextmenu", async (e) => {
  const el = e.target.closest(".misspelled");
  if (!el) return;
  e.preventDefault();
  const word = el.textContent;
  const lang = el.dataset.lang;
  const pos = editor.view.posAtDOM(el, 0);
  const t = performance.now();
  const sugg = await spell.suggest(lang, word);
  log(`sugerencias para "${word}" (${lang}): ${(performance.now() - t).toFixed(0)} ms`);
  menu.innerHTML = "";
  for (const s of sugg.slice(0, 6)) {
    const d = document.createElement("div");
    d.textContent = s;
    d.onclick = () => {
      editor.chain().focus().insertContentAt({ from: pos, to: pos + word.length }, s).run();
      menu.style.display = "none";
    };
    menu.append(d);
  }
  const add = document.createElement("div");
  add.textContent = "Añadir al diccionario del proyecto";
  add.style.borderTop = "1px solid #ddd";
  add.onclick = async () => {
    menu.style.display = "none";
    await spell.addToProject([word], editor.view);
    log(`"${word}" añadida al diccionario del proyecto`);
  };
  menu.append(add);
  Object.assign(menu.style, { left: `${e.clientX}px`, top: `${e.clientY}px`, display: "block" });
});
document.addEventListener("click", (e) => !menu.contains(e.target) && (menu.style.display = "none"));

$("markEn").onclick = () => editor.chain().focus().setMark("lang", { lang: "en_US" }).run();
$("long").onclick = async () => {
  const text = await (await fetch("/private/review-tto.txt")).text();
  const html = text.split("\n").filter(Boolean).map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("");
  const t = performance.now();
  editor.commands.setContent(html);
  log(`artículo largo cargado en el editor: ${editor.state.doc.textContent.split(/\s+/).length} palabras, ${(performance.now() - t).toFixed(0)} ms`);
};
