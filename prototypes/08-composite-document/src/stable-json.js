// Deterministic JSON: sorted keys, two-space indent, trailing newline (PLAN.md 3.2),
// so that unchanged content always serialises to the same bytes.
export function stableStringify(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    return v;
  };
  return JSON.stringify(sort(value), null, 2) + "\n";
}
