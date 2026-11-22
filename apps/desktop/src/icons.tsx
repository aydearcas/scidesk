// Line icons, 24 × 24 with a 1.7 px stroke (design proposal, section 7). Drawn here so the
// app carries no icon dependency; every icon goes with a visible name or an aria-label.
const PATHS: Record<string, string> = {
  article: "M7 3h7l5 5v13H7z M14 3v5h5 M10 12h6 M10 16h6",
  library: "M5 4h4v16H5z M10 4h4v16h-4z M15.5 4.5l3.8-1 3.2 15.5-3.8 1z",
  // a cog: a closed outline with eight teeth and its hole (rays around a ring read as a sun, "light mode")
  settings: "M10.21 5.34 L10.58 2.51 L13.42 2.51 L13.79 5.34 L15.45 6.02 L17.71 4.28 L19.72 6.29 L17.98 8.55 L18.66 10.21 L21.49 10.58 L21.49 13.42 L18.66 13.79 L17.98 15.45 L19.72 17.71 L17.71 19.72 L15.45 17.98 L13.79 18.66 L13.42 21.49 L10.58 21.49 L10.21 18.66 L8.55 17.98 L6.29 19.72 L4.28 17.71 L6.02 15.45 L5.34 13.79 L2.51 13.42 L2.51 10.58 L5.34 10.21 L6.02 8.55 L4.28 6.29 L6.29 4.28 L8.55 6.02z M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z",
  folder: "M3 6h6l2 2h10v11H3z",
  save: "M5 4h11l3 3v13H5z M8 4v5h7V4 M8 20v-6h8v6",
  rowAbove: "M4 12h16v8H4z M4 16h16 M12 3v6 M9 6h6",
  rowBelow: "M4 4h16v8H4z M4 8h16 M12 15v6 M9 18h6",
  deleteRow: "M4 5h16v6H4z M9.5 14.5l5 5 M14.5 14.5l-5 5",
  colLeft: "M12 4h8v16h-8z M16 4v16 M3 12h6 M6 9v6",
  colRight: "M4 4h8v16H4z M8 4v16 M15 12h6 M18 9v6",
  deleteCol: "M5 4h6v16H5z M14.5 9.5l5 5 M19.5 9.5l-5 5",
  merge: "M4 5h16v14H4z M12 5v3.5 M12 15.5V19 M7 12h10 M9.5 9.5L7 12l2.5 2.5 M14.5 9.5L17 12l-2.5 2.5",
  split: "M4 5h16v14H4z M12 5v14 M6.5 12H10 M8.5 10l2 2-2 2 M17.5 12H14 M15.5 10l-2 2 2 2",
  headerRow: "M4 5h16v14H4z M4 10h16 M4 7.5h16 M4 5h16v5H4z",
  generalNote: "M6 4h12v16H6z M9 9h6 M9 13h6 M9 17h3",
  alignLeft: "M4 6h16 M4 10h10 M4 14h16 M4 18h10",
  alignCenter: "M4 6h16 M7 10h10 M4 14h16 M7 18h10",
  alignRight: "M4 6h16 M10 10h10 M4 14h16 M10 18h10",
  newFile: "M7 3h7l5 5v13H7z M14 3v5h5 M13 11v6 M10 14h6",
  wordFile: "M7 3h7l5 5v13H7z M14 3v5h5 M9.5 12l1.2 5 1.3-4 1.3 4 1.2-5",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L20 20",
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
  preview: "M3 4h8v16H3z M13 4h8v16h-8z M5 8h4 M5 11h4 M15 8h4 M15 11h4",
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
