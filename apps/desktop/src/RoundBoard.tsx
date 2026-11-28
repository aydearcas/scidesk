// The round board (record 0102; R5 and PLAN 5.11, point 10): to whom the version was sent,
// who has returned their copy and when, how many of their proposals are left to decide, who
// is missing (with the deadline, if any, and a reminder to copy into an e-mail: SciDesk never
// sends one), and whoever returned a copy without being on the list.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BoardRow, RoundEntry } from "@scidesk/core";
import { authorColor } from "./track-changes.ts";

export interface RoundActions {
  /** Notes the round of the last Word for co-authors exported, sent to whoever signs but the user. */
  onNote: () => void;
  onDeadline: (round: string, date: string | null) => void;
  onAdd: (round: string, name: string) => void;
  onRemove: (round: string, index: number) => void;
  /** Copies a reminder for someone who has not returned their copy. */
  onRemind: (round: string, row: BoardRow) => void;
}

export function RoundBoard({ rounds, boards, unnoted, people, actions }: {
  rounds: RoundEntry[];
  /** The board of each round, by its id. */
  boards: Map<string, BoardRow[]>;
  /** The last Word for co-authors exported, when no round notes it yet. */
  unnoted: { created: string } | null;
  /** Names in the project's directory, to add someone. */
  people: string[];
  actions: RoundActions;
}) {
  const { t, i18n } = useTranslation();
  const [chosen, setChosen] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const day = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
  const entry = rounds.find((r) => r.round.id === chosen) ?? rounds.at(-1) ?? null;
  if (!entry && !unnoted) return null;
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const rows = entry ? boards.get(entry.round.id) ?? [] : [];
  const sentTo = rows.filter((r) => r.sent);
  const back = sentTo.filter((r) => r.copies.length).length;
  const today = new Date().toISOString().slice(0, 10);
  const late = !!entry?.round.deadline && entry.round.deadline < today;
  const add = () => { if (entry && adding.trim()) { actions.onAdd(entry.round.id, adding.trim()); setAdding(""); } };
  return (
    <section className="round-board" aria-label={t("ui.round.title")}>
      {unnoted && (
        <div className="round-unnoted">
          <p className="small">{t("ui.round.unnoted", { date: day(unnoted.created) })}</p>
          <button className="btn small primary" onMouseDown={keep} onClick={actions.onNote}>{t("ui.round.note")}</button>
        </div>
      )}
      {entry && (
        <>
          <div className="round-head">
            {rounds.length > 1 ? (
              <select value={entry.round.id} onChange={(e) => setChosen(e.target.value)} aria-label={t("ui.round.choose")}>
                {rounds.map((r) => <option key={r.round.id} value={r.round.id}>{r.round.name} · {day(r.round.sent.date)}</option>)}
              </select>
            ) : <b>{entry.round.name}</b>}
            <span className="muted small">{t("ui.round.sent", { date: day(entry.round.sent.date) })}</span>
          </div>
          <label className="round-deadline small">{t("ui.round.deadline")}
            <input type="date" value={entry.round.deadline ?? ""} onChange={(e) => actions.onDeadline(entry.round.id, e.target.value || null)} />
          </label>
          {sentTo.length > 0
            ? <p className="small">{t("ui.round.back", { count: back, total: sentTo.length })}{late && back < sentTo.length ? ` ${t("ui.round.late")}` : ""}</p>
            : <p className="muted small">{t("ui.round.noRecipients")}</p>}
          <ul className="round-rows">
            {rows.map((r, i) => {
              const last = r.copies.at(-1);
              return (
                <li key={`${r.name}-${i}`} className={r.copies.length ? "returned" : "missing"}>
                  <span className="who"><span className="dot" style={{ background: authorColor(r.name) }} aria-hidden="true" /><b>{r.name}</b></span>
                  <span className="muted small">
                    {last
                      ? `${t("ui.round.returned", { date: day(last.received) })}${r.pending !== null ? ` · ${t("ui.proposals.left", { count: r.pending })}` : ""}${r.sent ? "" : ` · ${t("ui.round.notListed")}`}`
                      : late ? t("ui.round.missingLate") : t("ui.round.missing")}
                  </span>
                  {r.sent && !r.copies.length && <button className="link small" onMouseDown={keep} onClick={() => actions.onRemind(entry.round.id, r)}>{t("ui.round.remind")}</button>}
                  {r.sent && <button className="link small" title={t("ui.round.remove")} aria-label={t("ui.round.remove")} onMouseDown={keep} onClick={() => actions.onRemove(entry.round.id, sentTo.indexOf(r))}>×</button>}
                </li>
              );
            })}
          </ul>
          <div className="round-add">
            <input list="round-people" value={adding} placeholder={t("ui.round.addPlaceholder")} aria-label={t("ui.round.add")}
              onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            <datalist id="round-people">{people.map((n) => <option key={n} value={n} />)}</datalist>
            <button className="btn small" disabled={!adding.trim()} onClick={add}>{t("ui.round.add")}</button>
          </div>
        </>
      )}
    </section>
  );
}
