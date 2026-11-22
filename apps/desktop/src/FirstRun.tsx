// The first start on a computer (PLAN 5.1, interface proposal 5.7, record 0050): the language of
// the interface, the shortcut scheme and the main areas, in one screen. Every choice applies
// at once (the screen changes language as soon as one is picked) and is kept in the settings
// of this computer; all can be changed later in Settings. The areas are optional.
import { useTranslation } from "react-i18next";
import { AreaPicker } from "./AreaPicker.tsx";
import { SCHEMES, shortcutLabel, type Action, type SchemeId } from "./shortcuts.ts";
import { effectiveScheme, type Settings } from "./settings.ts";

const EXAMPLES: Action[] = ["bold", "italic", "save", "find"];
const SCHEME_IDS: SchemeId[] = ["word-es", "international"];

export function FirstRun({ settings, onChange, onDone }: { settings: Settings; onChange: (patch: Partial<Settings>) => void; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const scheme = effectiveScheme(settings);
  return (
    <section className="first-run" aria-labelledby="first-run-title">
      <header>
        <h1 id="first-run-title">{t("ui.firstRun.title")}</h1>
        <p className="muted">{t("ui.firstRun.text")}</p>
      </header>

      <fieldset className="first-run-step">
        <legend><span className="step-number">1</span>{t("ui.interfaceLanguage")}</legend>
        <div className="segmented" role="radiogroup" aria-label={t("ui.interfaceLanguage")}>
          {(["es", "en"] as const).map((l) => (
            <button key={l} role="radio" aria-checked={settings.lang === l} className={settings.lang === l ? "on" : ""} lang={l} onClick={() => onChange({ lang: l })}>
              {l === "es" ? "Español" : "English"}
            </button>
          ))}
        </div>
        <p className="muted small">{t("ui.firstRun.languageNote")}</p>
      </fieldset>

      <fieldset className="first-run-step">
        <legend><span className="step-number">2</span>{t("ui.firstRun.shortcuts")}</legend>
        <div className="scheme-choices" role="radiogroup" aria-label={t("ui.firstRun.shortcuts")}>
          {SCHEME_IDS.map((s) => (
            <button key={s} role="radio" aria-checked={scheme === s} className={`choice${scheme === s ? " selected" : ""}`} onClick={() => onChange({ scheme: s })}>
              <b>{t(`ui.schemes.${s}`)}</b>
              <span className="muted small">{t(`ui.firstRun.schemeText.${s}`)}</span>
              <span className="scheme-keys">
                {EXAMPLES.map((a) => <span key={a}>{t(`ui.firstRun.examples.${a}`)} <kbd>{shortcutLabel(SCHEMES[s][a], i18n.language)}</kbd></span>)}
              </span>
            </button>
          ))}
        </div>
        <p className="muted small">{t("ui.firstRun.schemeNote", { cite: shortcutLabel(SCHEMES[scheme].cite, i18n.language) })}</p>
      </fieldset>

      <fieldset className="first-run-step">
        <legend><span className="step-number">3</span>{t("ui.areas.title")} <span className="muted small">· {t("ui.firstRun.optional")}</span></legend>
        <p className="muted small">{t("ui.areas.note")}</p>
        <AreaPicker value={settings.areas} onChange={(areas) => onChange({ areas })} />
      </fieldset>

      <footer>
        <span className="muted small">{t("ui.firstRun.later")}</span>
        <button className="btn primary big" onClick={onDone}>{t("ui.firstRun.start")}</button>
      </footer>
    </section>
  );
}
