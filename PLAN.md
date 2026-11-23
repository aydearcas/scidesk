# SciDesk: plan de desarrollo

**Borrador v0.5, 21 de noviembre de 2026.** Incorpora la revisión de la v0.4 ([`docs/revision-plan-v0.4.md`](docs/revision-plan-v0.4.md), propuestas R1 a R45) con tus comentarios. Están contestadas todas las preguntas, de P1 a P24 (sección 10). Lo que he supuesto sin preguntarte aparece como *Supuesto*. Cada decisión tomada tiene su ficha en [`docs/decisiones/`](docs/decisiones/). Las referencias del tipo "(R12)" remiten a la propuesta de la revisión de la que sale cada cambio.

> **El programa se llama SciDesk** (decidido en P19). Su nombre de trabajo era SciScribe, que se descartó porque ya existe un producto con ese nombre en el mismo sector.

## Novedades de la v0.5

- **Circuito con Word.** Se puede empezar un artículo a partir de un Word que ya existe (R1). La fusión de revisiones pasa a ser a tres bandas, con las marcas del DOCX especificadas, un plan B para cuando se pierden y un filtro de ruido (R2 a R4). Todo lo que entra de fuera (coautores, LLM, copias en conflicto, versiones antiguas) se revisa con un único mecanismo de propuestas (R7, 6.5).
- **Comprobaciones sin IA:** coherencia de cifras, manuscrito cegado, verificación de referencias, leyenda de abreviaturas por tabla, pendientes y avisos que se pueden ignorar (R8 a R12, 5.8).
- **Escritura diaria:** autocorrección científica, atajos de Word en español, opciones de pegado como en Word, búsqueda en todo el proyecto y búsqueda en PubMed desde el buscador de citas (R18, R19, R22 a R24).
- **Datos seguros:** escritura atómica con recuperación, historial con un archivo por instantánea, caché fuera de la carpeta sincronizada, copias en conflicto en lugar del aviso de "abierto en otro equipo" y nombres de carpeta fijos en inglés (R25 a R28 y P24).
- **Técnica:** corrector ortográfico propio, PDF y vista previa con Typst, control de cambios propio, documento compuesto, núcleo sin interfaz con línea de comandos, un solo esquema de validación, DOCX con plantilla y pruebas en Word real, y Tauri con tres condiciones (R29 a R35, R37 y R38).
- **Hoja de ruta:** fase 0 con once prototipos, corte vertical al empezar la fase 1, MVP recortado por un lado y ampliado por otro, y fase 2 en dos partes (R41 a R44).
- **Para más adelante:** resumen bilingüe lado a lado (R13) y bitácora de envíos (R15). **Descartadas:** devolver a los coautores lo hecho con sus propuestas (R6), ayudas para recortar (R17), recortes y bloques que no se exportan (R21), la aprobación final en el programa (R5), la nota de apoyo por cita (R24), el estudio del trabajo previo (R36) y la prueba en un PC de hospital (R39). El resultado de cada propuesta está al principio de la revisión.

La v0.4 decidió la licencia AGPL-3.0 con CLA, el historial con instantáneas propias, los perfiles de revista bajo demanda, varios artículos por proyecto, la adaptación a revista sin IA, los niveles de confidencialidad de los paquetes para LLM y el nombre SciDesk. La v0.3 añadió el resumen aparte, los dos modos de biblioteca (propia o Zotero), los perfiles de revista y el módulo de adaptación, la fusión de copias de varios coautores, los paquetes para LLM y las fuentes de Word.

## Decisiones tomadas

| # | Decisión | Consecuencias en el plan |
|---|---|---|
| P1 | **Código abierto público**, dejando abierta la posibilidad de una versión de pago | Licencia de P1b. Motor de citas sustituible |
| P1b | **Licencia AGPL-3.0 con acuerdo de contribución (CLA)** | Los colaboradores externos firman un CLA que permite la licencia dual o una versión de pago. citeproc-js se usa bajo AGPL (bajo CPAL, con su atribución, en una versión con otra licencia; ficha 0026). Comprobación automática de licencias de las dependencias (6.3) |
| P2 | **Windows y macOS. Se desarrolla primero en Windows** y después se prueba en macOS (tienes un MacBook Air) | La integración continua compila para los dos sistemas desde la fase 1, pero el desarrollo y las pruebas diarias se hacen en Windows. El pegado de tablas y la edición básica se prueban en el MacBook ya en la fase 0, y las pruebas del editor se ejecutan a diario también sobre WebKit (R37). Lo demás propio de macOS (portapapeles de Word para Mac, firma y notarización) se resuelve antes de la primera versión pública (7.7) |
| P3 | **Primero biomedicina y clínica**, en español e inglés; después, cualquier disciplina | Plantillas, comprobaciones y perfiles empiezan por biomedicina, pero el modelo no se ata a ella: tipos de artículo, guías de publicación y perfiles de revista son datos, no código. En el primer arranque eliges tus áreas principales para filtrar plantillas y revistas sugeridas |
| P4 | Coautores con **Word por correo**; la edición simultánea vendrá después | La ida y vuelta con DOCX está en la fase 2. El modelo de documento se diseña para admitir edición simultánea más adelante (5.11 y fase 5) |
| P4b | Varios coautores revisan **en paralelo** y cada uno devuelve su copia; tú lo pasas todo a tu copia maestra | **Fusionar varias copias devueltas es el núcleo de la fase 2**, no un extra (5.11) |
| P5 | **Texto continuo + vista previa paginada** | No hay paginación en vivo. La vista previa y el PDF se hacen con Typst (R30), que la fase 0 confirma con un prototipo |
| P6 | Ecuaciones: pocas en biomedicina, pero **necesarias para ampliar a otras disciplinas** | El formato las admite desde la versión 1, para no tener que migrar documentos. El editor y la exportación a Word llegan con la ampliación a otras disciplinas (fase 4) |
| P7 | Interfaz en **español e inglés**, con cambio de idioma en las opciones. **El código, en inglés** | Todos los textos de la interfaz van en archivos de traducción desde el primer día. Identificadores, claves del formato, comentarios del código y mensajes de commit, en inglés (P23) |
| P8 | **Cada tabla en su propio archivo** (`tables/`) y cada figura en `figures/`, **editables también desde la vista del documento completo** | La tabla se edita dentro del artículo, como en Word, o en su propia pestaña; en los dos casos se modifica el mismo archivo. Se consigue con un documento compuesto al cargar y repartido al guardar (R32, 3.3) |
| P9 | Documentos base aceptados, **más un documento propio para el resumen y las palabras clave**. Las plantillas por tipo de artículo se hacen según avance el desarrollo | Ver 4 |
| P10 | Revistas Q1–Q2 de reumatología. **Reumatología Clínica es la revista de prueba** | Primer perfil de revista y caso de prueba de principio a fin (5.9) |
| P11 | **Zotero vinculado** (primero Zotero; EndNote y Mendeley después) **o biblioteca propia** dentro del programa, ampliable con nuevos RIS, NBIB… | Dos modos de biblioteca (5.6) |
| P12 | **Un proyecto puede tener varios artículos**: el formato lo admite desde el principio y el MVP muestra uno solo. Biblioteca y directorio de personas comunes al proyecto, sin biblioteca global; tablas y figuras se copian entre artículos | Nueva estructura de carpetas (4) y análisis en 4.1. "Añadir otro artículo" llega en V1 |
| P13 | Incluir el **estilo de cita de Reumatología Clínica** | Existe en el repositorio oficial de estilos CSL, pero es de 2012 y no coincide con la guía actual. SciDesk incluye uno propio, derivado de «Elsevier - Vancouver» (prototipo 2, ficha 0026) |
| P14 | Consultar Crossref y PubMed por internet: **sí, como opción que se activa en el programa y explica para qué sirve** | Ajuste de conexión con una explicación por servicio. Todo funciona igual sin red (5.6) |
| P15 | **Historial con instantáneas propias**, no con git | Archivos que se escriben una vez y no se modifican, seguros al sincronizar con OneDrive: uno por instantánea, con solo lo nuevo de esa versión (R26). Puedes usar git por tu cuenta sobre la carpeta (6.4) |
| P16 | Asistente con IA: **más adelante**; cuando exista el programa se decidirá en qué pasos | Sigue en [Después]. Se añade la idea de los paquetes para LLM (5.12) |
| P17 | Conexión con revsis-app o PICO Creator: **por ahora no** | Sale de la hoja de ruta |
| P18 | **Pila propuesta aceptada**: Tauri + React + TypeScript | Se confirma con los prototipos de la fase 0. Tauri se mantiene si se cumplen tres condiciones; si falla alguna, se pasa a Electron (R37, 6.1) |
| P19 | **El programa se llama SciDesk** | Extensiones: `.scidesk` para el manifiesto del proyecto y su carpeta oculta, `.scidoc` para los documentos y `.scitable` para las tablas (*Supuesto*). Comprobaciones y nombres descartados en la ficha 0016 |
| P20 | **Perfiles de revista bajo demanda**: estilo de cita y datos de la revista de fuentes abiertas; el resto, con un paquete para LLM cuando eliges una revista que aún no tiene perfil | Nadie tiene que crear perfiles de todas las revistas por adelantado: el catálogo crece con el uso (5.9) |
| P21 | **El módulo de adaptación a revista no usa IA**: solo formato y requisitos | Lo que no toca tu texto se aplica al exportar; lo demás queda como lista de tareas. La ayuda con IA en la redacción, la corrección y la traducción irá en la futura versión con IA (5.12) |
| P22 | **Paquetes para LLM con cuatro niveles de confidencialidad** (0 público, 1 términos sueltos, 2 fragmentos que eliges, 3 documento completo) | Por defecto solo se ofrecen los niveles 0 y 1. Primeros usos: perfiles de revista y diccionarios de especialidad (5.12) |
| P23 | **Comentarios del código y mensajes de commit en inglés** | El plan y las decisiones siguen en español |
| — | **Fuentes**: todas las habituales de Word (Calibri, Times New Roman, Arial…) y Roboto | Ver 5.2 |
| — | **Módulo de adaptación a revista** | Ver 5.9 |

Decisiones que salen de la revisión de la v0.4:

| # | Decisión | Consecuencias en el plan |
|---|---|---|
| R1 | **Empezar un artículo a partir de un Word que ya existe** | Secciones, tablas y figuras en el MVP; las citas de Zotero, Mendeley y EndNote del Word, en la fase 2 (5.1) |
| R2–R4 | **Fusión a tres bandas** (lo enviado, tu copia actual y cada copia devuelta), con las marcas del DOCX especificadas, un plan B cuando se pierden y un filtro de ruido | Las copias pueden llegar en cualquier orden mientras sigues escribiendo (5.10, 5.11, ficha 0003) |
| R7 | **Un único mecanismo de propuestas** para todo lo que entra de fuera. Un LLM es un coautor más | Una sola vista de revisión para coautores, paquetes para LLM, copias en conflicto y versiones antiguas (6.5, ficha 0019) |
| R26 | **En la carpeta del proyecto solo viaja el historial**, con un archivo por instantánea. La caché y el estado de la ventana se quedan en cada equipo | 4 y 6.4, ficha 0013 |
| R28 | **Nombres de carpeta fijos en el disco** y etiquetas traducidas en el programa. A la izquierda, un navegador por conceptos | Los nombres van en inglés (P24). 4 y 5.1, ficha 0005 |
| P24 | **Nombres fijos de carpetas y archivos en inglés** (`references/`, `people/`, `articles/main/`, `tables/`, `figures/`…) | Coherentes con las claves del formato y el código (P7, P23); dentro del programa cada cual ve las etiquetas en su idioma. Los nombres que salen de tu contenido (proyecto, tablas) siguen en tu idioma (4, ficha 0005) |
| R29–R32 | **Corrector ortográfico propio, PDF con Typst, control de cambios propio y documento compuesto** | Los cuatro se prueban con un prototipo en la fase 0 (3.3, 6.1, fichas 0004, 0006 y 0010) |
| R33–R34 | **Núcleo sin interfaz con línea de comandos y un solo esquema** para validar todo. El `.scidoc` es el JSON de ProseMirror tal cual. **Formatos v1 especificados con TypeBox en `packages/formats/`** (21/11/2026), con `.scifigure` para las figuras y las rondas de revisión dentro del proyecto | 3.2, 4, 6.1 y 6.2; [`docs/formatos/especificacion-formatos.md`](docs/formatos/especificacion-formatos.md), ficha 0031 |
| R36 | **No se usa código GPL ni AGPL de terceros**, aunque la licencia lo permitiría, para no cerrar la licencia dual | 6.3, ficha 0012 |
| R40 | **Firma del instalador de Windows: por ahora, como el software libre habitual**, sin certificado comercial | 8, ficha 0002 |
| R42–R44 | **Corte vertical al empezar la fase 1, MVP recortado y ampliado, y fase 2 en dos partes** | 8 |

Prioridad de cada función:
- **[MVP]**: imprescindible en la primera versión usable.
- **[V1]**: en la primera versión completa.
- **[Después]**: interesante, pero no bloquea nada.

---

## 1. Visión

Un procesador de texto de escritorio para escribir artículos científicos de principio a fin: desde crear el proyecto hasta generar el paquete de envío a la revista y responder a los revisores.

Principios que guían todas las decisiones:

1. **Estructura antes que formato.** El programa sabe qué es el título, el resumen, una cita, una tabla o una afiliación. No son simplemente "texto en negrita". Gracias a eso puede numerar, contar palabras, comprobar y exportar sin que tú hagas nada a mano.
2. **Una sola fuente de verdad.** Autores, afiliaciones, referencias, figuras y tablas se definen una vez y aparecen donde haga falta: portada, carta, contribuciones, versión cegada…
3. **Word es un formato de salida de primera clase.** Las revistas y los coautores trabajan con .docx. Exportar a Word tiene que quedar impecable, y volver a importar lo que te devuelven tiene que ser posible.
4. **Archivos abiertos dentro de una carpeta.** No hay base de datos oculta. Se puede copiar, sincronizar con OneDrive o versionar con git, y nunca te quedas atrapado en el formato.
5. **Funciona sin conexión.** Internet solo se usa para buscar metadatos (DOI, PMID) y descargar estilos de cita y perfiles de revista, y siempre como una opción que activas tú y que explica para qué sirve.
6. **Lo que escribes no sale de tu equipo sin que lo decidas.** Nada del manuscrito se envía a ningún servicio de forma automática. Cuando algo sale (una consulta de DOI, un paquete para un LLM), el programa te enseña antes exactamente qué.

## 2. Qué existe y qué hueco cubre

Esto es lo que conozco hasta mediados de 2026. Conviene repasarlo en la fase 0.

| Herramienta | Qué hace bien | Qué le falta para este caso |
|---|---|---|
| Word + Zotero/EndNote | Es el estándar; los coautores lo usan | No tiene estructura de proyecto, los documentos satélite van a mano y las figuras y tablas se numeran a mano |
| Overleaf / LaTeX | Estructura, referencias y plantillas de revista | Exige saber LaTeX y casi no se usa en biomedicina |
| Editores de LaTeX en línea con IA (por ejemplo, sciscribe.dev) | Plantillas de revista, ayuda con IA y colaboración | Exigen LaTeX y trabajan en la nube |
| Manuscripts.io, Authorea, Curvenote | Edición estructurada orientada a revistas | Son web o en la nube, con poco control local y una adopción limitada |
| Zettlr / Pandoc / Typst | Texto plano y citas CSL | No son WYSIWYG y pegar tablas de Word es complicado |

El hueco que cubre SciDesk: un editor visual como Word, con la lógica de proyecto de VS Code y todo lo que piden las revistas, empezando por las biomédicas (ICMJE, CRediT, guías EQUATOR, versión cegada, carta de presentación).

## 3. El formato del archivo del artículo (investigación)

### 3.1 Opciones evaluadas

