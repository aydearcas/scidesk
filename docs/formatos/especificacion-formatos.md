# Especificación de los formatos de SciDesk (versión 1)

- **Fecha:** 21/11/2026
- **Estado:** borrador para revisar. Cierra la tarea de la fase 0 «especificar los formatos con un solo esquema» (PLAN.md, sección 8, y R34). Decisión en la ficha [0031](../decisiones/0031-formatos-v1-con-un-solo-esquema.md).
- **Esquemas:** [`packages/formats/`](../../packages/formats/). Cada formato se define una vez, con TypeBox, en `src/`; de esa definición salen los tipos de TypeScript, el validador y el JSON Schema publicado (`schemas/*.schema.json`). Los ejemplos de `examples/` se construyen con los datos sintéticos de los prototipos y se validan en las pruebas.

Este documento explica qué hay en cada archivo y por qué. El detalle exacto (cada campo, cada patrón) está en los esquemas, que mandan si este texto y ellos no coinciden.

## 1. Principios comunes

- **Un solo esquema por formato (R34).** La definición de `src/` genera a la vez los tipos, la validación y el JSON Schema 2020-12 publicado en `https://scidesk.app/schema/v1/<formato>.schema.json`. El programa valida con **el mismo objeto** que se publica (`toPublished()`), así que lo publicado es exactamente lo que se comprueba. Una prueba lo confirma con un validador independiente (Ajv): los dos dan el mismo resultado con todos los ejemplos.
- **Por qué TypeBox y no Zod** (elegido por el usuario el 21/11): en TypeBox la definición *es* JSON Schema, así que no hay conversión que pierda reglas. Con Zod, los refinamientos no pasan al esquema publicado. Ese esquema sirve también al núcleo de Rust y a quien procese un paquete para LLM.
- **Tres capas de validación:**
  1. **Forma:** el JSON Schema de cada formato. Los errores salen precisos: en un documento se busca el nodo más profundo que falla (por ejemplo, «el `id` del cambio debe cumplir `^ch-…`» o «una `table` no puede ir dentro de un `doc`»).
  2. **Normalización al cargar** (regla 1 de la ficha 0021): ids que faltan, ids repetidos y U+200B sin marca de cambio.
  3. **Reglas que JSON Schema no expresa,** dentro de un archivo (`checkDocument`) y entre los archivos de un proyecto (`checkProject`). ProseMirror comprueba además sus propias expresiones de contenido al cargar el documento en el editor.
- **`schemaVersion: 1`** en todos los archivos. Un archivo con una versión anterior se migra al abrirlo; uno con una versión posterior no se abre para escribir.
- **Escritura estable:** claves ordenadas, sangría de dos espacios y salto de línea final (`stableStringify`). Lo que no cambia da los mismos bytes, y las diferencias entre versiones se leen bien.
- **Claves en inglés** (P7). **Nombres de carpeta y archivo fijos, en inglés** (P24); los que salen del contenido (el proyecto, la carpeta de un artículo, una tabla) siguen en el idioma del usuario.
- **Fechas** en UTC con `Z` (`2026-11-21T12:00:00Z`); las fechas de calendario del perfil de revista, como `2026-11-20`. **Idiomas** con etiquetas BCP 47 (`es`, `en`, `en-GB`, `es-419`).
- **Nunca se guardan números calculados:** ni el número de una cita, ni el de una tabla o figura, ni la letra de una nota de tabla.
- **Quién hizo algo** se escribe igual en todos los formatos: `{ name, person? }`, el nombre tal como se muestra y, si se conoce, la persona de `people.json`.

## 2. Identificadores

Todos los ids que guarda SciDesk tienen la forma `<tipo>-<sufijo>`. El tipo dice qué nombran; el sufijo es aleatorio, de 10 caracteres de `[a-z0-9]` (unos 52 bits, sin colisiones en la práctica aunque se fusionen muchas copias). El patrón admite de 1 a 24 caracteres, para aceptar ids más cortos escritos a mano.

| Tipo | Qué nombra | Tipo | Qué nombra |
|---|---|---|---|
| `b-` | bloque: párrafo, título, encabezado, pie, lista, tabla, palabras clave | `r-` | referencia de la biblioteca |
| `n-` | nota de tabla o de figura | `p-` | persona o grupo del directorio |
| `t-` | tabla (su parte y su `tableRef`) | `af-` | afiliación |
| `f-` | figura (su parte y su `figureRef`) | `a-` | artículo |
| `e-` | ecuación | `s-` | instantánea del historial |
| `c-` | cita | `rd-`, `cp-` | ronda de revisión, copia devuelta |
| `ch-` | cambio marcado | `ps-`, `pr-` | conjunto de propuestas, propuesta |
| `cm-` | comentario | `z-`, `g-` | zona de la fusión, grupo «misma frase» |

