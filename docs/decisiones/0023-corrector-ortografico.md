# 0023. Corrector ortográfico: spellbook en WebAssembly y diccionario de especialidad

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 9 de la fase 0). La parte del diccionario de especialidad queda por diseñar.
- **Pregunta del plan:** R29 (prototipo 9 de la sección 8)

## Qué se decide
- **El motor es spellbook** (Rust, MPL-2.0, compatible con los diccionarios de Hunspell), **compilado a WebAssembly y ejecutado en un *web worker*** del editor, detrás de una interfaz propia. Si spellbook fallara, la alternativa es Hunspell en WebAssembly, que da las mismas respuestas.
- **Diccionarios:**
  - Español: `es_ES` de LibreOffice (RLA-ES), usado con su opción MPL-1.1.
  - Inglés: `en_US` de SCOWL, y `en_GB` también de SCOWL, no la versión LGPL de LibreOffice.
  - Se distribuyen como archivos de datos aparte.
- **Funcionamiento en el editor:**
  - Subrayados dibujados por el editor.
  - El idioma de cada palabra sale de su marca `lang`, si no del atributo `lang` del párrafo, y si no del idioma del documento.
  - Una caché por palabra e idioma, para que solo viajen al *worker* las palabras nuevas. El *worker* recibe palabras sueltas, nunca el documento.
  - Comprobación tras una pausa de 150 ms.
  - No se comprueban las siglas, las palabras con cifras, las citas y referencias cruzadas (son nodos sin texto) ni la bibliografía, que se genera desde la biblioteca.
- **Diccionario del proyecto** en `resources/`, válido para todos los idiomas, con «Añadir al diccionario del proyecto» en el menú contextual.
- **Hace falta un diccionario de especialidad** (biomedicina y reumatología, en español e inglés) incluido con el programa.

## Por qué
- **Rapidez:** en WebAssembly carga el español en 29–34 ms, comprueba 9.800 palabras en 24 ms y 84.000 en 142 ms, y sugiere en 23 ms de mediana. Con los dos idiomas ocupa 6,9 MB.
- **En el editor:**
  - El subrayado aparece 155–160 ms después de la última tecla.
  - Cada pulsación en un artículo de 6.500 palabras cuesta 2,2 ms en el hilo de la interfaz.
  - El fragmento en inglés dentro de un párrafo en español se corrige en inglés.
- **Exactitud:** sobre 13.217 palabras distintas (reales y erratas), spellbook coincide con Hunspell salvo en una errata inventada, en español, y en ninguna en inglés. La advertencia de su README de que es una versión alfa queda acotada para estos diccionarios.
- **WebAssembly en lugar de nativo:**
  - No cruza el IPC de Tauri y es idéntico en WebView2 y WKWebView.
  - El núcleo sin interfaz y `scidesk check` (R33) usan el mismo módulo en Node.
  - El nativo es algo más rápido, pero las cifras sobran en los dos casos.
- **spellbook frente a Hunspell en WebAssembly:** tiene mantenimiento activo (el editor Helix) mientras que `hunspell-asm` no se actualiza desde 2022 y arrastra avisos de seguridad. Además es más pequeño (392 KB) y más rápido al cargar y comprobar.
- **El diccionario de especialidad es imprescindible.** En dos revisiones reales del usuario, el diccionario general deja en el cuerpo del texto unos 16 subrayados por cada 1.000 palabras, y ninguno es una errata. Casi todos son vocabulario de la especialidad: reumatólogo, metaanálisis, espondiloartritis, psoriásica, aleatorizado, nombres de fármacos… Para «metotrexato» sugiere «mamotreto».

## Qué se descartó
- El corrector del motor web: no admite idioma por fragmento ni diccionario del proyecto, y es distinto en cada sistema (ya descartado en R29).
- nspell: memoria y velocidad justas con el español (ya descartado).
- spellbook nativo a través del IPC de Tauri: más complejo y sin ventaja apreciable.
- `hunspell-asm` como motor principal: sin mantenimiento y con avisos de seguridad.
- zspell (licencia no estándar) y SymSpell (no entiende la morfología de Hunspell).
- `en_GB` de LibreOffice (LGPL).

## Consecuencias
- **Diccionario de especialidad.** Hay que diseñar cómo se construye y se mantiene: qué fuentes y con qué licencia (DeCS y MeSH, nombres de fármacos, listas de reumatología), en qué formato (un `.dic` adicional con los afijos de `es_ES` para que acepte plurales y femeninos) y cómo se amplía. Los paquetes para LLM de nivel 0 ([0018](0018-paquetes-llm.md)) ya preveían ayudar a construirlo.
- Las palabras compuestas con guion, los nombres propios y la puntuación quedan para la fase 1.
- En la fase 1, las decoraciones se recalculan solo en los párrafos que cambian.
- WKWebView se comprueba en el prototipo 11.
- Detalle y cifras en [`prototypes/09-spellcheck/README.md`](../../prototypes/09-spellcheck/README.md).
