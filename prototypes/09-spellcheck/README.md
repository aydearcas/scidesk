# Prototipo 9: corrector ortográfico

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R29). Decisión resultante: [ficha 0023](../../docs/decisiones/0023-corrector-ortografico.md).

## Pregunta

¿Qué motor carga rápido el diccionario español, corrige un artículo de 5000 palabras sin retraso y admite idioma por fragmento?

## Respuesta

**spellbook (Rust, MPL-2.0) compilado a WebAssembly, en un *web worker* del editor.**

**Rapidez:**
- Carga el diccionario español en 29–34 ms, el inglés en 10–19 ms, y los dos ocupan 6,9 MB de memoria.
- Comprueba 9.800 palabras en 24 ms y 84.000 en 142 ms.
- Las sugerencias tardan 23 ms de mediana.

**Exactitud:** da las mismas respuestas que Hunspell. En 13.217 palabras distintas (palabras reales y erratas fabricadas) hay una sola discrepancia, en una errata inventada.

**Funciona en el editor** con idioma por fragmento, diccionario del proyecto y subrayados dibujados por el propio editor. La línea ondulada aparece 155–160 ms después de la última tecla: 150 ms son una pausa a propósito y el resto, la comprobación. Mientras se escribe en un artículo de 6.500 palabras, cada pulsación cuesta 2,2 ms de mediana en el hilo de la interfaz.

### Los tres motores, con el mismo texto

Corpus: dos revisiones narrativas reales del usuario (9.783 palabras, con la lista de referencias en inglés); para la concordancia, además, un informe de 82.000 palabras y el artículo sintético.

| | spellbook nativo (Rust) | **spellbook en WebAssembly** | Hunspell en WebAssembly (`hunspell-asm`) |
|---|---|---|---|
| Cargar español / inglés | 16 / 9 ms | **29–34 / 10–19 ms** | 45–63 / 29–30 ms |
| Comprobar 9.783 palabras | 14 ms | **24 ms** (por párrafos) | 38 ms |
| Sugerencias, mediana / p95 / máximo (español) | 28 / 112 / 312 ms | **23 / 91 / 184 ms** | 19 / 83 / 634 ms |
| Sugerencia correcta entre las 5 primeras (erratas fabricadas) | 183 de 186 | 184 de 188 | 183 de 186 |
| Discrepancias con Hunspell en 13.217 palabras distintas | 1 (español), 0 (inglés) | 0 con el nativo | — |
| Tamaño | — | 392 KB | 780 KB de JS con WebAssembly incrustado |
| Mantenimiento | activo (versión de junio de 2026, proyecto del editor Helix) | el mismo | última versión de junio de 2022; `npm audit` avisa de vulnerabilidades en sus dependencias |

La única discrepancia es «Miniserio», una errata fabricada a partir de «Ministerio»: Hunspell la acepta, seguramente como «mini-» más «serio», y spellbook la rechaza.

### Por qué WebAssembly y no nativo

El nativo es algo más rápido, pero cada comprobación tendría que cruzar de la interfaz a Rust por el IPC de Tauri. En WebAssembly:
- El corrector vive en un *worker* junto al editor.
- Se comporta igual en WebView2 y en WKWebView.
- El núcleo sin interfaz y la línea de comandos (`scidesk check`, R33) pueden usar el mismo módulo en Node.

Las cifras sobran en los dos casos.

### En el editor

`src/spellcheck.js` es un complemento de Tiptap:
- **El idioma de cada palabra** sale de la marca `lang` de su texto; si no la tiene, del atributo `lang` de su párrafo; si tampoco, del idioma del documento.
- **El *worker*** recibe palabras sueltas, nunca el documento, y responde con un sí o un no por palabra.
- **La caché** recuerda la respuesta de cada palabra en cada idioma, así que solo viajan las palabras nuevas. En el artículo de 6.500 palabras, la primera comprobación manda 1.531 palabras distintas y tarda 3,3 ms en el *worker*.
- **No se comprueban** las siglas (DAS28, AKOA), las palabras con cifras ni las letras sueltas.
- **El menú contextual** da las sugerencias en el idioma de la palabra y permite «Añadir al diccionario del proyecto», que vale para todos los idiomas.
- **Con el teclado real:**
  - Una errata escrita se subraya.
  - El fragmento marcado en inglés dentro de un párrafo en español no se subraya.
  - Las erratas de un párrafo en inglés sí.
  - Una palabra añadida al diccionario del proyecto deja de subrayarse.

### Falsos positivos con un texto real

Sin diccionario de especialidad, el diccionario general rechaza el 13,6 % de las palabras de las dos revisiones (1.330 de 9.783). Ninguna es una errata real:

