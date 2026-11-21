# Prototipo 3: DOCX con marcas y campos

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R3 y R35). Decisión resultante: [ficha 0025](../../docs/decisiones/0025-docx-con-marcas-y-campos.md).

## Pregunta

Al exportar a DOCX un artículo con tablas, una figura y citas, y abrirlo en Word:
- ¿Permite la biblioteca `docx` escribir marcadores y campos arbitrarios, con los estilos tomados de una plantilla de referencia?
- ¿Sobreviven esas marcas a lo que hace un coautor en Word, de modo que SciDesk reconozca bloques, citas y referencias cruzadas al importar su copia?

## Respuesta

**Sí, con dos piezas escritas a mano dentro de la biblioteca.**

`docx` 9.16 (MIT) escribe sin problema:
- los marcadores con cualquier nombre;
- la tabla con celdas combinadas y filas de encabezado;
- la imagen con texto alternativo;
- los números de línea, el pie con el número de página;
- las propiedades personalizadas;
- los estilos de una plantilla (`externalStyles`).

Las dos piezas a mano:
- **Campos con un resultado con formato** (la cita en superíndice). La biblioteca no tiene API de campos complejos. Se escriben como fragmentos de OOXML con `ImportedXmlComponent.fromXmlString`, que los inserta tal cual, sin envoltorio.
- **Los `SEQ` de los pies.** El `SequentialIdentifier` de la biblioteca se escribe «sucio» y Word pide actualizar los campos al abrir el archivo. Se escriben a mano con el número ya puesto.

**Word abre la exportación sin avisos ni reparaciones:**
- 16 páginas, A4, Calibri 12 a doble espacio, números de línea por página y páginas numeradas, en modo normal (no en modo de compatibilidad).
- 125 marcadores ocultos.
- 40 campos: 33 citas y la bibliografía de Zotero, 3 `REF` y 3 `SEQ`.
- Si se le pide que actualice todos los campos, **ningún resultado cambia**: los números que escribe SciDesk son los mismos que calcula Word.

**La versión para la revista** sale sin marcadores, sin campos y sin propiedades personalizadas ni autor, con las mismas 16 páginas.

Exportar el artículo entero tarda unos 0,4 s, contando el arranque de Node y citeproc-js.

### Las marcas, como quedan especificadas

| Qué | Cómo se escribe | Para qué |
|---|---|---|
| Cada bloque (párrafo, título, pie, nota, celda) | Marcador oculto `_SD_b_<id>` que abarca su contenido | Reconocer el bloque al importar (alinear las tres bandas) |
| Cada tabla y figura | `_SD_t_<id>` / `_SD_f_<id>` desde el pie hasta la última nota | Saber qué bloques forman la parte |
| Su número | `_SDn_<id>` alrededor del campo `SEQ Tabla \* ARABIC` (o `SEQ Figura`) | Destino de las referencias cruzadas |
| Cada referencia cruzada | Campo `REF _SDn_<id> \h` con el número como resultado; la palabra «tabla» va fuera, como texto | Que el número se actualice en Word |
| Cada cita | Campo de Zotero `ADDIN ZOTERO_ITEM CSL_CITATION {json}` con `citationID` = id de la cita en SciDesk, los CSL-JSON de sus referencias y el resultado en superíndice | Reconocer la cita al importar y que Zotero pueda trabajar con ella |
| La bibliografía | Campo `ADDIN ZOTERO_BIBL` con las entradas de citeproc-js como resultado | Ídem |
| El documento | Propiedades `ZOTERO_PREF_1`, `ZOTERO_PREF_2` (estilo de *Reumatología Clínica*) y `SciDesk` (proyecto, artículo e instantánea de la que sale la copia) | Saber qué versión es la base de la fusión |

Los marcadores que empiezan por `_` son los ocultos de Word: no aparecen en Insertar › Marcador salvo que se marque «Marcadores ocultos». Los nombres admiten solo letras, cifras y `_` (hasta 40 caracteres), así que el id `b-4e114f5c` se escribe `_SD_b_4e114f5c`.

### Qué pasa cuando un coautor edita la copia en Word

Se exportó el artículo y se reprodujeron en Word real (por COM) las ediciones de un coautor, cada una en su propia copia. Varias se hicieron también con el control de cambios activado. Después se leyó cada copia con `src/read-docx.mjs` y se comparó con la enviada (`src/compare.mjs`).