- **El identificador del proyecto es un UUID v4** (no tiene que caber en un marcador de Word y debe ser único en el mundo: con él se asocian los datos locales y se construye el URI propio de las referencias).
- **El sufijo solo usa `[a-z0-9]`** para que los marcadores del DOCX lo lleven sin cambios (sección 9).
- **Al copiar y pegar, o al partir un párrafo, el bloque nuevo recibe un id nuevo** (R34, ficha 0020). Lo hace la normalización: si un id ya se ha visto en el documento compuesto, se cambia.
- **Una tabla y su referencia comparten id** (`t-…` en el `tableRef` del cuerpo y en el `tablePart` de su archivo), igual que una figura. Una copia de una tabla es una tabla nueva, con id y archivo propios (regla 3 de la ficha 0021).

## 3. `.scidoc`: el documento

Un `.scidoc` es el **JSON de ProseMirror tal cual** (R34) dentro de un envoltorio:

```json
{
  "schemaVersion": 1,
  "documentType": "article",
  "lang": "es",
  "doc": { "type": "doc", "content": [ … ] },
  "changes": { "ch-…": { "author": { "name": "Marta Ríos Navarro", "person": "p-…" }, "date": "…", "origin": "docx" } },
  "comments": {}
}
```

- **`documentType`:** `article` (el cuerpo), `abstract`, `cover-letter`, `title-page`, `contributions`, `declarations`, `supplementary` o `reviewer-response`. Las tablas y figuras tienen extensión propia.
- **`lang`:** idioma principal del documento. El corrector lo usa cuando ni la palabra ni el párrafo dicen otro (ficha 0023).
- **Cada nodo** es `{ type, attrs?, content?, marks? }` y el texto, `{ type: "text", text, marks? }`, como lo escribe `Node.toJSON()` de ProseMirror. Los atributos con valor por defecto nulo pueden escribirse como `null` u omitirse.

### 3.1 Nodos de bloque

| Nodo | Atributos | Contenido | Notas |
|---|---|---|---|
| `title` | `id`, `lang` | texto | Uno por idioma, al principio del cuerpo; el primero es el principal. Reumatología Clínica pide también el título en inglés |
| `heading` | `id`, `level` (1–6), `role`, `lang` | texto | **Las secciones no son nodos contenedores:** un encabezado con `role` empieza la sección (como `sec-type` de JATS) |
| `paragraph` | `id`, `lang`, `indent` | texto | `indent` (opcional, 1 a 8): sangría izquierda en pasos de 1,25 cm, como «Aumentar sangría» de Word (ficha 0069) |
| `bulletList`, `orderedList` | `id` (`start` en la numerada) | `listItem`+ | `listItem` empieza por un párrafo |
| `equation` | `id` (`e-`), `latex` | — | Llega en la fase 4; está en el formato desde la v1 (P6) |
| `tableRef` | `id` (`t-`), `src` (`tables/*.scitable`) | — | Dónde va una tabla; la tabla vive en su archivo |
| `figureRef` | `id` (`f-`), `src` (`figures/*.scifigure`) | — | Dónde va una figura |

**Papeles de sección** (`role`): `introduction`, `methods`, `results`, `discussion`, `conclusions`, `acknowledgements`, `funding`, `conflicts`, `ethics`, `consent`, `data-availability`, `registration`, `ai-use`, `contributions`, `references`, `appendix` y `other`; para el resumen estructurado, además, `background`, `objective`, `background-objective`, `patients-methods`, `discussion-conclusions` y `case-presentation`. Un encabezado con `role: "references"` marca dónde va la bibliografía, que se genera siempre desde la biblioteca.

### 3.2 Nodos en línea

| Nodo | Atributos | Qué es |
|---|---|---|
| `text` | — | Texto con marcas |
| `hardBreak` | — | Salto de línea |
| `citation` | `id` (`c-`), `items` | Una cita. Cada elemento: `ref` (`r-…`) y, si hace falta, `locator`, `label` (los de CSL), `prefix`, `suffix` y `suppressAuthor`. El `id` es el `citationID` del campo de Zotero en el DOCX |
| `xref` | `target` | Referencia cruzada a una tabla, figura, encabezado o ecuación. Muestra solo el número; la palabra «tabla» es texto |
| `noteRef` | `target` (`n-`) | Llamada a una nota de la misma tabla o figura; su letra se calcula (R11) |
| `inlineEquation` | `latex` | Ecuación en línea (fase 4) |
| `field` | `name` | Campo combinado de la carta de presentación: `journal`, `editor`, `title`, `article-type`, `corresponding-author`, `authors`, `date` |

