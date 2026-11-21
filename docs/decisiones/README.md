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
| [0016](0016-nombre-scidesk.md) | El programa se llama SciDesk | P19 | 20/11/2026 | — |
| [0017](0017-adaptacion-sin-ia.md) | Adaptación a revista sin IA; redacción y traducción en la futura versión con IA | P21 | 20/11/2026 | — |
| [0018](0018-paquetes-llm.md) | Paquetes para LLM con cuatro niveles de confidencialidad | P22 | 20/11/2026 | — |
| [0019](0019-modelo-unico-de-propuestas.md) | Un único mecanismo de propuestas para todo lo que entra de fuera | R7 | 21/11/2026 | — |
| [0020](0020-control-de-cambios.md) | Control de cambios sobre suggest-changes (copia propia); cambios como marcas con `id` y registro de autores en `.scidoc`; correspondencia con `w:ins`/`w:del` | R31, prototipo 7 | 21/11/2026 | — |
| [0021](0021-documento-compuesto.md) | Documento compuesto: composición, reparto, formato de `.scitable` y reglas de ids, bordes, copias y tablas sin referencia | R32, prototipo 8 | 21/11/2026 | — |
| [0022](0022-pegar-tablas-de-word.md) | Pegar tablas de Word con un limpiador de HTML de Office (135/135 tablas reales); qué formato de celda se conserva; citas del portapapeles por HTML y RTF | 7.1, R23, prototipo 1 | 21/11/2026 | — |
| [0023](0023-corrector-ortografico.md) | Corrector: spellbook en WebAssembly en un *worker*, idioma por fragmento, diccionario del proyecto y diccionario de especialidad imprescindible | R29, prototipo 9 | 21/11/2026 | — |
| [0024](0024-vista-previa-y-pdf-con-typst.md) | Vista previa y PDF con Typst 0.15 como biblioteca de Rust: recompilación incremental en 8–10 ms, citas de citeproc-js, PDF/UA y PDF/A | R30, prototipo 4 | 21/11/2026 | — |
| [0025](0025-docx-con-marcas-y-campos.md) | DOCX con la biblioteca `docx` y plantilla de referencia; marcas especificadas (marcadores de rango por bloque, citas en formato de Zotero, `REF` y `SEQ`); identidad confirmada por contenido al importar | R3, R35, prototipo 3 | 21/11/2026 | — |
| [0026](0026-citas-con-citeproc-js.md) | Citas con citeproc-js (desde su repositorio, sin modificar): renumeración en vivo en ~2 ms, estilo propio de Reumatología Clínica que sigue su guía actual, y licencia AGPL-3.0 o CPAL con atribución | P13, 6.3, prototipo 2 | 21/11/2026 | — |

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
