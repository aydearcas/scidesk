// Classic menus (D4, record 0043) and drop-down buttons (Export). One open at a time;
// Escape or a click outside closes it; arrows move between items and between menus.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons.tsx";

export type MenuEntry =
  | "-"
  | { label: string; onSelect: () => void; shortcut?: string; disabled?: boolean; checked?: boolean; hint?: string; title?: string };
export interface MenuDef { id: string; label: string; items: MenuEntry[] }

function focusItem(list: HTMLElement | null, delta: number | "first" | "last") {
  if (!list) return;
  const items = [...list.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled), [role=menuitemcheckbox]:not(:disabled)")];
  if (!items.length) return;
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = delta === "first" ? 0 : delta === "last" ? items.length - 1 : (i + delta + items.length) % items.length;
  items[next].focus();
}

function MenuList({ items, onClose, labelledBy, className }: { items: MenuEntry[]; onClose: (refocus: boolean) => void; labelledBy: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className={`menu-list${className ? ` ${className}` : ""}`} role="menu" aria-labelledby={labelledBy}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); focusItem(ref.current, 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(ref.current, -1); }
        else if (e.key === "Home") { e.preventDefault(); focusItem(ref.current, "first"); }
        else if (e.key === "End") { e.preventDefault(); focusItem(ref.current, "last"); }
        else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); onClose(true); }
      }}>
      {items.map((it, i) => it === "-" ? <div key={i} className="menu-sep" role="separator" /> : (
        <button key={i} role={it.checked === undefined ? "menuitem" : "menuitemcheckbox"} aria-checked={it.checked} disabled={it.disabled} title={it.title}
          className={`menu-item${it.hint ? " with-hint" : ""}`}
          onClick={() => { onClose(false); it.onSelect(); }}>
          <span className="menu-check">{it.checked ? <Icon name="check" size={14} /> : null}</span>
          <span className="menu-label">{it.label}{it.hint && <span className="menu-hint">{it.hint}</span>}</span>
          {it.shortcut && <kbd className="menu-shortcut">{it.shortcut}</kbd>}
        </button>
      ))}
    </div>
  );
}

/** Closes on a click outside `root` and on Escape. */
function useDismiss(open: boolean, root: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as globalThis.Node)) close(); };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open, root, close]);
}

export function MenuBar({ menus, label }: { menus: MenuDef[]; label: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const close = () => setOpen(null);
  useDismiss(open !== null, root, close);
  const button = (id: string) => root.current?.querySelector<HTMLButtonElement>(`[data-menu="${id}"]`);
  const openAt = (i: number, focusFirst: boolean) => {
    const m = menus[(i + menus.length) % menus.length];
    setOpen(m.id);
    button(m.id)?.focus();
    if (focusFirst) requestAnimationFrame(() => focusItem(root.current?.querySelector(".menu-list") ?? null, "first"));
  };
  return (
    <div ref={root} className="menubar" role="menubar" aria-label={label}
      onKeyDown={(e) => {
        const i = menus.findIndex((m) => m.id === open);
        if (open && e.key === "ArrowRight") { e.preventDefault(); openAt(i + 1, true); }
        else if (open && e.key === "ArrowLeft") { e.preventDefault(); openAt(i - 1, true); }
      }}>
      {menus.map((m) => (
        <div key={m.id} className="menu">
          <button id={`menu-${m.id}`} data-menu={m.id} role="menuitem" aria-haspopup="menu" aria-expanded={open === m.id} className={`menu-button${open === m.id ? " open" : ""}`}
            onClick={() => setOpen(open === m.id ? null : m.id)}
            onMouseEnter={() => { if (open && open !== m.id) setOpen(m.id); }}
            onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openAt(menus.indexOf(m), true); } }}>
            {m.label}
          </button>
          {open === m.id && <MenuList items={m.items} labelledBy={`menu-${m.id}`} onClose={(refocus) => { close(); if (refocus) button(m.id)?.focus(); }} />}
        </div>
      ))}
    </div>
  );
}

/** A button that drops down a menu (Export, colours…). */
export function MenuButton({ id, label, items, className, children, title, align = "left", disabled }: {
  id: string; label: string; items: MenuEntry[]; className?: string; children?: ReactNode; title?: string; align?: "left" | "right"; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  return (
    <div ref={root} className="menu">
      <button id={id} className={className} aria-haspopup="menu" aria-expanded={open} title={title} aria-label={children ? label : undefined} disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); requestAnimationFrame(() => focusItem(root.current?.querySelector(".menu-list") ?? null, "first")); } }}>
        {children ?? label}
      </button>
      {open && <MenuList items={items} labelledBy={id} className={align === "right" ? "align-right" : undefined} onClose={(refocus) => { setOpen(false); if (refocus) document.getElementById(id)?.focus(); }} />}
    </div>
  );
}

/** The right-click menu, at the pointer; it takes the focus so that the keyboard works in it. */
export function ContextMenu({ x, y, items, label, onClose }: { x: number; y: number; items: MenuEntry[]; label: string; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useDismiss(true, root, onClose);
  useEffect(() => { focusItem(root.current, "first"); }, []);
  // kept inside the window
  const left = Math.min(x, window.innerWidth - 260);
  const top = Math.max(8, Math.min(y, window.innerHeight - 40 - items.length * 30));
  return (
    <div ref={root} className="context-menu" style={{ left, top, maxHeight: window.innerHeight - top - 8 }} aria-label={label}>
      <span id="context-menu-label" className="sr-only">{label}</span>
      <MenuList items={items} labelledBy="context-menu-label" onClose={onClose} />
    </div>
  );
}

/** A drop-down panel with free content (the colour palettes). */
export function Popover({ id, label, title, className, button, children, disabled }: {
  id: string; label: string; title?: string; className?: string; button: ReactNode; children: (close: () => void) => ReactNode; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  return (
    <div ref={root} className="menu" onKeyDown={(e) => { if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); document.getElementById(id)?.focus(); } }}>
      <button id={id} className={className} aria-haspopup="dialog" aria-expanded={open} aria-label={label} title={title ?? label} disabled={disabled} onClick={() => setOpen((o) => !o)}>{button}</button>
      {open && <div className="popover" role="dialog" aria-labelledby={id}>{children(() => setOpen(false))}</div>}
    </div>
  );
}