| Formato | Ventajas | Inconvenientes | Veredicto |
|---|---|---|---|
| **DOCX como formato nativo** | Compatibilidad total con Word | XML enorme y ambiguo. Las citas, la numeración y la estructura serían "texto con estilo", y mantenerlas sincronizadas es frágil. Cada guardado podría perder información | Solo como exportación e importación |
| **ODT** | Abierto y estándar | Los mismos problemas que DOCX y nadie lo usa en revistas | No |
| **Markdown / Pandoc** | Texto plano, ideal para git | Las tablas con celdas combinadas, bordes y formato copiadas de Word no caben; habría que extender la sintaxis | No como formato principal, sí como exportación |
| **LaTeX** | Potente | Difícil de editar visualmente y poco usado en biomedicina | Solo exportación [Después] |
| **JATS XML** | Es *el* estándar de las revistas (PubMed Central lo usa), así que la semántica es perfecta | Muy verboso y lento de manipular para la edición diaria | Sí como exportación, y como referencia para diseñar el formato propio |
| **Formato propio en JSON** | Representa exactamente el modelo del editor. Se puede versionar y migrar. Las citas, figuras y referencias cruzadas son objetos, no texto | Hay que diseñarlo y documentarlo, y otros programas no lo abren | **Recomendado** |

### 3.2 Recomendación

**Un formato propio en JSON, legible y versionado, cuyos conceptos copien los de JATS.** Su núcleo es el documento del editor (ProseMirror, ver sección 6) serializado tal cual, sin capa de traducción (R34): es lo más sencillo y lo que menos errores admite en la versión 1. Las reglas:

- Se guarda como un archivo `.scidoc` dentro de la carpeta del proyecto. No es un ZIP, porque la propia carpeta ya contiene figuras y tablas.
- Lleva un campo `schemaVersion` y migraciones automáticas, de modo que los documentos antiguos siempre se abren.
- Cada bloque (párrafo, sección, tabla) tiene un identificador estable. Esto permite comentarios, control de cambios, fusión de revisiones y respuestas a revisores que apunten a un sitio concreto. **Al copiar y pegar un bloque se le da un identificador nuevo**, para que no haya duplicados que confundan a la fusión (R34).
- **Nunca se guardan números calculados.** Una cita es `{tipo: cita, refs: ["smith2021"]}`, no "[3]", y una figura es una referencia a `figures/fig-kaplan.png`. La numeración se calcula al mostrar o exportar. Lo mismo vale para las llamadas de nota de las tablas (ᵃ, ᵇ, ᶜ): cada nota es un objeto con identificador y su letra se calcula (R11, 5.4).
- Cada bloque y cada fragmento admiten un atributo de idioma desde la versión 1, aunque la función llegue en V1 (R20, 5.2).
- Las claves del formato están en inglés (P7). El esquema incluye desde la versión 1 los elementos que llegarán más tarde (ecuación, comentario, cambio), para no tener que migrar documentos cuando lleguen (P6). Los cambios marcados se guardan como marcas `insertion`, `deletion` y `modification` con un `id`, y el autor, la fecha y el origen de cada `id` van en un registro `changes` junto a `doc` (prototipo 7, ficha 0020).
- **Un solo esquema por formato** (`.scidoc`, `.scitable`, perfil de revista, respuesta de un paquete para LLM), definido una vez con una herramienta que genera a la vez los tipos de TypeScript, la validación y el JSON Schema publicado. Todo lo que entra de fuera se valida con ese mismo código (R34). **Hecho en la fase 0 con TypeBox** en [`packages/formats/`](packages/formats/); la especificación completa está en [`docs/formatos/especificacion-formatos.md`](docs/formatos/especificacion-formatos.md) (ficha 0031).
- Se escribe con formato estable (claves ordenadas, sangría) para que las diferencias entre versiones sean legibles.
- Hay una garantía anti-encierro: el contenido siempre se puede exportar a DOCX, Markdown y JATS sin pérdida de texto.

Ejemplo simplificado. El archivo envuelve el documento de ProseMirror (`doc`), y los datos de cada nodo van en `attrs`, como los guarda ProseMirror. Las secciones no son nodos contenedores: un encabezado con `role` empieza la sección (ficha 0031):

```json
{
  "schemaVersion": 1,
  "documentType": "article",
  "lang": "es",
  "doc": {
    "type": "doc",
    "content": [
      { "type": "heading", "attrs": { "id": "b-2c9e0k1m4q", "level": 1, "role": "introduction" }, "content": [{ "type": "text", "text": "Introducción" }] },
      { "type": "paragraph", "attrs": { "id": "b-7f3a2n8x5w" }, "content": [
        { "type": "text", "text": "La artritis reumatoide afecta al 0,5–1 % de la población " },
        { "type": "citation", "attrs": { "id": "c-4h9s1d7e2r", "items": [{ "ref": "r-smo2016aaa" }, { "ref": "r-ale2018bbb", "locator": "12", "label": "page" }] } },
        { "type": "text", "text": ". Los resultados se muestran en la tabla " },
        { "type": "xref", "attrs": { "target": "t-basal8k2m1" } }
      ]},
      { "type": "tableRef", "attrs": { "id": "t-basal8k2m1", "src": "tables/caracteristicas-basales.scitable" } }
    ]
  },
  "changes": {},
  "comments": {}
}
```

### 3.3 Documento compuesto (R32)

P8 pide editar cada tabla dentro de la vista del documento completo aunque viva en su propio archivo, y lo mismo el resumen. Un editor de ProseMirror trabaja sobre un único árbol, así que se **compone al cargar y se reparte al guardar**: en memoria hay un solo documento con el resumen, el cuerpo, las tablas y los pies de figura, y la capa de guardado escribe cada parte en su archivo (el `tableRef` del ejemplo es el punto donde se inserta la tabla). La pestaña propia de una tabla es otra vista de esa misma parte del documento.

Así, deshacer, buscar, seleccionar, el control de cambios, la fusión y la numeración de las citas dentro de las tablas funcionan como en un solo documento. Se descartó tener un editor anidado por tabla, porque convierte cada tabla en una isla y obliga a duplicar el control de cambios. Como afecta a la especificación de los formatos, se probó en la fase 0 (prototipo 8, ficha 0021): funciona con cuatro reglas (ids normalizados al cargar, bordes de las partes protegidos, copias de tablas con archivo propio y tablas sin referencia que no se borran).

## 4. Estructura de un proyecto nuevo

Un proyecto corresponde a un estudio y puede contener varios artículos: el protocolo, el artículo principal, los análisis secundarios… (decidido en P12; análisis en 4.1).

El asistente "Nuevo artículo" crea el proyecto con su primer artículo y te pregunta:
- El tipo de artículo.
- El idioma o idiomas. Reumatología Clínica, por ejemplo, pide el título, el resumen y las palabras clave también en inglés.
- La revista objetivo (opcional) y el estilo de cita.
- El modo de la biblioteca: propia o vinculada a Zotero (5.6).

Y genera esto:

```
mi-estudio/
├── mi-estudio.scidesk          ← manifiesto: identificador del proyecto, artículos, modo de biblioteca, versión del formato (los idiomas van en cada artículo)
├── references/                    ← «Referencias»; común a todo el proyecto
│   ├── library.json               ← biblioteca en CSL-JSON (con la clave de Zotero si está vinculada)
│   └── imports/                   ← copia de cada RIS o NBIB importado, para trazabilidad
├── people/                        ← «Personas»
│   └── people.json                ← ficha de cada persona: nombre, forma de cita, ORCID, correo, grado y afiliaciones
├── resources/                     ← «Recursos»; común: diccionario del proyecto (dictionary.txt), abreviaturas, perfiles de revista (journals/) y estilos CSL elegidos (styles/)
├── articles/                      ← «Artículos»
│   └── main/                      ← el primer artículo; el programa oculta este nivel mientras solo haya uno
│       ├── article.json           ← tipo, idiomas, revista objetivo, estilo de cita y avisos ignorados de este artículo
│       ├── manuscript/
│       │   ├── article.scidoc     ← el cuerpo del artículo
│       │   └── abstract.scidoc    ← resumen y palabras clave, en uno o dos idiomas
│       ├── authors.json           ← quién firma, orden, afiliaciones usadas, CRediT, correspondencia y conflictos
│       ├── documents/
│       │   ├── cover-letter.scidoc   ← carta de presentación: plantilla con campos de la revista, el editor, el título y los autores
│       │   ├── title-page.scidoc     ← portada: se genera a partir de authors.json y people.json
│       │   ├── contributions.scidoc  ← se genera a partir de la matriz CRediT
│       │   ├── declarations.scidoc   ← financiación, conflictos, ética, disponibilidad de datos, uso de IA
│       │   └── reviewer-responses/   ← respuesta a revisores, una por ronda de revisión [V1]
│       ├── figures/               ← cada imagen original y su .scifigure (pie, notas, texto alternativo, fuente, licencia)
│       ├── tables/                ← cada tabla en su archivo .scitable
│       ├── rounds/                ← rondas con coautores: copias enviada y devueltas y sus propuestas [fase 2]
│       ├── proposals/             ← propuestas de otros orígenes: paquetes para LLM, copias en conflicto, versiones antiguas
│       ├── supplementary/
│       │   └── supplementary-material.scidoc ← con su propia numeración (Tabla S1, Figura S1)
│       └── exports/               ← DOCX, PDF y paquetes de envío generados (se pueden borrar y regenerar)
└── .scidesk/                       ← solo el historial de versiones, en history/ (oculta); viaja con el proyecto
```

Entre comillas angulares, la etiqueta que muestra el programa con la interfaz en español; con la interfaz en inglés, cada carpeta se ve con su nombre.

- **Lo que se sincroniza y lo que es de cada equipo (R26).** En la carpeta del proyecto solo queda lo que debe viajar con él, incluido el historial. La caché, el estado de la ventana y los ajustes locales van a la carpeta de datos de la aplicación del sistema, asociados al identificador del proyecto. Si se sincronizaran, generarían conflictos entre el PC y el MacBook.
- **Varios artículos (P12).** Lo común está en la raíz del proyecto y lo de cada artículo, en `articles/<nombre>/`. Un segundo artículo es otra carpeta, por ejemplo `articles/protocolo/`. Mientras solo haya uno, el programa muestra directamente su contenido, así que el proyecto se ve como si tuviera un solo nivel.
- **El resumen va aparte.** Tiene sus propias reglas (límite de palabras, apartados del resumen estructurado, número de palabras clave) y muchas revistas lo piden en dos idiomas. En un archivo propio se cuenta y se comprueba por separado. La vista del documento completo lo muestra en su sitio, encima del cuerpo, y se edita allí igual que las tablas.
- **Tablas y figuras en archivos propios (P8).** Así se pueden (a) colocar en el texto o al final según la revista, (b) reutilizar en el material suplementario y (c) editar en su propia pestaña. También se editan directamente en la vista del documento completo: es el mismo archivo.
- **El manifiesto tiene una extensión propia** (`.scidesk`), así que basta con hacer doble clic en él para abrir el proyecto en Windows o en macOS. *Supuesto.*
- **Los nombres de las carpetas y archivos son fijos en el disco** y el programa muestra etiquetas traducidas al idioma de la interfaz (R28). Crearlos en el idioma de cada usuario duplicaría las pruebas y la documentación, y complicaría los proyectos compartidos entre alguien con la interfaz en español y alguien en inglés. Sustituye al *Supuesto* de la v0.4, que creaba las carpetas en el idioma de la interfaz. **Los nombres fijos van en inglés (P24)**, igual que las claves del formato. Los nombres que salen de tu contenido siguen en tu idioma: el del proyecto (`mi-estudio/`), el de un artículo nuevo (`protocolo/`) o el de cada tabla (`caracteristicas-basales.scitable`).

Cada tipo de artículo trae su plantilla de secciones. Se harán según avance el desarrollo (P9): primero el original y después el orden lo marcarán los tipos de Reumatología Clínica y lo que vayas necesitando.
- **Original:** IMRaD.
- **Revisión sistemática:** PRISMA 2020.
- **Ensayo clínico:** CONSORT.
- **Estudio observacional:** STROBE.
- **Caso clínico:** CARE.
- **Protocolo:** SPIRIT o PRISMA-P.
- **Estudio cualitativo:** COREQ.
- Además: original breve, revisión narrativa, carta al editor y guía de práctica clínica.

### 4.1 Un proyecto, varios artículos (decidido en P12)

De un mismo estudio suelen salir varios artículos: el protocolo, el artículo principal, los análisis secundarios, una comunicación a un congreso o una versión en otro idioma. Se valoraron tres opciones:
- **A. Un artículo por proyecto**, como proponía la v0.2.
- **B. Un proyecto con varios artículos** que comparten lo común.
- **C. Además, una biblioteca global**, compartida entre proyectos.

Comparación de A y B:

| | A. Un artículo | B. Varios artículos |
|---|---|---|
| Sencillez de la interfaz, la numeración y la exportación | Máxima: todo se refiere a un artículo | Hay que saber siempre en qué artículo estás, y el navegador tiene un nivel más |
| Biblioteca | Una por artículo: se repiten las importaciones entre artículos del mismo estudio | Una para todo el estudio: se importa y se deduplica una sola vez |
| Autores y afiliaciones | Se vuelven a escribir en cada proyecto | Un directorio de personas del estudio, del que cada artículo elige sus autores, su orden, sus afiliaciones, su CRediT y su autor de correspondencia |
| Tablas y figuras comunes (por ejemplo, las características basales) | Se copian entre proyectos y pueden acabar siendo distintas | Se pueden reutilizar, pero con el riesgo de la fila siguiente |
| Cambios en algo compartido | No existe el problema | Corregir una referencia o una tabla para el artículo 2 cambia el 1, que quizá ya está enviado o publicado. Hay que "congelar" lo que usa cada artículo al enviarlo |
| Historial de versiones | Uno por proyecto, sencillo | Tiene que ser por artículo: restaurar el artículo 1 no debe tocar el 2 |
| Comprobaciones | Directas | Se calculan por artículo: "referencias sin citar" mira las del artículo, no todas las del estudio |
| Enviar a un coautor o llevarlo a otro equipo | Se copia la carpeta | Hace falta "exportar este artículo como proyecto independiente" |
| Cambiar de idea más tarde | Pasar de A a B obliga a migrar los proyectos | Un proyecto B con un solo artículo se comporta como A |

**Decisión:**
1. **El formato es B desde el principio, con una interfaz de un solo artículo en el MVP.** El asistente crea un proyecto con un artículo, y el programa oculta el nivel extra mientras solo haya uno. "Añadir otro artículo al proyecto" llega en V1. Así no habrá que migrar nada.
2. **Compartido por todo el proyecto:** la biblioteca, el directorio de personas, el diccionario y la lista de abreviaturas, y los perfiles de revista descargados.
3. **Propio de cada artículo:** manuscrito y resumen, lista de autores (quiénes firman, en qué orden y con qué afiliaciones, elegidos del directorio de personas), CRediT, documentos (carta, portada, declaraciones), material suplementario, tablas, figuras, revista objetivo, exportaciones e historial.
4. **Las tablas y figuras se copian entre artículos, no se enlazan.** Un enlace vivo es cómodo hasta que cambias sin querer un artículo ya enviado.
5. **Cada versión con nombre de un artículo guarda los datos exactos de las referencias citadas y de sus autores**, para que la versión enviada se pueda reproducir siempre, aunque luego se corrija la biblioteca o el directorio.
6. **Sin biblioteca global (C) por ahora.** En el modo Zotero, la biblioteca global ya es Zotero. En el modo de biblioteca propia basta con "importar referencias de otro proyecto".

**¿Por qué personas comunes, si no todas firman todos los artículos?** Lo común no es la lista de autores, sino la ficha de cada persona. Cada artículo elige del directorio quiénes firman y en qué orden; el resto de personas del directorio no aparece en ese artículo.