Ejemplo del cuerpo de `examples/knee-oa/` (recortado):

```json
{ "type": "paragraph", "attrs": { "id": "b-5emlpnx041", "lang": null }, "content": [
  { "type": "text", "text": "…en el plazo de 48 meses" },
  { "type": "citation", "attrs": { "id": "c-9ocsslpnju", "items": [{ "ref": "r-uwmivrq3yt" }] } },
  { "type": "text", "text": ". La escala KL clasifica…" }
]}
```

Esto corrige el ejemplo de PLAN.md 3.2, que guardaba `refs` como cadenas y envolvía las secciones en un nodo `section`.

### 3.3 Marcas

- **Formato:** `bold`, `italic`, `underline`, `superscript`, `subscript`, `textColor` (`{ color: "#RRGGBB" }`) y `highlight` (`{ color }`, uno de los 16 colores de resaltado de Word), estos dos añadidos el 22/11/2026 (ficha 0043); `fontFamily` (`{ family }`, nombre de la fuente como en `w:rFonts`) y `fontSize` (`{ size }`, en puntos, de 1 a 409 en medios puntos), añadidos el 22/11/2026 para el modo de fuente libre (ficha 0047): los lleva el Word para coautores y nunca el Word ni el PDF para la revista.
- **`lang {lang}`:** idioma de un fragmento dentro de un párrafo. El idioma de cada palabra sale de esta marca; si no, del `lang` del párrafo; si no, del `lang` del documento (ficha 0023).
- **`link {href}`:** solo `http`, `https` y `mailto`.
- **`comment {id}`:** texto anclado a un comentario del registro `comments`.
- **Cambios marcados** (ficha 0020): `insertion {id}`, `deletion {id}` y `modification {id, type, attrName, previousValue, newValue}`. El texto borrado sigue en el documento con su marca hasta que se acepta. `modification` es el cambio de un atributo de un nodo (nivel de un encabezado, alineación de una celda), como lo registra `prosemirror-suggest-changes`; un cambio de formato del texto es un borrado más una inserción del mismo texto con el mismo `id`. Partir o unir párrafos se marca con un U+200B a cada lado del corte.
- **Los bloques y los nodos en línea** solo admiten marcas de cambio y de comentario: un párrafo entero insertado o borrado lleva la marca en el propio nodo.

### 3.4 Registros `changes` y `comments`

- **`changes`:** por cada `id` de cambio, `author`, `date`, `origin` y, opcionalmente, `source`. `origin` es `local` (escrito aquí), `docx` (copia de Word), `llm` (paquete para LLM), `conflict-copy` (copia en conflicto de OneDrive o Dropbox), `history` (versión antigua) o `scidesk` (coautor con SciDesk, más adelante). `source` dice de qué conjunto de propuestas, copia o instantánea viene (`ps-…`, `cp-…`, `s-…`).
- **`comments`:** por cada comentario, `author`, `date`, `origin`, `text`, `resolved` y `replies` (texto sin formato en la v1).
- **Al guardar se eliminan las entradas cuyo `id` ya no está en el documento.** Al cargar, una marca sin entrada en el registro es un error; una entrada sin marca, un aviso.
- **Cada archivo del documento compuesto lleva su propio registro**, solo con los cambios de su contenido; al cargar se juntan (ficha 0021). El ejemplo `examples/standalone/` lo muestra con el documento editado en Word del prototipo 7: 7 cambios en el cuerpo y 1 en la tabla.

### 3.5 El resumen (`abstract.scidoc`)

El `doc` del resumen contiene una `abstractSection {id, lang}` por idioma. Cada una lleva sus encabezados (con el `role` del apartado del resumen estructurado), sus párrafos y un bloque `keywords {id}` con un `keyword` por palabra clave. Así el recuento de palabras, el número de palabras clave y la comparación de cifras entre idiomas (R8) trabajan sobre la estructura y no sobre texto como «Palabras clave: …». Un artículo sin resumen (una carta) tiene el `doc` sin ninguna sección (ficha 0048); entonces el documento compuesto no lleva `abstractPart`.

### 3.6 Documento compuesto

Al cargar, el artículo forma un solo árbol (ficha 0021): `abstractPart {src}` al principio, el cuerpo, y cada `tableRef` o `figureRef` sustituido por su `tablePart` o `figurePart` con `src`. El esquema `Composite` lo describe para las pruebas, pero no es un archivo: al guardar se reparte. Las partes llevan `src` solo en memoria; en su archivo no.

