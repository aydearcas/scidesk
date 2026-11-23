// The concept navigator (D1, R28, design proposal 3.1): the article's objects with their
// name and number, not its files. Manuscript with its sections and their words, abstract,
// tables and figures numbered as they will come out and marked when the text does not cite
// them, authors and submission documents. A button switches to the folder as it is on disk.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ArticleOutline, CheckReport, OutlinePart, Project, SectionNumbering } from "@scidesk/core";
import { Icon, type IconName } from "./icons.tsx";
import { ContextMenu, type MenuEntry } from "./Menus.tsx";

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

export function Navigator({ project, folder, report, outline, active, onGo, articles, onSwitchArticle, onNewArticle, sectionNumbers, numbering, onNumbering, onAddSection, onSectionMenu, onMoveSection }: {
  /** Record 0071: "Add section" (the menu of types, at the button) and a section's own menu (right click). */
  onAddSection: (x: number, y: number) => void;
  onSectionMenu: (block: string, x: number, y: number) => void;
  /** A section dragged in the list and dropped before (or after) another, by their headings' ids. */
  onMoveSection: (block: string, target: string, after: boolean) => void;
  /** Record 0070: the sections' numbers by heading id, the article's numbering and where it comes from. */
  sectionNumbers: Map<string, string>;
  numbering: { value: SectionNumbering; from: "article" | "journal" | "default" } | null;
  onNumbering: (value: SectionNumbering | null) => void;
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
  // record 0070: the numbering menu, floating over the window (the tree scrolls and would cut it)
  const [numberingAt, setNumberingAt] = useState<{ x: number; y: number } | null>(null);
  // record 0071: a section dragged in the list, as in a sortable list: the others make room
  // as it moves, its name follows the pointer, and the text changes only when it is dropped
  const [drag, setDrag] = useState<{ block: string; from: number; to: number; shift: number; x: number; y: number; dx: number; dy: number; width: number; label: string } | null>(null);
  const dragged = useRef(false);
  const startDrag = (e: React.PointerEvent, block: string) => {
    if (e.button !== 0) return;
    const x0 = e.clientX, y0 = e.clientY;
    const label = e.currentTarget.querySelector(".nav-label")?.textContent ?? "";
    // where every section was when the drag began (the list moves under the pointer afterwards)
    const list = [...(e.currentTarget.closest(".nav-tree")?.querySelectorAll<HTMLElement>("[data-section]") ?? [])];
    const rects = list.map((el) => ({ block: el.dataset.section!, mid: el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 }));
    const from = rects.findIndex((r) => r.block === block);
    const box = e.currentTarget.getBoundingClientRect();
    const shift = box.height;
    // held where it was grabbed: the row follows the pointer at that point
    const dx = x0 - box.left, dy = y0 - box.top, width = box.width;
    if (from < 0) return;
    let current: { block: string; from: number; to: number; shift: number; x: number; y: number; dx: number; dy: number; width: number; label: string } | null = null;
    const move = (m: PointerEvent) => {
      if (!current && Math.hypot(m.clientX - x0, m.clientY - y0) < 5) return;
      // the slot: how many of the other sections are above the pointer
      const to = rects.filter((r, i) => i !== from && r.mid < m.clientY).length;
      current = { block, from, to, shift, x: m.clientX, y: m.clientY, dx, dy, width, label };
      document.body.classList.add("dragging-section");
      setDrag(current);
    };
    const end = (drop: boolean) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key, true);
      document.body.classList.remove("dragging-section");
      if (current) {
        dragged.current = true; // the click that follows the drop is not a "go to"
        setTimeout(() => { dragged.current = false; }, 0);
        const { to } = current;
        // before the section now in that slot, or after it when moving down
        if (drop && to !== from) onMoveSection(block, rects[to].block, to > from);
      }
      setDrag(null);
    };
    const up = () => end(true);
    const key = (k: KeyboardEvent) => { if (k.key === "Escape") { k.preventDefault(); k.stopPropagation(); end(false); } };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key, true);
  };
  /** How far a section of the list moves while another is dragged (the dragged one, to its slot). */
  const dragOffset = (index: number): number => {
    if (!drag) return 0;
    const { from, to, shift } = drag;
    if (index === from) return (to - from) * shift;
    if (from < to && index > from && index <= to) return -shift;
    if (to < from && index >= to && index < from) return shift;
    return 0;
  };
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
  const item = (target: NavTarget, label: React.ReactNode, right?: React.ReactNode, extra?: { level?: 1 | 2; icon?: IconName; title?: string; onMenu?: (e: React.MouseEvent) => void; section?: string; sectionIndex?: number }) => (
    <li key={JSON.stringify(target)}>
      <button className={`nav-item level-${extra?.level ?? 2}${sameTarget(active, target) ? " active" : ""}${extra?.section && drag ? (drag.block === extra.section ? " dragging" : " shifting") : ""}`}
        style={extra?.sectionIndex !== undefined && drag ? { transform: `translateY(${dragOffset(extra.sectionIndex)}px)` } : undefined}
        aria-current={sameTarget(active, target) ? "true" : undefined} title={extra?.title} data-section={extra?.section}
        onPointerDown={extra?.section ? (e) => startDrag(e, extra.section!) : undefined}
        onClick={() => { if (!dragged.current) onGo(target); }}
        onContextMenu={extra?.onMenu ? (e) => { e.preventDefault(); extra.onMenu!(e); } : undefined}>
        {extra?.icon && <Icon name={extra.icon} size={16} />}
        <span className="nav-label">{label}</span>
        {right}
      </button>
    </li>
  );
  const part = (p: OutlinePart, kind: "table" | "figure") => item(
    { kind: "part", id: p.id, part: kind },
    <>{p.number} · {p.caption || <span className="muted">{t(kind === "table" ? "ui.noTitle" : "ui.noCaption")}</span>}</>,
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

  // record 0070: how the sections are numbered (the journal's, or the article's own choice)
  const numberingMenu = (current: { value: SectionNumbering; from: "article" | "journal" | "default" }) => {
    const journalSays = current.from === "journal" ? current.value : null;
    const option = (v: SectionNumbering) => ({ label: t(`ui.numbering.${v === "1." ? "dotted" : v === "1" ? "plain" : "none"}`), checked: current.from === "article" && current.value === v, onSelect: () => onNumbering(v) });
    const name = (v: SectionNumbering) => t(`ui.numbering.${v === "1." ? "dotted" : v === "1" ? "plain" : "none"}`);
    const items: MenuEntry[] = [
      { label: journalSays ? t("ui.numbering.asJournalSays", { style: name(journalSays) }) : t("ui.numbering.asJournal"), checked: current.from !== "article", onSelect: () => onNumbering(null) },
      "-",
      option("none"), option("1."), option("1"),
    ];
    return (
      <>
        <button className={`icon-button nav-numbering${current.value !== "none" ? " on" : ""}`} aria-haspopup="menu" aria-expanded={!!numberingAt} aria-label={t("ui.numbering.title")}
          title={`${t("ui.numbering.title")}: ${name(current.value)}${current.from === "article" ? "" : ` (${t(current.from === "journal" ? "ui.numbering.fromJournal" : "ui.numbering.fromDefault")})`}`}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setNumberingAt(numberingAt ? null : { x: r.left, y: r.bottom + 4 }); }}>
          <Icon name="orderedList" size={15} />
        </button>
        {numberingAt && <ContextMenu x={numberingAt.x} y={numberingAt.y} items={items} label={t("ui.numbering.title")} onClose={() => setNumberingAt(null)} />}
      </>
    );
  };

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
      {drag && <div className="nav-drag-ghost" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.width, height: drag.shift }} aria-hidden="true"><span>{drag.label}</span></div>}
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
          {group("article", t("ui.manuscript"), <>{counts && of(counts.main, limits.words)}{numbering && numberingMenu(numbering)}
            <button className="icon-button nav-add-section" title={t("ui.sections.add")} aria-label={t("ui.sections.add")} aria-haspopup="menu"
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onAddSection(r.left, r.bottom + 4); }}><Icon name="plus" size={15} /></button></>, <>
            {outline?.title && item({ kind: "block", block: outline.title.block }, t("ui.titleBlock"), limits.titleCharacters && counts ? <span className="nav-count" title={t("ui.titleCharacters")}>{of(counts.titleCharacters, limits.titleCharacters)}</span> : undefined, { title: outline.title.text })}
            {(counts?.abstract ?? []).map((a) => item({ kind: "abstract", lang: a.lang }, `${t("ui.abstract")} · ${a.lang.toUpperCase()}`, of(a.words, limits.abstractWords)))}
            {(counts?.sections ?? []).filter((s) => s.block).map((s, sectionIndex) => item({ kind: "block", block: s.block! }, `${sectionNumbers.get(s.block!) ? `${sectionNumbers.get(s.block!)} ` : ""}${s.heading || t("beforeFirstHeading")}`,
              <span className={`nav-count${s.counted ? "" : " muted"}`} title={s.counted ? undefined : t("notCounted")}>{s.counted ? n(s.words) : s.role === "references" && counts ? n(counts.references) + (limits.references ? ` / ${n(limits.references)}` : "") : "—"}</span>,
              { onMenu: (e) => onSectionMenu(s.block!, e.clientX, e.clientY), title: t("ui.sections.rightClick"), section: s.block!, sectionIndex }))}
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