| | Directorio común; cada artículo elige (elegido) | Lista propia en cada artículo |
|---|---|---|
| Datos de cada persona (nombre y forma de cita, ORCID, correo, grado, afiliaciones) | Se escriben una vez | Se repiten en cada artículo. "Copiar autores de otro artículo" ayuda, pero después cada copia va por su lado |
| Una corrección (un ORCID mal escrito, un correo nuevo) | Llega a todos los artículos en curso | Hay que repetirla en cada artículo, y es fácil que alguno se quede sin corregir |
| Elegir autores al crear un artículo | El programa propone las personas del estudio | Se copian de otro artículo o se escriben |
| Alguien cambia de centro entre el protocolo y el artículo de resultados | Cada artículo elige qué afiliaciones de esa persona usa | Natural: cada artículo tiene las suyas |
| Artículo ya enviado | Sus versiones con nombre guardan los datos tal como estaban, igual que con las referencias | Sin riesgo |
| Personas que no firman (agradecimientos, miembros de un grupo o consorcio) | Caben en el mismo directorio | Otra lista más en cada artículo |
| Proyecto con un solo artículo | No se nota la diferencia | — |

Reparto de los datos:
- **En el directorio**, lo que no depende del artículo: nombre, forma de cita, ORCID, correo, grado y todas las afiliaciones conocidas. El directorio indica en qué artículos aparece cada persona.
- **En cada artículo**, lo que sí depende de él: quiénes firman, el orden, qué afiliaciones de cada persona se usan, CRediT, autor de correspondencia, contribución igual y conflictos de interés.

## 5. Funciones propuestas

### 5.1 Proyectos y espacio de trabajo
- **[MVP]** Asistente "Nuevo artículo" con plantillas y abrir carpeta existente. Lista de proyectos recientes.
- **"Nuevo artículo a partir de un Word"** (R1). Convierte un .docx que ya existe en un proyecto. Es la puerta de entrada para los artículos ya empezados, los borradores que te manda un coautor y los métodos que reutilizas de artículos anteriores, y usa el mismo lector de OOXML que la fase 2, así que lo prueba antes con documentos reales.
  - **[MVP]** Secciones a partir de los estilos de título, con el papel de cada una (introducción, métodos…) deducido del texto del título. Tablas convertidas en archivos `.scitable` e imágenes extraídas a `figures/`, con sus pies reconocidos por el patrón "Tabla 1." o "Figure 2.".
  - **[V1]** (fase 2) **Citas de Zotero, Mendeley y EndNote convertidas en citas vivas.** Los tres guardan los datos de cada referencia dentro del propio documento: Zotero en campos `ADDIN ZOTERO_ITEM CSL_CITATION` con CSL-JSON, Mendeley Cite en controles de contenido con JSON y EndNote en campos `EN.CITE` con XML. Así se puebla la biblioteca del proyecto y las citas quedan enlazadas sin tener el gestor instalado. El prototipo 10 lo comprobó con tres Word reales con EndNote (164 citas; el XML va en el código del campo o, si es largo, en base64 en el `fldData` del campo anidado `EN.CITE.DATA`) y con copias con Zotero: se recuperan todas las referencias, en el orden y con los números del documento (ficha 0028). Mendeley Cite queda pendiente de un ejemplo real.
  - **[V1]** Las citas escritas a mano se señalan y se propone su vínculo (R24, 5.6).
- **[MVP]** En el primer arranque eliges el idioma de la interfaz (español o inglés), tus áreas principales, que filtran plantillas y revistas sugeridas (P3 y P7), y el esquema de atajos de teclado (R19). Todo se puede cambiar después en Ajustes.
- **[MVP]** **Dos esquemas de atajos: "Word en español" e "Internacional"** (R19). Word en español usa atajos propios (Ctrl+N negrita, Ctrl+K cursiva, Ctrl+S subrayado, Ctrl+G guardar, Ctrl+B buscar), y quien lleva años con ellos pulsará Ctrl+N para poner negrita. El esquema se cambia en Ajustes en cualquier momento. Ningún atajo usa Ctrl+Alt, porque en los teclados españoles de Windows AltGr equivale a Ctrl+Alt. **Hecho** (ficha 0044), con la cita en Ctrl+Mayús+C en los dos (D6) y el esquema guardado por equipo.
- **[MVP]** Interfaz al estilo de VS Code: carpeta abierta, pestañas y barra de estado (la paleta de comandos llega en V1). La propuesta detallada está en [`docs/interfaz/diseno-interfaz.md`](docs/interfaz/diseno-interfaz.md).
  - **A la izquierda, un navegador por conceptos** (R28): los objetos del artículo con su nombre y su número ("Tabla 2 · Características basales"), no el árbol de archivos (`authors.json`, `article.scidoc`). Quien escribe un artículo no piensa en archivos. La vista de archivos queda como secundaria. **Hecho** (ficha 0044).
  - Editor con pestañas en el centro (artículo, carta, tabla 2…).
  - Panel lateral derecho. **Decidido y hecho** (propuesta de interfaz y ficha 0044): Avisos, Revisión y Detalles; las referencias pasan a una vista grande. **Antes:** su contenido se decidía al diseñar la interfaz en la fase 1, según lo que resultara útil al escribir. Candidatos: esquema del documento, referencias, comentarios, comprobaciones, propiedades del elemento seleccionado (tabla, figura, cita) e historial. La maqueta de [`sciscribe-chatgpt/SciScribe-captura.png`](sciscribe-chatgpt/SciScribe-captura.png) usa cuatro pestañas: esquema, referencias, comentarios y comprobaciones.
- **[MVP]** Menú contextual (clic derecho) en el texto, en las celdas de tabla y en los pies de figura, con lo que tiene sentido en cada sitio: insertar cita, referencia cruzada, comentario, pendiente (5.8) o carácter especial. **En el texto, hecho en versión mínima** (ficha 0044): cita, referencia cruzada, pendiente, cortar y copiar, y editar o quitar una cita. **En las tablas y figuras, hecho** (ficha 0045): filas, columnas, celdas, encabezado, notas, abrir en su pestaña y quitar del texto. Falta el comentario (V1).
- **[MVP]** Guardado automático e indicador de cambios sin guardar. **Hecho** (ficha 0039).
- **[MVP]** **Escritura atómica y recuperación tras un cierre inesperado** (R25). Cada guardado se escribe en un archivo temporal que después sustituye al original, para que un corte de luz o un fallo no deje un `.scidoc` a medias. Un registro de los cambios sin guardar permite recuperar el trabajo al volver a abrir. En un procesador de texto, perder una tarde de escritura una sola vez basta para dejar de confiar en él. **Hecho** (ficha 0039): el registro va en la carpeta local de datos de cada equipo y, si el archivo cambió en el disco, la versión del disco se guarda en una instantánea antes de recuperar.
- **[MVP]** **Cada exportación a DOCX guarda una instantánea** de lo exportado, aunque el historial no tenga todavía interfaz (R42). Sin ella, el primer artículo real que escribas no podría aprovechar la fusión cuando llegue, porque no existiría la versión de partida.
- **[V1]** **Cambios hechos desde otro equipo y copias en conflicto** (R27), en lugar del aviso de "proyecto abierto en otro equipo", que con un archivo de bloqueo falla justo cuando hace falta porque la sincronización llega tarde:
  - Si un archivo cambia en el disco mientras está abierto, se recarga si no tenías cambios o se fusiona si los tenías.
  - Las copias en conflicto que crean OneDrive y Dropbox se reconocen y se ofrece fusionarlas con la vista de propuestas (6.5).
- **[V1]** Paleta de comandos (Ctrl+Shift+P) y atajos configurables uno a uno en Ajustes.
- **[V1]** **Buscar y reemplazar en todo el proyecto** (R22): texto, resumen, tablas, pies de figura, suplementario y carta a la vez, para cambiar el nombre de un fármaco, una abreviatura o una cifra.
- **[V1]** Historial de versiones con nombre ("Enviado a Reumatología Clínica", "Revisión 1"), comparar dos versiones y restaurar, también un párrafo o una sección sueltos, que llegan como propuestas (6.5). Por debajo, instantáneas propias (6.4, decidido en P15).
- **[Después]** Plantillas de proyecto propias: guardar un proyecto como plantilla.

### 5.2 Editor de texto (lo de Word que importa en un artículo)
- **[MVP]** Estilos semánticos: título, títulos de sección de nivel 1 a 3, párrafo, cita en bloque, lista numerada o con viñetas. El aspecto (fuente, tamaño, interlineado) se define en los estilos del documento, no párrafo a párrafo, y el perfil de revista puede imponer el suyo al exportar.
- **[MVP]** **Fuentes**: se pueden usar todas las instaladas en el equipo, incluidas las habituales de Word (Calibri, Aptos, Cambria, Times New Roman, Arial) y Roboto. En el MVP se elige la fuente del documento; elegir una para cada estilo llega en V1 (R43). **Además, desde el 22/11/2026, dos modos de fuente** (ficha 0047): «adaptada a la revista», por defecto, y «libre», con fuente y tamaño por selección y «Adaptar a la revista»; la fuente y el tamaño propios solo van en el Word para coautores.
  - Las fuentes de Microsoft no se pueden incluir en el instalador: su licencia no lo permite, sea cual sea la nuestra. En Windows ya están instaladas. En macOS, Times New Roman y Arial vienen con el sistema, pero Calibri y Cambria solo están si tienes Office.
  - Por eso el programa incluye equivalentes libres con las mismas medidas, para que el texto ocupe lo mismo: Carlito (Calibri), Caladea (Cambria), Liberation Serif (Times New Roman), Liberation Sans (Arial) y Liberation Mono (Courier New). Roboto es libre y se incluye tal cual.
  - El DOCX conserva el nombre original de la fuente, así que quien lo abra en Word verá Calibri. El PDF incrusta la fuente que se haya usado.
- **[MVP]** Negrita, cursiva, subrayado, superíndice, subíndice, alineación, sangría. **[V1]** Versalitas (R43).
- **[MVP]** Deshacer y rehacer, buscar y reemplazar (también "solo en esta sección"). **[V1]** Con expresiones regulares (R43). **Buscar y reemplazar en el manuscrito, hecho el 22/11/2026** (ficha 0044): barra propia con Ctrl+B o Ctrl+F, Ctrl+L o Ctrl+H, coincidencias resaltadas, mayúsculas opcionales y «Reemplazar todo» que se deshace de una vez; falta «solo en esta sección».
- **[MVP]** Caracteres especiales con acceso rápido a los científicos: ±, ≤, ≥, µ, α–ω, ×, espacio duro, guion largo.
- **[MVP]** **Autocorrección científica y texto automático** (R18). Reglas que se aplican al teclear y se deshacen con Ctrl+Z, y que sustituyen buena parte del uso del menú de caracteres especiales:
  - `+-` → ±, `<=` → ≤, `>=` → ≥, `->` → →, y la x entre números ("2 x 2") → ×.
  - Espacio duro entre número y unidad, y antes de % si el estilo lo pide.
  - Signo menos tipográfico en números negativos y guion corto en rangos.
  - Comillas según el idioma del fragmento.
  - Texto automático por proyecto: escribir "ar" y tabulador para "artritis reumatoide".
- **[MVP]** **Pegar texto como en Word** (R23). Al pegar se elige, como en Word, entre:
  - **Combinar formato** (por defecto): conserva negrita, cursiva, superíndices y subíndices, y toma la fuente, el tamaño y el color del documento.
  - **Mantener formato de origen**: conserva también fuentes, tamaños y colores.
  - **Solo texto**: pega sin ningún formato (también con Ctrl+Shift+V).
  - Desde un PDF, une las líneas cortadas y los guiones de final de línea.
  - Si el portapapeles de Word incluye los campos de Zotero, las citas pegadas llegan vivas. Se comprueba en el prototipo 1.
- **[MVP]** **Color del texto y resaltado** en la cinta, con los colores estándar y de resaltado de Word (petición del usuario al decidir D1–D8, ficha 0043). Hechos en el formato, el editor, el pegado, «Nuevo desde Word», el DOCX y el PDF.
- **[MVP]** Recuento de palabras **por sección** y según las reglas de la revista: el texto principal sin resumen, referencias, tablas ni pies. El resumen se cuenta aparte.
- **[MVP]** Corrector ortográfico en español e inglés con diccionario personal por proyecto (términos médicos). **Es un corrector propio, no el del motor web** (R29): usa los diccionarios de Hunspell (los de LibreOffice) y los subrayados los dibuja el editor. El del motor web no permite elegir el idioma por fragmento ni añadir palabras a un diccionario del proyecto, y se comporta distinto en Windows y en macOS. En el MVP, el idioma es el del documento.
- **[V1]** **Idioma por fragmento** (R20). Un artículo en español lleva el título y el resumen en inglés, y a veces citas textuales en otro idioma. El idioma es un atributo del bloque o del fragmento (el formato lo admite desde la versión 1), de modo que el corrector usa el diccionario correcto en cada parte, las comprobaciones de formato numérico saben qué separador decimal esperar y el DOCX marca el idioma de cada fragmento, para que el corrector de Word de los coautores no lo subraye todo.
- **[V1]** Diccionarios de especialidad (por ejemplo, de reumatología: fármacos, escalas como DAS28 o HAQ, abreviaturas habituales). Se pueden crear o ampliar con un paquete para LLM sin enviar nada del artículo (5.12).
- **[V1]** Notas al pie.
- **[V1]** Comentarios anclados a texto, con respuestas y marcado como resuelto.
- **[V1]** Control de cambios: aceptar o rechazar, por autor, y ver el final o el original. Comentarios y control de cambios son una implementación propia sobre una pieza libre (R31, 6.1), con prototipo en la fase 0.
- **[V1]** Vista de página / vista previa de impresión con Typst (R30, riesgo 7.2) **[P5]**. La interfaz avisa de que **la vista previa no es Word**: la paginación del PDF de SciDesk no coincidirá con la del DOCX abierto en Word, porque cada motor parte las líneas a su manera. Para una revista que limite páginas, la referencia es Word.
- **[Después]** Ecuaciones con editor visual, que se exportan a Word como ecuaciones nativas. Llegan con la ampliación a otras disciplinas **[P6]**.
- **[Después]** Modo concentración, tema oscuro y estadísticas de escritura.
- **[Después]** **Título, resumen y palabras clave en dos idiomas, lado a lado** (R13): vista en dos columnas del resumen en español y en inglés, alineada por apartados y con el recuento de cada lado, y palabras clave con autocompletado de MeSH, que es de dominio público. Para la equivalencia en español están los DeCS de BIREME, cuyo acuerdo de licencia habrá que leer para saber si se pueden incluir en un programa de código abierto o solo consultar por su API.

### 5.3 Autores, afiliaciones y documentos satélite
- **[MVP]** Formulario de autores con estos datos (**hecho**, ficha 0038):
  - Nombre y apellidos (con forma de cita, p. ej. "Pérez-García J").
  - Grado académico, ORCID y correo.
  - Afiliaciones (reutilizables entre autores) y autor de correspondencia.
  - "Contribución igual" y autoría de grupo o consorcio.
- **[MVP]** Las fichas de las personas viven en el directorio común del proyecto, y cada artículo elige quién firma, en qué orden y con qué afiliaciones (4.1).
- **[MVP]** El bloque de autores del artículo y la portada se generan solos: superíndices de afiliación, orden y datos de correspondencia. Si cambias un autor, cambia en todas partes.
- **[V1]** Matriz CRediT con los 14 roles (autores × roles, con grado de participación: principal, igual o de apoyo). **La matriz ya se rellena en el formulario de autores** (ficha 0038). A partir de ella se generan:
  - El documento de contribuciones en el formato de la revista: tabla CRediT, frase con iniciales ("JPG y AML diseñaron…") o criterios ICMJE.
  - Una comprobación de que cada autor cumple los 4 criterios ICMJE.
- **[V1]** Carta de presentación con campos combinados (revista, editor, título, tipo de artículo, autor de correspondencia, fecha) y párrafos tipo editables.
- **[V1]** Declaraciones con plantillas: financiación, conflictos de interés, aprobación ética y consentimiento, disponibilidad de datos, registro (PROSPERO, ClinicalTrials.gov), uso de IA y agradecimientos.
- **[Después]** Ayuda para el formulario de conflictos ICMJE de cada autor (por ejemplo, enviar a cada coautor la lista de datos que necesita).

