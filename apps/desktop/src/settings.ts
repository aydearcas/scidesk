// Settings of this computer (record 0044): interface language and shortcut scheme. They are
// kept in the app's local data folder (the browser's storage in the preview), never in the
// project: two people opening the same project keep their own (R26, record 0039).
import { useCallback, useEffect, useState } from "react";
import i18n from "./i18n.ts";
import { localStore } from "./platform.ts";
import { defaultScheme, keyScheme, type SchemeId } from "./shortcuts.ts";

export interface Settings {
  lang: "es" | "en";
  /** null: the default of the language ("Word en español" with Spanish). */
  scheme: SchemeId | null;
  /** Panels shown, and their widths in px. */
  left: boolean;
  right: boolean;
  leftWidth: number;
  rightWidth: number;
  /** Zoom of the sheet: "fit" to the width of the window, or a percentage. */
  zoom: "fit" | number;
  /**
   * Record 0047. "journal": the text is shown with the document's font, and a fragment's own
   * font and size are hidden (kept); "free": they are shown, and the toolbar has font, size
   * and "Adapt to the journal".
   */
  fontMode: "journal" | "free";
}
const KEY = "settings/interface.json";
export const DEFAULTS: Settings = { lang: "es", scheme: null, left: true, right: true, leftWidth: 260, rightWidth: 320, zoom: "fit", fontMode: "journal" };

export const effectiveScheme = (s: Settings): SchemeId => s.scheme ?? defaultScheme(s.lang);

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    void (async () => {
      try {
        const text = await (await localStore()).read(KEY);
        if (text) setSettings({ ...DEFAULTS, ...(JSON.parse(text) as Partial<Settings>) });
      } catch { /* unreadable settings: the defaults */ }
    })();
  }, []);
  useEffect(() => {
    keyScheme.current = effectiveScheme(settings);
    if (i18n.language !== settings.lang) void i18n.changeLanguage(settings.lang);
    document.documentElement.lang = settings.lang;
  }, [settings]);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      void localStore().then((st) => st.write(KEY, JSON.stringify(next))).catch(() => {});
      return next;
    });
  }, []);
  return [settings, update];
}
