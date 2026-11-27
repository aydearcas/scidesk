// "Review" in the right panel (design proposal 3.3, records 0044 and 0094): the comments of
// the article as threads, each one at the height of its text, as the margin of Word (D5: in
// the panel, not as balloons over the page), and the proposals of a copy returned by a
// co-author (records 0032 and 0097: each one with what can be done with it now); the merge
// of a whole round comes in phase 2b, in this same tab.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/core";
import type { ProposalSetFile } from "@scidesk/formats";
import type { CommentAnchor, CommentRecord } from "./comments.ts";
import type { ProposalState } from "./proposals-text.ts";
import { authorColor } from "./track-changes.ts";

export interface CommentThread { anchor: CommentAnchor; record: CommentRecord }
/** Record 0097: what the cards of the returned copy do. */
export interface ProposalActions {
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onGo: (id: string) => void;
  /** Brings these proposals (or every one that can be) into the text as tracked changes. */
  onBring: (ids?: string[]) => void;
  onCopy: (id: string) => void;
  /** The user made it by hand. */
  onDone: (id: string) => void;
  onAll: (accept: boolean) => void;
}
export interface CommentActions {
  /** Goes to the comment's text (and makes it the active one). */
  onGo: (id: string) => void;
  onNew: () => void;
  onSave: (id: string, text: string) => void;
  /** A new comment given up before it had any text: it goes away. */
  onDiscard: (id: string) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onReply: (id: string, text: string) => void;
  onDeleteReply: (id: string, index: number) => void;
  /** Gives the focus back to the text. */
  onDone: () => void;
}