### 5.4 Tablas
- **[MVP]** Editor de tablas: insertar o borrar filas y columnas, combinar celdas, alineación por columna (decimales) y bordes de estilo científico (solo líneas horizontales). **[V1]** Bordes y sombreado a medida (R43).
- **[MVP]** La tabla se edita dentro de la vista del documento completo o en su propia pestaña; en los dos casos se modifica su archivo (P8).
- **[MVP]** **Pegar desde Word y Excel conservando el formato** (**hecho**, ficha 0042: cada tabla pegada se guarda en su `.scitable` con su pie y sus notas): celdas combinadas, negritas, sangrías de la primera columna, bordes y superíndices de notas. Es el riesgo técnico número 1 (7.1).
- **[MVP]** Título y notas de la tabla (abreviaturas, ᵃ ᵇ ᶜ). La numeración es automática por orden de primera mención.
- **[MVP]** **Las notas de tabla son objetos** (R11). Igual que las citas no guardan su número, las llamadas de nota no guardan su letra: las letras se reordenan solas al mover filas, y la misma nota se puede usar en varias celdas. Se fija al especificar `.scitable` en la fase 0, para no migrar después.
- **[V1]** **Leyenda de abreviaturas automática** de cada tabla y cada figura (R11). Las revistas piden que se entiendan solas, con sus abreviaturas definidas al pie. A partir del registro de abreviaturas del artículo (5.8) se genera la línea de cada tabla ("DAS28: Disease Activity Score 28; PCR: proteína C reactiva") y se mantiene al día.
- **[V1]** Colocar las tablas dentro del texto o "todas al final" según el perfil de revista, sin tocar el documento.
- **[V1]** Importar desde CSV o Excel.
- **[Después]** Tablas que salen de los datos, por ejemplo una tabla de características basales generada desde un CSV.

### 5.5 Figuras
- **[MVP]** Insertar imagen (PNG, JPG, TIFF, SVG) copiándola a `figures/`, con pie de figura y numeración automática. SVG también en el Word (ficha 0068). **TIFF (verlo en el editor, el PDF y el Word), aplazado por el usuario al final del desarrollo** (22/11/2026).
- **[V1]** Comprobación de requisitos: resolución en ppp según el tamaño de impresión, modo de color y formato admitido por la revista.
- **[V1]** Exportar las figuras como archivos separados con el nombre que pide la revista (`Figure1.tiff`), convirtiendo el formato si hace falta.
- **[V1]** Figuras con paneles (A, B, C) y lista de pies de figura al final del manuscrito.
- **[Después]** Generar el diagrama de flujo PRISMA a partir de los números.

### 5.6 Referencias

**Dos modos de biblioteca (P11).** Se elige al crear el proyecto y se puede cambiar después: al vincular más tarde, las referencias se emparejan por DOI, PMID o título.

*Modo biblioteca propia: el "gestor" está dentro del programa*
- **[MVP]** Importar la biblioteca inicial en estos formatos:
  - RIS (.ris).
  - PubMed / MEDLINE (.nbib, .txt).
  - BibTeX (.bib).
  - CSL-JSON.
  - EndNote XML (.xml) **[V1]**.
  - EndNote etiquetado (.enw) **[V1]**.
- **[MVP]** **Añadir más referencias en cualquier momento** importando nuevos archivos. Cada importación se guarda en `references/imports/` y muestra un resumen: cuántas referencias son nuevas, cuántas ya estaban y cuáles han cambiado.
- **[MVP]** Eliminar duplicados al importar (por DOI, PMID y título normalizado) y avisar.
- **[MVP]** Ver, buscar, editar y borrar referencias. Para cada una se ve en cuántos sitios está citada. **Hecho** (ficha 0037): una referencia citada no se puede borrar.

*Modo vinculado a Zotero* **[V1]** (después vendrán EndNote y Mendeley)
- Eliges una biblioteca o una colección de Zotero y SciDesk la lee a través de la API local de Zotero (Zotero 7 o posterior). Hace falta tener Zotero abierto en el mismo equipo y activar en Zotero la opción "Permitir que otras aplicaciones de este equipo se comuniquen con Zotero".
- Lo que añades en Zotero (por ejemplo, con su conector del navegador) aparece en SciDesk.
- El proyecto guarda una copia de cada referencia citada con su clave de Zotero. Así se abre y se exporta en otro equipo o sin Zotero. Al volver a abrirlo con Zotero, se actualizan los cambios y se avisa de las referencias borradas allí.
- Cómo se lee y se sincroniza (colección con subcolecciones, versiones por clave, `Zotero-Server-ID`, normalización del CSL-JSON de Zotero) sale del prototipo 5 (ficha 0027): una colección de 30 referencias se lee en ~60 ms.
- **[Después]** Escribir en Zotero desde SciDesk, por ejemplo al añadir una referencia por DOI. Zotero 10 lo permite a través de su API local, con un permiso que concedes en un diálogo de Zotero.
- **[Después]** EndNote no tiene una API comparable: lo razonable es usar su exportación EndNote XML y reimportarla para actualizar. Mendeley Reference Manager tiene una API en la nube que habrá que estudiar.

*En los dos modos*
- **[V1]** Añadir una referencia pegando un DOI, PMID o ISBN; los metadatos se buscan en Crossref y PubMed. **Es una opción que se activa en el programa y explica para qué sirve (P14)**: completar y corregir los metadatos de las referencias, sin enviar nada del manuscrito. Sin conexión, todo lo demás funciona igual.
- **[V1]** **Buscar en PubMed o en Crossref desde el buscador de citas** (R24). Si lo que buscas al citar no está en la biblioteca, el mismo buscador lo ofrece, con la conexión activada, y la referencia se añade y se cita en un solo paso.
- **[V1]** **Resolver citas escritas a mano** (R24). Para las citas que un coautor escribe a mano y para los Word importados sin campos: el programa reconoce el texto ("Smolen et al., 2016", o una lista de referencias pegada), busca la coincidencia en la biblioteca y después en los registros, y propone el vínculo.
- **[V1]** Las citas de Zotero, Mendeley y EndNote de un Word importado pueblan la biblioteca (R1, 5.1).
- **[V1]** Abreviaturas de revista del catálogo NLM (necesarias para Vancouver).
- **[V1]** **Verificación de referencias** (R10), que amplía la comprobación de retractados. Con la conexión activada:
  - Cada referencia se contrasta con PubMed o Crossref y queda como "verificada" con su fecha. Si el título, el año, el volumen o las páginas no coinciden, se muestran las diferencias y se corrigen con un clic.
  - Aviso de retractaciones (base de Retraction Watch vía Crossref), fes de erratas y notas de preocupación.
  - Aviso de prepublicaciones que ya se han publicado en una revista.
  - Las referencias que no aparecen en ningún registro se señalan para revisarlas a mano.

  Las revistas han empezado a comprobar que las referencias existen, por las que inventan los LLM. Llegar al envío con todas verificadas es un argumento a favor del programa.
- **[Después]** Adjuntar PDF a una referencia.

**Citar**
- **[MVP]** Cita rápida: un atajo de teclado **o el clic derecho** (en el texto, en una celda de tabla o en un pie de figura) abre un buscador (autor, año, título) y Enter inserta la cita. Se pueden poner varias en la misma cita.
- **[MVP]** Prefijo, sufijo y localizador ("p. 12") y "omitir autor" en los estilos autor-año. **Hecho** (fichas 0037 y 0067).
- **[MVP]** Numeración automática por orden de aparición. Los rangos se compactan ([1–3, 5]) y se recalculan al mover texto.
- **[MVP]** Bloque de bibliografía que se actualiza solo. Puede ir en el artículo o en el suplementario.
- **[MVP]** Cambiar de estilo de cita al instante.
- **[MVP]** Estilos incluidos de serie: Vancouver/ICMJE, AMA 11, APA 7, Harvard, NLM, Nature, Science, Cell, The Lancet, NEJM, BMJ, JAMA, IEEE, Chicago, Elsevier Vancouver y **Reumatología Clínica** (P13; estilo propio, ficha 0026). **Hecho** (ficha 0037): los 18 están en `packages/core/assets/styles/`, con su procedencia y su licencia.
- **[MVP]** Las palabras fijas de las referencias («En:»/«In:», «editores»/«editors», «ed.», «consultada el»/«accessed», «En prensa»/«In press») salen en el idioma del manuscrito. Un ajuste del artículo permite elegir otro (ficha 0026).
- **[V1]** Buscador del repositorio oficial de estilos CSL (más de 10 000 estilos, uno por revista), con descarga.
- **[V1]** Avisos de referencias de la biblioteca sin citar, citas rotas y referencias incompletas (sin año, sin revista…).

### 5.7 Referencias cruzadas y numeración
- **[MVP]** "Insertar referencia cruzada" a tabla, figura, sección, ecuación o material suplementario. El texto ("Tabla 2", "Figura 1B", "Tabla S3") se mantiene actualizado.
- **[V1]** Comprobar que tablas y figuras se citan en orden y que todas se citan al menos una vez.

### 5.8 Comprobaciones antes del envío (el "corrector de manuscrito")
Un panel que se va actualizando mientras escribes. Es la cara del programa y lo que lo distingue de Word a primera vista, así que una versión mínima entra ya en el MVP (R43).

**Cómo funciona el panel** (R12):
- **[MVP]** **Tres niveles**: "impide el envío" (falta una declaración obligatoria), "conviene revisar" (abreviatura usada antes de definirla) e "información".
- **[MVP]** **Ignorar un aviso.** Un panel que no se puede silenciar se deja de mirar. Cada aviso tiene un identificador estable para marcarlo como "es correcto" o "no aplica", con una nota opcional, y que no vuelva a salir. Lo ignorado se guarda en el proyecto y se puede revisar.
- **[MVP]** Cada aviso lleva a su sitio en el texto.

**Qué comprueba:**
- **[MVP]** **Pendientes** (R12). **Hecho** (ficha 0041), salvo el atajo para crear uno. Mientras se escribe se dejan marcas como "XX", "??", "[REF]" o "comprobar". El programa las reconoce, permite crear una con un atajo y las lista. Avisa si queda alguna al exportar para la revista.
- **[MVP]** Límites de palabras del resumen y del texto frente a los de Reumatología Clínica. **[V1]** Todos los límites del perfil de revista: palabras del resumen y del texto, número de palabras clave, de referencias, de figuras, de tablas y de autores, y caracteres del título.
- **[V1]** Abreviaturas: lista automática, uso antes de definirlas, definidas pero no usadas y definición repetida en el resumen y en el texto. Con ellas se genera la leyenda de cada tabla y figura (5.4).
- **[MVP]** Tablas, figuras y referencias sin citar. **[V1]** Fuera de orden.
- **[V1]** **Coherencia de cifras** (R8). El plan dejaba para la versión con IA comprobar que las cifras del resumen coinciden con las de los resultados, pero la mayor parte se hace con reglas:
  - **Aritmética de porcentajes.** En "45/120 (38,5 %)" el programa calcula 37,5 % y avisa. También en las celdas de tabla con formato "n (%)" cuando la columna tiene un total.
  - **Cifras del resumen que no aparecen en el texto ni en las tablas.**
  - **Resumen en español y en inglés con cifras distintas**, igualando antes la coma y el punto decimal.
  - **Intervalos de confianza** que no contienen su estimación o con los límites invertidos.
  - **Valores de p** imposibles o mal escritos ("p = 0,000", p mayor que 1).
  - **Tamaño de muestra** distinto entre el resumen, los métodos y la primera tabla.

  Son errores frecuentes, los revisores los encuentran y a veces acaban en una fe de erratas.
- **[V1]** **Manuscrito cegado** (R9). Quitar la portada no basta para anonimizar. El programa conoce los nombres de los autores, sus centros y sus ciudades, así que busca en el texto lo que os identifica: el nombre del hospital o de la ciudad en Métodos, el comité de ética con su nombre y su código de aprobación, autocitas con "nuestro trabajo previo" o "como describimos", agradecimientos, financiación con código de proyecto y registro del estudio, y los metadatos del archivo y los nombres de autor en comentarios y cambios. Para cada hallazgo ofrece sustituirlo solo en la versión cegada (por ejemplo, "[centro eliminado para la revisión]"), sin tocar el manuscrito. Reumatología Clínica es de doble ciego, así que entra en el caso de prueba.
- **[V1]** Secciones obligatorias del tipo de artículo y declaraciones que faltan.
- **[V1]** Formato numérico: separador decimal coherente, "p < 0,05" frente a "p<.05" según el estilo, espacio entre número y unidad e intervalos de confianza coherentes.
- **[V1]** Variante del inglés que pide la revista (británico o americano), con avisos de palabras escritas en la otra.
- **[Después]** Rasgos típicos de texto generado con IA: rayas, punto y coma y dos puntos en exceso, con umbrales ajustables (5.12).
- **[Después]** Lista de verificación de la guía EQUATOR (PRISMA, CONSORT, STROBE…): cada ítem se enlaza a la parte del texto que lo cumple y se exporta la checklist rellena con números de página.

### 5.9 Perfiles de revista y adaptación a revista

**Qué reúne un perfil de revista** **[V1]**:
- Estilo de cita.
- Límites por tipo de artículo: palabras, referencias, figuras, tablas y autores.
- Resumen: si es estructurado y con qué apartados, límite de palabras, idiomas y número de palabras clave.
- Formato de envío: interlineado, fuente y tamaño, márgenes, números de línea y de página, tablas al final o en el texto, y figuras en archivos separados con sus requisitos.
- Tipo de revisión: si es ciega, con portada separada y manuscrito anonimizado.
- Declaraciones exigidas y dónde van, formato de las contribuciones y documentos opcionales (puntos destacados, resumen gráfico).

**¿Se puede obtener automáticamente? ¿Está al día?** Solo en parte:

| Dato | ¿Automático? | De dónde | ¿Está al día? |
|---|---|---|---|
| Estilo de cita | Sí | Repositorio oficial de estilos CSL (más de 10 000, mantenido por voluntarios) | En general sí, pero algunos estilos son antiguos. El de Reumatología Clínica es de 2012 y no coincide con su guía actual, que muestra referencias con el formato de Elsevier y DOI: cumple 9 de 17 reglas. SciDesk incluye uno propio (prototipo 2, ficha 0026) |
| Identificación de la revista: ISSN, editorial, abreviatura NLM, acceso abierto | Sí | Catálogo de revistas de la NLM (dominio público), OpenAlex y DOAJ (abiertos) | Sí, se actualizan continuamente |
| Área temática, para sugerir revistas según tus áreas | Sí | OpenAlex | Sí |
| Cuartil (Q1, Q2…) | En parte | JCR (Clarivate, de pago) o SJR (Scimago, consulta gratuita; hay que comprobar si se puede reutilizar) | Una vez al año |
| Límites, estructura del resumen, palabras clave, formato de envío, revisión ciega y declaraciones | **No** | Solo la "guía para autores" de cada revista, en texto libre (web o PDF). Existen directorios de enlaces, como el de la Mulford Library (más de 6000 revistas de ciencias de la salud), pero no datos estructurados | Cambia sin aviso y a veces está incompleta: la guía actual de Reumatología Clínica no da el límite de palabras del resumen |

**Cómo se consiguen los perfiles (decidido en P20).** Nadie tiene que preparar por adelantado los perfiles de todas las revistas, que son decenas de miles. Se crean **bajo demanda**, cuando alguien elige una revista:
1. **Lo automático se rellena solo**: estilo de cita, ISSN, abreviatura, editorial y área, desde las fuentes abiertas de la tabla anterior.
2. **Si la revista ya está en el catálogo**, se descarga su perfil. El catálogo es un repositorio público de perfiles, como el de estilos CSL. El programa incluye de serie un perfil genérico (ICMJE) y el de Reumatología Clínica.
3. **Si no está**, el programa ofrece un paquete para LLM (5.12) con la guía de la revista (enlace o texto) y el esquema del perfil. El LLM devuelve el perfil con una cita literal de la guía para cada dato, y tú lo revisas campo por campo. No hay problema de confidencialidad, porque la guía es pública. El perfil verificado se puede aportar al catálogo, que así crece con el uso.
4. **Perfiles base por editorial** *(Supuesto)*: las revistas de una misma editorial (Elsevier, Springer Nature, Wiley…) comparten buena parte de la guía. Un perfil de revista puede heredar del de su editorial y guardar solo lo que cambia, lo que reduce mucho el trabajo de cada perfil nuevo.
5. **Formato abierto de perfil**: un archivo JSON con esquema publicado, en el que cada dato lleva su fuente (enlace a la guía) y la fecha en que se comprobó. Al principio, el catálogo es solo un repositorio con los perfiles que vayas creando; la infraestructura para que otros aporten los suyos llega cuando haga falta (R45).
6. **Aviso de caducidad**: si un perfil se comprobó hace más de un año, el programa lo avisa y enlaza la guía.

