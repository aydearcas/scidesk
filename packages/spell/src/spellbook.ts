// spellbook (MPL-2.0) compiled to WebAssembly (rust/), behind a small interface: load the
// module once, then one Dictionary per language (record 0023). Strings cross the boundary as
// UTF-8 in buffers the module allocates. Runs in a web worker (the window) or in Node.
const enc = new TextEncoder();
const dec = new TextDecoder();

interface Exports {
  memory: WebAssembly.Memory;
  alloc(len: number): number;
  dealloc(ptr: number, len: number): void;
  dict_new(aff: number, affLen: number, dic: number, dicLen: number): number;
  check_many(handle: number, ptr: number, len: number): number;
  suggest(handle: number, ptr: number, len: number): number;
  out_len(): number;
  add_word(handle: number, ptr: number, len: number): number;
}

export interface Dictionary {
  /** One boolean per word (true: correct); one call per batch keeps crossing into WebAssembly cheap. */
  checkMany(words: string[]): boolean[];
  check(word: string): boolean;
  suggest(word: string): string[];
  /** Adds a word for this session (the project dictionary); Hunspell's "word/flags" is accepted. */
  add(word: string): boolean;
}

export interface Spellbook {
  dictionary(aff: string, dic: string): Dictionary;
  memoryBytes(): number;
}

export async function loadSpellbook(wasm: BufferSource): Promise<Spellbook> {
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const x = instance.exports as unknown as Exports;
  const withString = <T>(str: string, fn: (ptr: number, len: number) => T): T => {
    const bytes = enc.encode(str);
    const ptr = x.alloc(bytes.length);
    new Uint8Array(x.memory.buffer, ptr, bytes.length).set(bytes);
    try { return fn(ptr, bytes.length); } finally { x.dealloc(ptr, bytes.length); }
  };
  return {
    memoryBytes: () => x.memory.buffer.byteLength,
    dictionary(aff, dic) {
      const handle = withString(aff, (ap, al) => withString(dic, (dp, dl) => x.dict_new(ap, al, dp, dl)));
      if (!handle) throw new Error("the dictionary does not parse");
      const d: Dictionary = {
        checkMany(words) {
          if (!words.length) return [];
          // a word with a line break would shift every answer after it
          const clean = words.map((w) => w.replace(/\n/g, " "));
          return withString(clean.join("\n"), (p, l) => {
            const out = x.check_many(handle, p, l);
            return Array.from(new Uint8Array(x.memory.buffer, out, words.length), (b) => b === 1);
          });
        },
        check: (word) => d.checkMany([word])[0],
        suggest: (word) => withString(word, (p, l) => {
          const out = x.suggest(handle, p, l);
          const s = dec.decode(new Uint8Array(x.memory.buffer, out, x.out_len()));
          return s ? s.split("\n") : [];
        }),
        add: (word) => withString(word, (p, l) => x.add_word(handle, p, l) === 1),
      };
      return d;
    },
  };
}