## 4. `.scitable` y `.scifigure`

Mismo envoltorio que `.scidoc`, con `documentType: "table"` o `"figure"`.

**`.scitable`:** el `doc` es un `tablePart {id}` con, en este orden, un `tableCaption`, una `table` y cero o más `tableNote`.

- **`table {id, columnWidths}`:** filas `tableRow` con celdas `tableCell` o `tableHeader` (una fila de `tableHeader` se repite en cada página). `columnWidths` son anchos **relativos** de las columnas o `null`.
- **Celdas:** `colspan`, `rowspan` y `align` (`left`, `center`, `right`, `decimal` o `null`). Contienen párrafos y listas. Es la propuesta de la ficha 0022, que este formato cierra: **se conservan la alineación y los anchos relativos; se descartan bordes, sombreado, fuentes y tamaños**, que pone el estilo de la revista.
- **Notas como objetos (R11):** `tableNote {id, kind, lang}`. `kind: "general"` es una nota sin llamada (abreviaturas, fuente); `kind: "specific"` se llama desde las celdas con `noteRef` y su letra se calcula por orden de primera llamada. La misma nota se puede llamar desde varias celdas. El estilo de las llamadas (a, b, c o \*, †, ‡) lo pone el perfil de revista.
- **Comprobaciones:** todas las filas cubren las mismas columnas, contando las celdas combinadas; `columnWidths` tiene un valor por columna; cada `noteRef` apunta a una nota de la misma tabla; una nota específica sin llamada o una general con llamada dan aviso.

**`.scifigure`:** el `doc` es un `figurePart {id, image, alt, credit, license}` con un `figureCaption` y cero o más `figureNote`. `image` es el archivo de imagen en `figures/` (PNG, JPG, TIFF, SVG, EPS o PDF), `alt` el texto alternativo para el PDF accesible, y `credit` y `license` la fuente y el permiso si la figura no es original. La extensión `.scifigure` la decidió el usuario el 21/11: las figuras entran en el documento compuesto igual que las tablas.

## 5. El proyecto

### 5.1 Manifiesto (`<nombre>.scidesk`)

```json
{ "format": "scidesk-project", "schemaVersion": 1, "id": "<uuid v4>", "name": "Artrosis de rodilla acelerada",
  "created": "…", "articles": [{ "id": "a-…", "folder": "main" }], "library": { "mode": "own" } }
```

- **`format`** distingue un proyecto de SciDesk de cualquier otro JSON.
- **`id`:** el identificador del proyecto (UUID v4). Asocia los datos locales de cada equipo y forma el URI propio de las referencias. Si un equipo encuentra dos carpetas vivas con el mismo id, es que se ha copiado el proyecto: SciDesk pregunta y da un id nuevo a la copia.
- **`articles`:** cada artículo con su id y su carpeta bajo `articles/`, en el orden del navegador (ficha 0015). Al menos uno.
- **`library`:** `{ mode: "own" }` o `{ mode: "zotero", zotero: { library, libraryId?, collection, name } }`: la colección de Zotero vinculada, con sus subcolecciones (ficha 0027).
- **Los idiomas no van en el manifiesto,** como decía PLAN.md 4, sino en cada artículo: un proyecto puede tener un artículo en español y su versión en inglés (P12).

### 5.2 Artículo (`articles/<carpeta>/article.json`)

- `id`, `articleType` (`original`, `brief-original`, `systematic-review`, `clinical-trial`, `observational`, `case-report`, `protocol`, `qualitative`, `narrative-review`, `letter`, `guideline`, `other`).
- **`lang` y `translations`:** idioma del manuscrito y los otros idiomas del título, el resumen y las palabras clave (Reumatología Clínica: `["en"]`).
- `runningTitle` (título corto, R14).
- **`journal`:** id del perfil de revista en `resources/journals/`, o `null`.
- **`citationStyle`:** `{ id, file? }`. Por defecto, el del perfil; el usuario puede elegir otro. `file` solo si el estilo no viene con SciDesk ni con el perfil.
- **`referenceTermsLang`:** idioma de las palabras fijas de las referencias («En:», «editores»…). `null` es el idioma del manuscrito (ficha 0026).
- **`ignoredWarnings`:** los avisos marcados como «es correcto» o «no aplica», con su nota, fecha y quién (R12). Cada aviso tiene un id estable.

Los nombres de los documentos del artículo son fijos (sección 8), así que `article.json` no los lista.

