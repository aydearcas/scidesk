# 0020. Control de cambios sobre suggest-changes y cómo se guardan en `.scidoc`

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 7 de la fase 0). Actualizada el 21/11/2026 con el prototipo 11 (composición del teclado).
- **Pregunta del plan:** R31 (prototipo 7 de la sección 8)

## Qué se decide
- **La base del control de cambios es `@handlewithcare/prosemirror-suggest-changes`** (MIT), en una **copia propia dentro del repositorio** (se conserva su licencia) y detrás de una interfaz propia, como el motor de citas. Se descarta `@manuscripts/track-changes-plugin`.
- La copia propia lleva desde el principio un cambio: **un cambio nuevo solo se une al contiguo si es del mismo autor** (la versión publicada reutiliza el identificador del vecino, incidencia #26, y atribuía a un autor lo que escribía otro). Se incorporarán también la corrección de Intro seguido de Retroceso (#35) cuando se publique o se haga aparte. Las correcciones se ofrecen al proyecto original.
- **Cómo se guardan los cambios en `.scidoc`:**
  - Dentro de `doc` (el JSON de ProseMirror tal cual), cada cambio es una marca `insertion`, `deletion` o `modification` con un solo atributo, `id`. El texto borrado sigue en el documento con su marca hasta que se acepta.
  - Al lado de `doc`, un registro **`changes`** con los datos de cada `id`: autor (la persona de `people.json` si se conoce y, si no, el nombre que trae el DOCX), fecha y origen (escrito aquí, copia de Word, paquete para LLM, copia en conflicto o versión antigua; [0019](0019-modelo-unico-de-propuestas.md)). Al guardar se eliminan las entradas cuyo `id` ya no está en el documento.
  - Los `id` son cadenas opacas y únicas, generadas al azar como los de los bloques, para que no choquen al fusionar copias.
  - Partir o unir párrafos se representa, como hace la pieza, con un espacio de anchura cero (U+200B) marcado a cada lado del corte. Un párrafo entero insertado o borrado lleva la marca en el propio nodo. El cambio de formato es un borrado más una inserción del mismo texto con el mismo `id`.
  - Cada archivo del documento compuesto (`.scitable`, resumen) lleva su propio registro para los cambios de su contenido.
- **Correspondencia con Word** (exportación e importación simétricas): inserción ↔ `w:ins`, borrado ↔ `w:del`/`w:delText`, corte de párrafo marcado ↔ marca de párrafo insertada o borrada (`w:pPr/w:rPr/w:ins` o `w:del`), cambio de formato ↔ `w:rPrChange`, y autor y fecha ↔ `w:author` y `w:date`. Al importar, las revisiones contiguas de Word con el mismo tipo, autor y fecha forman un solo cambio.

## Por qué
- En el prototipo, suggest-changes pasa los 18 casos de edición (insertar, borrar, sustituir, partir y unir párrafos, borrar entre párrafos, citas, negrita, tablas, dos autores, guardar y reabrir, deshacer); Manuscripts falla 3 (unión de párrafos, borrado entre párrafos y formato).
- Con este modelo, Word abre los 11 DOCX exportados y ve los mismos cambios, autores y textos (aceptar todo y rechazar todo dan lo mismo en Word que en SciDesk). Los cambios hechos por el propio Word se importan con su autor y también dan el mismo texto al aceptarlos o rechazarlos.
- suggest-changes no depende del esquema: solo pide tres marcas. Manuscripts exige un atributo `dataTracked` en todos los nodos y marcas, carga además su esquema completo (`@manuscripts/transform`, con citeproc y otras dependencias), fija versiones exactas de ProseMirror y su repositorio público no se actualiza desde 2023.
- suggest-changes es pequeña (unas 1.200 líneas) y legible, así que mantener una copia propia es asumible; es la forma de no depender de una biblioteca joven (6.1).
- Es más rápida en un artículo largo: 0,16 ms por pulsación de mediana con 8000 palabras y 100 cambios (Manuscripts, 0,37 ms).
- Autor y fecha aparte, en un registro por `id`, en lugar de dentro de cada marca: las marcas quedan pequeñas, el registro se corresponde con el modelo de propuestas (un cambio, su autor y su origen) y con lo que hace Word.

## Qué se descartó
- `@manuscripts/track-changes-plugin`, por lo anterior. Su ventaja, guardar autor, fecha y estado dentro de cada marca, se obtiene con el registro.
- Usar suggest-changes tal cual, sin copia propia: atribuye mal los cambios contiguos de dos autores.
- Guardar autor y fecha como atributos de cada marca: la pieza solo crea marcas con `id`, habría que tocar muchos más puntos de su código, y el JSON crece mucho (con Manuscripts, cada cambio ocupa unas diez líneas).
- Escribir el control de cambios desde cero: suggest-changes ya resuelve bien lo difícil (pasos de ProseMirror, deshacer, aceptar y rechazar).

## Consecuencias
- Todo lo que lee texto (recuento de palabras, búsqueda, corrector, comprobaciones, exportadores) tiene que ignorar el texto con marca `deletion`, según la vista, y los U+200B marcados. Al cargar, se eliminan los U+200B que no llevan marca.
- Al partir un párrafo, el nuevo hereda el `id` del bloque: la capa de identificadores tiene que regenerarlo, como ya preveía 3.2.
- El esquema de `.scidoc` v1 incluye las tres marcas, el registro `changes` y que `doc` y las celdas de tabla admitan las marcas en sus bloques.
- Quedan para el prototipo 8 y el corte vertical de la fase 1: probar el modo de sugerencias con el teclado real (Intro, Retroceso, IME) y encajarlo en el `dispatchTransaction` de Tiptap.
- **Composición del teclado** (prototipo 11, [0030](0030-tauri-confirmado.md)): en el Mac, las teclas de acento abren una composición y el modo sugerencias dejaba «s´í». La copia propia de la pieza no convierte en sugerencia lo que ocurre durante la composición y, al terminar, aplica el cambio neto como una sola sugerencia (código de partida en `prototypes/08-composite-document/src/editor.js`, `compositionPlugin`; comprobado en Safari).
- Quedan para la fase 2a: comentarios (`w:comment`), cambios en la estructura de las tablas, movimientos (`w:moveFrom`/`w:moveTo`), cambios de estilo de párrafo y qué hacer cuando un autor borra la inserción de otro (la pieza la elimina sin dejar rastro).
- La exportación del prototipo está escrita a mano; la definitiva usa la biblioteca `docx` (prototipo 3) con la misma correspondencia.
- Detalle, casos y resultados en [`prototypes/07-track-changes/README.md`](../../prototypes/07-track-changes/README.md). Actualiza [0010](0010-pila-tecnologica.md).