**Módulo de adaptación a revista** **[V1]**

Al elegir revista o cambiar de revista, el módulo compara el proyecto con el perfil y muestra un informe en dos partes:
- **Lo que se aplica solo al exportar, sin tocar tu texto**: estilo de cita, formato de página, orden y nombres de los apartados, tablas al final o en el texto, nombres de los archivos de figura, portada separada y versión cegada, y declaraciones en su sitio.
- **Lo que tienes que hacer tú**, como lista de tareas enlazada al texto: recortar palabras del resumen o del texto, cambiar los apartados del resumen estructurado, reducir referencias o figuras, añadir palabras clave, poner el título en inglés o escribir una declaración que falta.

Sustituye a "cambiar de revista tras un rechazo" de la v0.2, que pasa de [Después] a V1. El módulo no usa IA y se limita al formato y los requisitos (decidido en P21). Adaptar el estilo de redacción queda para la futura versión con IA (5.12).

**Primer caso: Reumatología Clínica** (guía para autores consultada el 20 de noviembre de 2026)

| Dato | Lo que pide |
|---|---|
| Original | Hasta 3000 palabras de texto, 6 figuras, 6 tablas y 30 referencias; aconseja no pasar de 6 autores |
| Original breve | 1500 palabras, 15 referencias, 2 tablas o figuras y 6 autores |
| Caso clínico | 600 palabras, 1 figura y 1 tabla, 10 referencias; apartados fijos (resumen y abstract, introducción, observación clínica, discusión y conclusiones) |
| Carta al editor | 600 palabras, 1 figura o tabla, 10 referencias y 4 autores; empieza por "Señor editor" |
| Resumen | Estructurado en "Antecedentes y objetivo", "Pacientes o Materiales y métodos", "Resultados" y "Discusión y Conclusiones". **La guía actual no da el límite de palabras** (una versión anterior decía 250 para originales) |
| Palabras clave | Hasta 6 |
| Idiomas | Se publica en español y en inglés; el título se da también en inglés |
| Revisión | Doble ciego: portada aparte (autores, afiliaciones, agradecimientos y conflictos) y manuscrito anonimizado |
| Formato | Doble espacio, letra de 12 puntos, márgenes laterales de 2 a 2,5 cm y todas las páginas numeradas; sin justificar ni partir palabras |
| Referencias | Números en superíndice por orden de aparición. Los ejemplos de la guía siguen el formato «Vancouver» de Elsevier: volumen en negrita, última página abreviada con raya corta, DOI como enlace y 6 autores antes de «et al.». El estilo CSL de la revista (2012, en realidad el de la NLM con superíndice) no coincide; SciDesk incluye uno propio que sí (ficha 0026) |
| Declaración de uso de IA | En un apartado propio, antes de las referencias |
| Opcionales | Puntos destacados (de 3 a 5, de 85 caracteres como máximo) y resumen gráfico |
| Figuras | En archivos separados; fotografías a 300 ppp como mínimo, dibujos de líneas a 1000 ppp y combinadas a 500 ppp; pies de figura en una lista aparte |
| Envío | Editorial Manager |

Esta tabla ya muestra el problema: la guía es buena, pero le falta un dato importante y su estilo de cita hay que verificarlo contra los ejemplos.

### 5.10 Exportación y envío
- **[MVP]** **DOCX**:
  - Usa estilos de Word reales (Título, Título 1…), para que la revista y los coautores puedan trabajar con él.
  - **Toma los estilos de una plantilla de referencia** (R35), un `.docx` o `.dotx` base que puede ser el del programa o uno tuyo, en lugar de definirlos todos en código.
  - Las tablas son tablas de Word nativas, no imágenes.
  - Aplica interlineado, fuente, márgenes, números de línea y numeración de páginas según el perfil.
- **[MVP]** **Marcas invisibles, especificadas** (R3). Son las que permiten reconocer el documento al reimportarlo (5.11):
  - **Cada bloque** lleva un marcador de Word (*bookmark*) oculto con su identificador.
  - **Cada cita** es un campo con sus datos dentro. Si se usa el formato de campo de Zotero, los coautores que usan Zotero pueden trabajar con esas citas, que la v0.4 dejaba para [Después]. Cada referencia lleva un URI (el de Zotero o uno propio): sin él, Zotero duplica las referencias al actualizar el documento (prototipo 5, ficha 0027).
  - **Cada referencia cruzada** es un campo `REF` de Word que apunta al marcador de la tabla o figura, y la numeración de los pies usa campos `SEQ`. Así, si un coautor añade una tabla en Word, los números se actualizan allí también.
  - La especificación exacta (nombres, qué abarca cada marcador, propiedades del documento) y las reglas para importar salen del prototipo 3 (ficha 0025). Las marcas son pistas: la identidad de cada bloque se confirma siempre por contenido.
- **[MVP]** **Dos perfiles de exportación a DOCX** (R3):

  | | Para coautores | Para la revista |
  |---|---|---|
  | Marcas y campos | Sí | No: todo convertido a texto normal |
  | Metadatos del archivo (autor, empresa, tiempo de edición) | Se conservan | Se eliminan |
  | Formato | El del documento | El del perfil de la revista |
- **[MVP]** PDF para leer o revisar, generado con Typst (R30), con números de línea.
- **[V1]** **Paquete de envío**: un ZIP o carpeta con todo lo que pide la revista, con sus nombres:
  - Manuscrito.
  - Manuscrito **cegado**, sin autores, afiliaciones, agradecimientos ni metadatos del archivo, y con las sustituciones que propone la comprobación del cegado (R9, 5.8).
  - Portada.
  - Figuras separadas.
  - Tablas.
  - Material suplementario.
  - Carta de presentación.
  - Documentos opcionales que admita la revista (por ejemplo, los puntos destacados).
- **[V1]** **Hoja de envío** (R14), con prioridad baja dentro de la fase 3. Editorial Manager y ScholarOne obligan a copiar a mano en formularios lo que el proyecto ya sabe. La vista reúne, con un botón de copiar en cada campo: título, título corto, resumen como texto sin formato y palabras clave; cada autor con su correo, ORCID, afiliación y país; recuentos de palabras del texto y del resumen, tablas, figuras y referencias; financiación, conflictos de interés, ética, registro y disponibilidad de datos; y revisores sugeridos y excluidos. Pide tres datos nuevos en el formato: título corto, financiadores con código de proyecto y lista de revisores sugeridos, que sale del directorio de personas.
- **[V1]** Exportar el DOCX con comentarios y control de cambios.
- **[V1]** Markdown y HTML.
- **[Después]** JATS XML y LaTeX.
- **[Después]** **Bitácora de envíos y estado del artículo** (R15): para cada artículo, una línea de tiempo con la revista, la fecha de envío, el número de manuscrito, la decisión y el enlace a la versión que se envió y a la ronda de respuesta a revisores, y el estado de cada artículo del proyecto (borrador, con coautores, enviado, en revisión, aceptado).

### 5.11 Revisión por pares y colaboración
- **[V1]** **Ronda de revisión con coautores** (fase 2). Es tu forma real de trabajar (P4b): varios coautores revisan en paralelo y cada uno devuelve su copia.
  1. "Enviar a coautores" exporta el DOCX con el perfil para coautores (5.10) y guarda automáticamente la versión de partida ("Enviado a coautores 20/11").
  2. Cada coautor revisa su copia en Word, con o sin control de cambios, y te la devuelve. Mientras tanto, sigues escribiendo.
  3. "Importar revisiones" admite varios DOCX a la vez y **se puede usar tantas veces como haga falta dentro de la misma ronda**, porque las copias llegan en días distintos. Se recogen los cambios marcados, los comentarios y también **los cambios hechos sin activar el control de cambios**, que se detectan al comparar.
  4. **La fusión es a tres bandas** (R2). La **base** es lo que enviaste, **la tuya** es tu copia actual y **la suya** es cada copia devuelta. Las propuestas se calculan de la base a la suya y se aplican sobre la tuya. Si tú has cambiado el mismo pasaje desde el envío, se muestra como conflicto con las tres versiones. Los identificadores estables de bloque son los que permiten alinear las tres.
  5. **El autor de cada cambio se toma de la marca de Word** (`w:author`), no del nombre del archivo, porque un coautor trabaja a veces sobre la copia de otro y un mismo archivo trae cambios de dos personas. Los cambios hechos sin control de cambios se atribuyen a quien devolvió el archivo.
  6. **Filtro de ruido** (R4). Word registra como cambio casi cualquier cosa: una fuente distinta, el idioma de corrección, un espacio doble, unas comillas rectas convertidas en curvas. Por defecto se ocultan los cambios que solo afectan al formato, a los espacios y a la tipografía de comillas y guiones, con un contador ("23 cambios de formato ocultos") y la opción de verlos.
  7. La vista de propuestas (6.5) reúne las de todos los coautores, párrafo a párrafo, cada una con su nombre y su color. Cuando dos coautores tocan la misma frase, se muestran juntas para elegir una o combinarlas. Aceptas o rechazas cada propuesta, todas las de un coautor o todas a la vez. Los comentarios se convierten en hilos de comentarios del programa.
  8. Las citas y referencias cruzadas se reconocen gracias a las marcas invisibles del DOCX exportado (5.10). Si un coautor escribe una cita a mano ("Smith 2020"), queda señalada para que la vincules a la biblioteca; desde la fase 3, el programa propone además el vínculo (R24, 5.6).
  9. **Plan B, cuando las marcas se pierden** (R3). Se pierden si un coautor abre el archivo en Google Docs, Pages, LibreOffice o Word en línea, o si copia el texto a un documento nuevo. Entonces la alineación se hace por contenido (el párrafo de la base que más se parece), y las citas se reconocen por su texto ("[3]", "(Smith, 2020)") comparándolo con las citas que tenía ese párrafo en la base.
  10. **Tablero de la ronda** (R5): a quién se envió, quién ha devuelto su copia y quién falta, con la fecha límite que hayas puesto, cuántas propuestas de cada coautor quedan por resolver y un texto de recordatorio listo para copiar en el correo. El programa no envía correos. La aprobación de la versión final por cada autor se sigue haciendo por correo, fuera del programa.

  Esto sustituye el paso manual de trasladar cada copia a tu copia maestra. La referencia a batir es la función "Combinar" de Word (Revisar › Comparar › Combinar), que ya fusiona copias de varios revisores, pero solo admite dos documentos cada vez, no filtra el ruido y trata las citas como texto. El corpus de prueba se pasó también por ella en la fase 0 (prototipo 6, ficha 0029): con la ronda sintética, SciDesk recupera las 75 ediciones de los dos coautores con su autor y sin falsos positivos, y separa acuerdos y conflictos por zonas; «Combinar» recupera 58 de 75 con su autor, atribuye cambios a quien no los hizo y entremezcla los de los dos coautores dentro de las palabras.
- **[V1]** **Respuesta a revisores**:
  - Pegas los comentarios de la revista y se separan en puntos.
  - Para cada punto escribes la respuesta y enlazas el cambio del manuscrito.
  - Se genera la carta de respuesta con citas del texto nuevo.
- **[V1]** Generar la versión con cambios marcados frente a la versión enviada, como piden las revistas en la revisión.
- **[Después]** Edición simultánea sobre el mismo documento (fase 5). Se prepara desde el principio:
  - ProseMirror tiene integración madura con **Yjs** (CRDT, el mismo enfoque que usan muchos editores colaborativos), así que el editor elegido ya lo admite.
  - Los identificadores estables de bloque y que no se guarden números calculados (sección 3.2) son justo lo que necesita un CRDT.
  - Habrá que decidir el transporte cuando llegue el momento:
    - Un servidor de sincronización propio, que podría ser la parte de pago.
    - Sincronización entre iguales.
    - Una carpeta compartida en OneDrive o Dropbox, con limitaciones.
  - Los coautores tendrían que usar SciDesk. Mientras no lo hagan, la vía sigue siendo Word.
  - Antes de eso, un coautor que use SciDesk podrá devolver sus propuestas sin pasar por Word, por el mismo mecanismo de propuestas (6.5).

### 5.12 IA y paquetes para LLM (opcional)

**Versión con IA** **[Después]**: por ahora el programa no usa IA (P16 y P21). Más adelante habrá una versión que la incluya, con tu clave de API y solo cuando lo pidas, y en qué pasos se decidirá cuando el programa exista. Una de sus funciones principales será **ayudar en la redacción, corregirla y traducir** (por ejemplo, pasar el resumen al inglés o adaptar el estilo de redacción a una revista). Otros candidatos:
- Revisar el inglés.
- Recortar el resumen al límite.
- Comprobar la coherencia de las cifras en lo que no cubren las reglas de 5.8 (R8).
- Sugerir palabras clave MeSH.

Sus propuestas llegan por el mismo mecanismo que las de los coautores (6.5): **un LLM es un coautor más** cuyas propuestas aceptas o rechazas.

**Revisar rasgos típicos de texto generado con IA** **[Después]**, con un paquete para LLM o con la API del asistente:
- Qué busca: rayas (—) usadas como incisos, punto y coma en exceso y dos puntos "descriptivos" ("El resultado: una mejora…"). La lista de patrones se puede ampliar.
- Primer paso, sin IA: el programa cuenta esos signos por párrafo y por sección y señala los que pasan de un umbral (por ejemplo, por cada 1000 palabras). No son errores, porque la raya y el punto y coma son correctos; el problema es el abuso. Por eso los umbrales se pueden ajustar y dependen del idioma. Este aviso aparece en el panel de comprobaciones (5.8).
- Segundo paso, con IA: los párrafos señalados van en un paquete (nivel 2) o a la API, y vuelven propuestas de otra redacción, que aceptas o rechazas una a una en la vista de propuestas (6.5).

**Paquetes para LLM** **[V1]**, al estilo de revsis-app. En lugar de conectar el programa a un modelo, SciDesk prepara un paquete (una carpeta o un ZIP) con:
- Las instrucciones para el LLM.
- Los datos de contexto.
- El esquema de la respuesta esperada.

Tú lo procesas con el LLM que prefieras (por ejemplo, Claude con una skill) e importas la respuesta. El programa la valida contra el esquema, te la enseña y aceptas elemento a elemento. Si la respuesta propone cambios en tu texto, llegan a la vista de propuestas (6.5), como las de un coautor.

Ventajas: no hace falta clave de API ni conexión desde el programa, eliges el modelo y ves exactamente qué sale de tu equipo.

**Niveles de confidencialidad (decidido en P22).** Cada paquete declara su nivel, y antes de crearlo el programa muestra la lista exacta de lo que contiene:

| Nivel | Qué sale de tu equipo | Ejemplos |
|---|---|---|
| 0. Público | Nada del proyecto; solo información pública o general que eliges tú (un área, una revista) | Crear el perfil de una revista a partir de su guía. Catálogo de términos y abreviaturas de una especialidad para el corrector. Párrafos tipo de carta de presentación según el tipo de artículo |
| 1. Términos sueltos | Palabras o listas, sin el texto que las rodea | Palabras que el corrector no reconoce, para validarlas. Abreviaturas usadas, para proponer su forma desarrollada |
| 2. Fragmentos que eliges | Solo el texto que seleccionas | El resumen, para sugerir palabras clave MeSH. Los párrafos señalados por rasgos típicos de la IA, para proponer otra redacción |
| 3. Documento completo | Todo el manuscrito | Revisión del inglés, solo si la pides expresamente |

Por defecto solo se ofrecen los niveles 0 y 1. Nada específico de la investigación entra en un paquete sin que lo elijas.