| Escenario | Sin control de cambios | Con control de cambios |
|---|---|---|
| S00 Abrir y guardar | Todo intacto | — |
| S01–S03 Escribir en medio, al principio o al final de un párrafo | El marcador sigue y abarca el texto nuevo | Igual |
| S04 Partir un párrafo (Intro) | El marcador abarca las dos mitades | Igual |
| S05 Unir dos párrafos | Los dos marcadores empiezan en el párrafo unido | La marca de párrafo queda como borrada; los dos se conservan |
| S06 Borrar un párrafo | Su marcador desaparece | El párrafo queda como borrado, con su marcador |
| S07 Mover un párrafo (cortar y pegar) | El marcador viaja con el párrafo, pero lo pegado al principio de otro bloque queda *dentro* del marcador de ese bloque | Word lo guarda como movimiento (`w:moveFrom`/`w:moveTo`): el original queda borrado con su marcador y las citas aparecen dos veces, una borrada y otra viva |
| S08 Copiar y pegar un párrafo | La copia no tiene marcador propio (Word no repite nombres) y queda dentro del marcador del bloque siguiente | — |
| S09 Reescribir un párrafo entero | **El marcador y sus citas desaparecen**; el párrafo nuevo no tiene marca | Se conserva todo como borrado más insertado |
| S10 Borrar una cita | Desaparece su campo | El campo queda como borrado |
| S11 Escribir otro número sobre una cita | El campo sigue igual y el resultado no coincide («7» donde citeproc-js daba «6»): se detecta | — |
| S12 Escribir una cita a mano, «(Smith, 2020)» | Texto normal: se detecta por su forma (plan B) | — |
| S13 Insertar una tabla nueva antes de la tabla 1, con Insertar título | Al actualizar campos, Word renumera **1, 2, 3** y las referencias cruzadas pasan a «2» y «3». El pie nuevo queda dentro del marcador del pie siguiente | Igual |
| S14 Borrar la tabla 2 entera | Sus 32 marcadores desaparecen; la referencia cruzada muestra «¡Error! No se encuentra el origen de la referencia.» | — |
| S15 Copiar todo a un documento nuevo | **Marcadores y campos se conservan todos**; se pierden las propiedades del documento (también `SciDesk`) | — |

**Ninguna edición rompe el archivo ni hace que Word cambie los nombres de los marcadores.** Word no añadió marcadores propios.

**Conclusiones para la importación:**
- **Los marcadores son pistas muy buenas, pero no la verdad.** Cuando fallan, lo normal es que *se pierdan*: al borrar, al reescribir un párrafo entero o al borrar una tabla. Eso es seguro, porque ese bloque pasa a alinearse por contenido (plan B de 5.11). El otro fallo es que lo insertado o pegado *al principio* de un bloque queda dentro de su marcador (S07, S08, S13).
- **Regla:** la identidad de cada bloque se confirma siempre por contenido. Si el marcador abarca varios párrafos, el bloque es el que más se parece al texto enviado, y los demás son nuevos, partidos o pegados. Si en un párrafo empiezan dos marcadores, es una unión.
- **Las citas se reconocen por `citationID`,** que sobrevive a todo salvo al borrado. Un movimiento con control de cambios las duplica (una en `moveFrom` y otra en `moveTo`): manda la viva. Un resultado escrito a mano se señala para revisarlo.
- **Una referencia cruzada se lee por el marcador al que apunta, nunca por su texto,** porque si el destino se borra Word escribe un mensaje de error en su lugar.
- **La versión de partida no puede depender solo de la propiedad `SciDesk`,** porque copiar el texto a un documento nuevo la pierde mientras los marcadores sobreviven. Propuesta: repetir el id de la instantánea en un marcador al principio del documento (`_SDs_<id>`).

### El marcador de punto, descartado

También se probó un marcador vacío al principio de cada bloque en lugar de uno que abarque su contenido, con los mismos escenarios (`BLOCK_MARK=point`):
- **Mejor en un caso:** sobrevive a reescribir el párrafo entero (S09).
- **Peor en los demás:** al borrar un párrafo o una tabla, el marcador salta al párrafo siguiente (S06, S14), y al mover acaba en párrafos que no son el suyo (S07).

Un marcador que se pierde lleva a alinear por contenido; uno que cambia de sitio atribuye el identificador a otro texto. Por eso se escogen los de rango.

### Detalles para el exportador

- **Estilos por su nombre interno.** Word en español guarda los estilos con identificadores traducidos (`Ttulo1`, `Descripcin`). El exportador los busca por su nombre interno (`heading 1`, `caption`, `title`) en el `styles.xml` de la plantilla.
- **Formato desactivado.** `TextRun` escribe `<w:b w:val="false"/>` si se le pasa `bold: false`: hay que pasar solo el formato que está activo.
- **Modo de compatibilidad.** `compatabilityModeVersion: 15` (así lo escribe la biblioteca), para que Word no abra el documento en modo de compatibilidad.
- **Plantilla sin datos personales.** Guardada por Word, la plantilla lleva el nombre del autor. Se guarda con `RemovePersonalInformation`.
- **Campos `SEQ`.** Con la etiqueta de Word en el idioma del documento (`Tabla`, `Figura`), para que «Insertar título» de un coautor siga la misma numeración.

## Lo que este prototipo no cubre

