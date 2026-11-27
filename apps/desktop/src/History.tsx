// The history of versions (record 0099; design proposal 5.6): on the left, the article's
// snapshots in time, with the versions named and those sent out standing out and the
// automatic ones grouped by day; in the centre, the version chosen compared with the text as
// it is now (or with another version), paragraph by paragraph, with restoring the whole
// version and bringing back one paragraph or one section as proposals.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SnapshotInfo, VersionBlock } from "@scidesk/core";
import { Icon } from "./icons.tsx";

const ATOM = "\ufffc";

/** A snapshot's name in the user's language: the one given, or what it was made for. */
export function useVersionName() {
  const { t } = useTranslation();
  return (s: SnapshotInfo) => (s.kind !== "named" && s.reason ? t(`ui.history.reason.${s.reason}`) : s.label);
}
const dayOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export function HistoryTimeline({ versions, selected, onSelect, onName, naming }: {
  versions: SnapshotInfo[] | null;
  selected: string | null;
  onSelect: (id: string) => void;
  /** Saves the text as it is now as a version with this name. */
  onName: (name: string) => Promise<void>;
  /** Grows when the menu asks to name a version: the field opens. */
  naming: number;
}) {
  const { t, i18n } = useTranslation();
  const nameOf = useVersionName();
  const [writing, setWriting] = useState(false);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const field = useRef<HTMLInputElement>(null);
  const defaultName = () => t("ui.history.defaultName", { date: new Date().toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" }) });
  // only a new request opens the field (not the one made before this list was shown)
  const asked = useRef(naming);
  useEffect(() => { if (naming !== asked.current) { asked.current = naming; setName(defaultName()); setWriting(true); } }, [naming]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (writing) field.current?.select(); }, [writing]);
  const time = (iso: string) => new Date(iso).toLocaleString(i18n.language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const day = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { weekday: "short", day: "numeric", month: "short" });
  const save = async () => {
    if (!name.trim()) return;
    await onName(name.trim());
    setWriting(false);
  };
  // the versions named and sent one by one; the automatic ones of a day together
  const rows: ({ kind: "one"; s: SnapshotInfo } | { kind: "day"; day: string; list: SnapshotInfo[] })[] = [];
  for (const s of versions ?? []) {
    const last = rows.at(-1);
    if (s.kind === "auto") {
      if (last?.kind === "day" && last.day === dayOf(s.created)) last.list.push(s);
      else rows.push({ kind: "day", day: dayOf(s.created), list: [s] });
    } else rows.push({ kind: "one", s });
  }
  const item = (s: SnapshotInfo) => (
    <li key={s.id}>
      <button className={`version kind-${s.kind}${s.id === selected ? " active" : ""}`} onClick={() => onSelect(s.id)}>
        <span className="version-name">{nameOf(s)}</span>
        <span className="muted small">{time(s.created)}{s.author ? ` · ${s.author.name}` : ""}{s.kind === "sent" ? ` · ${t("ui.history.sent")}` : ""}</span>
      </button>
    </li>
  );
  return (
    <div className="history-timeline">
      <div className="panel-head"><span className="panel-title">{t("ui.history.title")}</span></div>
      {writing ? (
        <div className="version-new">
          <label className="field">{t("ui.history.nameLabel")}
            <input ref={field} value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void save(); else if (e.key === "Escape") setWriting(false); }} />
          </label>
          <div className="thread-actions">
            <button className="btn small primary" disabled={!name.trim()} onClick={() => void save()}>{t("ui.history.save")}</button>
            <button className="btn small" onClick={() => setWriting(false)}>{t("cancel")}</button>
          </div>
        </div>
      ) : (
        <button className="btn small" onClick={() => { setName(defaultName()); setWriting(true); }}><Icon name="plus" size={14} /> {t("ui.history.name")}</button>
      )}
      {versions === null ? <p className="muted small">{t("ui.history.loading")}</p>
        : versions.length === 0 ? <p className="muted small">{t("ui.history.empty")}</p>
        : (
          <ul className="versions">
            {rows.map((r) => r.kind === "one" ? item(r.s) : (
              <li key={`day-${r.day}-${r.list[0].id}`} className="version-day">
                <button className="link small" aria-expanded={open.has(r.list[0].id) || r.list.some((s) => s.id === selected)}
                  onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(r.list[0].id)) n.delete(r.list[0].id); else n.add(r.list[0].id); return n; })}>
                  <Icon name={open.has(r.list[0].id) ? "chevronDown" : "chevronRight"} size={12} /> {t("ui.history.autoDay", { count: r.list.length, day: day(r.list[0].created) })}
                </button>
                {(open.has(r.list[0].id) || r.list.some((s) => s.id === selected)) && <ul className="versions">{r.list.map(item)}</ul>}
              </li>
            ))}
          </ul>
        )}
      <p className="muted small">{t("ui.history.hint")}</p>
    </div>
  );
}