### 5.3 Directorio de personas (`people/people.json`)

- **`affiliations`:** lista común, reutilizable entre personas: `id` (`af-`), `institution`, `department`, `city`, `country` (ISO 3166-1) y `ror`.
- **`people`:** personas (`kind: "person"`: `given`, `family`, `citationName` como «Pérez-García J», `degrees`, `orcid` con su dígito de control comprobado, `email`, `affiliations` y `notes`) y grupos o consorcios (`kind: "group"`: `name` y `members`).
- Lo que no depende del artículo. En qué artículos aparece cada persona se deduce de sus `authors.json` y no se guarda.

### 5.4 Autores de un artículo (`articles/<carpeta>/authors.json`)

- **`authors`, en el orden en que firman:** `person`, las `affiliations` que se imprimen (un subconjunto de las de la persona, comprobado), `corresponding`, `equalContribution` (los autores con la misma etiqueta contribuyeron por igual), `credit` y `conflicts`.
- **`credit`:** los 14 roles CRediT (`conceptualization` … `writing-review-editing`) con el grado `lead`, `equal` o `supporting`.
- **`acknowledged`:** personas del directorio a las que se agradece y que no firman.

### 5.5 Biblioteca (`references/library.json`)

Cada entrada: `id` (`r-`), `csl`, `zotero?`, `source?` y `added`.

- **`csl`:** CSL-JSON 1.0.2 **sin `id`** (el de SciDesk va al lado y se añade al pasarlo a citeproc-js). Solo variables de CSL, fechas con números (`"date-parts": [[2014]]`) y la abreviatura de la revista en `container-title-short`: se normaliza al importar (ficha 0027).
- **`zotero`** (modo Zotero): `key`, `uri`, `library`, `libraryId?` y `dateModified`. El `uri` es el que va en cada cita del DOCX.
- **Corrección de la ficha 0027** (ficha 0031): **la versión del elemento y el `Zotero-Server-ID` no se guardan aquí,** sino en el estado local de cada equipo (sección 8). Son de una instalación de Zotero: con el proyecto sincronizado entre el PC y el MacBook, cada equipo tiene la suya, y guardarlas en el proyecto reescribiría `library.json` cada vez que se cambia de equipo.
- **`source`:** de dónde vino. `kind` es `endnote-field`, `zotero-field`, `mendeley-field` (citas de un Word, ficha 0028), `ris`, `nbib`, `bibtex`, `csl-json`, `endnote-xml`, `pubmed`, `crossref`, `zotero`, `manual` o `project`. Además `file` (la copia en `references/imports/` o el nombre del Word), `key` (EndNote `<db-id>:<registro>`, el URI de un campo de Zotero o Mendeley, un PMID o DOI), `date` y **`unmapped`**: los campos de EndNote que no se convirtieron, para mostrarlos en lugar de perderlos.

## 6. Perfil de revista (`resources/journals/<id>.json`)

El mismo archivo vale para un proyecto y para el catálogo público (ficha 0014). **Cada dato lleva su procedencia:** `{ value, source, quote?, checked? }`.

- **`source`** es el id de una de las `sources` del perfil (guía para autores, catálogo de la NLM, OpenAlex, DOAJ, repositorio de CSL, la editorial o SciDesk), cada una con su URL y la fecha en que se consultó.
- **`quote`** es la cita literal de la guía que apoya el dato. Es lo que debe devolver el paquete para LLM al crear un perfil (ficha 0018) y lo que el usuario revisa campo por campo.
- **`checked`** es la fecha de comprobación de ese dato si no es la de la fuente. SciDesk avisa cuando pasa de 12 meses.

Contenido:
- **`journal`:** título, abreviatura de la NLM, ISSN impreso y electrónico, editorial, acceso abierto y página.
- **`citationStyle`:** `{ id, file?, basedOn? }`. **`file` es el estilo propio que viaja con el perfil** (`styles/*.csl`, junto al perfil) cuando el del repositorio de CSL no coincide con la guía, como en Reumatología Clínica (ficha 0026).
- **`referenceTermsLang`:** solo si la revista pide las palabras fijas de las referencias en un idioma concreto; si no, se usa el del manuscrito.
- **`languages`:** idiomas del manuscrito y en qué otros idiomas se piden el título, el resumen y las palabras clave.
- **`abstract`:** si es estructurado, sus apartados (`role` y etiqueta por idioma) y el mínimo de palabras clave.
- **`articleTypes`:** por tipo de artículo, su nombre en la guía, los **límites** (palabras, palabras del resumen, referencias, figuras, tablas, figuras y tablas juntas, autores, autores aconsejados, palabras clave y caracteres del título), su resumen si cambia, apartados fijos y una apertura fija («Señor editor»).
- **`manuscriptFormat`:** interlineado, cuerpo de letra, fuente, márgenes laterales, números de línea y de página, justificado, partición de palabras, tablas en el texto o al final, lista de pies de figura y variante del inglés.
- **`review`:** ciega (`double`, `single`, `open`, `none`) y portada aparte.
- **`declarations`:** cuáles son obligatorias y dónde van; `contributionsFormat`; `optionalDocuments` (puntos destacados con sus límites, resumen gráfico); `figures` (archivos separados, formatos, resolución mínima); `submission` (sistema de envío); y `notes` para lo que la guía dice sin campo propio o lo que le falta.
- **`extends`:** perfil base del que hereda (el de la editorial; *Supuesto* de la ficha 0014).

