// Same tokenizer and typo generator as the Rust benchmark (rust/src/main.rs).
export function words(text) {
  return text
    .split(/[^\p{L}'’0-9]+/u)
    .map((w) => w.replace(/^['’]+|['’]+$/g, ""))
    .filter((w) => [...w].length > 1 && !/[0-9]/.test(w));
}

const DEACCENT = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };
export function typos(good, n) {
  const out = [];
  good.forEach((w, i) => {
    if (out.length >= n) return;
    const chars = [...w];
    if (chars.length < 5) return;
    const de = chars.map((c) => DEACCENT[c] ?? c).join("");
    let typo;
    if (de !== w) typo = de;
    else if (i % 2 === 0) typo = chars.filter((_, j) => j !== chars.length >> 1).join("");
    else {
      const c = [...chars];
      [c[1], c[2]] = [c[2], c[1]];
      typo = c.join("");
    }
    if (typo !== w) out.push([typo, w]);
  });
  return out;
}
