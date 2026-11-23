// The two shortcut schemes (R19, D6, record 0044).
import { describe, expect, it } from "vitest";
import { ACTIONS, actionFor, comboOf, isMac, SCHEMES, shortcutLabel } from "./shortcuts.ts";

// "Mod" is Ctrl on Windows and Cmd on macOS: the key as the platform running the tests sends it
const key = (k: string, o: Partial<KeyboardEvent> = {}) => ({ key: k, ctrlKey: !isMac, metaKey: isMac, shiftKey: false, altKey: false, ...o });

describe("shortcut schemes", () => {
  it("are Word's in Spanish and the international ones", () => {
    expect(actionFor("word-es", comboOf(key("n")))).toBe("bold");
    expect(actionFor("word-es", comboOf(key("k")))).toBe("italic");
    expect(actionFor("word-es", comboOf(key("s")))).toBe("underline");
    expect(actionFor("word-es", comboOf(key("g")))).toBe("save");
    expect(actionFor("word-es", comboOf(key("b")))).toBe("find");
    expect(actionFor("international", comboOf(key("b")))).toBe("bold");
    expect(actionFor("international", comboOf(key("i")))).toBe("italic");
    expect(actionFor("international", comboOf(key("s")))).toBe("save");
    // new and open as Word: Ctrl+U and Ctrl+A in Spanish, Ctrl+N and Ctrl+O otherwise (record 0048)
    expect(actionFor("word-es", comboOf(key("u")))).toBe("newArticle");
    expect(actionFor("word-es", comboOf(key("a")))).toBe("openProject");
    expect(actionFor("international", comboOf(key("n")))).toBe("newArticle");
    expect(actionFor("international", comboOf(key("o")))).toBe("openProject");
    // alignment as Word in each language (record 0073)
    expect(["q", "t", "d", "j"].map((k) => actionFor("word-es", comboOf(key(k))))).toEqual(["alignLeft", "alignCenter", "alignRight", "justify"]);
    expect(["l", "e", "r", "j"].map((k) => actionFor("international", comboOf(key(k))))).toEqual(["alignLeft", "alignCenter", "alignRight", "justify"]);
  });

  it("set headings 1 to 3 with Ctrl+1/2/3 and a paragraph with Ctrl+0, in both (record 0085)", () => {
    for (const s of ["word-es", "international"] as const) {
      expect(["1", "2", "3", "0"].map((k) => actionFor(s, comboOf(key(k))))).toEqual(["heading1", "heading2", "heading3", "normalParagraph"]);
    }
  });

  it("cite with Ctrl+Shift+C in both (D6)", () => {
    for (const s of ["word-es", "international"] as const) {
      expect(actionFor(s, comboOf(key("C", { shiftKey: true })))).toBe("cite");
      expect(SCHEMES[s].cite).toBe("Mod-Shift-c");
    }
  });

  it("never use Ctrl+Alt, and Ctrl+Alt (AltGr) is never a shortcut", () => {
    for (const s of Object.values(SCHEMES)) for (const c of Object.values(s)) expect(c).not.toMatch(/Alt/);
    // AltGr+2 on a Spanish keyboard types "@": not bold, not anything
    expect(comboOf(key("@", { altKey: true }))).toBeNull();
    expect(comboOf({ key: "n", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBeNull();
  });

  it("give one action per key in each scheme, and every action a key", () => {
    for (const s of Object.values(SCHEMES)) {
      const combos = ACTIONS.map((a) => s[a]);
      expect(combos.every(Boolean)).toBe(true);
      expect(new Set(combos).size).toBe(combos.length);
    }
  });

  it("are shown as the interface says them", () => {
    expect(shortcutLabel("Mod-Shift-c", "es")).toBe(isMac ? "⌘⇧C" : "Ctrl+Mayús+C");
    expect(shortcutLabel("Mod-Shift-c", "en")).toBe(isMac ? "⌘⇧C" : "Ctrl+Shift+C");
  });
});

describe("the web view's own keys", () => {
  it("Ctrl+F, F3 and Ctrl+P are kept from the web view (its find bar searches the whole window)", async () => {
    const { BROWSER_KEYS, plainKeyOf } = await import("./shortcuts.ts");
    expect(BROWSER_KEYS).toEqual(expect.arrayContaining(["Mod-f", "Mod-p", "F3"]));
    expect(comboOf(key("f"))).toBe("Mod-f");
    expect(plainKeyOf({ key: "F3", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe("F3");
    expect(plainKeyOf({ key: "a", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBeNull();
  });
});
