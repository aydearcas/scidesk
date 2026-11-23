// Brings a part of the text into view by scrolling only the desk (the sheet's own scroller).
// The DOM's scrollIntoView scrolls every ancestor that can scroll, also the ones with
// overflow: hidden: near the end of the text, where the desk cannot scroll any further, it
// moved the whole window up and hid the title bar, the ribbon and the tabs (phase 1 test).

export type RevealBlock = "start" | "center" | "nearest";

/** Scrolls `scroller` so that `target` (an element or a rectangle in window coordinates) shows. */
export function revealIn(scroller: HTMLElement, target: Element | DOMRect, block: RevealBlock = "nearest", smooth = false) {
  const box = scroller.getBoundingClientRect();
  const r = target instanceof Element ? target.getBoundingClientRect() : target;
  const margin = Math.min(48, box.height / 6);
  let delta = 0;
  if (block === "start") delta = r.top - box.top - margin;
  else if (block === "center") delta = r.top + r.height / 2 - (box.top + box.height / 2);
  else if (r.top < box.top + margin) delta = r.top - box.top - margin;
  else if (r.bottom > box.bottom - margin) delta = Math.min(r.bottom - box.bottom + margin, r.top - box.top - margin);
  if (Math.abs(delta) < 1) return;
  const top = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, scroller.scrollTop + delta));
  scroller.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}

/** The desk the editor is in (the nearest ancestor that scrolls vertically). */
export function scrollerOf(el: Element | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}
