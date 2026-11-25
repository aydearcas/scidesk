// The first line of a comment's thread when the pointer is over its text (design proposal 4.2,
// record 0094), with who wrote it and how many replies it has. Drawn outside the editor's DOM:
// changing an element ProseMirror draws (its title) could make it read the text again.
// It never covers the interface (the user's request): it stays inside the area of the sheet,
// above the line when it fits there, below it otherwise.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { comments } from "./comments.ts";
import { scrollerOf } from "./reveal.ts";
import { authorColor } from "./track-changes.ts";

/** The line of commented text under the pointer and the area it may use (window coordinates). */
interface Tip { id: string; x: number; lineTop: number; lineBottom: number; area: { top: number; bottom: number; left: number; right: number } }
/** Space between the text and the box, and between the box and the edges of the area. */
const GAP = 10;
const EDGE = 4;

export function CommentHover() {
  const { t } = useTranslation();
  const [tip, setTip] = useState<Tip | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(".ProseMirror span.comment");
      const id = el?.getAttribute("data-comment");
      if (!el || !id || document.documentElement.dataset.markup === "original") { setTip(null); return; }
      // the line of the commented text under the pointer
      const lines = [...el.getClientRects()];
      const r = lines.find((l) => e.clientY >= l.top - 1 && e.clientY <= l.bottom + 1) ?? el.getBoundingClientRect();
      // the area of the sheet: the desk that scrolls it (or, in a short text, what holds the editor)
      const editor = el.closest(".ProseMirror") as HTMLElement;
      const desk = scrollerOf(editor) ?? editor.parentElement?.parentElement ?? editor;
      const a = desk.getBoundingClientRect();
      const area = { top: Math.max(0, a.top), bottom: Math.min(window.innerHeight, a.bottom), left: Math.max(0, a.left), right: Math.min(window.innerWidth, a.right) };
      setTip((old) => (old?.id === id ? old : { id, x: e.clientX, lineTop: r.top, lineBottom: r.bottom, area }));
    };
    const hide = () => setTip(null);
    document.addEventListener("mouseover", over);
    document.addEventListener("mousedown", hide, true);
    document.addEventListener("keydown", hide, true);
    document.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mousedown", hide, true);
      document.removeEventListener("keydown", hide, true);
      document.removeEventListener("scroll", hide, true);
    };
  }, []);
  // once drawn, its size decides where it goes
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !tip) return;
    const { area } = tip;
    el.style.maxWidth = `${Math.max(160, Math.min(320, area.right - area.left - 2 * EDGE))}px`;
    const w = el.offsetWidth, h = el.offsetHeight;
    const roomAbove = tip.lineTop - GAP - area.top;
    const roomBelow = area.bottom - tip.lineBottom - GAP;
    const above = roomAbove >= h + EDGE || roomAbove >= roomBelow;
    const top = above ? Math.max(area.top + EDGE, tip.lineTop - GAP - h) : Math.min(area.bottom - EDGE - h, tip.lineBottom + GAP);
    const left = Math.max(area.left + EDGE, Math.min(tip.x - 12, area.right - EDGE - w));
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.visibility = "visible";
  }, [tip]);
  const c = tip ? comments.registry[tip.id] : null;
  // a comment still being written has nothing to show yet
  if (!tip || !c || (!c.text && !c.replies.length)) return null;
  const first = c.text.split("\n")[0];
  const line = first.length > 120 ? `${first.slice(0, 118)}…` : first;
  return (
    <div ref={box} className="comment-tip" role="tooltip" style={{ top: 0, left: 0, visibility: "hidden" }}>
      <div className="comment-tip-head">
        <span className="dot" style={{ background: authorColor(c.author.name) }} aria-hidden="true" />
        <b>{c.author.name}</b>
        {c.resolved && <span className="muted">· {t("ui.comments.resolvedTag")}</span>}
      </div>
      <div>{line}</div>
      {c.replies.length > 0 && <div className="muted small">{t("ui.comments.replies", { count: c.replies.length })}</div>}
    </div>
  );
}
