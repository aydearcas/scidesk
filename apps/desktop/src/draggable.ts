// A dialog that can be dragged (the user's request, 25/11, record 0094): by its grip or any
// part of it that is not a field, a button or a result. It never leaves the window, and it
// opens again where it was left while the program is open (one place per kind of dialog).
import { useLayoutEffect, useRef } from "react";

const places = new Map<string, { x: number; y: number }>();
const INTERACTIVE = "input, textarea, select, button, a, label, li, [role=option], [contenteditable=true]";
const MARGIN = 8;

/** Ref and pointer handler for a dialog box; `key` names the place it keeps. */
export function useDraggable(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  const at = useRef(places.get(key) ?? { x: 0, y: 0 });
  /** The offset, kept inside the window (the box where it would be without it, plus the offset). */
  const place = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const base = { left: r.left - at.current.x, top: r.top - at.current.y, right: r.right - at.current.x, bottom: r.bottom - at.current.y };
    const cx = Math.max(MARGIN - base.left, Math.min(window.innerWidth - MARGIN - base.right, x));
    const cy = Math.max(MARGIN - base.top, Math.min(window.innerHeight - MARGIN - base.bottom, y));
    at.current = { x: cx, y: cy };
    el.style.transform = cx || cy ? `translate(${cx}px, ${cy}px)` : "";
  };
  // where it was left (still inside the window, if this one is smaller now)
  useLayoutEffect(() => { place(at.current.x, at.current.y); });
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as Element).closest(INTERACTIVE)) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const start = { px: e.clientX, py: e.clientY, ...at.current };
    el.classList.add("dragging");
    const move = (ev: PointerEvent) => place(start.x + ev.clientX - start.px, start.y + ev.clientY - start.py);
    const up = () => {
      el.classList.remove("dragging");
      places.set(key, at.current);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  return { ref, onPointerDown };
}
