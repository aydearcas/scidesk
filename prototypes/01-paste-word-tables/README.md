# Prototipo 1: pegar tablas de Word

Prototipo desechable de la fase 0 (PLAN.md, sección 8; riesgo 7.1 y R23). Decisión resultante: [ficha 0022](../../docs/decisiones/0022-pegar-tablas-de-word.md).

## Pregunta

Al pegar tablas reales de Word en Tiptap, ¿cuántas quedan bien? ¿Incluye el portapapeles de Word los campos de las citas (Zotero, EndNote)?

## Corpus

En lugar de diez tablas sueltas, se probaron **las 135 tablas de un informe real de revisión sistemática del usuario**, unas 10.800 celdas:

| Característica | Tablas |
|---|---|
| Celdas combinadas en horizontal | 130 |
| Celdas combinadas en vertical | 119 |
| Celdas con varios párrafos | 58 |
| Superíndices | 84 |
| Sombreado | 97 |
| Filas de encabezado que se repiten en cada página | 49 |
| Símbolos de la fuente Wingdings 2 (✓) | 1 |
| Tabla anidada | 1 |

Las citas se probaron con tres párrafos de otra revisión del usuario: 16 citas de EndNote.

El documento es privado. Lo que se deriva de él (portapapeles capturado y verdad de referencia) está en `private/`, que git ignora, y este README solo da recuentos.

## Respuesta

**Con un limpiador específico del HTML de Office, las 135 tablas quedan bien (135/135).** Sin limpiador quedan 83. La estructura (filas y celdas combinadas) llega bien en todos los casos; lo que falla son detalles que el limpiador corrige.

| Comprobación | Sin limpiador | Con limpiador |
|---|---|---|
| Estructura: filas y celdas combinadas | 135 | 135 |
| Texto de cada celda | 133 | 135 |
| Párrafos por celda | 134 | 135 |
| Superíndice, subíndice, cursiva | 135 | 135 |
| Negrita (comparada con la que muestra Word, incluida la del estilo) | 135 | 135 |
| Filas de encabezado marcadas como encabezado | 86 | 135 |
| **Tablas bien en todo** | **83** | **135** |

Tiempo de pegado: 8 ms de mediana y 76 ms en la tabla más grande (508 celdas).

**Qué corrige el limpiador** (`src/clean.js`, aplicado como `transformPastedHTML` de Tiptap):
1. **Fuentes de símbolos.** Word escribe la marca ✓ como la letra «P» en Wingdings 2. Sin corregirlo, la celda dice «P». Se convierten a Unicode los caracteres de Wingdings, Wingdings 2 y Symbol (letras griegas, ≥, ≤, ±, ×…).
2. **Listas de Word.** El guion o el número de una lista llega como texto (en un `<span style="mso-list:Ignore">`), y quedaba «- » delante del texto. Se quita y los párrafos pasan a ser una lista de verdad.
3. **Filas de encabezado.** Las filas que Word repite en cada página llegan en `<thead>`, pero con celdas `<td>`, y el editor no sabía que eran encabezado. Se convierten en `<th>`.
4. **Tablas anidadas.** Una revista no las acepta. Se convierten en un párrafo por fila, con las celdas separadas por un tabulador y conservando la negrita y los superíndices.
5. **Rutas locales.** El HTML de Word lleva la ruta del documento de origen y rutas temporales del equipo (`msohtmlclip`). Solo se usa el contenido del `<body>`, así que no se guardan.

**Citas en el portapapeles (R23)**, con las 16 citas de EndNote de tres párrafos:
- **HTML** (lo que pega un navegador): lleva el campo de las 16 citas, escondido en comentarios condicionales (`<!--[if supportFields]>…ADDIN EN.CITE…<![endif]-->`). ProseMirror ignora los comentarios, así que sin hacer nada la cita queda como texto plano. Pero solo 6 de las 16 traen el registro completo de la referencia. Las otras 10 son `EN.CITE.DATA`, que EndNote guarda en los datos binarios del campo, y Word no los copia al HTML.
- **RTF** (`Rich Text Format`): lleva las 16 con su registro completo. Las 6 van en claro y las 10 en `{\*\datafield …}`, que es el XML de EndNote en hexadecimal.
- **Conclusión:** para conservar las citas al pegar desde Word hay que leer los campos de los comentarios del HTML y, para las `EN.CITE.DATA`, el RTF. Si no hay RTF, se buscan en la biblioteca por el texto de la cita. El lector de campos de EndNote es el del prototipo 10.

**Cómo se midió.** La verdad de referencia es la estructura que hay dentro del propio DOCX (`tools/docx_tables.py`): celdas combinadas por `w:gridSpan` y `w:vMerge`, el texto de cada párrafo, los símbolos de `w:sym` y las filas `w:tblHeader`. La negrita se compara con la que Word muestra de verdad (`tools/word-bold.ps1`), porque Word convierte en `<b>` también la que viene del estilo de la tabla o del párrafo.

