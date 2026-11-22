// Settings (record 0044): interface language, shortcut scheme, font mode and main areas
// (record 0050), kept on this computer,
// with the table of shortcuts of both schemes.
import { useTranslation } from "react-i18next";
import { AreaPicker } from "./AreaPicker.tsx";
import { ACTIONS, BUILT, SCHEMES, shortcutLabel, type SchemeId } from "./shortcuts.ts";
import { effectiveScheme, type Settings } from "./settings.ts";

export function SettingsView({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const { t, i18n } = useTranslation();
  const scheme = effectiveScheme(settings);
  const schemes: SchemeId[] = ["word-es", "international"];
  return (
    <section className="settings-view" aria-labelledby="settings-title">
      <h2 id="settings-title">{t("ui.settings")}</h2>
      <p className="muted">{t("ui.settingsLocal")}</p>
      <fieldset className="setting">
        <legend>{t("ui.interfaceLanguage")}</legend>
        {(["es", "en"] as const).map((l) => (
          <label key={l} className="inline"><input type="radio" name="lang" checked={settings.lang === l} onChange={() => onChange({ lang: l })} />{l === "es" ? "Español" : "English"}</label>
        ))}
      </fieldset>
      <fieldset className="setting">
        <legend>{t("ui.shortcutScheme")}</legend>
        {schemes.map((s) => (
          <label key={s} className="inline"><input type="radio" name="scheme" checked={scheme === s} onChange={() => onChange({ scheme: s })} />{t(`ui.schemes.${s}`)}</label>
        ))}
        <p className="muted small">{t("ui.schemeNote")}</p>
      </fieldset>
      <fieldset className="setting">
        <legend>{t("ui.fontMode")}</legend>
        {(["journal", "free"] as const).map((m) => (
          <label key={m} className="inline"><input type="radio" name="fontMode" checked={settings.fontMode === m} onChange={() => onChange({ fontMode: m })} />{t(`ui.fontModes.${m}`)}</label>
        ))}
        <p className="muted small">{t("ui.fontModeNote")}</p>
      </fieldset>
      <fieldset className="setting areas-setting">
        <legend>{t("ui.areas.title")}</legend>
        <p className="muted small">{t("ui.areas.note")}</p>
        <AreaPicker value={settings.areas} onChange={(areas) => onChange({ areas })} />
      </fieldset>
      <table className="shortcut-table">
        <thead><tr><th>{t("ui.action")}</th>{schemes.map((s) => <th key={s} className={s === scheme ? "current" : ""}>{t(`ui.schemes.${s}`)}</th>)}</tr></thead>
        <tbody>
          {ACTIONS.map((a) => (
            <tr key={a} className={BUILT.includes(a) ? "" : "later"}>
              <th scope="row">{t(`ui.actions.${a}`)}{BUILT.includes(a) ? "" : <span className="muted small"> · {t("ui.comingLater")}</span>}</th>
              {schemes.map((s) => <td key={s} className={s === scheme ? "current" : ""}><kbd>{shortcutLabel(SCHEMES[s][a], i18n.language)}</kbd></td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{t("ui.noCtrlAlt")}</p>
    </section>
  );
}