- **Zotero de verdad:**
  - Si el complemento de Zotero para Word reconoce estas citas y la bibliografía, y las actualiza con «Refresh» sin perder el `citationID`.
  - Qué hace con `uris` vacíos, que corresponden a referencias que no están en la biblioteca de Zotero.
  
  **Comprobado en el prototipo 5 ([ficha 0027](../../docs/decisiones/0027-zotero-por-su-api-local.md)):** el «Refresh» de Zotero conserva los `citationID`, los marcadores y las propiedades, pero con `uris` vacíos duplica las referencias en la bibliografía y renumera las citas. Desde entonces, cada referencia lleva un URI. El exportador de este prototipo no se ha cambiado.
- **Guardar con el complemento de Zotero cargado.** Guardar desde COM se colgó en Word oculto. Al aislarlo, el bloqueo también se dio sin el complemento: dependía de llamar a `SaveAs2` dentro del script. No se llegó a saber la causa y se rodeó copiando el archivo y guardando con `Save()`. Falta comprobar en Word visible que un coautor con Zotero instalado puede abrir y guardar la copia sin problemas (prototipo 5).
- **Google Docs, LibreOffice, Pages y Word para Mac:** no se han probado. Es la parte del prototipo 6, que ya prevé el plan B.
- **Fusión:** aquí solo se lee lo que queda en cada copia. Fusionar es el prototipo 6.
- **Una ronda escrita por personas,** con ediciones mezcladas. Aquí cada escenario es una sola edición, hecha por COM, que se acerca al teclado pero no es igual.
- **Lo que falta del DOCX:**
  - comentarios y cambios marcados de SciDesk en la exportación (prototipo 7);
  - notas al pie;
  - ecuaciones;
  - la portada aparte;
  - el perfil de formato de la revista más allá de la plantilla.
- **Las páginas como imagen:** se dibujan desde el metarchivo de Word y el texto sale más grueso de lo que es. El formato se comprobó por COM: Normal en Calibri 12, sin negrita y a doble espacio.

## Cómo se ejecuta

Requisitos:
- Node 24.
- Word de escritorio en Windows, para la plantilla y las comprobaciones.
- El estilo CSL de `../04-typst-preview/csl/`.

```powershell
npm install
powershell -ExecutionPolicy Bypass -File tools\make-template.ps1
node src/make-scidoc.mjs
node src/export.mjs coauthors
node src/export.mjs journal
powershell -ExecutionPolicy Bypass -File tools\run-word.ps1 inspect out\word-inspect.json out\article-coauthors.docx out\article-journal.docx
powershell -ExecutionPolicy Bypass -File tools\run-word.ps1 edit out\article-coauthors.docx out\word-range
node src/compare.mjs out/word-range
```

Qué hace cada paso:
- `make-template.ps1` crea con Word la plantilla de referencia (`template/reference.dotx`, sin datos personales) y la figura de prueba.
- `make-scidoc.mjs` convierte el artículo sintético de `prototypes/corpus/` en un `.scidoc` con ids de bloque, citas, referencias cruzadas, dos tablas y una figura.
- `export.mjs` escribe `out/article-coauthors.docx` o `out/article-journal.docx`.
- `run-word.ps1 inspect` escribe lo que ve Word (páginas, marcadores, campos y si cambian al actualizarlos) e imágenes de algunas páginas en `out/png/`.
- `run-word.ps1 edit` reproduce los escenarios de coautor en Word, cada uno en su copia.
- `compare.mjs` dice qué se recupera de cada copia.

Para la variante de punto: `$env:BLOCK_MARK="point"; node src/export.mjs coauthors out/point/article-coauthors.docx`, copiar `out/blank.docx` a `out/point/` y repetir los dos últimos pasos con `out/point/…` y `out/word-point`, pasando `out/point/article-coauthors.docx` como segundo argumento de `compare.mjs`.

**`run-word.ps1`:**
- Guarda el portapapeles al empezar y lo restaura al terminar, también si tiene que cortar un Word que se cuelga; los escenarios cortan, copian y pegan.
- Si se cuelga, solo cierra las instancias ocultas de Word que se abrieron después de lanzarlo.
- No cambia el nombre de usuario de Office.
- Descarga el complemento de Zotero solo en su sesión de Word; Word lo vuelve a cargar la próxima vez que arranca.

## Archivos

- `src/make-scidoc.mjs`: el artículo sintético convertido a `.scidoc`, con su biblioteca en CSL-JSON.
- `src/export.mjs`: el exportador con sus dos perfiles.
- `src/read-docx.mjs`: el lector. Da los párrafos con sus marcadores, el texto aceptando o rechazando los cambios marcados, los campos clasificados y las propiedades.
- `src/compare.mjs`: qué se recupera de cada copia editada.
- `tools/make-template.ps1`, `tools/word.ps1` y `tools/run-word.ps1`: Word por COM.
- `template/`: la plantilla de referencia y la figura de prueba.
