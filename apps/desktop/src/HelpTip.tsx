// A "?" in a circle next to a field's name: hovering it, or reaching it with the keyboard,
// shows what the field is and how to fill it in (the user's request, 22/11/2026). The text is
// also its accessible description, so a screen reader reads it with the field. The bubble is
// drawn over everything (side panels included) and kept inside the window.
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WIDTH = 320;
const MARGIN = 8;

export function HelpTip({ text, label }: { text: string; label?: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !button.current || !bubble.current) return;
    const b = button.current.getBoundingClientRect();
    const h = bubble.current.offsetHeight;
    const left = Math.max(MARGIN, Math.min(b.left - 8, window.innerWidth - WIDTH - MARGIN));
    // below the "?", or above it when there is no room
    const top = b.bottom + 6 + h > window.innerHeight - MARGIN ? Math.max(MARGIN, b.top - 6 - h) : b.bottom + 6;
    setAt({ left, top });
  }, [open]);
  const show = () => setOpen(true);
  const hide = () => { setOpen(false); setAt(null); };
  return (
    <span className="help-tip">
      <button ref={button} type="button" className="help-tip-button" aria-label={label ?? "?"} aria-describedby={id}
        onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
        onKeyDown={(e) => { if (e.key === "Escape") hide(); }}
        onClick={(e) => { e.preventDefault(); e.currentTarget.focus(); show(); }}>?</button>
      {/* always in the page for screen readers; shown only while open */}
      {createPortal(
        <span ref={bubble} role="tooltip" id={id} className={`help-tip-text${open && at ? " open" : ""}`}
          style={{ width: WIDTH, left: at?.left ?? -9999, top: at?.top ?? -9999 }}>{text}</span>,
        document.body,
      )}
    </span>
  );
}