/** A block's text with what changed marked; long stretches that did not change, shortened. */
function Changes({ block }: { block: VersionBlock }) {
  const shown = (s: string) => s.replaceAll(ATOM, "▪");
  const cut = (s: string, edge: "start" | "end" | "both") => {
    const CONTEXT = 70;
    if (s.length <= CONTEXT * 2) return shown(s);
    if (edge === "start") return `…${shown(s.slice(-CONTEXT))}`;
    if (edge === "end") return `${shown(s.slice(0, CONTEXT))}…`;
    return `${shown(s.slice(0, CONTEXT))} … ${shown(s.slice(-CONTEXT))}`;
  };
  if (block.status === "removed") return <p className="version-text"><del>{shown(block.before)}</del></p>;
  if (block.status === "added") return <p className="version-text"><ins>{shown(block.after)}</ins></p>;
  const out: React.ReactNode[] = [];
  let pos = 0;
  block.hunks.forEach((h, i) => {
    if (h.from > pos) out.push(<span key={`s${i}`}>{cut(block.before.slice(pos, h.from), i === 0 ? "start" : "both")}</span>);
    if (h.before) out.push(<del key={`d${i}`}>{shown(h.before)}</del>);
    if (h.after) out.push(<ins key={`i${i}`}>{shown(h.after)}</ins>);
    pos = h.to;
  });
  if (pos < block.before.length) out.push(<span key="end">{cut(block.before.slice(pos), "end")}</span>);
  return <p className="version-text">{out}</p>;
}

export function HistoryView({ versions, selected, against, onAgainst, blocks, onRestore, onBring, onGo }: {
  versions: SnapshotInfo[] | null;
  selected: string | null;
  /** What it is compared with: the text as it is now, or another version. */
  against: string;
  onAgainst: (v: string) => void;
  /** The comparison, older version first; null while it is worked out. */
  blocks: VersionBlock[] | null;
  onRestore: () => void;
  /** Brings these blocks of the version chosen back into the text, as proposals. */
  onBring: (ids: string[], what: string) => void;
  onGo: (block: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const nameOf = useVersionName();
  const sel = versions?.find((s) => s.id === selected) ?? null;
  if (!sel) return <div className="history-view"><p className="muted">{versions?.length ? t("ui.history.choose") : t("ui.history.empty")}</p></div>;
  const other = against === "current" ? null : versions?.find((s) => s.id === against) ?? null;
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const changed = blocks?.filter((b) => b.status !== "same") ?? [];
  const same = (blocks?.length ?? 0) - changed.length;
  const withText = against === "current";
  // a section comes back whole from its heading: the blocks of it that differ
  const sectionOf = (id: string) => changed.filter((b) => b.sectionId === id).map((b) => b.id);
  let lastSection: string | null | undefined;
  return (
    <div className="history-view">
      <header className="history-head">
        <div>
          <h2>{nameOf(sel)}</h2>
          <p className="muted small">{when(sel.created)}{sel.author ? ` · ${sel.author.name}` : ""}</p>
        </div>
        <div className="history-actions">
          <label className="field inline">{t("ui.history.compareWith")}
            <select value={against} onChange={(e) => onAgainst(e.target.value)}>
              <option value="current">{t("ui.history.current")}</option>
              {versions!.filter((s) => s.id !== sel.id).map((s) => <option key={s.id} value={s.id}>{nameOf(s)} · {when(s.created)}</option>)}
            </select>
          </label>
          <button className="btn primary" onClick={onRestore}>{t("ui.history.restore")}</button>
        </div>
      </header>
      <p className="muted small">
        {other
          ? t("ui.history.between", { older: new Date(other.created) < new Date(sel.created) ? nameOf(other) : nameOf(sel), newer: new Date(other.created) < new Date(sel.created) ? nameOf(sel) : nameOf(other) })
          : t("ui.history.sinceVersion")}
        {blocks && ` ${t("ui.history.count", { count: changed.length })}${same ? ` ${t("ui.history.same", { count: same })}` : ""}`}
      </p>
      {blocks === null ? <p className="muted">{t("ui.history.comparing")}</p>
        : changed.length === 0 ? <p className="muted">{other ? t("ui.history.noDiffVersions") : t("ui.history.noDiff")}</p>
        : (
          <ul className="version-blocks">
            {changed.map((b) => {
              const head = b.sectionId !== lastSection ? b.section : undefined;
              lastSection = b.sectionId;
              return (
                <li key={b.id}>
                  {head !== undefined && (
                    <div className="version-section">
                      <h4>{head ?? t("ui.history.start")}</h4>
                      {withText && b.sectionId && sectionOf(b.sectionId).length > 1 && (
                        <button className="link small" onClick={() => onBring(sectionOf(b.sectionId!), t("ui.history.section"))}>{t("ui.history.bringSection")}</button>
                      )}
                    </div>
                  )}
                  <div className={`card version-block status-${b.status}`} onClick={() => onGo(b.id)}>
                    <span className="tag">{t(`ui.history.status.${b.status}`)}</span>
                    <Changes block={b} />
                    {withText && (
                      <div className="thread-actions">
                        <button className="btn small" onClick={(e) => { e.stopPropagation(); onBring([b.id], t("ui.history.paragraph")); }}>{t("ui.history.bring")}</button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