El ejemplo `examples/knee-oa/resources/journals/reumatologia-clinica.json` recoge la tabla de PLAN.md 5.9 (guía consultada el 20/11/2026) con el estilo propio del prototipo 2. No lleva citas literales: se añadirán al revisar la guía, no se inventan.

## 7. Propuestas (rondas de coautores y otros orígenes)

El modelo único de propuestas (fichas 0019 y 0029) tiene un solo formato, el **conjunto de propuestas**, sea cual sea el origen.

**Conjunto de propuestas:** `id` (`ps-`), `origin` (`kind`: `docx-copy`, `llm-package`, `conflict-copy`, `history` o `scidesk`; y, según el caso, `round`, `copy`, `file` o `package`), `base.snapshot` (la versión de la que se calculan: la enviada o la restaurada), `created`, `integrity` (`ok`, `mismatch` o `not-checked`: aplicar todas las propuestas a la base da la copia con todo aceptado), `hiddenNoise` y `proposals`.

**Cada propuesta:**

| Campo | Qué es |
|---|---|
| `author` | Quién la propone (`w:author` si venía marcada; si no, quien devolvió la copia) |
| `tracked` | Si venía con control de cambios o se encontró comparando con la base |
| `kind` | `insert`, `delete`, `replace`, `format`, `comment`, `split-paragraph`, `join-paragraphs`, `insert-paragraph`, `delete-paragraph` o `move` |
| `anchor` | Dónde, **en la versión base:** `{ file, block, from, to }`, con desplazamientos de ProseMirror dentro del bloque (cada unidad UTF-16 de texto y cada nodo en línea cuentan 1); o `{ file, after }` para un párrafo nuevo |
| `before`, `after` | El texto de la base y el propuesto. Sirven para mostrarla y para volver a encontrar el sitio en tu copia actual |
| `content`, `format`, `comment`, `moveOf` | Contenido con formato o citas, marcas añadidas o quitadas, el comentario con sus respuestas y la otra mitad de un movimiento |
| `zone`, `sameSentence` | La zona de la fusión a tres bandas y el grupo «misma frase» |
| `status` | Resultado de la fusión: `applicable`, `agreement`, `duplicate` (un acuerdo ya aplicado por otra), `conflict-coauthors`, `conflict-mine` o `noise-hidden` |
| `decision` | Lo que hiciste: `pending`, `accepted`, `rejected` o `edited`, con `decided` (quién y cuándo) |

`status` y `decision` van separados: el primero lo calcula la fusión y el segundo es tuyo.

**Dónde se guardan (decidido por el usuario el 21/11: viajan con el proyecto):**
- **Ronda con coautores:** `articles/<carpeta>/rounds/<ronda>/` con `round.json` (nombre, instantánea y fecha del envío, y cada copia devuelta con quién la devolvió, cuándo y su huella SHA-256), la copia enviada, las devueltas en `copies/` y un conjunto de propuestas por copia en `proposals/<copia>.json`. Así se puede empezar a revisar en el PC y seguir en el MacBook.
- **Otros orígenes** (paquete para LLM, copia en conflicto, versión antigua): `articles/<carpeta>/proposals/<conjunto>.json`.

El ejemplo `examples/knee-oa/articles/main/rounds/ronda-1/` usa la ronda sintética del prototipo 6 (copias de Ríos y Soler). Ancla 63 de sus 75 ediciones; las otras 12 caen en texto que incluye el número de una cita impresa o en pies de tabla, que el generador del ejemplo no traduce. No es un límite del formato.

## 8. Qué viaja con el proyecto y qué se queda en cada equipo (R26, ficha 0013)

