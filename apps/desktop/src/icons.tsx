// Line icons, 24 × 24 with a 1.7 px stroke (design proposal, section 7). Drawn here so the
// app carries no icon dependency; every icon goes with a visible name or an aria-label.
const PATHS: Record<string, string> = {
  article: "M7 3h7l5 5v13H7z M14 3v5h5 M10 12h6 M10 16h6",
  library: "M5 4h4v16H5z M10 4h4v16h-4z M15.5 4.5l3.8-1 3.2 15.5-3.8 1z",
  settings: "M4 7h10 M18 7h2 M4 17h4 M12 17h8 M16 5v4 M10 15v4",
  folder: "M3 6h6l2 2h10v11H3z",
  table: "M4 5h16v14H4z M4 10h16 M4 14.5h16 M10 5v14",
  figure: "M4 5h16v14H4z M4 16l5-5 4 4 2-2 5 5 M15 9.5a1.2 1.2 0 1 0 0.01 0",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14c2 .8 3 3 3 6",
  send: "M4 6h16v12H4z M4 7l8 6 8-6",
  undo: "M9 7L4 12l5 5 M4 12h11a5 5 0 0 1 0 10h-3",
  redo: "M15 7l5 5-5 5 M20 12H9a5 5 0 0 0 0 10h3",
  quote: "M5 15c0-4 1.5-6 4-7 M5 15h3v3H5z M13 15c0-4 1.5-6 4-7 M13 15h3v3h-3z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  omega: "M5 19h4v-2.5A6.5 6.5 0 1 1 15 16.5V19h4",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  close: "M6 6l12 12 M18 6L6 18",
  panelLeft: "M4 5h16v14H4z M9 5v14",
  panelRight: "M4 5h16v14H4z M15 5v14",
  files: "M8 3h8l4 4v11H8z M16 3v4h4 M4 7v14h11",
  concepts: "M5 6h14 M8 11h11 M8 16h11 M5 11h.01 M5 16h.01",
  blocking: "M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z M12 7.5v5.5 M12 16.3v.2",
  review: "M12 3.5L22 20H2z M12 9.5v4.5 M12 17v.2",
  correct: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12.5l2.7 2.7L16.5 9.5",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5.5 M12 7.7v.2",
  check: "M5 12.5l4.5 4.5L19 7.5",
  textColor: "M6 16L12 4l6 12 M8.2 11.5h7.6",
  highlight: "M14 4l6 6-8 8H6v-6z M10 8l6 6",
  download: "M12 4v11 M7 10l5 5 5-5 M5 20h14",
  // a page with a tick: "adapt to the journal" (record 0047)
  adapt: "M7 3h7l5 5v13H7z M14 3v5h5 M9.5 14.5l2 2 4-4.5",
  palette: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.4-1-1.8-1-2.9 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon${className ? ` ${className}` : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The four levels of a warning: a colour and a shape (design proposal, section 7). */
export function LevelIcon({ level, size = 16 }: { level: "blocking" | "review" | "info" | "correct"; size?: number }) {
  return <Icon name={level} size={size} className={`level-icon ${level}`} />;
}
