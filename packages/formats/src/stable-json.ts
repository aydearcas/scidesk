// How every SciDesk file is written (PLAN 3.2, record 0021): keys sorted, two-space indent,
// a final newline, so that what does not change gives the same bytes and diffs are readable.
export function stableStringify(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]));
    }
    return v;
  };
  return JSON.stringify(sort(value), null, 2) + "\n";
}