```
<proyecto>/
├── <nombre>.scidesk                       manifiesto
├── references/library.json                biblioteca (sin estado de sincronización de Zotero)
├── references/imports/                    copia de cada archivo importado
├── people/people.json                     directorio de personas
├── resources/dictionary.txt               diccionario del proyecto (una palabra por línea, UTF-8)
├── resources/journals/<id>.json           perfiles de revista, y su estilo propio en styles/
├── resources/styles/<estilo>.csl          estilos elegidos que no vienen con SciDesk
├── articles/<carpeta>/
│   ├── article.json · authors.json
│   ├── manuscript/article.scidoc · abstract.scidoc
│   ├── documents/cover-letter.scidoc · title-page.scidoc · contributions.scidoc · declarations.scidoc
│   ├── documents/reviewer-responses/<ronda>.scidoc
│   ├── supplementary/supplementary-material.scidoc
│   ├── tables/<nombre>.scitable
│   ├── figures/<nombre>.scifigure y su imagen
│   ├── rounds/<ronda>/                    rondas con coautores
│   ├── proposals/<conjunto>.json          propuestas de otros orígenes
│   └── exports/                           se puede borrar: se regenera
└── .scidesk/history/                      historial: un archivo por instantánea
```

| | Dónde | Por qué |
|---|---|---|
| **Viaja con el proyecto** | Todo lo anterior, incluido el historial y las rondas | Es el trabajo; sin ello el proyecto no se reproduce |
| **En la carpeta, pero desechable** | `exports/` | Se regenera; nunca hace falta para abrir el proyecto |
| **Se queda en cada equipo** (carpeta de datos de la aplicación, por id del proyecto) | Estado de la ventana y pestañas, proyectos recientes, cachés (citeproc-js, corrector, vista previa), **estado de sincronización con Zotero**, registro de cambios sin guardar (R25) y ajustes del programa | Es de cada equipo; sincronizarlo generaría conflictos entre el PC y el MacBook |