Primeros usos, según el momento de la escritura:
- Al crear el proyecto o elegir área: diccionario y abreviaturas de la especialidad (nivel 0).
- Al elegir una revista que no está en el catálogo: crear su perfil (nivel 0, ver 5.9).
- Antes de enviar: validar términos desconocidos y abreviaturas (nivel 1).

La respuesta importada se trata como datos no confiables: se valida contra el esquema y nunca se ejecuta.

**Conexión con revsis-app y PICO Creator:** por ahora no (P17).

## 6. Arquitectura técnica propuesta

### 6.1 Pila tecnológica

| Pieza | Recomendación | Alternativas | Motivo |
|---|---|---|---|
| Aplicación de escritorio | **Tauri 2** (Rust + WebView2 en Windows y WKWebView en macOS), **con tres condiciones** (abajo), **que se cumplen: Tauri confirmado** (prototipo 11, ficha 0030) | Electron, si falla alguna condición | Seguro por diseño, con acceso nativo a archivos y con Typst y el código en Rust integrados de forma directa. El tamaño del instalador (~10 MB frente a ~100 MB) importa poco en un procesador de texto. El coste oculto es que en macOS el editor corre sobre WebKit y no sobre el Chromium que usas a diario en Windows (R37) |
| Interfaz | **React + TypeScript + Vite** | Svelte, Vue | El ecosistema más grande y el que mejor se lleva con el editor |
| Traducción de la interfaz | **i18next** (MIT), con archivos en español e inglés desde el primer día | — | P7 |
| Motor del editor | **ProseMirror** (vía **Tiptap**: núcleo y extensiones con licencia MIT, como UniqueID para los identificadores de bloque) | Lexical, Slate, CKEditor 5, ONLYOFFICE embebido | ProseMirror es el estándar para documentos estructurados: esquema estricto, nodos personalizados (cita, referencia cruzada) y tablas con celdas combinadas. Solo se usan piezas libres: en Tiptap, los comentarios, el control de cambios y la conversión a DOCX son extensiones de pago (`@tiptap-pro`) y no se usan |
| Comentarios y control de cambios | **Implementación propia** sobre una pieza libre: **`@handlewithcare/prosemirror-suggest-changes` (MIT), en una copia propia**, elegida con el prototipo 7 frente a `@manuscripts/track-changes-plugin` (ficha 0020) | — | Es la función más difícil de un editor y determina cómo se guardan los cambios en `.scidoc`, así que el esquema de la versión 1 no se cierra sin un prototipo que escriba y borre en modo de sugerencias, acepte y rechace, exporte a `w:ins` y `w:del` y vuelva a importar (R31) |
| Núcleo sin interfaz | **Paquete de TypeScript sin interfaz** con todo lo que no es pantalla: esquema, numeración, citas, comprobaciones, importación, exportación, fusión y propuestas. **Línea de comandos** (`scidesk export`, `scidesk check`) sobre él | — | Las pruebas con el corpus se ejecutan en segundos sin abrir la aplicación; herramientas externas, como una skill de Claude, pueden trabajar con un proyecto sin meter IA en el programa; y es la base del servidor de sincronización de la fase 5 (R33) |
| Esquemas y validación | **Una sola definición por formato** que genera los tipos de TypeScript, la validación y el JSON Schema publicado: **TypeBox** (MIT), elegido en la fase 0 (ficha 0031), en el paquete [`packages/formats/`](packages/formats/) | Zod (descartado: sus refinamientos no pasan al JSON Schema publicado) | Todo lo que entra de fuera se valida con el mismo código (R34, 3.2). Con TypeBox la definición ya es JSON Schema, así que lo publicado es exactamente lo que se comprueba; el núcleo de Rust y los paquetes para LLM usan el mismo archivo |
| Motor de citas | **citeproc-js** (el de Zotero y Mendeley) en un *web worker* | hayagriva (Rust, MIT/Apache) | citeproc-js es la implementación de referencia de CSL y es la más fiel. **Licencia: CPAL/AGPL** (ver 6.3). Confirmado con el prototipo 2 (ficha 0026): renumera en vivo en unos 2 ms con 50 referencias. Se incluye desde su repositorio en un commit fijo, porque npm no recibe versiones desde 2023 |
| Lectura de formatos de referencias | citation-js (MIT) para RIS, BibTeX y CSL-JSON, y analizadores propios para NBIB y EndNote XML | — | NBIB y EndNote XML son sencillos de analizar y conviene controlarlos |
| Zotero | API local de Zotero (HTTP en el propio equipo), detrás de una interfaz propia | Better BibTeX | La interfaz propia permite añadir EndNote y Mendeley después sin tocar el resto |
| Exportar DOCX | Biblioteca `docx` (MIT) más un traductor propio de nuestro documento a OOXML, con **plantilla de referencia** para los estilos | Pandoc | Control total de estilos, tablas, comentarios y cambios. La biblioteca admite cambios marcados y notas al pie. El prototipo 3 confirmó que escribe marcadores con cualquier nombre; los campos complejos (citas, `REF`, `SEQ`) se escriben como fragmentos de OOXML propios dentro de ella, y los estilos de la plantilla se buscan por su nombre interno (ficha 0025) |
| Importar DOCX y fusionar revisiones | Lector OOXML propio (JSZip + XML) y **fusión propia a tres bandas** por bloques, con jsdiff (BSD) para el texto. El mismo lector importa un Word existente con sus citas de Zotero, Mendeley y EndNote (R1) | mammoth.js (pierde formato a propósito) | Hacen falta comentarios, cambios, tablas con formato, detectar los cambios no marcados y alinear las copias aunque se pierdan las marcas (R2, R3). Confirmado con el prototipo 6 (ficha 0029): propuestas por copia en 6–7 ms y fusión por zonas |
| PDF y vista previa | **Typst** integrado en Rust (R30), con un exportador propio del documento a Typst. Confirmado con el prototipo 4 (ficha 0024): recompila un artículo de 13 páginas en 8–10 ms tras cada tecla | paged.js (descartado), LibreOffice sin interfaz | Da el mismo resultado en Windows y en macOS, mientras que paged.js depende del motor web, distinto en cada sistema. Numera las líneas, genera PDF etiquetado y admite PDF/UA-1 y PDF/A. Compila de forma incremental en milisegundos, así que la vista previa puede seguir al texto, y sabe en qué página y línea cae cada elemento (útil para la lista EQUATOR). **Las citas y la bibliografía llegan ya formateadas por citeproc-js**, como texto, para que el PDF y el DOCX coincidan |
| Fuentes | Fuentes del sistema más equivalentes libres incluidos: Carlito, Caladea, Liberation y Roboto | — | 5.2 |
| Ecuaciones (fase 4) | MathLive (edición) y LaTeX → MathML → OMML (Word) | KaTeX solo para mostrar | Word necesita OMML para que las ecuaciones sean editables |
| Ortografía | **Corrector propio** con diccionarios de Hunspell (los de LibreOffice, es/en) y subrayados dibujados por el editor (R29). Motor: **`spellbook` (MPL-2.0) compilado a WebAssembly en un *web worker***, elegido con el prototipo 9 (ficha 0023). Hace falta un diccionario de biomedicina y reumatología: sin él quedan unos 16 subrayados por cada 1.000 palabras de un artículo clínico real | Corrector del motor web y nspell (descartados) | El del motor web no admite idioma por fragmento ni diccionario del proyecto (Chromium tiene una propuesta de API, pero no está disponible) y es distinto en cada sistema. nspell va justo de memoria y velocidad con el diccionario español |
| Historial de versiones | **Instantáneas propias** (P15), un archivo por instantánea (R26) | git con gitoxide o libgit2 | Ver 6.4 |
| Pruebas | Vitest (unidades) sobre el núcleo sin interfaz; Playwright (interfaz) en Chromium y **también a diario en su WebKit**, que funciona en Windows, con el núcleo de Tauri simulado; WebdriverIO con su servicio para Tauri en macOS; archivos de referencia para DOCX | — | Exportar a Word se rompe con facilidad: hacen falta comparaciones automáticas (R35, R37) |

**Las tres condiciones para mantener Tauri** (R37). Si falla alguna, se pasa a Electron, y la decisión se toma al final de la fase 0, cuando cambiar de plataforma cuesta días y no semanas:
1. Lo que más cambia entre motores web no depende del motor: corrector propio (R29) y PDF con Typst (R30).
2. Los prototipos de pegar tablas y de edición básica se repiten en el MacBook **en la fase 0**, no al cerrar la fase 1.
3. Las pruebas del editor se ejecutan a diario también sobre WebKit. El WebKit de Playwright no es idéntico a WKWebView, pero detecta la mayoría de las diferencias.

**Pruebas del DOCX** (R35):
- **Validación.** Cada DOCX generado se comprueba contra el esquema de OOXML en la integración continua. El peor fallo posible es que Word diga que el archivo está dañado.
- **Word real.** En tu equipo, una prueba abre cada DOCX del corpus con Word, lo convierte a PDF y compara la imagen con la de referencia. Los servidores de integración continua no tienen Word, así que esta prueba es local.
- **Ida y vuelta.** Importar lo que se acaba de exportar tiene que devolver el mismo documento. Es la prueba más valiosa del proyecto, porque detecta a la vez errores de exportación y de importación.

**Bibliotecas jóvenes detrás de una interfaz propia.** El control de cambios y el corrector dependen de piezas recientes que pueden quedarse sin mantenimiento. Igual que el motor de citas y el historial, van detrás de una interfaz propia para poder cambiarlas.

### 6.2 Esquema de módulos