export function ReviewPanel({ proposals: got, states, proposalActions, onImport, threads, active, comment, editor, copyRequest }: {
  proposals: { set: ProposalSetFile; name: string } | null;
  /** What each proposal is now (in the text, can go there, cannot…); null while it is worked out. */
  states: Map<string, ProposalState> | null;
  proposalActions: ProposalActions;
  onImport: (file: File, returnedBy: string) => Promise<void>;
  threads: CommentThread[];
  active: string | null;
  comment: CommentActions;
  /** The manuscript's editor while it is on screen: the threads go at the height of their text. Null: a list. */
  editor: Editor | null;
  /** Grows when the review bar asks for the returned copy: its part opens. */
  copyRequest: number;
}) {
  const { t } = useTranslation();
  const [returnedBy, setReturnedBy] = useState("");
  const [problem, setProblem] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [showDecided, setShowDecided] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const proposals = got?.set ?? null;
  useEffect(() => { if (copyRequest || proposals) setCopyOpen(true); }, [copyRequest, proposals]);
  const shown = proposals?.proposals.filter((p) => p.status !== "noise-hidden") ?? [];
  const stateOf = (id: string) => states?.get(id);
  const decided = shown.filter((p) => stateOf(p.id)?.kind === "decided").length;
  const bringable = shown.filter((p) => stateOf(p.id)?.kind === "can-place").map((p) => p.id);
  const decidable = shown.filter((p) => { const s = stateOf(p.id); return s && (s.kind === "in-text" || s.kind === "reverts" || (s.kind === "comment" && !s.problem)); }).length;
  const listed = shown.filter((p) => showDecided || stateOf(p.id)?.kind !== "decided");
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const act = (f: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); f(); };
  const resolved = threads.filter((x) => x.record.resolved).length;
  const visible = threads.filter((x) => showResolved || !x.record.resolved || x.anchor.id === active);
  const onFile = async () => {
    const file = input.current?.files?.[0];
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!returnedBy.trim()) { setProblem(t("needReturnedBy")); return; }
    setProblem("");
    try { await onImport(file, returnedBy.trim()); } catch (e) { setProblem(e instanceof Error ? e.message : String(e)); }
  };
  const aligned = !!editor && !editor.isDestroyed;
  return (
    <div className={`review${aligned ? " aligned" : ""}`}>
      <section className="comments" aria-label={t("ui.comments.title")}>
        <div className="comments-head">
          <h4>{t("ui.comments.title")}{threads.length - resolved ? <span className="count">{threads.length - resolved}</span> : null}</h4>
          <button className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={comment.onNew}>{t("ui.comments.new")}</button>
        </div>
        {resolved > 0 && (
          <label className="show-resolved small muted"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> {t("ui.comments.showResolved", { count: resolved })}</label>
        )}
        {threads.length === 0 ? <p className="muted small">{t("ui.comments.empty")}</p>
          : aligned ? <AlignedThreads editor={editor!} threads={visible} active={active} actions={comment} />
          : (
            <ul className="threads">
              {visible.map((x) => <Thread key={x.anchor.id} thread={x} active={x.anchor.id === active} actions={comment} />)}
            </ul>
          )}
      </section>
      <details className="returned-copy" open={copyOpen} onToggle={(e) => setCopyOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>{t("ui.comments.returnedCopy")}{shown.length - decided ? <span className="count">{shown.length - decided}</span> : null}</summary>
        <p className="muted small">{t("ui.reviewIntro")}</p>
        <label className="field">{t("returnedBy")}<input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} /></label>
        <label className={`file-button btn${returnedBy.trim() ? "" : " disabled"}`}>{t("importCopy")}<input ref={input} type="file" accept=".docx" onChange={() => void onFile()} aria-label={t("importCopy")} /></label>
        {problem && <p className="field-error" role="alert">{problem}</p>}
        {proposals && (
          <>
            <h4>{t("ui.proposalsOf", { name: got!.name, count: shown.length })}</h4>
            {shown.length > 0 && states && (
              <>
                <p className="muted small">{t("ui.proposals.left", { count: shown.length - decided })}</p>
                {(bringable.length > 0 || decidable > 0) && (
                  <div className="proposal-bulk">
                    {bringable.length > 0 && <button className="btn small primary" onMouseDown={keep} onClick={() => proposalActions.onBring()}>{t("ui.proposals.bring", { count: bringable.length })}</button>}
                    {decidable > 0 && <button className="btn small" onMouseDown={keep} onClick={() => proposalActions.onAll(true)}>{t("ui.proposals.acceptAll")}</button>}
                    {decidable > 0 && <button className="btn small" onMouseDown={keep} onClick={() => proposalActions.onAll(false)}>{t("ui.proposals.rejectAll")}</button>}
                  </div>
                )}
                {decided > 0 && (
                  <label className="show-resolved small muted"><input type="checkbox" checked={showDecided} onChange={(e) => setShowDecided(e.target.checked)} /> {t("ui.proposals.showDecided", { count: decided })}</label>
                )}
              </>
            )}
            {shown.length === 0 ? <p className="muted">{t("noProposals")}</p> : (
              <ul className="proposals">
                {listed.map((p) => {
                  const s = stateOf(p.id);
                  const problem = s?.kind === "problem" ? s.problem : s?.kind === "comment" ? s.problem : undefined;
                  const body = p.kind === "comment" && p.comment ? (
                    // record 0096: a new comment, or what the copy did with one sent
                    <>
                      <div><b>{p.author.name}</b> {[
                        p.comment.removed ? t("proposalComment.removed") : !p.comment.thread ? t("proposalComment.new") : p.comment.replies.length ? t("proposalComment.replies") : "",
                        p.comment.thread && p.comment.resolved === true ? t("proposalComment.resolves") : p.comment.thread && p.comment.resolved === false ? t("proposalComment.reopens") : "",
                      ].filter(Boolean).join(", ")} {p.before && <span className="muted">{t("proposalComment.on")} «{p.before}»</span>}</div>
                      {p.comment.text && <div className="comment-text">{p.comment.text}</div>}
                      {p.comment.replies.map((r, i) => <div key={i} className="comment-reply"><b>{r.author.name}</b>: {r.text}</div>)}
                    </>
                  ) : (
                    <>
                      <div><span className={p.tracked ? "tag tracked" : "tag"}>{p.tracked ? t("tracked") : t("untracked")}</span> <span className="who"><span className="dot" style={{ background: authorColor(p.author.name) }} aria-hidden="true" /><b>{p.author.name}</b></span> {t(`kinds.${p.kind}`)}</div>
                      <div>{p.before && <del>{p.before}</del>} {p.after && <ins>{p.after}</ins>}</div>
                    </>
                  );
                  // record 0097: what can be done with it now
                  return (
                    <li key={p.id} className={`card proposal${p.kind === "comment" ? " proposal-comment" : ""}${s ? ` state-${s.kind}` : ""}`} onClick={() => proposalActions.onGo(p.id)}>
                      {body}
                      {s?.kind === "reverts" && <p className="proposal-note small muted">{t("ui.proposals.reverts")}</p>}
                      {problem && <p className="proposal-note small warn">{t(`ui.proposals.problem.${problem}`)}</p>}
                      {s?.kind === "decided" && <p className="proposal-note small muted"><span className="tag">{t(`ui.proposals.decision.${p.decision}`)}</span></p>}
                      {s && s.kind !== "decided" && (
                        <div className="thread-actions">
                          {(s.kind === "in-text" || s.kind === "reverts" || (s.kind === "comment" && !s.problem)) && (
                            <>
                              <button className="btn small primary" onMouseDown={keep} onClick={act(() => proposalActions.onAccept(p.id))}>{t("ui.proposals.accept")}</button>
                              <button className="btn small" onMouseDown={keep} onClick={act(() => proposalActions.onReject(p.id))}>{t("ui.proposals.reject")}</button>
                            </>
                          )}
                          {s.kind === "can-place" && (
                            <>
                              <button className="btn small primary" onMouseDown={keep} onClick={act(() => proposalActions.onBring([p.id]))}>{t("ui.proposals.bringOne")}</button>
                              <button className="btn small" onMouseDown={keep} onClick={act(() => proposalActions.onReject(p.id))}>{t("ui.proposals.reject")}</button>
                            </>
                          )}
                          {problem && (
                            <>
                              {p.after && <button className="link small" onMouseDown={keep} onClick={act(() => proposalActions.onCopy(p.id))}>{t("ui.proposals.copy")}</button>}
                              <button className="link small" onMouseDown={keep} onClick={act(() => proposalActions.onDone(p.id))}>{t("ui.proposals.done")}</button>
                              <button className="link small" onMouseDown={keep} onClick={act(() => proposalActions.onReject(p.id))}>{t("ui.proposals.reject")}</button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="integrity muted small">{proposals.integrity === "ok" ? t("integrityOk") : t("integrityBad")}</p>
          </>
        )}
        {!proposals && <p className="muted small">{t("ui.reviewEmpty")}</p>}
      </details>
    </div>
  );
}

/**
 * The threads at the height of their text, as Word's margin: each card wants to start where
 * its comment starts on screen; one that would overlap the card above goes down. The active
 * one is exactly at its text, and the ones above it go up to make room. They follow the desk
 * as it scrolls, the text as it changes and each card as it grows; those out of sight are
 * counted at the top and the bottom, with a button to go to the nearest one.
 */
function AlignedThreads({ editor, threads, active, actions }: { editor: Editor; threads: CommentThread[]; active: string | null; actions: CommentActions }) {
  const { t } = useTranslation();
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLLIElement>());
  const [edges, setEdges] = useState({ above: [] as string[], below: [] as string[] });
  const latest = useRef({ threads, active });
  latest.current = { threads, active };

  const layout = useCallback(() => {
    const box = track.current;
    if (!box || editor.isDestroyed) return;
    const view = editor.view;
    const top0 = box.getBoundingClientRect().top;
    const height = box.clientHeight;
    const GAP = 6;
    const items = latest.current.threads.flatMap((x) => {
      const el = cards.current.get(x.anchor.id);
      if (!el) return [];
      let y = 0;
      try { y = view.coordsAtPos(Math.min(x.anchor.from + 1, view.state.doc.content.size), -1).top - top0; } catch { /* hidden */ }
      return [{ id: x.anchor.id, el, y, h: el.offsetHeight }];
    });
    // in the order they are on screen (several pages in a row are not in the order of the text)
    items.sort((a, b) => a.y - b.y);
    const pos = items.map((i) => i.y);
    const ai = items.findIndex((i) => i.id === latest.current.active);
    for (let i = Math.max(ai, 0) + 1; i < items.length; i++) pos[i] = Math.max(items[i].y, pos[i - 1] + items[i - 1].h + GAP);
    for (let i = ai - 1; i >= 0; i--) pos[i] = Math.min(items[i].y, pos[i + 1] - items[i].h - GAP);
    items.forEach((it, i) => { it.el.style.transform = `translateY(${Math.round(pos[i])}px)`; });
    const above = items.filter((it, i) => pos[i] + it.h < 0).map((it) => it.id);
    const below = items.filter((_, i) => pos[i] > height).map((it) => it.id);
    setEdges((e) => (e.above.join() === above.join() && e.below.join() === below.join() ? e : { above, below }));
  }, [editor]);

  // after every render, and on the next frame after a scroll, an edit or a card that grows
  useLayoutEffect(() => { layout(); });
  const frame = useRef(0);
  const schedule = useCallback(() => { cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(layout); }, [layout]);
  const sizes = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    const ro = new ResizeObserver(schedule);
    sizes.current = ro;
    if (track.current) ro.observe(track.current);
    for (const el of cards.current.values()) ro.observe(el);
    // the desk scrolls (capture: scroll events do not bubble), the window changes size, the text changes
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    editor.on("transaction", schedule);
    return () => {
      ro.disconnect();
      sizes.current = null;
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      editor.off("transaction", schedule);
      cancelAnimationFrame(frame.current);
    };
  }, [editor, schedule]);
  const keep = (id: string) => (el: HTMLLIElement | null) => {
    const old = cards.current.get(id);
    if (old && old !== el) sizes.current?.unobserve(old);
    if (el) { cards.current.set(id, el); sizes.current?.observe(el); } else cards.current.delete(id);
  };
  return (
    <div className="thread-track" ref={track}>
      <ul className="threads">
        {threads.map((x) => <Thread key={x.anchor.id} thread={x} active={x.anchor.id === active} actions={actions} cardRef={keep(x.anchor.id)} aligned />)}
      </ul>
      {edges.above.length > 0 && (
        <button className="track-more top" onMouseDown={(e) => e.preventDefault()} onClick={() => actions.onGo(edges.above[edges.above.length - 1])}>▲ {t("ui.comments.moreAbove", { count: edges.above.length })}</button>
      )}
      {edges.below.length > 0 && (
        <button className="track-more bottom" onMouseDown={(e) => e.preventDefault()} onClick={() => actions.onGo(edges.below[0])}>▼ {t("ui.comments.moreBelow", { count: edges.below.length })}</button>
      )}
    </div>
  );
}

/** Scrolls the panel (and only the panel: never the window, record 0083) to show `el`. */
function revealInPanel(el: HTMLElement) {
  let box = el.parentElement;
  while (box && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
  if (!box) return;
  const a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  if (a.top < b.top) box.scrollTop -= b.top - a.top + 8;
  else if (a.bottom > b.bottom) box.scrollTop += Math.min(a.top - b.top - 8, a.bottom - b.bottom + 8);
}

function Thread({ thread, active, actions, cardRef, aligned }: { thread: CommentThread; active: boolean; actions: CommentActions; cardRef?: (el: HTMLLIElement | null) => void; aligned?: boolean }) {
  const { t, i18n } = useTranslation();
  const { anchor, record } = thread;
  const id = anchor.id;
  const isNew = record.text === "" && record.replies.length === 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.text);
  const [reply, setReply] = useState("");
  const li = useRef<HTMLLIElement>(null);
  // in a list, the panel scrolls to the active one; at the height of the text, it is already there
  useEffect(() => { if (active && !aligned && li.current) revealInPanel(li.current); }, [active, aligned]);
  useEffect(() => { if (!editing) setDraft(record.text); }, [record.text, editing]);
  const when = (d: string) => new Date(d).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" });
  const quote = anchor.text.length > 90 ? `${anchor.text.slice(0, 88)}…` : anchor.text;
  const writing = isNew || editing;
  const save = () => {
    const text = draft.trim();
    if (!text) return;
    actions.onSave(id, text);
    setEditing(false);
    actions.onDone();
  };
  const cancel = () => {
    if (isNew) actions.onDiscard(id);
    else { setEditing(false); setDraft(record.text); }
    actions.onDone();
  };
  const sendReply = () => {
    const text = reply.trim();
    if (!text) return;
    actions.onReply(id, text);
    setReply("");
  };
  const keys = (ok: () => void, no: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ok(); }
    else if (e.key === "Escape") { e.preventDefault(); no(); }
  };
  const person = (name: string) => <span className="who"><span className="dot" style={{ background: authorColor(name) }} aria-hidden="true" />{name}</span>;
  return (
    <li ref={(el) => { li.current = el; cardRef?.(el); }} className={`card thread${active ? " active" : ""}${record.resolved ? " resolved" : ""}`} data-thread={id}
      onClick={(e) => { if (!(e.target as HTMLElement).closest("button, textarea, input, a")) actions.onGo(id); }}>
      <div className="thread-head">
        {person(record.author.name)}
        <span className="muted small">{when(record.date)}</span>
        {record.resolved && <span className="tag">{t("ui.comments.resolvedTag")}</span>}
      </div>
      {quote && <button className="quote" title={t("ui.comments.goTo")} onClick={() => actions.onGo(id)}>{quote}</button>}
      {writing ? (
        <div className="thread-write">
          <textarea autoFocus value={draft} rows={3} placeholder={t("ui.comments.placeholder")} aria-label={t("ui.comments.placeholder")}
            onChange={(e) => setDraft(e.target.value)} onKeyDown={keys(save, cancel)} />
          <div className="thread-actions">
            <button className="btn small primary" disabled={!draft.trim()} onClick={save}>{isNew ? t("ui.comments.post") : t("ui.comments.saveEdit")}</button>
            <button className="btn small" onClick={cancel}>{t("cancel")}</button>
          </div>
        </div>
      ) : <p className="thread-text">{record.text}</p>}
      {record.replies.length > 0 && (
        <ul className="replies">
          {record.replies.map((r, i) => (
            <li key={i}>
              <div className="thread-head">{person(r.author.name)}<span className="muted small">{when(r.date)}</span>
                <button className="link small" title={t("ui.comments.deleteReply")} aria-label={t("ui.comments.deleteReply")} onClick={() => actions.onDeleteReply(id, i)}>×</button>
              </div>
              <p className="thread-text">{r.text}</p>
            </li>
          ))}
        </ul>
      )}
      {!writing && (
        <>
          {active && !record.resolved && (
            <div className="thread-write">
              <textarea value={reply} rows={1} placeholder={t("ui.comments.reply")} aria-label={t("ui.comments.reply")}
                onChange={(e) => setReply(e.target.value)} onKeyDown={keys(sendReply, () => { setReply(""); actions.onDone(); })} />
              {reply.trim() && <div className="thread-actions"><button className="btn small primary" onClick={sendReply}>{t("ui.comments.send")}</button></div>}
            </div>
          )}
          <div className="thread-actions">
            <button className="link small" onClick={() => actions.onResolve(id, !record.resolved)}>{record.resolved ? t("ui.comments.reopen") : t("ui.comments.resolve")}</button>
            <button className="link small" onClick={() => setEditing(true)}>{t("ui.comments.edit")}</button>
            <button className="link small" onClick={() => actions.onDelete(id)}>{t("ui.comments.delete")}</button>
          </div>
        </>
      )}
    </li>
  );
}
