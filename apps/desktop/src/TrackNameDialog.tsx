// The name tracked changes and comments carry (record 0090), asked for the first time tracked
// changes are turned on on this computer, as Word asks for its user name. It is kept in the
// settings of this computer, and can be changed in Settings.
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function TrackNameDialog({ suggested, onSave, onClose }: {
  /** A name to start from (who signs the article first, when known). */
  suggested: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(suggested);
  return (
    <div className="overlay" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="recovery-dialog track-name-dialog" role="dialog" aria-modal="true" aria-labelledby="track-name-title"
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
        <h2 id="track-name-title">{t("ui.track.nameTitle")}</h2>
        <p className="muted">{t("ui.track.nameIntro")}</p>
        <input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t("ui.track.namePlaceholder")} aria-label={t("ui.track.nameSetting")} />
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>{t("cancel")}</button>
          <button type="submit" className="btn primary" disabled={!name.trim()}>{t("ui.track.nameSave")}</button>
        </div>
      </form>
    </div>
  );
}
