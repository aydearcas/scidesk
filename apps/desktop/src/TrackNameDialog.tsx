// The name tracked changes and comments carry (record 0090), asked for the first time tracked
// changes are turned on, or a comment is written (record 0094), on this computer, as Word asks
// for its user name. It is kept in the
// settings of this computer, and can be changed in Settings.
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function TrackNameDialog({ suggested, purpose = "track", onSave, onClose }: {
  /** A name to start from (who signs the article first, when known). */
  suggested: string;
  /** What the name is asked for: tracked changes, or a comment (its texts). */
  purpose?: "track" | "comment";
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(suggested);
  return (
    <div className="overlay" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="recovery-dialog track-name-dialog" role="dialog" aria-modal="true" aria-labelledby="track-name-title"
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
        <h2 id="track-name-title">{t(purpose === "comment" ? "ui.comments.nameTitle" : "ui.track.nameTitle")}</h2>
        <p className="muted">{t(purpose === "comment" ? "ui.comments.nameIntro" : "ui.track.nameIntro")}</p>
        <input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t("ui.track.namePlaceholder")} aria-label={t("ui.track.nameSetting")} />
        <div className="dialog-actions">
          <button type="submit" className="btn primary" disabled={!name.trim()}>{t(purpose === "comment" ? "ui.comments.nameSave" : "ui.track.nameSave")}</button>
          <button type="button" className="btn" onClick={onClose}>{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}
