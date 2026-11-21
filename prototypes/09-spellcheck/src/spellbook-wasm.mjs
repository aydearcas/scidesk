// JavaScript side of rust-wasm/: load the module once, then one Dictionary per language.
const enc = new TextEncoder();
const dec = new TextDecoder();

export async function loadSpellbook(wasmBytes) {
  const { instance } = await WebAssembly.instantiate(wasmBytes, {});
  const x = instance.exports;
  const put = (str) => {
    const bytes = enc.encode(str);
    const ptr = x.alloc(bytes.length);
    new Uint8Array(x.memory.buffer, ptr, bytes.length).set(bytes);
    return [ptr, bytes.length];
  };
  const withString = (str, fn) => {
    const [ptr, len] = put(str);
    try {
      return fn(ptr, len);
    } finally {
      x.dealloc(ptr, len);
    }
  };
  return {
    memoryBytes: () => x.memory.buffer.byteLength,
    dictionary(aff, dic) {
      const handle = withString(aff, (ap, al) => withString(dic, (dp, dl) => x.dict_new(ap, al, dp, dl)));
      if (!handle) throw new Error("dictionary does not parse");
      return {
        /** One boolean per word; call it with a whole paragraph's words. */
        checkMany(words) {
          if (!words.length) return [];
          return withString(words.join("\n"), (p, l) => {
            const out = x.check_many(handle, p, l);
            return Array.from(new Uint8Array(x.memory.buffer, out, words.length), (b) => b === 1);
          });
        },
        check(word) {
          return this.checkMany([word])[0];
        },
        suggest(word) {
          return withString(word, (p, l) => {
            const out = x.suggest(handle, p, l);
            const s = dec.decode(new Uint8Array(x.memory.buffer, out, x.out_len()));
            return s ? s.split("\n") : [];
          });
        },
        add(word) {
          return withString(word, (p, l) => x.add_word(handle, p, l) === 1);
        },
      };
    },
  };
}
