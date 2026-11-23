// The two shortcut schemes (R19, D6, record 0043): "Word en español", the default with the
// interface in Spanish, and "International". The quick citation is Ctrl+Shift+C in both.
// No shortcut uses Ctrl+Alt: on Spanish Windows keyboards it is AltGr (ñ, @, #, [, ]…).
// Combos are written as ProseMirror writes them ("Mod-Shift-c"); Mod is Ctrl, or Cmd on a Mac.

export type SchemeId = "word-es" | "international";
export type Action =
  | "bold" | "italic" | "underline" | "superscript" | "subscript" | "undo" | "redo"
  | "cite" | "xref" | "save" | "find" | "replace" | "newArticle" | "openProject"
  | "alignLeft" | "alignCenter" | "alignRight" | "justify" | "pageBreak"
  // listed and reserved, not built yet (phase 1 V1 and phase 2)
  | "comment" | "suggestions" | "palette";

/** Actions that work today; the others show "coming later" in Settings. */
export const BUILT: readonly Action[] = ["bold", "italic", "underline", "superscript", "subscript", "undo", "redo", "cite", "xref", "save", "find", "replace", "newArticle", "openProject", "alignLeft", "alignCenter", "alignRight", "justify", "pageBreak"];
/** Actions that act on the text, run by the editor when it has the focus. */
export const EDITOR_ACTIONS: readonly Action[] = ["bold", "italic", "underline", "superscript", "subscript", "cite", "xref", "alignLeft", "alignCenter", "alignRight", "justify", "pageBreak"];

const COMMON: Partial<Record<Action, string>> = {
  superscript: "Mod-.", subscript: "Mod-,", undo: "Mod-z", redo: "Mod-y",
  // record 0078: a page break is Ctrl+Enter in Word, in Spanish and in English
  pageBreak: "Mod-Enter",
  cite: "Mod-Shift-c", xref: "Mod-Shift-r", comment: "Mod-Shift-m", suggestions: "Mod-Shift-e", palette: "Mod-Shift-p",
};
export const SCHEMES: Record<SchemeId, Record<Action, string>> = {
  // as Word in Spanish: N(egrita), K (cursiva), S(ubrayado), G(uardar), B(uscar), L (reemplazar),
  // U (nuevo), A(brir); in the text, Ctrl+A still selects everything (record 0048)
  // alignment as Word in Spanish: Q (izquierda), T (centrar), D(erecha), J(ustificar); and as Word in English: L, E, R, J
  "word-es": { ...COMMON, bold: "Mod-n", italic: "Mod-k", underline: "Mod-s", save: "Mod-g", find: "Mod-b", replace: "Mod-l", newArticle: "Mod-u", openProject: "Mod-a", alignLeft: "Mod-q", alignCenter: "Mod-t", alignRight: "Mod-d", justify: "Mod-j" } as Record<Action, string>,
  international: { ...COMMON, bold: "Mod-b", italic: "Mod-i", underline: "Mod-u", save: "Mod-s", find: "Mod-f", replace: "Mod-h", newArticle: "Mod-n", openProject: "Mod-o", alignLeft: "Mod-l", alignCenter: "Mod-e", alignRight: "Mod-r", justify: "Mod-j" } as Record<Action, string>,
};
/** Order of the actions in the table of Settings. */
export const ACTIONS: readonly Action[] = ["newArticle", "openProject", "bold", "italic", "underline", "superscript", "subscript", "alignLeft", "alignCenter", "alignRight", "justify", "pageBreak", "undo", "redo", "save", "cite", "xref", "find", "replace", "comment", "suggestions", "palette"];

/**
 * Keys that open the web view's own tools: its find bar (which searches the whole window,
 * not the document) and its print dialog (of the window). Tauri 2.12 cannot turn off
 * WebView2's browser keys, so the window swallows these unless a scheme uses them.
 */
export const BROWSER_KEYS: readonly string[] = ["Mod-f", "Mod-g", "Mod-Shift-g", "Mod-h", "Mod-p", "F3", "Shift-F3"];
/** "F3" / "Shift-F3": function keys without Ctrl, for BROWSER_KEYS. */
export function plainKeyOf(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey || !/^F\d+$/.test(e.key)) return null;
  return `${e.shiftKey ? "Shift-" : ""}${e.key}`;
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** The scheme in use; set by the window from the settings, read on every key press. */
export const keyScheme: { current: SchemeId } = { current: "word-es" };
export const defaultScheme = (lang: string): SchemeId => (lang.startsWith("es") ? "word-es" : "international");

/** "Mod-Shift-c" for a key press, or null when it is not a shortcut (no Ctrl/Cmd). */
export function comboOf(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">): string | null {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  // Ctrl+Alt is AltGr on Spanish keyboards: typing, never a shortcut
  if (!mod || e.altKey) return null;
  if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return null;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  return `Mod-${e.shiftKey ? "Shift-" : ""}${key}`;
}

export function actionFor(scheme: SchemeId, combo: string | null): Action | null {
  if (!combo) return null;
  for (const [a, c] of Object.entries(SCHEMES[scheme])) if (c === combo) return a as Action;
  return null;
}

/** "Ctrl+Mayús+C" / "Ctrl+Shift+C" / "⌘⇧C". */
export function shortcutLabel(combo: string | undefined, lang: string): string {
  if (!combo) return "";
  const parts = combo.split("-");
  const key = parts.pop()!;
  const k = key.length === 1 ? key.toUpperCase() : key === "Enter" && lang.startsWith("es") ? "Intro" : key;
  if (isMac) return parts.map((p) => (p === "Mod" ? "⌘" : p === "Shift" ? "⇧" : p)).join("") + k;
  return [...parts.map((p) => (p === "Mod" ? "Ctrl" : p === "Shift" ? (lang.startsWith("es") ? "Mayús" : "Shift") : p)), k].join("+");
}
