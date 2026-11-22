// The user's main areas (record 0050): toggles grouped as clinical medicine, other health
// sciences and basic sciences, sorted by name in the interface language, with a search
// without accents. Used on the first start and in Settings.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AREAS, areaName, normalizeAreas, type AreaGroup } from "@scidesk/core";
import { Icon } from "./icons.tsx";

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const GROUPS: AreaGroup[] = ["clinical", "health", "basic"];

export function AreaPicker({ value, onChange }: { value: string[]; onChange: (areas: string[]) => void }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const lang = i18n.language;
  const words = fold(query).split(/\s+/).filter(Boolean);
  const chosen = new Set(value);
  const toggle = (id: string) => onChange(normalizeAreas(chosen.has(id) ? value.filter((a) => a !== id) : [...value, id]));
  const shown = (g: AreaGroup) => AREAS
    .filter((a) => a.group === g && words.every((w) => fold(areaName(a.id, lang)).includes(w)))
    .sort((a, b) => areaName(a.id, lang).localeCompare(areaName(b.id, lang), lang));
  const groups = GROUPS.map((g) => ({ g, areas: shown(g) })).filter((x) => x.areas.length > 0);
  return (
    <div className="area-picker">
      <div className="area-picker-head">
        <label className="search-field">
          <Icon name="search" size={15} />
          <span className="sr-only">{t("ui.areas.search")}</span>
          <input className="bare" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.areas.search")} />
        </label>
        <span className="muted small" aria-live="polite">{value.length ? t("ui.areas.chosen", { count: value.length }) : t("ui.areas.none")}</span>
        {value.length > 0 && <button className="btn quiet" onClick={() => onChange([])}>{t("ui.areas.clear")}</button>}
      </div>
      {value.length > 0 && (
        <p className="area-chosen small">{value.map((id) => areaName(id, lang)).join(" · ")}</p>
      )}
      {groups.map(({ g, areas }) => (
        <div key={g} className="area-group" role="group" aria-label={t(`ui.areas.groups.${g}`)}>
          <h3>{t(`ui.areas.groups.${g}`)}</h3>
          <div className="area-chips">
            {areas.map((a) => (
              <button key={a.id} className={`area-chip${chosen.has(a.id) ? " on" : ""}`} aria-pressed={chosen.has(a.id)} onClick={() => toggle(a.id)}>
                {chosen.has(a.id) && <Icon name="check" size={13} />}{areaName(a.id, lang)}
              </button>
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && <p className="muted small">{t("ui.areas.noMatch")}</p>}
    </div>
  );
}
