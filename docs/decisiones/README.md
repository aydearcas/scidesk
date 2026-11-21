# Registro de decisiones

Un archivo corto por decisión importante: qué se decidió, por qué y qué se descartó. Las preguntas pendientes están en la sección 10 de [`PLAN.md`](../../PLAN.md). Las fichas que cambiaron con la revisión de la v0.4 ([`../revision-plan-v0.4.md`](../revision-plan-v0.4.md)) lo indican en su estado; la columna "Actualizada" da la fecha.

| N.º | Decisión | Pregunta del plan | Fecha | Actualizada |
|---|---|---|---|---|
| [0001](0001-codigo-abierto.md) | Código abierto público con posible versión de pago | P1 | 20/11/2026 | — |
| [0002](0002-plataformas-windows-primero.md) | Windows y macOS, desarrollando primero en Windows; Mac probado ya en la fase 0; firma de Windows como el software libre habitual | P2, R37, R40 | 20/11/2026 | 21/11/2026 |
| [0003](0003-coautores-con-word-y-fusion.md) | Coautores con Word y fusión a tres bandas de copias devueltas en paralelo | P4, P4b, R2–R5, R44 | 20/11/2026 | 21/11/2026 |
| [0004](0004-texto-continuo-con-vista-previa.md) | Texto continuo con vista previa paginada, con Typst | P5, R30, prototipo 4 | 20/11/2026 | 21/11/2026 |
| [0005](0005-alcance-e-idiomas.md) | Biomedicina primero; interfaz en español e inglés; código, comentarios y commits en inglés; ecuaciones con la ampliación; nombres de carpeta fijos en inglés; atajos de Word en español | P3, P6, P7, P23, P24, R19, R28 | 20/11/2026 | 21/11/2026 |
| [0006](0006-estructura-del-proyecto.md) | Tablas y figuras en archivos propios, documentos base y resumen aparte; documento compuesto | P8, P9, R11, R32, prototipo 8 | 20/11/2026 | 21/11/2026 |
| [0007](0007-referencias.md) | Biblioteca propia o vinculada a Zotero; consultas en línea opcionales; estilo de Reumatología Clínica | P11, P13, P14, R1, R10, R24, R45 | 20/11/2026 | 21/11/2026 |
| [0008](0008-revista-de-prueba.md) | Reumatología Clínica como revista de prueba | P10 | 20/11/2026 | — |
| [0009](0009-ia-mas-adelante.md) | IA más adelante; sin conexión con revsis-app por ahora | P16, P17 | 20/11/2026 | — |
| [0010](0010-pila-tecnologica.md) | Pila Tauri + React + TypeScript, con corrector propio, Typst, control de cambios propio y núcleo sin interfaz | P18, R29–R35, R37, R38, prototipo 7 | 20/11/2026 | 21/11/2026 |
| [0011](0011-fuentes-tipograficas.md) | Fuentes del sistema y equivalentes libres de las de Word | — | 20/11/2026 | — |
| [0012](0012-licencia-agpl.md) | Licencia AGPL-3.0 con acuerdo de contribución (CLA); sin código GPL ni AGPL de terceros | P1b, R36 | 20/11/2026 | 21/11/2026 |
| [0013](0013-historial-instantaneas.md) | Historial de versiones con instantáneas propias, no con git; un archivo por instantánea | P15, R26, R42 | 20/11/2026 | 21/11/2026 |
| [0014](0014-perfiles-de-revista.md) | Perfiles de revista bajo demanda | P20 | 20/11/2026 | — |
| [0015](0015-varios-articulos-por-proyecto.md) | Un proyecto, varios artículos, con biblioteca y personas comunes | P12 | 20/11/2026 | 21/11/2026 |
| [0016](0016-nombre-scidesk.md) | El programa se llama SciDesk | P19 | 20/11/2026 | 21/11/2026 |
| [0017](0017-adaptacion-sin-ia.md) | Adaptación a revista sin IA; redacción y traducción en la futura versión con IA | P21 | 20/11/2026 | — |
| [0018](0018-paquetes-llm.md) | Paquetes para LLM con cuatro niveles de confidencialidad | P22 | 20/11/2026 | — |
| [0019](0019-modelo-unico-de-propuestas.md) | Un único mecanismo de propuestas para todo lo que entra de fuera | R7 | 21/11/2026 | 21/11/2026 |
| [0020](0020-control-de-cambios.md) | Control de cambios sobre suggest-changes (copia propia); cambios como marcas con `id` y registro de autores en `.scidoc`; correspondencia con `w:ins`/`w:del` | R31, prototipo 7 | 21/11/2026 | 21/11/2026 |
| [0021](0021-documento-compuesto.md) | Documento compuesto: composición, reparto, formato de `.scitable` y reglas de ids, bordes, copias y tablas sin referencia | R32, prototipo 8 | 21/11/2026 | — |
| [0022](0022-pegar-tablas-de-word.md) | Pegar tablas de Word con un limpiador de HTML de Office (135/135 tablas reales); qué formato de celda se conserva; citas del portapapeles por HTML y RTF | 7.1, R23, prototipo 1 | 21/11/2026 | 21/11/2026 |
| [0023](0023-corrector-ortografico.md) | Corrector: spellbook en WebAssembly en un *worker*, idioma por fragmento, diccionario del proyecto y diccionario de especialidad imprescindible | R29, prototipo 9 | 21/11/2026 | — |
| [0024](0024-vista-previa-y-pdf-con-typst.md) | Vista previa y PDF con Typst 0.15 como biblioteca de Rust: recompilación incremental en 8–10 ms, citas de citeproc-js, PDF/UA y PDF/A | R30, prototipo 4 | 21/11/2026 | — |
| [0025](0025-docx-con-marcas-y-campos.md) | DOCX con la biblioteca `docx` y plantilla de referencia; marcas especificadas (marcadores de rango por bloque, citas en formato de Zotero, `REF` y `SEQ`); identidad confirmada por contenido al importar | R3, R35, prototipo 3 | 21/11/2026 | 21/11/2026 |
| [0026](0026-citas-con-citeproc-js.md) | Citas con citeproc-js (desde su repositorio, sin modificar): renumeración en vivo en ~2 ms, estilo propio de Reumatología Clínica que sigue su guía actual, y licencia AGPL-3.0 o CPAL con atribución | P13, 6.3, prototipo 2 | 21/11/2026 | — |
| [0027](0027-zotero-por-su-api-local.md) | Zotero por su API local (colección, sincronización por versiones, `Zotero-Server-ID`) y un URI por referencia en las citas del DOCX, porque sin él Zotero duplica referencias al actualizar | Prototipo 5 | 21/11/2026 | 21/11/2026 |
| [0028](0028-importar-citas-de-un-word.md) | Importar las citas de un Word desde el propio documento (EndNote `EN.CITE`/`EN.CITE.DATA`, Zotero, Mendeley Desktop), con EndNote XML convertido a CSL-JSON y la importación comprobada contra la bibliografía del documento | R1, prototipo 10 | 21/11/2026 | — |
| [0029](0029-fusion-de-copias-devueltas.md) | Fusión de las copias devueltas: propuestas de la enviada a cada copia (marcadas con su autor, no marcadas atribuidas a quien la devolvió), ruido oculto y fusión sobre tu copia por zonas con acuerdos y conflictos; mejor que «Combinar» de Word | R2–R4, prototipo 6 | 21/11/2026 | — |
| [0030](0030-tauri-confirmado.md) | Tauri confirmado frente a Electron: las tres condiciones de R37 se cumplen (prototipo 11 en el MacBook); composición del teclado en el modo sugerencias, limpiador para Word para Mac y citas pegadas en el Mac por el portapapeles nativo | R37, P18, prototipo 11 | 21/11/2026 | — |
| [0031](0031-formatos-v1-con-un-solo-esquema.md) | Formatos v1 con un solo esquema (TypeBox, `packages/formats/`): `.scidoc`, `.scitable`, `.scifigure`, proyecto, personas, autores, biblioteca, perfil de revista, propuestas y marcas del DOCX; estado de Zotero en cada equipo | R34, fase 0 | 21/11/2026 | — |
| [0032](0032-corte-vertical.md) | Corte vertical: monorepo (formats, core, desktop), núcleo con acceso a archivos por interfaz, exportar DOCX con marcas e instantánea e importar la copia devuelta como propuestas; probado con Word real y en la ventana | R42, fase 1 | 21/11/2026 | — |
| [0033](0033-docx-del-manuscrito.md) | DOCX del manuscrito completo: resumen, tablas con notas, figuras, referencias cruzadas, plantilla de referencia y formato del perfil de revista; texto generado fuera del marcador del bloque y llamadas a notas como REF | Fase 1, R11, R35 | 21/11/2026 | — |
| [0034](0034-portada-aparte.md) | Portada aparte generada desde autores y directorio de personas (afiliaciones numeradas, correspondencia, contribución igual, conflictos, agradecimientos); manuscrito para la revista sin autores | Fase 1, P12 | 21/11/2026 | — |
| [0039](0039-guardado-automatico-y-recuperacion.md) | Guardado automático y recuperación tras un cierre inesperado: registro de cambios sin guardar en la carpeta local de datos de cada equipo, comparado con el disco al abrir, con instantánea si el archivo cambió; comandos de Tauri para esa carpeta y `scidesk recover` | R25, R26, fase 1 | 21/11/2026 | — |
| [0040](0040-pdf-con-typst.md) | PDF del manuscrito con Typst: fuente generada en el núcleo con el contenido, las citas de citeproc-js y el formato del DOCX para la revista, compilada en Rust (comando de Tauri y binario `scidesk-pdf`); PDF etiquetado, PDF/UA-1 y PDF/A | R30, fase 1 | 21/11/2026 | — |
| [0035](0035-importar-referencias.md) | Importar referencias a la biblioteca propia: RIS, BibTeX y CSL-JSON con citation-js (formato forzado, sin red), NBIB con lector propio, normalización al CSL-JSON de SciDesk y duplicados por DOI, PMID o autor, año y título | Fase 1, P11 | 21/11/2026 | — |
| [0036](0036-nuevo-articulo-desde-word.md) | Nuevo artículo a partir de un Word (básico): estilos por nombre interno, título, resumen por idioma, encabezados con papel, tablas con pie y notas, figuras, listas y referencias cruzadas vivas; probado con los Word reales del usuario en local | R1, fase 1 | 21/11/2026 | — |
| [0037](0037-biblioteca-cita-rapida-y-estilos.md) | Ver, buscar, editar y borrar la biblioteca con los usos de cada referencia, cita rápida (Ctrl+Mayús+Y, varias referencias con página), 18 estilos CSL incluidos (con procedencia y licencia) y cambio de estilo al momento | Fase 1, P13 | 21/11/2026 | — |
| [0038](0038-formulario-de-autores.md) | Formulario de autores y afiliaciones: directorio de personas y grupos, quién firma y en qué orden, afiliaciones impresas, correspondencia, contribución igual, conflictos, agradecimientos y matriz CRediT; comprobación conjunta y guardado de people.json y authors.json a la vez | Fase 1, P12 | 21/11/2026 | — |

## Plantilla

```markdown
# NNNN. Título

- **Fecha:** dd/mm/aaaa
- **Estado:** propuesta | aceptada | sustituida por NNNN
- **Pregunta del plan:** Pn

## Qué se decide
## Por qué
## Qué se descartó
## Consecuencias
```