```
┌───────────────────────── Interfaz (React, español e inglés) ─────────────────────────┐
│ Navegador  │ Pestañas del editor (Tiptap/ProseMirror)     │ Panel derecho            │
│ por        │  · nodos: cita, xref, tabla, figura,         │ (contenido por decidir)  │
│ conceptos  │    ecuación, comentario, cambio              │                          │
├────────────┴──────────────────────────────────────────────┴──────────────────────────┤
│ Núcleo sin interfaz (TypeScript, en workers cuando pesa; también línea de comandos)  │
│  Esquemas y validación · Proyecto · Numeración · Citas (citeproc) ·                  │
│  Biblioteca (propia o Zotero) · Comprobaciones · Perfiles y adaptación a revista ·   │
│  Propuestas (6.5) · Paquetes para LLM · Corrector ·                                  │
│  Exportadores (DOCX, Typst, MD, JATS) · Importador DOCX y fusión a tres bandas       │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Núcleo Tauri (Rust): archivos con escritura atómica, vigilancia de la carpeta,       │
│ diálogos, historial, fuentes del sistema, conversión de imágenes, PDF (Typst),       │
│ red (Crossref, PubMed)                                                               │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Licencias: AGPL-3.0 con CLA (decidido en P1b)

*Esto no es asesoramiento legal. Antes de publicar conviene que lo revise alguien especializado.*

**¿Hay incompatibilidades con la pila? No.** Todas las piezas de la sección 6.1 se pueden usar con cualquiera de las licencias candidatas para tu código. La única con condiciones es citeproc-js, y tiene salida en todos los casos. Falta confirmar la licencia de una candidata para el control de cambios, que se descarta si no cumple la regla de más abajo. Este es el inventario:

| Componente | Licencia | Efecto sobre nuestra licencia |
|---|---|---|
| Tauri, React, Vite, ProseMirror, Tiptap (núcleo y extensiones libres), Yjs, citation-js, docx, i18next, MathLive, KaTeX, prosemirror-suggest-changes, Zod o TypeBox | MIT (Tauri: MIT o Apache-2.0) | Ninguno: son permisivas y compatibles con todo |
| `@manuscripts/track-changes-plugin` (candidata para el control de cambios) | A confirmar | Si resulta ser GPL o AGPL, no se usa (ver la regla tras la tabla) |
| spellbook (candidato para el corrector) | MPL-2.0 | Ninguno si no se modifica: el copyleft de la MPL solo alcanza a sus propios archivos |
| Hunspell (si el corrector se compila a WebAssembly) | MPL-1.1, GPL-2.0 o LGPL-2.1, a elegir | Se usa bajo MPL. Ninguno |
| TypeScript, Typst | Apache-2.0 | Ninguno. Solo es incompatible con la GPL-2.0 "solo", que no está entre las candidatas |
| jsdiff | BSD-3-Clause | Ninguno |
| JSZip | MIT o GPL-3.0, a elegir | Se usa como MIT |
| **citeproc-js** | **CPAL-1.0 o AGPL-3.0, a elegir** | Con AGPL o GPL-3.0 se usa bajo AGPL. Con MIT, Apache, MPL o una versión cerrada se usa bajo CPAL, que obliga a publicar los cambios que hagamos al propio citeproc-js y exige mostrar una atribución en la interfaz cada vez que arranca: su anexo B pide «citeproc-js implements the Citation Style Language», «(c) Frank Bennett» y citationstyles.org. SciDesk la muestra en todas sus versiones (ficha 0026). El «AGPL-1.0» de npm es un error de metadatos: la opción real es AGPL-3.0 o posterior |
| hayagriva (alternativa a citeproc-js) | MIT o Apache-2.0 | Ninguno |
| gitoxide / libgit2 (solo si el historial usa git) | MIT o Apache-2.0 / GPL-2.0 con excepción de enlace | Ninguno: la excepción permite usar libgit2 desde programas con cualquier licencia |
| Estilos y traducciones de CSL | CC BY-SA 3.0 | Son datos, no código: no afectan a la licencia del programa. Si modificamos un estilo, se publica con la misma licencia y citando la fuente |
| Diccionarios ortográficos | Español: GPL, LGPL o MPL, a elegir. Inglés: permisiva | Van en archivos aparte; se usan bajo LGPL o MPL. Ninguno |
| Fuentes libres (Carlito, Caladea, Liberation, Roboto) | SIL OFL 1.1 o Apache-2.0, según la fuente | Se pueden incluir en cualquier programa, también de pago; lo único que no se puede es venderlas sueltas |
| Fuentes de Microsoft (Calibri, Times New Roman…) | Propietarias | No se pueden incluir con ninguna licencia; se usan las instaladas en el equipo (5.2) |
| WebView2 (Windows) y WKWebView (macOS) | Del sistema operativo | No se distribuyen con el programa |
| Pandoc | GPL-2.0 o posterior | Se evita en el núcleo; como mucho, una herramienta externa opcional |
| Extensiones de pago de Tiptap | Comercial | No se usan |

**Regla para las dependencias (R36).** Como SciDesk es AGPL, su licencia le permitiría incorporar código GPL-3.0 o AGPL de terceros. Pero la licencia dual que busca el CLA solo es posible si todo el código es tuyo o tiene una licencia que no obligue a publicar el programa entero con ella: permisiva, MPL o con una opción así, como citeproc-js con CPAL. Por eso **no se copia código GPL ni AGPL de terceros ni se usa como dependencia**.

Para que siga siendo así, en la integración continua se añade una comprobación automática de licencias de las dependencias (cargo-deny para Rust y license-checker para npm), que avisa de cualquier dependencia que solo se pueda usar bajo GPL o AGPL.

**Las opciones para tu código, comparadas:**

| | MIT | Apache-2.0 | MPL-2.0 | GPL-3.0 | AGPL-3.0 |
|---|---|---|---|---|---|
| Qué puede hacer otro con tu código | Todo, incluido un producto cerrado basado en el tuyo | Igual que MIT | Igual, pero si modifica tus archivos tiene que publicar esos archivos | Usarlo y venderlo, pero lo que distribuya tiene que ser GPL y con su código | Igual que GPL y, además, si lo ofrece como servicio en red también tiene que publicar el código |
| Protección frente a un competidor que cierre tu programa | Ninguna | Ninguna | Baja | Alta en el escritorio | Alta en el escritorio y en un servidor |
| Licencia de patentes explícita | No | Sí | Sí | Sí | Sí |
| Tu versión de pago | Libre, pero cualquiera puede hacer lo mismo | Igual que MIT | Libre para tus archivos nuevos | Necesitas ser titular de todo el código (acuerdo de contribución, CLA) para vender una versión cerrada | Igual que GPL |
| Atrae contribuciones externas | Mucho | Mucho | Bastante | Bastante | Menos, sobre todo si además pides firmar un CLA |
| Para quien solo usa el programa (investigadores, hospitales) | Sin obligaciones | Sin obligaciones | Sin obligaciones | Sin obligaciones | Sin obligaciones: la AGPL solo afecta a quien modifica y distribuye o lo ofrece como servicio |
| Futuro servidor de sincronización (fase 5) | Cualquiera puede montar uno cerrado con tu código | Igual que MIT | Casi igual | Cualquiera puede ofrecer como servicio una versión modificada sin publicarla | Quien ofrezca una versión modificada como servicio tiene que publicarla |
| Tiendas de aplicaciones (App Store de Apple) | Sin problema | Sin problema | Sin problema | Sus condiciones chocan con la GPL cuando publica un tercero; tú, como titular, sí puedes | Igual que GPL |

Algunas ideas que ayudan a decidir:
- **Ninguna licencia impide que otros distribuyan gratis tu programa compilado.** El valor de una versión de pago tiene que venir de la comodidad (instaladores firmados con actualizaciones), del servicio (sincronización) o del soporte, no de la licencia.
- **Empezar restrictivo deja abiertas más puertas.** Si eres titular de todo el código (con CLA), puedes pasar más adelante de AGPL a MIT. Al revés no: las versiones que ya hayas publicado como MIT seguirán siéndolo para siempre.
- **El CLA es lo que permite la licencia dual.** Un DCO (la alternativa ligera, en la que el colaborador solo certifica que su aportación es suya) no te da derecho a relicenciar. Hay herramientas que automatizan la firma del CLA en GitHub (por ejemplo, CLA Assistant).

**Decisión: AGPL-3.0 con CLA**, porque:
1. El modelo de pago más probable (servicio de sincronización, fase 5) es justo el que protege la AGPL.
2. Mantiene abiertas todas las opciones, incluida pasar a una licencia más permisiva más adelante.
3. No pone ninguna obligación a quien solo usa el programa.

Lo que se pierde: menos contribuciones externas y ninguna empresa podrá construir un producto cerrado sobre SciDesk (que es lo que se busca).

Alternativas descartadas: **GPL-3.0**, que en el escritorio protege igual pero no cubre un futuro servidor, y **Apache-2.0**, que favorece la difusión y las contribuciones a cambio de no proteger frente a productos cerrados.

### 6.4 Historial de versiones: instantáneas propias en lugar de git (decidido en P15)

Lo que se quiere (5.1): guardar versiones con nombre ("Enviado a coautores 20/11"), instantáneas automáticas en momentos clave (antes de importar revisiones, al exportar para la revista, una vez al día), comparar dos versiones y restaurar. Hay dos formas de guardarlo por debajo.

**Opción 1: git invisible.** Cada versión sería un commit en un repositorio oculto, escrito con una biblioteca de Rust dentro del programa (sin instalar git).

Ventajas:
- Probado y fiable: cada versión solo guarda lo que cambió, comprimido, y la integridad se comprueba con huellas criptográficas.
- Formato abierto: si SciDesk desapareciera, el historial se podría abrir con cualquier herramienta de git, y un usuario avanzado podría subirlo a GitHub.
- El formato `.scidoc` (JSON estable y legible) produce diferencias razonables.
- Trae ramas y fusiones, por si algún día hicieran falta.

Inconvenientes:
- **Se lleva mal con OneDrive y Dropbox.** Un repositorio git tiene archivos que se modifican en cada operación (referencias, índice, paquetes). Si la carpeta se sincroniza entre el PC y el MacBook y se trabaja en los dos antes de que termine la sincronización, el historial puede corromperse o duplicarse.
- **Figuras pesadas.** Un TIFF de 20–50 MB se guarda entero cada vez que cambia, porque git no comprime bien los archivos binarios.
- **Choca con tu propio git.** Si la carpeta del proyecto ya está dentro de un repositorio tuyo, un `.git` oculto interfiere (se evita guardándolo con otro nombre dentro de `.scidesk/`).
- **Las diferencias de git no sirven para personas.** git compara líneas de JSON, no frases. Hay que programar igualmente una comparación propia por párrafos y palabras, y la fusión de revisiones de coautores se hace a nivel de documento (5.11), no con la fusión de git.
- **Más dependencias.** gitoxide (Rust) todavía no cubre todo git, y libgit2 añade código en C que complica la compilación en Windows y macOS.

**Opción 2: instantáneas propias.** Cada versión es **un archivo** en `.scidesk/history/` que contiene su nombre, fecha y autor, la lista de archivos del proyecto con sus huellas y, comprimido, **solo el contenido nuevo de esa versión**: lo que no estaba ya en una instantánea anterior (R26). Cada versión pertenece a un artículo e incluye los datos comunes que usa (referencias citadas y fichas de sus autores), para que restaurar un artículo no toque los demás (4.1).

La v0.4 guardaba cada archivo por separado, una vez por contenido distinto. Eso produce miles de archivos pequeños, que es lo que peor llevan OneDrive y Dropbox. Con un archivo por instantánea, la carpeta queda con decenas de archivos en lugar de miles.

Ventajas:
- **Los archivos se escriben una vez y no se modifican nunca.** La sincronización solo añade archivos, así que no hay conflictos posibles: si el PC y el MacBook crean una versión a la vez, salen dos archivos distintos.
- Una figura que no cambia no ocupa más espacio.
- Las instantáneas automáticas antiguas se pueden olvidar conservando las que tienen nombre. Como una instantánea puede guardar contenido que usan las posteriores, olvidarla exige compactar: se escribe un archivo nuevo con lo que sigue haciendo falta y después se borran los antiguos.
- Mucho más sencillo: unos cientos de líneas de código, sin dependencias, y con un formato documentado.

Inconvenientes:
- Es un formato propio, aunque sencillo y documentado, y no trae ramas.
- Reinventa una parte pequeña de git.

**Decisión: instantáneas propias.** Cambia la propuesta de la v0.2, porque lo que git hace mejor (ramas y fusiones) aquí no se usaría: la fusión de revisiones se hace sobre el documento. Además, sincronizar la carpeta entre dos equipos es justo donde git es frágil. Para no perder lo bueno de git:
- El historial va detrás de una interfaz propia, igual que el motor de citas, así que se podría cambiar a git más adelante.
- **[Después]** "Exportar el historial a un repositorio git".
- Si quieres usar git por tu cuenta, puedes: el proyecto es una carpeta normal y tu git solo tiene que ignorar `.scidesk/`.

Desde la fase 1, **cada exportación a DOCX guarda una instantánea** (R42), aunque la interfaz del historial llegue en la fase 2: es la versión de partida que necesita la fusión a tres bandas.

### 6.5 Propuestas: un único mecanismo para todo lo que entra de fuera (R7)

Varias funciones son, por debajo, lo mismo: alguien propone cambios sobre tu texto y tú decides. Se tratan con **un solo modelo** (un cambio, su autor y su origen) y **una sola vista de revisión**:
- Las copias de Word de los coautores (5.11).
- La respuesta de un paquete para LLM que proponga otra redacción (5.12).
- Una copia en conflicto creada por OneDrive o Dropbox (5.1).
- Recuperar un párrafo o una sección de una versión antigua (5.1).
- En el futuro, un coautor que también use SciDesk y devuelva sus propuestas sin pasar por Word, y el asistente con IA.

Así se programa y se aprende una sola vez, y la futura versión con IA se reduce a decidir por dónde llegan las propuestas: **un LLM es un coautor más**, cuyas propuestas aceptas o rechazas. El modelo se fija en la fase 0, junto con el formato, y la fase 2a lo prueba con una sola copia antes de complicarlo.

### 6.6 Rendimiento y seguridad desde el primer día (R38)

- **Citas y referencias cruzadas sin componentes de React.** Un artículo tiene cientos. Si cada una fuera un componente, el editor se volvería lento. Son nodos sencillos cuyo texto ("[1–3]", "Tabla 2") lo pinta un complemento de numeración. React queda para lo pesado: los marcos de tabla y de figura.
- **Comprobaciones como funciones puras.** Cada una recibe el estado del proyecto y el perfil, y devuelve avisos con identificador estable (5.8). Se ejecutan fuera del hilo de la interfaz, con retraso.
- **Seguridad que no puede esperar a la auditoría final:** política de contenido estricta, permisos de Tauri limitados a la carpeta del proyecto, imágenes SVG mostradas como imagen y nunca insertadas en la página, y lectura de ZIP y XML protegida contra rutas que salen de la carpeta, archivos que se expanden sin límite y entidades externas.

## 7. Riesgos técnicos y cómo atacarlos

| # | Riesgo | Por qué es difícil | Plan |
|---|---|---|---|
| 7.1 | **Pegar tablas de Word con formato** | Word pone en el portapapeles HTML con estilos `mso-*`, celdas combinadas con `rowspan`/`colspan`, bordes por celda y párrafos dentro de las celdas | Prototipo 1 hecho con las 135 tablas de un informe tuyo: 135/135 bien con un limpiador específico de HTML de Office, 83/135 sin él (ficha 0022). Repetido en el MacBook (prototipo 11): 10/12 tablas perfectas y dos espacios perdidos; en Safari las citas de EndNote pegadas llegan solo como texto (ficha 0030) |
| 7.2 | **Paginación tipo Word mientras se escribe** | Los editores web son de flujo continuo; paginar en vivo es caro y con errores. Además, ninguna vista previa coincidirá con la paginación de Word | Decidido: editar en flujo continuo (como el "modo borrador" de Word) con una vista previa paginada con Typst al lado o a demanda. Para enviar a una revista importa el DOCX, no cómo se ve la página **[P5]**. La interfaz dice que la vista previa no es Word (R30) |
| 7.3 | **Fidelidad del DOCX exportado** | OOXML es enorme, y Word y LibreOffice lo interpretan distinto | Generar con estilos con nombre a partir de una plantilla de referencia, validar cada DOCX contra el esquema de OOXML, probar en Word real, comparar automáticamente con DOCX de referencia y probar la ida y vuelta (R35, 6.1) |
| 7.4 | **Ida y vuelta con Word y fusión de varias copias** | Hay que traducir los cambios de Word (`w:ins`, `w:del`, cambios de formato) a marcas de ProseMirror y al revés. Además, varios coautores devuelven copias en días distintos mientras sigues escribiendo, algunos no activan el control de cambios y Word registra mucho ruido | Fase 2, justo después del MVP y en dos partes (R44). Fusión a tres bandas (R2) con filtro de ruido (R4). Primero exportar y después importar, con un corpus de rondas reales (versión enviada más las copias devueltas, anonimizadas si hace falta). Los cambios no marcados se detectan comparando con la versión enviada. Desde la fase 1, el DOCX exportado ya lleva las marcas invisibles especificadas en 5.10 (R3), y cada exportación guarda la versión de partida (R42) |
| 7.5 | **Ecuaciones en Word** | La conversión de MathML a OMML no es perfecta | Su prioridad va ligada a la ampliación a otras disciplinas (P6). El formato las admite desde la versión 1 |
| 7.6 | **Rendimiento con documentos largos** | Con 8000 palabras, 80 referencias y 6 tablas, citeproc puede ir lento si recalcula todo, y cientos de citas como componentes harían lento el editor | Recalcular de forma incremental en un *worker* y numerar con un retraso de ~200 ms. Citas y referencias cruzadas como nodos sencillos y comprobaciones fuera del hilo de la interfaz (R38, 6.6) |
| 7.7 | **Windows y macOS** | Tauri usa WebView2 (Chromium) en Windows y WKWebView (Safari) en macOS: el portapapeles de Word en Mac genera otro HTML, y la ortografía y la impresión difieren. Distribuir en macOS exige firma y notarización (cuenta de desarrollador de Apple, de pago anual) | Se desarrolla en Windows (P2). Corrector propio y PDF con Typst, que no dependen del motor web. Pegado de tablas y edición básica probados en el MacBook ya en la fase 0, y pruebas diarias del editor también en WebKit; si falla alguna de las tres condiciones de 6.1, se pasa a Electron (R37). La integración continua (GitHub Actions) compila y prueba en los dos sistemas desde la fase 1. Pruebas a mano en el MacBook Air al cerrar cada fase, incluido el corpus de tablas pegadas desde Word para Mac. Firma de macOS solo cuando haya una versión pública |
| 7.8 | **Dependencia de Zotero** | La API local solo funciona con Zotero abierto, y cambia entre versiones (Zotero 10 cambió cómo numera las versiones de los registros) | El proyecto guarda una copia de lo citado y nunca necesita Zotero para abrirse. Adaptador propio y pruebas con cada versión mayor de Zotero |
| 7.9 | **Perfiles de revista desactualizados** | Las guías cambian sin aviso y a veces están incompletas | Fuente y fecha en cada dato, aviso a los 12 meses y catálogo abierto a correcciones. El programa recuerda que el perfil no sustituye a leer la guía antes de enviar |
| 7.10 | **Fuentes que no están en el equipo** | Las fuentes de Microsoft no se pueden distribuir; si faltan, el texto se ve con otra fuente y cambian los saltos de línea | Equivalentes libres con las mismas medidas (5.2) y un aviso cuando se sustituye una fuente |
| 7.11 | **Coautores que no usan Word de escritorio** | Google Docs, Pages, LibreOffice y Word en línea eliminan marcas y campos | Plan B de alineación por contenido y citas reconocidas por su texto (R3, 5.11). El prototipo 6 incluye copias pasadas por Google Docs, LibreOffice y Word para Mac |
| 7.12 | **El programa no sirve hasta el final de la fase 2** | El MVP permite escribir y exportar, pero no volver a meter lo que devuelven los coautores. Son muchos meses sin uso real, con una sola persona desarrollando | Corte vertical al empezar la fase 1, importar un Word existente e instantánea en cada exportación desde el MVP, y fase 2 en dos partes que terminan en algo usable (R42 a R44) |
| 7.13 | **Control de cambios sin pieza libre madura** | Es lo más difícil del editor y condiciona el formato. En Tiptap es de pago | Implementación propia sobre una pieza libre, elegida con el prototipo 7 antes de cerrar el esquema (R31) |
| 7.14 | **Tabla en archivo propio editada dentro del documento** | El editor trabaja sobre un único árbol | Documento compuesto al cargar y repartido al guardar, con el prototipo 8 (R32, 3.3) |
| 7.15 | **OneDrive con miles de archivos pequeños y copias en conflicto** | Sincronización lenta y pérdida de cambios | Un archivo por instantánea y la caché fuera de la carpeta (R26); copias en conflicto reconocidas y fusionadas (R27) |
| 7.16 | **Un cierre inesperado deja un archivo a medias** | Pérdida de trabajo y de confianza | Escritura atómica y registro de cambios sin guardar desde el MVP (R25) |
| 7.17 | **Dependencia de bibliotecas jóvenes** (control de cambios, corrector) | Pueden quedarse sin mantenimiento | Detrás de una interfaz propia, como el motor de citas (6.1) |
| 7.18 | **Código GPL o AGPL de terceros** | Cerraría la puerta a la licencia dual | No se usa; la integración continua lo vigila (R36, 6.3) |
| 7.19 | **Panel de avisos que no se puede silenciar** | Se deja de mirar | Cada aviso se puede ignorar con una nota, y hay tres niveles (R12, 5.8) |
| 7.20 | **Instalador de Windows sin firmar** | SmartScreen muestra "Windows protegió su PC", que frena a muchos usuarios y que algunos equipos gestionados bloquean | Por ahora se distribuye como el software libre habitual, sin certificado comercial (R40). Se revisa antes de la primera versión pública (8) |

## 8. Hoja de ruta por fases

Cada fase termina con algo que puedes usar y probar. Los tamaños son relativos (S, M, L, XL).

Con la hoja de ruta de la v0.4, el programa no mejoraba a Word con Zotero hasta el final de la fase 2: en cuanto mandabas el artículo a los coautores, no había forma de volver a meter lo que te devolvían. Los cambios de la v0.5 (corte vertical, importar un Word existente, instantánea en cada exportación y fase 2 en dos partes) buscan poder usarlo con un artículo real mucho antes (R42 a R44).

### Fase 0: decisiones y prototipos de riesgo (M)
- Reservar scidesk.app, scidesk.dev y los nombres en GitHub, npm y crates.io (P19). Preparar el texto del CLA (P1b).
- Prototipos desechables, cada uno respondiendo a una pregunta concreta (R41):
  1. Pegar 10 tablas de Word reales en Tiptap: ¿cuántas quedan bien? Comprobar también si el portapapeles de Word incluye los campos de Zotero (R23).
  2. citeproc-js con 50 referencias y 3 estilos, entre ellos el de Reumatología Clínica comparado con los ejemplos de su guía, renumerando en vivo.
  3. Exportar a DOCX un artículo con tabla, figura y citas, y abrirlo en Word. ¿Permite la biblioteca `docx` escribir marcadores y campos arbitrarios (R3, R35)?
  4. Vista previa y PDF con Typst (R30): ¿compila de forma incremental lo bastante rápido para seguir al texto, con números de línea y con las citas formateadas por citeproc-js?
  5. Leer una colección de Zotero por su API local y convertirla a CSL-JSON.
  6. Fusión de tres copias devueltas, con y sin control de cambios, alguna pasada por Google Docs, LibreOffice y Word para Mac, comparada con "Combinar" de Word (R2 a R4): ¿se recuperan bien los cambios y su autor?
  7. Control de cambios (R31): ¿qué pieza libre sirve de base y cómo se guardan los cambios en `.scidoc`?
  8. Documento compuesto (R32): ¿se edita bien una tabla que vive en su archivo dentro del documento completo, con deshacer y buscar comunes?
  9. Corrector (R29): ¿qué motor carga rápido el diccionario español, corrige un artículo de 5000 palabras sin retraso y admite idioma por fragmento?
  10. Importar un Word tuyo con citas de Zotero o EndNote (R1): ¿se recuperan las citas y la biblioteca?
  11. Arranque en el MacBook (R37): repetir el prototipo 1 y la edición básica en el MacBook Air. ¿Se comporta igual el editor?
- Especificar con un solo esquema (R34) el formato `.scidoc` v1 (JSON de ProseMirror tal cual, con cambios marcados, idioma por fragmento e identificadores que se regeneran al pegar), `.scitable` (con las notas como objetos, R11), `authors.json`, el manifiesto `.scidesk` con varios artículos (P12) y el identificador del proyecto, `people.json` y el esquema del perfil de revista. Los esquemas de los paquetes para LLM se definen con la misma herramienta cuando lleguen (fase 3). Especificar también las marcas del DOCX (R3), el modelo de propuestas (R7, 6.5) y qué se queda en cada equipo (R26). **Hecho el 21/11/2026** con TypeBox en [`packages/formats/`](packages/formats/): esquemas, ejemplos construidos con los datos sintéticos de los prototipos y pruebas; especificación en [`docs/formatos/especificacion-formatos.md`](docs/formatos/especificacion-formatos.md) (ficha 0031).
- **Terminado cuando:** las respuestas están escritas en `docs/decisiones/` y la pila de la sección 6 está confirmada o corregida, incluida la elección entre Tauri y Electron según las tres condiciones de 6.1.

### Fase 1: MVP, "escribo un artículo para Reumatología Clínica y lo envío en Word" (L)
Se desarrolla y se prueba en Windows; la integración continua compila también para macOS, y las pruebas del editor se ejecutan a diario también en WebKit.
- **Primeras semanas: corte vertical** (R42). Antes de construir el MVP entero, la versión más delgada posible del circuito completo: abrir un proyecto, escribir dos párrafos con una cita, exportar a DOCX, modificar ese DOCX en Word y volver a importarlo viendo las diferencias. Sin tablas, sin estilos y sin interfaz cuidada. Recorre de punta a punta el camino más arriesgado y fija las interfaces entre módulos antes de que haya mucho código apoyado en ellas. **Hecho el 21/11/2026** (ficha 0032): monorepo con `packages/formats`, `packages/core` (con la línea de comandos `scidesk`) y `apps/desktop`; probado con Word real y en la ventana (en el navegador, con el núcleo de Tauri simulado). Las instantáneas usan un formato provisional.
- Núcleo sin interfaz con su línea de comandos (R33), y desde el primer día las medidas de rendimiento y seguridad de 6.6 (R38).
- Esqueleto Tauri + React con la interfaz en español e inglés, asistente de proyecto con plantilla IMRaD, navegador por conceptos (R28) y esquemas de atajos "Word en español" e "Internacional" (R19). **Esqueleto de la ventana hecho el 22/11/2026** (ficha 0044): menús clásicos y Exportar, barra de vistas, navegador por conceptos con vista de archivos, pestañas (manuscrito, biblioteca, autores, ajustes), panel derecho con Avisos, Revisión y Detalles, barra de estado, cinta con color y resaltado, burbuja, menú contextual mínimo y los dos esquemas de atajos guardados por equipo; probado en el navegador y, el 22/11/2026, en la ventana real de Tauri. Faltan el asistente y la pantalla de inicio (láminas de D8) y la vista previa.
- "Nuevo artículo a partir de un Word", en versión básica: secciones, tablas y figuras (R1). **Hecho el 21/11/2026** (ficha 0036), probado con los tres Word reales del usuario en local; faltan autores, listas anidadas, notas al pie e imágenes EMF/WMF.
- Editor con estilos semánticos, fuente del documento, formato básico, buscar y reemplazar, caracteres especiales, autocorrección científica (R18), pegado de texto como en Word (R23), recuento de palabras por sección (con el resumen aparte), corrector propio (R29) y menú contextual. **Hechos** (fichas 0041, 0042 y 0044): títulos y párrafo, negrita, cursiva, subrayado, índices, color y resaltado; buscar y reemplazar en el manuscrito; caracteres especiales en la cinta; pegado con «combinar formato» y «solo texto»; recuento por sección; menú contextual mínimo. Faltan la fuente del documento, la cita en bloque, las listas, la alineación y la sangría en la cinta, la autocorrección, el corrector (prototipo 9, sin integrar) y «solo en esta sección». **Salto de página y página en blanco en Insertar, hechos el 23/11/2026** (ficha 0078, Ctrl+Intro; también en el Word y el PDF).
- Autores y afiliaciones: bloque de autores y portada automáticos. **Portada hecha** (ficha 0034) y **formulario de autores y afiliaciones, con la matriz CRediT, hecho el 21/11/2026** (ficha 0038).
- Referencias en modo biblioteca propia: importar RIS, NBIB, BibTeX y CSL-JSON (también después de la importación inicial), eliminar duplicados, cita rápida, bibliografía automática y ~15 estilos incluidos, entre ellos el de Reumatología Clínica. **Importar y eliminar duplicados, hecho el 21/11/2026** (ficha 0035). **Ver, buscar, editar y borrar la biblioteca, la cita rápida y los 18 estilos, hechos el 21/11/2026** (ficha 0037); **el clic derecho para citar y «omitir autor», hechos el 22/11/2026** (ficha 0067).
- Tablas: editor en el documento y en pestaña propia, con notas como objetos (R11), y pegado desde Word. **Pegado desde Word hecho el 21/11/2026** (ficha 0042), con el «combinar formato» de R23. **Documento compuesto en la ventana hecho el 22/11/2026** (ficha 0045): resumen con palabras clave, tablas (pie, celdas, filas y columnas, celdas combinadas, encabezado, alineación, notas generales y específicas con su letra) y figuras (imagen, pie, notas, texto alternativo, fuente y licencia) editables en su sitio; la tabla también en su pestaña; se guarda solo lo que cambia, y una parte quitada del texto queda «sin colocar». Faltan «mantener formato de origen», el pegado desde PDF y el diseño de la pestaña (lámina de D8). **Mover una tabla o una figura arrastrándola, hecho el 23/11/2026** (ficha 0077). Referencias cruzadas numeradas.
- Panel de comprobaciones mínimo: límites de palabras, pendientes y elementos sin citar, con tres niveles y avisos que se pueden ignorar (R12, R43). **Hecho el 21/11/2026** (ficha 0041), con todos los límites del perfil y el recuento de palabras por sección.
- Exportar DOCX, con plantilla de referencia, marcas invisibles y los dos perfiles (R3, R35), y PDF con Typst (R30), con el formato que pide Reumatología Clínica (doble espacio, 12 puntos, páginas numeradas, portada aparte). Instantánea en cada exportación (R42). **DOCX del manuscrito hecho el 21/11/2026** (ficha 0033): resumen, tablas con notas, figuras, referencias cruzadas, plantilla y formato del perfil; comprobado en Word real. **Portada aparte hecha** (ficha 0034). **PDF con Typst hecho** (ficha 0040): mismo contenido, citas y formato que el DOCX para la revista, compilado en Rust. El PDF se probó en la ventana real de Tauri el 22/11/2026 (ficha 0044). Faltan las comprobaciones de cegado del texto (R9, V1) y TIFF en el DOCX (al final del desarrollo; SVG hecho, ficha 0068). La validación con veraPDF se quitó del plan el 23/11/2026 (ficha 0080).
- Guardado automático con escritura atómica y recuperación (R25). **Hecho el 21/11/2026** (ficha 0039); probado en la ventana real de Tauri el 22/11/2026, con un proyecto en el disco y un cierre forzado (ficha 0044).
- Pasan a V1 (R43): búsqueda con expresiones regulares, versalitas, una fuente distinta para cada estilo, y bordes y sombreado de tabla a medida.
- **Terminado cuando:** puedes escribir de verdad un original corto de principio a fin, el DOCX exportado cumple la guía de Reumatología Clínica sin retoques y un Word tuyo ya empezado se importa con sus secciones, tablas y figuras.

### Fase 2: coautores con Word (XL, en dos partes)
Cada parte termina con algo usable, y la 2a prueba el modelo de propuestas antes de complicarlo (R44).

**Fase 2a: una copia devuelta.**
- Comentarios y control de cambios en el editor, con la implementación elegida en el prototipo 7 (R31).
- Exportar a DOCX con comentarios y cambios.
- Importar una copia devuelta con control de cambios y comentarios, verla en la vista de propuestas (6.5), y aceptar y rechazar.
- Citas de Zotero, Mendeley y EndNote de un Word importado convertidas en citas vivas (R1).
- Historial de versiones con nombre (P15).
- **Terminado cuando:** un coautor o un revisor lingüístico te devuelve una copia con control de cambios y comentarios, y la integras sin perder citas ni formato.

**Fase 2b: la ronda completa.**
- **Ronda de revisión con coautores** (5.11): varias copias, también sin control de cambios, fusión a tres bandas con conflictos entre coautores y copias que llegan tarde (R2), autor tomado de la marca de Word, filtro de ruido (R4), plan B cuando se pierden las marcas (R3) y tablero de la ronda (R5).
- **Terminado cuando:** mandas el artículo a tres coautores, dos te lo devuelven con control de cambios y uno sin él, una de las copias llega cuando ya has integrado las otras y seguido escribiendo, y lo integras todo en tu copia maestra desde una sola vista, sin perder citas ni formato.

### Fase 3: el proyecto completo y la revista (L)
- CRediT, contribuciones, carta de presentación, declaraciones y material suplementario con numeración S.
- Perfiles de revista (catálogo y creación con un paquete para LLM), módulo de adaptación a revista y panel de comprobaciones completo: abreviaturas con la leyenda de cada tabla y figura (R11), coherencia de cifras (R8) y manuscrito cegado (R9).
- Biblioteca vinculada a Zotero. Más estilos (buscador del repositorio CSL), DOI y PMID en línea (opcional), búsqueda en PubMed y Crossref desde el buscador de citas, citas escritas a mano resueltas (R24), EndNote XML y .enw, y verificación de referencias (R10).
- Idioma por fragmento (R20), búsqueda y reemplazo en todo el proyecto (R22), y cambios desde otro equipo y copias en conflicto (R27).
- Plantillas PRISMA, CONSORT, STROBE y CARE, y las demás según se necesiten.
- Añadir otros artículos al proyecto (P12), con "exportar este artículo como proyecto independiente".
- Paquete de envío con versión cegada.
- Respuesta a revisores y versión con cambios marcados frente a la enviada.
- Por último, si da tiempo, la hoja de envío (R14); si no, pasa a la fase 4.
- **Terminado cuando:** envías un artículo real a Reumatología Clínica y respondes a su revisión desde el programa.

### Fase 4: extras (M cada uno, a elegir)
- Ampliación a otras disciplinas: ecuaciones, plantillas y perfiles de otras áreas.
- Paquetes para LLM de diccionarios de especialidad y abreviaturas.
- Asistente con IA integrado, en los pasos que se decidan (P16), y revisión de rasgos típicos de texto generado con IA (por paquete o por API).
- JATS, LaTeX, EndNote y Mendeley (R45), escribir en Zotero, listas de verificación EQUATOR enlazadas, diagrama PRISMA, tablas desde datos e instalador firmado con actualizaciones automáticas.
- Resumen bilingüe lado a lado con MeSH y DeCS (R13) y bitácora de envíos (R15).

### Fase 5: edición simultánea (XL)
- Yjs sobre ProseMirror, presencia (quién está editando dónde) y comentarios en tiempo real.
- Transporte por decidir: servidor propio de sincronización (candidato a parte de pago) o entre iguales.
- Fuera del alcance hasta que las fases 1–3 estén en uso real.

### Antes de cualquier versión publicable
- Búsqueda formal de anterioridad de la marca SciDesk por alguien especializado y, si va a haber versión de pago, registro de la marca (P19). CLA preparado (P1b).
- Adaptación y pruebas en macOS en el MacBook Air: portapapeles de Word para Mac, ortografía, impresión, firma y notarización.
- Firma del instalador de Windows (R40). Por ahora se trata como el software libre habitual: sin certificado comercial, aceptando el aviso de SmartScreen en las primeras versiones. El servicio de firma de Microsoft, que era la opción barata, en la Unión Europea solo admite organizaciones, y los certificados comerciales son cada vez más caros y de menor duración. Antes de la primera versión pública se valoran las alternativas, entre ellas los programas gratuitos de firma para proyectos de código abierto (*a comprobar*), junto con el registro de la marca, porque depende de quién publique.
- Auditoría de seguridad: archivos no confiables (DOCX, RIS, perfiles y respuestas de LLM importados), permisos de Tauri, red, conexión local con Zotero y actualizaciones.
- Pruebas con 3 o 4 artículos reales tuyos.

## 9. Cómo trabajaremos
- Iteraciones cortas: cada sesión termina con algo que funciona y un commit.
- `CLAUDE.md` en la raíz guarda las decisiones y el estado, para que cualquier sesión nueva continúe sin perder contexto.
- `docs/decisiones/` contiene un archivo corto por decisión importante: qué se eligió, por qué y qué se descartó.
- Un corpus de prueba en `tests/corpus/` con tablas de Word, archivos RIS y NBIB, DOCX reales (también Word tuyos con citas de Zotero o EndNote) y rondas de revisión con coautores, con copias pasadas por Google Docs y LibreOffice (anonimizados si hace falta). Es la mejor protección contra regresiones al importar y exportar. Se ejecuta sobre el núcleo sin interfaz, en segundos (R33), y la prueba con Word real se ejecuta en tu equipo (R35).
- Idiomas: el código (identificadores, comentarios) y los mensajes de commit, en inglés (P23); el plan y las decisiones, en español.
- Plataforma: desarrollo y pruebas diarias en Windows, con las pruebas del editor también en WebKit; macOS en el MacBook Air en la fase 0 (prototipo 11) y al cerrar cada fase (R37).

## 10. Preguntas abiertas

*Contestadas todas: P1 a P24, con P1b (ver "Decisiones tomadas" al principio). P24 se planteó y se contestó con la revisión de la v0.4: los nombres fijos de carpetas y archivos van en inglés.*

No queda ninguna pregunta abierta. El siguiente paso es la fase 0 (sección 8):
- Reservar scidesk.app, scidesk.dev y los nombres en GitHub, npm y crates.io.
- Hacer los once prototipos de riesgo.
- Especificar los formatos con un solo esquema: `.scidoc`, `.scitable`, `authors.json`, `people.json`, el manifiesto `.scidesk` y el esquema del perfil de revista, además de las marcas del DOCX y el modelo de propuestas.
