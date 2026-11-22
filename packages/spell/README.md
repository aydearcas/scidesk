# @scidesk/spell

SciDesk's spell checker (records [0023](../../docs/decisiones/0023-corrector-ortografico.md) and [0057](../../docs/decisiones/0057-corrector-en-el-editor.md)): spellbook compiled to WebAssembly, the Hunspell dictionaries it loads, and the rules for what is a word. The editor runs it in a web worker; Node can load it too.

## Contents

| Path | What | Licence |
|---|---|---|
| `rust/` | spellbook 0.4 behind a C-style interface (`dict_new`, `check_many`, `suggest`, `add_word`) | SciDesk's (AGPL-3.0-or-later); spellbook is MPL-2.0 |
| `assets/spellwasm.wasm` | `rust/` built for `wasm32-unknown-unknown` (`npm run build:wasm`) | as above |
| `assets/dicts/es_ES.*` | Spanish dictionary of the RLA-ES project (LibreOffice), from LibreOffice/dictionaries | GPL-3.0+, LGPL-3.0+ or MPL-1.1+, at the user's choice: SciDesk uses it under the MPL (`LICENSE_es_ES.md`, `README_hunspell_es.txt`) |
| `assets/dicts/en_US.*` | American English dictionary from SCOWL (LibreOffice/dictionaries) | SCOWL's permissive licence (`README_en_US.txt`) |
| `assets/dicts/biomed_*.dic` | the specialty dictionary (biomedicine), built from `specialty/` (`npm run build:specialty`); loaded after the general dictionary of its language (record 0059) | AGPL-3.0-or-later, written for SciDesk (`specialty/README.md`) |
| `src/` | the WebAssembly wrapper, the word rules, the project dictionary file and the specialty lists | AGPL-3.0-or-later |
| `tools/` | `build-specialty.ts` and `measure-text.ts` (underlined words in a plain text) | AGPL-3.0-or-later |

The dictionaries are data files shipped as they are, apart from the program. British English (`en_GB`) is not included yet: LibreOffice's is LGPL, and SCOWL's own en_GB still has to be fetched (record 0023). Until then, English text is checked with `en_US`.

## Building the WebAssembly module

```sh
rustup target add wasm32-unknown-unknown
npm run build:wasm --workspace @scidesk/spell
```
