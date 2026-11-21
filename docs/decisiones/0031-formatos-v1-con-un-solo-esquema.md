# 0031. Formatos v1 con un solo esquema: TypeBox en `packages/formats/`

- **Fecha:** 21/11/2026
- **Estado:** aceptada la herramienta, la carpeta, `.scifigure` y que las rondas viajan con el proyecto (elegido por el usuario el 21/11/2026); el resto del formato es una propuesta pendiente de su revisión. Corrige [0027](0027-zotero-por-su-api-local.md) en lo que guarda `library.json` de Zotero.
- **Pregunta del plan:** R34 y la última tarea de la fase 0 (PLAN.md, sección 8)

## Qué se decide
- **Herramienta: TypeBox 1.x (MIT).** Cada formato se define una vez en `packages/formats/src/`. De la definición salen los tipos de TypeScript, el validador y el JSON Schema 2020-12 publicado (`schemas/`, con `$id` en `https://scidesk.app/schema/v1/`). El programa valida con el mismo objeto que se publica.
- **Carpeta: `packages/formats/`** (`@scidesk/formats`), el primer paquete del núcleo sin interfaz. La especificación en español está en [`docs/formatos/especificacion-formatos.md`](../formatos/especificacion-formatos.md).
- **Formatos especificados:** `.scidoc`, `.scitable`, `.scifigure`, el manifiesto `.scidesk`, `article.json`, `authors.json`, `people.json`, `library.json`, el perfil de revista, la ronda de revisión y el conjunto de propuestas, el campo de cita y la propiedad `SciDesk` del DOCX, y el estado local de un proyecto en cada equipo.
- **Decisiones de formato que toma esta ficha:**
  - **Ids `<tipo>-<sufijo>`** (sufijo aleatorio de 10 caracteres `[a-z0-9]`), con un tipo por clase de objeto; el proyecto, un UUID v4. El marcador del DOCX es el id con el guion cambiado por `_`.
  - **Secciones como encabezados con `role`**, no como nodos contenedores. Corrige el ejemplo de PLAN.md 3.2.
  - **La cita guarda `items`** (`ref`, y si hace falta `locator`, `label`, `prefix`, `suffix`, `suppressAuthor`) y su propio `id`, que es el `citationID` del DOCX.
  - **Título como bloque `title` por idioma** al principio del cuerpo. **Resumen por idioma** (`abstractSection`) con palabras clave como nodos.
  - **Notas de tabla `general` o `specific`**; solo las específicas se llaman con `noteRef` y reciben letra.
  - **`.scitable` conserva la alineación de cada celda y los anchos relativos de las columnas** y descarta bordes, sombreado, fuentes y tamaños: cierra la propuesta de [0022](0022-pegar-tablas-de-word.md).
  - **`.scifigure`** para el pie, las notas, la imagen, el texto alternativo, la fuente y la licencia de cada figura, con el mismo envoltorio que `.scitable`. Es una cuarta extensión.
  - **Los idiomas van en cada artículo, no en el manifiesto.**
  - **`modification` lleva los atributos de `prosemirror-suggest-changes`** (`type`, `attrName`, `previousValue`, `newValue`) para los cambios de atributos de nodos; matiza «un solo atributo, `id`» de [0020](0020-control-de-cambios.md), que vale para `insertion` y `deletion`.
  - **Comentarios en un registro `comments`** junto a `changes`, con la marca `comment {id}`.
  - **Cada dato del perfil de revista es `{ value, source, quote?, checked? }`**, con las fuentes listadas en el perfil.
  - **Propuestas:** el estado de la fusión (`status`) y la decisión del usuario (`decision`) van en campos distintos. El ancla está en la versión base: bloque y desplazamientos de ProseMirror, más el texto de antes y después.
  - **Las rondas con coautores viajan con el proyecto** (`articles/<artículo>/rounds/<ronda>/`, con copia de los DOCX devueltos), y las propuestas de otros orígenes, en `articles/<artículo>/proposals/`.
  - **`library.json` no guarda la versión del elemento de Zotero ni el `Zotero-Server-ID`.** Van al estado local de cada equipo; en el proyecto queda lo que identifica el elemento (clave, URI, biblioteca y fecha de modificación). **Corrige [0027](0027-zotero-por-su-api-local.md).**
