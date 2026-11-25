// Quick citation (PLAN 5.6, record 0037): a search box over the library (author, year,
// title…); Enter adds the highlighted reference to the citation, Enter with an empty search
// inserts it. Several references per citation, each with prefix, page and suffix. Opened
// with Ctrl+Shift+C, the toolbar or the context menu; on a selected citation it edits that
// citation. "Omit author" (record 0067) shows with the styles that print the author.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDraggable } from "./draggable.ts";
import { searchLibrary, summarize } from "@scidesk/core";
import type { LibraryFile } from "@scidesk/formats";

export interface CiteItem { ref: string; locator?: string; label?: string; prefix?: string; suffix?: string; suppressAuthor?: boolean }

export function QuickCite({ library, initial, uses, omitAuthor, onDone, onClose }: {
  library: LibraryFile;
  /** The style prints the author (author-date): "omit author" changes the citation. */
  omitAuthor: boolean;
  initial: CiteItem[];
  uses: Map<string, number>;
  onDone: (items: CiteItem[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<CiteItem[]>(initial);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const byId = useMemo(() => new Map(library.references.map((r) => [r.id, r])), [library]);
  const hits = useMemo(() => searchLibrary(library, query, 30).filter((h) => !chosen.some((c) => c.ref === h.entry.id)), [library, query, chosen]);
  useEffect(() => setActive(0), [query]);

  const add = (ref: string) => { setChosen((c) => [...c, { ref }]); setQuery(""); input.current?.focus(); };
  const setItem = (i: number, patch: Partial<CiteItem>) => setChosen((c) => c.map((x, j) => {
    if (j !== i) return x;
    const next: CiteItem = { ...x, ...patch };
    for (const k of ["locator", "prefix", "suffix", "suppressAuthor"] as const) if (!next[k]) delete next[k];
    if (next.locator) next.label = x.label ?? "page"; else delete next.label;
    return next;
  }));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && hits[active]) add(hits[active].entry.id);
      else if (!query.trim() && chosen.length) onDone(chosen);
    } else if (e.key === "Backspace" && !query && chosen.length) setChosen((c) => c.slice(0, -1));
  };
  const short = (id: string) => {
    const s = summarize(byId.get(id)?.csl ?? { type: "article" });
    return `${s.authors || "—"} ${s.year ?? ""}`.trim();
  };

  // record 0094: it can be dragged, and opens again where it was left
  const drag = useDraggable("quick-cite");
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="quick-cite" role="dialog" aria-modal="true" aria-label={t("quickCite")} ref={drag.ref} onPointerDown={drag.onPointerDown}>
        <div className="drag-grip" title={t("ui.dragDialog")} aria-hidden="true" />
        <div className="chips">
          {chosen.map((c, i) => (
            <span key={c.ref} className="chip">
              <button className="chip-label" onClick={() => setOpen(open === i ? null : i)} title={t("citeDetails")}>
                {c.prefix ? `${c.prefix} ` : ""}{c.suppressAuthor ? <s>{short(c.ref)}</s> : short(c.ref)}{c.locator ? `, p. ${c.locator}` : ""}{c.suffix ? ` ${c.suffix}` : ""}
              </button>
              <button className="chip-x" onClick={() => setChosen((x) => x.filter((_, j) => j !== i))} aria-label={t("removeFromCitation")}>×</button>
            </span>
          ))}
          <input
            ref={input} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey}
            placeholder={chosen.length ? t("quickCiteMore") : t("quickCitePlaceholder")}
            aria-label={t("quickCitePlaceholder")} role="combobox" aria-expanded={hits.length > 0} aria-controls="quick-cite-results"
            aria-activedescendant={hits[active] ? `qc-${hits[active].entry.id}` : undefined}
          />
        </div>
        {open !== null && chosen[open] && (
          <div className="cite-details">
            <label>{t("prefix")}<input value={chosen[open].prefix ?? ""} onChange={(e) => setItem(open, { prefix: e.target.value })} /></label>
            <label>{t("locator")}<input value={chosen[open].locator ?? ""} onChange={(e) => setItem(open, { locator: e.target.value })} /></label>
            <label>{t("suffix")}<input value={chosen[open].suffix ?? ""} onChange={(e) => setItem(open, { suffix: e.target.value })} /></label>
            {(omitAuthor || chosen[open].suppressAuthor) && (
              <label className="check" title={omitAuthor ? t("omitAuthorHint") : t("omitAuthorNumeric")}>
                <input type="checkbox" checked={!!chosen[open].suppressAuthor} onChange={(e) => setItem(open, { suppressAuthor: e.target.checked })} />
                {t("omitAuthor")}
              </label>
            )}
          </div>
        )}
        {!library.references.length ? <p className="muted">{t("emptyLibrary")}</p> : (
          <ul id="quick-cite-results" className="results" role="listbox">
            {hits.length === 0 && query.trim() && <li className="muted">{t("noMatches")}</li>}
            {hits.map((h, i) => {
              const s = summarize(h.entry.csl);
              const n = uses.get(h.entry.id) ?? 0;
              return (
                <li key={h.entry.id} id={`qc-${h.entry.id}`} role="option" aria-selected={i === active} className={i === active ? "active" : ""}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); add(h.entry.id); }}>
                  <div><b>{s.authors || "—"}</b> {s.year ?? ""}{n ? <span className="muted"> · {t("citedTimes", { count: n })}</span> : null}</div>
                  <div className="result-title">{s.title}{s.container ? <span className="muted"> · {s.container}</span> : null}</div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="dialog-actions">
          <span className="muted">{t("quickCiteHelp")}</span>
          <button onClick={() => onDone(chosen)} disabled={!chosen.length}>{initial.length ? t("updateCitation") : t("insertCitation")}</button>
          <button onClick={onClose}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
}
