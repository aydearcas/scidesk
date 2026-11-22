// The start screen (sheet 6 of the interface proposal, record 0048): three ways to start,
// with their shortcuts, the demo project, and the recent projects with each article's state.
// A project whose folder is not found (a synchronised folder not downloaded yet, or moved)
// is shown apart, with "Find the folder" and "Remove from the list".
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Icon, LevelIcon, type IconName } from "./icons.tsx";
import type { RecentArticle, RecentProject } from "./recent.ts";
import { PREVIEW_PLACE } from "./recent.ts";

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** "hoy, 10:42", "ayer" or the date. */
function when(iso: string, lang: string, t: TFunction): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(new Date()) - day(d)) / 86400000);
  if (days === 0) return t("ui.home.today", { time: d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) });
  if (days === 1) return t("ui.home.yesterday");
  return d.toLocaleDateString(lang);
}

/** The folder as the user knows it: its last three levels. */
export function shortPath(path: string): string {
  if (path === PREVIEW_PLACE) return "";
  const parts = path.split(/[\\/]+/).filter(Boolean);
  return parts.slice(-3).join(" › ");
}

function ArticleRow({ a }: { a: RecentArticle }) {
  const { t, i18n } = useTranslation();
  const n = (x: number) => x.toLocaleString(i18n.language);
  const over = a.limit !== null && a.words > a.limit;
  const type = t(`ui.articleTypes.${a.articleType}`, { defaultValue: a.articleType });
  return (
    <div className="recent-article">
      <div className="recent-line">
        <span className="recent-title">{a.title || type}</span>
        {a.round
          ? <span className="badge accent">{t("ui.home.withCoauthors", { n: a.round.number })}</span>
          : <span className="badge">{t("ui.home.draft")}</span>}
        <span className={`recent-words${over ? " over" : ""}`}>{a.limit !== null ? t("ui.home.wordsOf", { words: n(a.words), limit: n(a.limit) }) : t("ui.home.words", { count: a.words, words: n(a.words) })}</span>
      </div>
      <div className="recent-sub muted small">
        {type}{a.journal ? ` · ${a.journal}` : ""}{a.round ? ` · ${t("ui.home.copiesBack", { count: a.round.copies })}` : ""}
      </div>
    </div>
  );
}

export function Home({ recent, missing, keys, canOpenFolder, onNew, onFromWord, onOpen, onOpenRecent, onLocate, onForget, onDemo }: {
  recent: RecentProject[];
  missing: Set<string>;
  keys: { newArticle: string; openProject: string };
  canOpenFolder: boolean;
  onNew: () => void;
  onFromWord: () => void;
  onOpen: () => void;
  onOpenRecent: (r: RecentProject) => void;
  onLocate: (r: RecentProject) => void;
  onForget: (r: RecentProject) => void;
  onDemo: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const words = fold(query).split(/\s+/).filter(Boolean);
  const matches = (r: RecentProject) => words.every((w) => fold([r.name, r.path, ...r.articles.map((a) => a.title)].join(" ")).includes(w));
  const shown = recent.filter(matches);
  const found = shown.filter((r) => !missing.has(r.path));
  const lost = shown.filter((r) => missing.has(r.path));
  const start: { icon: IconName; title: string; text: string; keys?: string; onClick: () => void; disabled?: boolean; primary?: boolean }[] = [
    { icon: "newFile", title: t("ui.home.newTitle"), text: t("ui.home.newText"), keys: keys.newArticle, onClick: onNew, primary: true },
    { icon: "wordFile", title: t("ui.home.fromWordTitle"), text: t("ui.home.fromWordText"), onClick: onFromWord },
    { icon: "folder", title: t("ui.home.openTitle"), text: canOpenFolder ? t("ui.home.openText") : t("ui.home.openBrowser"), keys: canOpenFolder ? keys.openProject : undefined, onClick: onOpen, disabled: !canOpenFolder },
  ];
  return (
    <div className="home">
      <section className="home-start" aria-labelledby="home-start">
        <h1 id="home-start">{t("ui.home.start")}</h1>
        <p className="muted">{t("ui.home.startText")}</p>
        {start.map((s) => (
          <button key={s.title} className={`start-option${s.primary ? " primary" : ""}`} onClick={s.onClick} disabled={s.disabled}>
            <span className="start-icon"><Icon name={s.icon} size={20} /></span>
            <span className="start-text"><b>{s.title}</b><span>{s.text}</span></span>
            {s.keys && <kbd className="start-keys">{s.keys}</kbd>}
          </button>
        ))}
        <button className="link-button" onClick={onDemo}>{t("ui.home.demo")}</button>
      </section>

      <section className="home-recent" aria-labelledby="home-recent">
        <div className="home-recent-head">
          <h2 id="home-recent">{t("ui.home.recent")}</h2>
          {recent.length > 0 && (
            <label className="search-field">
              <Icon name="search" size={15} />
              <span className="sr-only">{t("ui.home.searchRecent")}</span>
              <input className="bare" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.home.searchRecent")} />
            </label>
          )}
        </div>
        {recent.length === 0 && <p className="muted home-empty">{t("ui.home.noRecent")}</p>}
        {recent.length > 0 && shown.length === 0 && <p className="muted home-empty">{t("ui.home.noMatch")}</p>}
        {found.map((r) => (
          <button key={r.path} className="recent-card" onClick={() => onOpenRecent(r)}>
            <div className="recent-head">
              <b>{r.name}</b>
              <span className="muted small">{when(r.opened, i18n.language, t)}</span>
            </div>
            <div className="recent-path muted small">{r.path === PREVIEW_PLACE ? t("ui.home.previewPlace") : shortPath(r.path)}</div>
            {r.articles.map((a) => <ArticleRow key={a.folder} a={a} />)}
          </button>
        ))}
        {lost.map((r) => (
          <div key={r.path} className="recent-card missing" role="group" aria-label={r.name}>
            <LevelIcon level="review" size={18} />
            <div className="missing-text">
              <b>{r.name}</b>
              <span>{t("ui.home.missing")}</span>
              <span className="muted small">{shortPath(r.path)}</span>
            </div>
            {canOpenFolder && <button className="btn" onClick={() => onLocate(r)}>{t("ui.home.locate")}</button>}
            <button className="btn quiet" onClick={() => onForget(r)}>{t("ui.home.forget")}</button>
          </div>
        ))}
      </section>
    </div>
  );
}