- **Validación en tres capas:** forma (JSON Schema), normalización al cargar (ids que faltan o repetidos y U+200B sin marca) y reglas entre archivos (citas, referencias cruzadas, partes, autores, ORCID).

## Por qué
- **TypeBox** genera JSON Schema directamente: no hay conversión que pierda reglas, a diferencia de los refinamientos de Zod. El esquema publicado sirve también al núcleo de Rust, a quien procese un paquete para LLM y al catálogo público de perfiles. Se comprobó con Ajv, un validador independiente, que acepta y rechaza lo mismo con todos los ejemplos.
- **Los ejemplos salen de los prototipos:** el artículo sintético de la ronda (prototipos 3 y 6) con sus tablas, figura, biblioteca, personas, perfil y las propuestas de las dos copias; el proyecto del prototipo 8 con la biblioteca del prototipo 5; y el documento editado en Word del prototipo 7. Pasan todas las comprobaciones sin errores ni avisos, y 21 pruebas confirman que cada regla detecta su error.
- **Encabezados con `role`** en lugar de secciones anidadas: es lo que usan Tiptap, Word y los prototipos 3, 7 y 8, editar es más sencillo (mover texto entre secciones, importar un Word plano) y JATS se puede derivar al exportar.
- **El estado de Zotero fuera del proyecto:** el usuario trabaja en el PC y en el MacBook con la carpeta sincronizada. Cada equipo tiene su instalación de Zotero y su `Zotero-Server-ID`, así que guardarlos en `library.json` lo reescribiría cada vez que se cambia de equipo, con riesgo de copias en conflicto. Perder el estado local solo obliga a una comparación completa, que tarda unos 60 ms (prototipo 5).
- **`.scifigure` y rondas que viajan:** elegidos por el usuario. Las figuras entran en el documento compuesto igual que las tablas, y una ronda a medias se puede seguir en otro equipo.

## Qué se descartó
- **Zod 4**, por lo anterior.
- **Esquemas en una carpeta `spec/`** separada del código: habría que moverlos en la fase 1.
- **Secciones como nodos contenedores**, como en el ejemplo de la v0.5.
- **`refs` como lista de cadenas** (prototipos 7 y 8): no deja sitio a la página citada ni a prefijos y sufijos.
- **Idiomas en el manifiesto:** un proyecto puede tener artículos en idiomas distintos.
- **Pie de figura en un JSON sin extensión propia** y **figuras sin especificar hasta la fase 1**.
- **Rondas solo en el equipo**: no se podrían seguir en otro.
- **Validar ids obligatorios sin normalizar antes:** el esquema exige ids, y por eso la carga normaliza primero, como decía la regla 1 de [0021](0021-documento-compuesto.md).

## Consecuencias
- **Fase 1:** el esquema de ProseMirror del editor (Tiptap) debe coincidir con estas definiciones (nombres de nodo y marca, atributos). Hará falta una prueba que lo compruebe. El núcleo usa `normalize`, `validate`, `checkDocument` y `checkProject` de este paquete.
- **Fase 1:** queda por fijar el formato interno de las instantáneas de `.scidesk/history/`. Este paquete fija su id (`s-…`).
- **Fase 3:** los esquemas de los paquetes para LLM se escriben con la misma herramienta ([0018](0018-paquetes-llm.md)).
- **PLAN.md** cambia en 3.2 (ejemplo), 4 (estructura de carpetas, manifiesto y `.scifigure`), 6.1 (herramienta) y 8 (fase 0 terminada salvo los nombres y dominios).
- Se publican los esquemas en `https://scidesk.app/schema/v1/` cuando el dominio esté reservado.
- Detalle en [`docs/formatos/especificacion-formatos.md`](../formatos/especificacion-formatos.md) y [`packages/formats/`](../../packages/formats/).