**Ctrl+V real** (hecho a mano por el usuario en el navegador integrado de la aplicación, que es Chromium, el motor de WebView2), con cuatro de las tablas más difíciles: t2, la larga con negritas de estilo; t44, la anidada; t51, la de la lista; y t135, la de los símbolos y 44 filas:
- **Las cuatro quedan bien**, con el mismo resultado que el pegado automático.
- El evento de pegado entrega `text/plain`, `text/html` **y `text/rtf`**, así que las citas de EndNote del RTF se pueden leer sin salir del navegador.
- El HTML que entrega Chromium es siempre 56 caracteres más corto que el capturado del portapapeles. La diferencia está en el borde del documento (falta, por ejemplo, el salto de línea inicial) y no cambia el resultado.

**Por qué se puede confiar.** Cada tabla se copió con Word de escritorio (`Range.Copy`, lo mismo que Ctrl+C) y se guardó el formato `HTML Format` del portapapeles. El HTML se leyó con la API de Windows, porque .NET lo decodifica con la página de códigos ANSI y estropea los acentos. Ese HTML se pegó con `view.pasteHTML`, que sigue el mismo camino que Ctrl+V en ProseMirror.

## Lo que este prototipo no cubre

- **Ctrl+V real de las 135.** Se hizo a mano con 4 tablas, porque las teclas del navegador integrado son simuladas y no pegan del portapapeles del sistema. Para el resto vale la equivalencia comprobada con esas cuatro.
- **WebKit y Word para Mac:** son el prototipo 11.
- **Formato de celda que el esquema actual descarta:** centrado (7.134 párrafos centrados en estas tablas), anchos de columna (134 tablas), alineación vertical, bordes, sombreado y fuentes. Qué conserva SciDesk se propone en la ficha 0022 y se cierra al especificar `.scitable`.
- **Pie, notas y tabla juntos.** Copiar el pie, la tabla y las notas a la vez y convertirlos en una tabla de SciDesk (`tablePart`, prototipo 8) con sus notas como objetos (R11).
- **Citas de Zotero**, porque no había un documento con ellas; se espera lo mismo, en comentarios condicionales (`ADDIN ZOTERO_ITEM CSL_CITATION {…}`). Tampoco se ha probado pegar desde Excel o LibreOffice.

## Cómo se ejecuta

Requisitos: Node 24, Python 3, Word de escritorio en Windows y un DOCX con tablas.

```powershell
npm install
python -I tools/docx_tables.py "<informe.docx>" private/truth.json
powershell -STA -ExecutionPolicy Bypass -File tools\capture-clipboard.ps1 -Docx "<informe.docx>" -Out private\clip
powershell -ExecutionPolicy Bypass -File tools\word-bold.ps1 -Docx "<informe.docx>" -Out private\word-bold.json
npm run dev
```

Para la captura y para `word-bold.ps1`, Word se abre oculto. La captura usa el portapapeles y lo restaura al terminar. Después:

- `http://localhost:5179/?variant=raw` pega todas las tablas sin limpiador, y `?variant=clean`, con él. `&tables=2,44` limita la prueba a esas tablas.
- **Ctrl+V real:** ejecuta `powershell -STA -ExecutionPolicy Bypass -File tools\hold-tables-on-clipboard.ps1 -Docx "<informe.docx>" -Tables "2,44,51,135" -Signal out\signal` y abre `http://localhost:5179/paste.html`. La página dice cuándo está cada tabla en el portapapeles; haz clic en el recuadro y pulsa Ctrl+V. Los resultados quedan en `out/real-paste-N.json`.
- **Citas:** `capture-clipboard.ps1 -Docx "<revisión.docx>" -Out private\clip-cites -Paragraphs "47,49,50" -Rtf` y luego `python -I tools/rtf_citations.py private/clip-cites/*.rtf`.

## Archivos

- `src/clean.js`: el limpiador.
- `src/measure.js`: la comparación con la verdad de referencia.
- `src/run.js` e `index.html`: el pegado automático. `src/paste.js` y `paste.html`: el Ctrl+V real.
- `src/editor.js`: el editor (Tiptap con tablas, superíndice y subíndice).
- `tools/docx_tables.py`: la verdad de referencia a partir del DOCX.
- `tools/capture-clipboard.ps1`: copia con Word y guarda el portapapeles.
- `tools/word-bold.ps1`: la negrita que muestra Word.
- `tools/hold-tables-on-clipboard.ps1`: deja las tablas en el portapapeles para el Ctrl+V real.
- `tools/rtf_citations.py`: las citas de EndNote del RTF.
- `vite.config.js`: el servidor, con las señales para el Ctrl+V real.