El estado local de un proyecto (`projects/<id>/state.json` en `%APPDATA%\SciDesk\` o en `~/Library/Application Support/SciDesk/`) tiene esquema propio (`local-state`): dónde ha visto el equipo el proyecto, el estado de Zotero (`serverId`, versión de la biblioteca y de cada elemento) y el estado libre de la interfaz. Perderlo cuesta recalcular, nunca trabajo.

**Queda para la fase 1:** el formato interno de cada instantánea de `.scidesk/history/` (va detrás de una interfaz propia, ficha 0013). Este documento fija su id (`s-…`), que usan el DOCX y las propuestas.

## 9. Marcas del DOCX para coautores (fichas 0025 y 0027)

Un id `<tipo>-<sufijo>` se escribe en un marcador cambiando el guion por `_`: `b-4e114f5c` → `_SD_b_4e114f5c`. Los marcadores solo admiten letras, cifras y `_`, hasta 40 caracteres, y Word oculta los que empiezan por `_`. Con sufijos de 10 caracteres, el más largo ocupa 17.

| Qué | Marca |
|---|---|
| Cada bloque, también en celdas, pies y notas | Marcador `_SD_<tipo>_<sufijo>` que abarca su contenido (`_SD_b_…`; las notas, `_SD_n_…`) |
| Cada tabla o figura | `_SD_t_…` o `_SD_f_…` desde el pie hasta la última nota |
| Su número | `_SDn_t_…` o `_SDn_f_…` alrededor del campo `SEQ Tabla \* ARABIC` (o `SEQ Figura`, `SEQ Table`, `SEQ Figure`, según el idioma del documento) |
| Cada referencia cruzada | `REF _SDn_<id> \h`; la palabra «tabla» va fuera, como texto |
| Cada nota específica de tabla o figura | Su letra dentro de un marcador `_SDn_n_…`; cada llamada desde una celda es `REF _SDn_n_… \h` con la letra en superíndice (ficha 0033) |
| El texto que genera la exportación | «Tabla 1. », la letra de una nota y «Palabras clave: » van **antes** del marcador del bloque; los encabezados generados («Resumen», «Bibliografía», «Pies de figura») no llevan marcador. Al importar no se comparan (ficha 0033) |
| Cada cita | `ADDIN ZOTERO_ITEM CSL_CITATION {json}`: `citationID` = id de la cita (`c-…`), y cada referencia con su CSL-JSON y **siempre un URI** (el de Zotero o `https://scidesk.app/ref/<proyecto>/<referencia>`) |
| La bibliografía | `ADDIN ZOTERO_BIBL` |
| El documento | Propiedades `ZOTERO_PREF_n` (el estilo, en trozos de 255 caracteres) y `SciDesk` = `{ format: 1, project, article, snapshot, profile: "coauthors" }`, y un marcador `_SDs_s_…` al principio con la instantánea de partida |

El JSON del campo de cita y el de la propiedad `SciDesk` tienen esquema (`docx-citation` y `docx-property`), y el código da los nombres (`blockBookmark`, `numberBookmark`, `snapshotBookmark`, `parseBookmark`, `ownReferenceUri`). **Al importar, las marcas son pistas:** la identidad de cada bloque se confirma por contenido, las citas por `citationID` y las referencias cruzadas por su destino (ficha 0025). El perfil «para la revista» no lleva ninguna marca.

## 10. Qué comprueba cada capa

**`checkDocument` (un archivo):** ids de bloque sin repetir; cada marca de cambio o comentario con su entrada en el registro (y aviso si sobran entradas); los títulos, solo al principio del cuerpo; la rejilla de cada tabla y sus anchos; las llamadas de nota, a una nota de la misma parte; un `src` en una parte guardada en su archivo, aviso.

**`checkProject` (un proyecto):** cada archivo, contra su esquema; un manifiesto en la raíz; ids de referencia sin repetir; ningún bloque `zotero` en un proyecto con biblioteca propia; afiliaciones y miembros de grupo que existen y ORCID con su dígito de control; cada artículo del manifiesto con su `article.json` (mismo id), su perfil de revista si lo nombra, su cuerpo, su resumen y sus autores; autores que existen en el directorio y afiliaciones que son suyas; **ids únicos en todo el documento compuesto** del artículo (cuerpo, resumen, tablas y figuras); cada `tableRef` y `figureRef` con su archivo y el mismo id, sin referencias repetidas; cada imagen de figura presente; cada cita, a una referencia de la biblioteca; cada referencia cruzada, a una tabla, figura, encabezado o ecuación del artículo.

**Con los ejemplos:** los dos proyectos de ejemplo pasan sin errores ni avisos, y las pruebas comprueban que cada regla detecta su error (una cita guardada como número, una referencia que no está, un cambio sin autor, un id repetido entre el cuerpo y una tabla, una fila que no cubre las columnas, una nota de otra tabla, una referencia cruzada sin destino, un título fuera de sitio, una afiliación ajena, un ORCID mal escrito, estado de Zotero en `library.json` y una cita del DOCX sin URI).

## 11. Ejemplos

| Ejemplo | De dónde sale | Qué muestra |
|---|---|---|
| `examples/knee-oa/` | Corpus sintético de la ronda (prototipos 3 y 6), estilo del prototipo 2 | Proyecto con biblioteca propia: título en dos idiomas, 48 bloques, 33 citas, 37 referencias (una importada de un Word con EndNote, con campos sin convertir), 2 tablas con celdas combinadas y notas llamadas desde las celdas, 1 figura, resumen en dos idiomas con palabras clave, 6 autores y un grupo, CRediT, perfil de Reumatología Clínica y la ronda con las dos copias devueltas y sus propuestas |
| `examples/composite-zotero/` | Proyecto de prueba del prototipo 8 y biblioteca del prototipo 5 | Proyecto vinculado a Zotero: el resumen y dos tablas como partes, citas de 30 referencias leídas de Zotero; los ids de bloque, que el prototipo no tenía, los pone la normalización |
| `examples/standalone/` | Prototipo 7 y lo anterior | El documento editado en Word con 8 cambios marcados (7 en el cuerpo y 1 en su tabla, cada archivo con su registro), un campo de cita y la propiedad `SciDesk` de un DOCX para coautores, y el estado local de un equipo con la sincronización de Zotero |

Los ejemplos se regeneran con `npm run make:examples` (ids de un generador con semilla: siempre los mismos bytes; necesita antes las salidas de los prototipos 5 y 7, que no están en el repositorio) y los esquemas con `npm run build:schemas`; `npm test` comprueba todo y `npm run typecheck`, los tipos. Las personas y los datos son ficticios; los Word privados del usuario no se usan.

## 12. Fuera de la v1

- El formato interno de las instantáneas (fase 1).
- Los esquemas de los paquetes para LLM (fase 3), con la misma herramienta.
- Comentarios con formato, movimientos (`w:moveFrom`/`w:moveTo`) y cambios en la estructura de las tablas (fase 2a), notas al pie, paneles de figura («Figura 1B») y la lista de abreviaturas del artículo (V1). Se añadirán como campos opcionales, sin cambiar de versión, o con una migración si hiciera falta.
- Los pendientes («XX», «[REF]») se reconocen en el texto; no tienen nodo propio.