| Causa | Palabras distintas | Apariciones | Qué lo resuelve |
|---|---|---|---|
| Palabras en inglés (casi todas en los títulos de las referencias) | 253 | 744 | El idioma por fragmento. En SciDesk la bibliografía se genera desde la biblioteca y no se corrige |
| Con mayúscula inicial (autores, revistas, lugares) | 187 | 271 | Igual: casi todas están en las referencias |
| Siglas | 84 | 162 | No se comprueban |
| Vocabulario técnico en minúscula | 68 | 153 | Un diccionario de especialidad y el del proyecto |

En el cuerpo del texto, sin la lista de referencias (5.832 palabras), quedan **95 subrayados, unos 16 por cada 1.000 palabras**. Casi todos son vocabulario de la especialidad que el diccionario general no tiene: reumatólogo, reumatología, metaanálisis, espondiloartritis, psoriásica, aleatorizado, multicéntrico, fármacos como adalimumab o hidroxicloroquina… y unas pocas palabras en inglés sin marcar. Al pedirle sugerencias para «metotrexato», el diccionario general propone «mamotreto».

**Sin un diccionario de biomedicina y reumatología, el corrector subraya demasiado para ser útil en un artículo clínico.**

## Diccionarios y licencias

- **Español:** `es_ES` de LibreOffice (RLA-ES), con triple licencia GPL-3, LGPL-3 o MPL-1.1; SciDesk lo usaría con la MPL-1.1.
- **Inglés de EE. UU.:** `en_US`, de SCOWL, con licencia de tipo BSD.
- **Inglés británico:** `en_GB` de LibreOffice es LGPL; para no depender de esa licencia conviene usar la versión que publica SCOWL.
- **spellbook:** MPL-2.0, una licencia de copyleft por archivo compatible con la licencia dual de SciDesk (0012).
- **Repositorio:** los diccionarios no se guardan en él; se descargan con `tools/get-dicts.sh`.

## Lo que este prototipo no cubre

- **WebKit:** el *worker* y WebAssembly se han medido en Node (V8) y en Chromium. En WKWebView se comprueba en el prototipo 11.
- **El diccionario de especialidad:** cómo construirlo (DeCS y MeSH, nombres de fármacos, términos de reumatología), qué licencia tiene cada fuente y cómo se amplía. Los paquetes para LLM de nivel 0 (0018) ya lo preveían.
- **Palabras compuestas con guion** (Kellgren-Lawrence se comprueba por partes), los nombres propios y la puntuación (espacio antes de un signo, comillas).
- **Rendimiento con muchos más subrayados:** las decoraciones se recalculan para todo el documento en cada cambio (2,2 ms con 6.500 palabras). En la fase 1 se recalculará solo lo que cambia.
- **Varias variantes regionales a la vez** (es_ES y es_MX).

## Cómo se ejecuta

Requisitos: Node 24, Rust con el objetivo `wasm32-unknown-unknown` (`rustup target add wasm32-unknown-unknown`) y `sh` (Git Bash).

```powershell
npm install
npm run dicts
npm run wasm
npm run native
```

**Mediciones** (el texto de prueba va en `private/`, fuera de git, extraído con `python -I tools/docx_text.py <docx> private/<nombre>.txt`):
- `rust/target/release/spellbench.exe dicts/es_ES.aff dicts/es_ES.dic private/corpus-es.txt --words private/words-es-spellbook.tsv`: spellbook nativo.
- `node src/hunspell-bench.mjs es_ES private/words-es-spellbook.tsv private/corpus-es.txt --disagree private/disagree-es.tsv`: Hunspell y la concordancia.
- `node src/wasm-bench.mjs es_ES private/words-es-spellbook.tsv private/corpus-es.txt`: spellbook en WebAssembly.
- `node src/classify-unknown.mjs private/corpus-es.txt`: por qué se rechaza cada palabra (solo recuentos; las listas van a `private/`).

**Editor:** `npm run dev` y abre `http://localhost:5180/`. «Cargar un artículo largo» usa `private/review-tto.txt` si existe.

## Archivos

- `rust/src/main.rs`: banco de pruebas nativo.
- `rust-wasm/src/lib.rs`: spellbook con una interfaz mínima para WebAssembly (cargar diccionario, comprobar en lote, sugerir, añadir palabra).
- `src/spellbook-wasm.mjs`: el lado de JavaScript del módulo.
- `src/spell-worker.js`: el *worker* con un diccionario por idioma y el diccionario del proyecto.
- `src/spellcheck.js`: el complemento del editor (idioma por fragmento, caché, subrayados).
- `src/main.js` e `index.html`: la página de prueba.
- `src/hunspell-bench.mjs`, `src/wasm-bench.mjs`, `src/classify-unknown.mjs` y `src/words.mjs`: mediciones.
- `tools/get-dicts.sh`: descarga de diccionarios. `tools/docx_text.py`: texto de un DOCX.
