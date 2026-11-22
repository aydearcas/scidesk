// The concept navigator (D1, R28, design proposal 3.1): the article's objects with their
// name and number, not its files. Manuscript with its sections and their words, abstract,
// tables and figures numbered as they will come out and marked when the text does not cite
// them, authors and submission documents. A button switches to the folder as it is on disk.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ArticleOutline, CheckReport, OutlinePart, Project } from "@scidesk/core";
import { Icon, type IconName } from "./icons.tsx";

export type NavTarget =
  | { kind: "block"; block: string }
  | { kind: "part"; id: string; part: "table" | "figure" }
  | { kind: "abstract"; lang: string }
  /** A table or figure whose file was kept when it left the text: clicking puts it back. */
  | { kind: "unplaced"; src: string }
  | { kind: "authors" }
  | { kind: "credit" }
  | { kind: "title-page" };

const sameTarget = (a: NavTarget | null, b: NavTarget) => !!a && JSON.stringify(a) === JSON.stringify(b);

export function Navigator({ project, folder, report, outline, active, onGo, articles, onSwitchArticle, onNewArticle }: {
  /** The project's articles: with more than one, the header chooses which (design proposal 3.1). */
  articles: { folder: string; title: string }[];
  onSwitchArticle: (folder: string) => void;
  /** Record 0051: the wizard, to add another article to the project. */
  onNewArticle: () => void;
  project: Project;
  folder: string;
  report: CheckReport | null;
  outline: ArticleOutline | null;
  active: NavTarget | null;
  onGo: (target: NavTarget) => void;
}) {
  const { t, i18n } = useTranslation();
  const [files, setFiles] = useState<string[] | null>(null);
  const [showFiles, setShowFiles] = useState(false);
  const art = project.articles.find((a) => a.folder === folder)!;
  useEffect(() => {
    if (!showFiles) return;
    let live = true;
    void project.fs.list("").then((f) => live && setFiles(f));
    return () => { live = false; };
  }, [showFiles, project, report]);

  const n = (v: number) => v.toLocaleString(i18n.language);
  const of = (value: number, limit: number | undefined, sep = " / ") => (
    <span className={`nav-count${limit !== undefined && value > limit ? " over" : ""}`}>{n(value)}{limit !== undefined ? `${sep}${n(limit)}` : ""}</span>
  );
  const limits = report?.limits ?? {};
  const counts = report?.counts;
  const item = (target: NavTarget, label: React.ReactNode, right?: React.ReactNode, extra?: { level?: 1 | 2; icon?: IconName; title?: string }) => (
    <li key={JSON.stringify(target)}>
      <button className={`nav-item level-${extra?.level ?? 2}${sameTarget(active, target) ? " active" : ""}`} aria-current={sameTarget(active, target) ? "true" : undefined} title={extra?.title} onClick={() => onGo(target)}>
        {extra?.icon && <Icon name={extra.icon} size={16} />}
        <span className="nav-label">{label}</span>
        {right}
      </button>
    </li>
  );
  const part = (p: OutlinePart, kind: "table" | "figure") => item(
    { kind: "part", id: p.id, part: kind },
    <>{p.number} · {p.caption || <span className="muted">{t("ui.noCaption")}</span>}</>,
    p.cited ? undefined : <span className="nav-flag" title={t(kind === "table" ? "ui.uncitedTable" : "ui.uncitedFigure")}><Icon name="review" size={14} className="level-icon review" /><span className="sr-only">{t(kind === "table" ? "ui.uncitedTable" : "ui.uncitedFigure")}</span></span>,
  );
  const group = (icon: IconName, label: string, right: React.ReactNode, children: React.ReactNode, target?: NavTarget) => (
    <li className="nav-group">
      {target ? (
        <button className={`nav-item level-1${sameTarget(active, target) ? " active" : ""}`} onClick={() => onGo(target)}><Icon name={icon} size={16} /><span className="nav-label">{label}</span>{right}</button>
      ) : <div className="nav-item level-1 static"><Icon name={icon} size={16} /><span className="nav-label">{label}</span>{right}</div>}
      {children && <ul>{children}</ul>}
    </li>
  );

  const fileTree = () => {
    if (!files) return <p className="muted pad">{t("checksPending")}</p>;
    // folders first at each level, as on disk; each folder once, files indented under it
    const rows: { key: string; name: string; depth: number; folder: boolean }[] = [];
    const seen = new Set<string>();
    const sorted = [...files].sort((a, b) => {
      const pa = a.split("/"), pb = b.split("/");
      for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
        if (pa[i] === pb[i]) continue;
        const fa = i < pa.length - 1, fb = i < pb.length - 1;
        return fa !== fb ? (fa ? -1 : 1) : pa[i].localeCompare(pb[i]);
      }
      return pa.length - pb.length;
    });
    for (const f of sorted) {
      const parts = f.split("/");
      parts.slice(0, -1).forEach((name, i) => {
        const key = parts.slice(0, i + 1).join("/");
        if (!seen.has(key)) { seen.add(key); rows.push({ key, name, depth: i, folder: true }); }
      });
      rows.push({ key: f, name: parts[parts.length - 1], depth: parts.length - 1, folder: false });
    }
    return (
      <ul className="file-tree">
        {rows.map((r) => (
          <li key={r.key} style={{ paddingLeft: 8 + r.depth * 14 }} title={r.key} className={r.folder ? "folder" : ""}>
            <Icon name={r.folder ? "folder" : "article"} size={14} /> {r.name}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <nav className="navigator" aria-label={t("ui.navigator")}>
      <div className="panel-head">
        {!showFiles && articles.length > 1 ? (
          <select className="article-select" value={folder} onChange={(e) => onSwitchArticle(e.target.value)} aria-label={t("ui.chooseArticle")} title={t("ui.chooseArticle")}>
            {articles.map((a) => <option key={a.folder} value={a.folder}>{a.title}</option>)}
          </select>
        ) : <span className="panel-title">{showFiles ? t("ui.projectFiles") : t("ui.thisArticle")}</span>}
        {!showFiles && (
          <button className="icon-button" title={t("ui.newArticleHere")} aria-label={t("ui.newArticleHere")} onClick={onNewArticle}>
            <Icon name="newFile" size={16} />
          </button>
        )}
        <button className="icon-button" aria-pressed={showFiles} title={showFiles ? t("ui.showConcepts") : t("ui.showFiles")} aria-label={showFiles ? t("ui.showConcepts") : t("ui.showFiles")} onClick={() => setShowFiles((v) => !v)}>
          <Icon name={showFiles ? "concepts" : "files"} size={16} />
        </button>
      </div>
      {showFiles ? fileTree() : (
        <ul className="nav-tree">
          {group("article", t("ui.manuscript"), counts && of(counts.main, limits.words), <>
            {outline?.title && item({ kind: "block", block: outline.title.block }, t("ui.titleBlock"), limits.titleCharacters && counts ? <span className="nav-count" title={t("ui.titleCharacters")}>{of(counts.titleCharacters, limits.titleCharacters)}</span> : undefined, { title: outline.title.text })}
            {(counts?.abstract ?? []).map((a) => item({ kind: "abstract", lang: a.lang }, `${t("ui.abstract")} · ${a.lang.toUpperCase()}`, of(a.words, limits.abstractWords)))}
            {(counts?.sections ?? []).filter((s) => s.block).map((s) => item({ kind: "block", block: s.block! }, s.heading || t("beforeFirstHeading"),
              <span className={`nav-count${s.counted ? "" : " muted"}`} title={s.counted ? undefined : t("notCounted")}>{s.counted ? n(s.words) : s.role === "references" && counts ? n(counts.references) + (limits.references ? ` / ${n(limits.references)}` : "") : "—"}</span>))}
          </>)}
          {group("table", t("ui.tables"), counts && of(counts.tables, limits.tables, ` ${t("ui.of")} `), outline?.tables.length ? outline.tables.map((p) => part(p, "table")) : <li className="nav-empty">{t("ui.noTables")}</li>)}
          {group("figure", t("ui.figures"), counts && of(counts.figures, limits.figures, ` ${t("ui.of")} `), outline?.figures.length ? outline.figures.map((p) => part(p, "figure")) : <li className="nav-empty">{t("ui.noFigures")}</li>)}
          {!!outline?.unplaced.length && group("files", t("ui.unplaced"), <span className="nav-count">{n(outline.unplaced.length)}</span>,
            outline.unplaced.map((u) => item({ kind: "unplaced", src: u.src }, <>{u.caption || <span className="muted">{u.src}</span>}</>, <Icon name={u.kind} size={14} />, { title: `${t("ui.placeAgain")} · ${u.src}` })))}
          {group("users", t("ui.authorsGroup"), <span className="nav-count">{n(art.authors.authors.length)}</span>, null, { kind: "authors" })}
          {group("send", t("ui.submissionDocs"), null, <>
            {item({ kind: "title-page" }, t("ui.titlePage"), <span className="nav-auto">{t("ui.automatic")}</span>)}
            {item({ kind: "credit" }, t("ui.contributions"), <span className="nav-auto">{t("ui.automatic")}</span>)}
          </>)}
        </ul>
      )}
    </nav>
  );
}
