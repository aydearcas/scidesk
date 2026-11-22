// The two shortcut schemes (R19, D6, record 0043): "Word en español", the default with the
// interface in Spanish, and "International". The quick citation is Ctrl+Shift+C in both.
// No shortcut uses Ctrl+Alt: on Spanish Windows keyboards it is AltGr (ñ, @, #, [, ]…).
// Combos are written as ProseMirror writes them ("Mod-Shift-c"); Mod is Ctrl, or Cmd on a Mac.

export type SchemeId = "word-es" | "international";
export type Action =
  | "bold" | "italic" | "underline" | "superscript" | "subscript" | "undo" | "redo"
  | "cite" | "xref" | "save"
  // listed and reserved, not built yet (phase 1 V1 and phase 2)
  | "find" | "replace" | "comment" | "suggestions" | "palette";

/** Actions that work today; the others show "coming later" in Settings. */
export const BUILT: readonly Action[] = ["bold", "italic", "underline", "superscript", "subscript", "undo", "redo", "cite", "xref", "save"];
/** Actions that act on the text, run by the editor when it has the focus. */
export const EDITOR_ACTIONS: readonly Action[] = ["bold", "italic", "underline", "superscript", "subscript", "cite", "xref"];

const COMMON: Partial<Record<Action, string>> = {
  superscript: "Mod-.", subscript: "Mod-,", undo: "Mod-z", redo: "Mod-y",
  cite: "Mod-Shift-c", xref: "Mod-Shift-r", comment: "Mod-Shift-m", suggestions: "Mod-Shift-e", palette: "Mod-Shift-p",
};
export const SCHEMES: Record<SchemeId, Record<Action, string>> = {
  // as Word in Spanish: N(egrita), K (cursiva), S(ubrayado), G(uardar), B(uscar), L (reemplazar)
  "word-es": { ...COMMON, bold: "Mod-n", italic: "Mod-k", underline: "Mod-s", save: "Mod-g", find: "Mod-b", replace: "Mod-l" } as Record<Action, string>,
  international: { ...COMMON, bold: "Mod-b", italic: "Mod-i", underline: "Mod-u", save: "Mod-s", find: "Mod-f", replace: "Mod-h" } as Record<Action, string>,
};
/** Order of the actions in the table of Settings. */
export const ACTIONS: readonly Action[] = ["bold", "italic", "underline", "superscript", "subscript", "undo", "redo", "save", "cite", "xref", "find", "replace", "comment", "suggestions", "palette"];

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
  const k = key.length === 1 ? key.toUpperCase() : key;
  if (isMac) return parts.map((p) => (p === "Mod" ? "⌘" : p === "Shift" ? "⇧" : p)).join("") + k;
  return [...parts.map((p) => (p === "Mod" ? "Ctrl" : p === "Shift" ? (lang.startsWith("es") ? "Mayús" : "Shift") : p)), k].join("+");
}
