# SciDesk

Procesador de texto de escritorio para escribir artículos científicos, con lógica de proyecto al estilo de VS Code: carpeta con la estructura del artículo, autores, carta de presentación, contribuciones CRediT, figuras, tablas y gestión de referencias con estilos CSL.

Antes se llamaba `nobs-papers`; el proyecto se trasladó a esta carpeta el 20 de noviembre de 2026. Su nombre de trabajo fue SciScribe hasta el 20 de noviembre de 2026, cuando se cambió a SciDesk porque ya existe un producto con ese nombre en el mismo sector (decisión 0016). La carpeta del repositorio sigue llamándose `sciscribe`.

## Estado actual (20 de noviembre de 2026)
- Fase: planificación. Todavía no hay código.
- El plan de desarrollo está en `PLAN.md` (borrador v0.4). Las preguntas abiertas están en su sección 10.
- Decisiones tomadas (fichas en `docs/decisiones/`):
  - Código abierto público con posible versión de pago. Licencia AGPL-3.0 con acuerdo de contribución (CLA).
  - Windows y macOS; se desarrolla primero en Windows y se prueba después en un MacBook Air.
  - Primero biomedicina y clínica, en español e inglés; después, cualquier disciplina. Ecuaciones con la ampliación.
  - Interfaz en español e inglés, seleccionable. Código en inglés.
  - Coautores con Word por correo; varios revisan en paralelo, así que fusionar las copias devueltas es el núcleo de la fase 2. La edición simultánea, más adelante.
  - Texto continuo + vista previa paginada.
  - Cada tabla y figura en su archivo, editables también desde el documento completo. Resumen y palabras clave en un documento propio.
  - Referencias: biblioteca propia ampliable o vinculada a Zotero (EndNote y Mendeley después). Consultas a Crossref y PubMed opcionales y explicadas.
  - Revista de prueba: Reumatología Clínica (también su estilo de cita).
  - Perfiles de revista bajo demanda: estilo y datos de la revista de fuentes abiertas; el resto, con un paquete para LLM al elegir una revista sin perfil, y catálogo público que crece con el uso.
  - Historial de versiones con instantáneas propias (archivos que solo se añaden), no con git.
  - Todas las fuentes típicas de Word y Roboto: fuentes del sistema más equivalentes libres.
  - IA integrada más adelante (entre otras funciones, revisar rasgos típicos de texto generado con IA); sin conexión con revsis-app ni PICO Creator por ahora.
  - Pila: Tauri 2 + React + TypeScript + Tiptap/ProseMirror, citeproc-js y exportación DOCX con la biblioteca `docx` (a confirmar con los prototipos de la fase 0).
  - Nombre: SciDesk. Extensiones: `.scidesk` (manifiesto del proyecto y carpeta oculta), `.scidoc` (documentos) y `.scitable` (tablas).
  - Un proyecto puede tener varios artículos (formato preparado desde el principio, MVP con uno). Biblioteca y directorio de personas comunes; cada artículo elige quién firma. Tablas y figuras se copian entre artículos. Sin biblioteca global.
- Pendiente de decisión del usuario (PLAN.md, sección 10):
  - P21 a P23: alcance del módulo de adaptación, paquetes para LLM y si comentarios y commits van en inglés.
- Formato propuesto del artículo: JSON propio `.scidoc`, versionado y alineado con los conceptos de JATS (PLAN.md, sección 3).

## Cómo trabajar en este repositorio
- El usuario escribe en español; responde y redacta el plan y las decisiones en español.
- El código (identificadores) se escribe en inglés. Comentarios del código y mensajes de commit: en inglés si el usuario confirma P23; hasta entonces, pregunta antes de escribirlos.
- Cada decisión importante se documenta en `docs/decisiones/` (qué, por qué y qué se descartó), se añade a su índice y se refleja en este archivo.
- El usuario revisa los documentos con comentarios en archivos `.trmd` (un ZIP con `document.md`, `comments.json` y `manifest.json`): extráelo y lee los comentarios con su texto anclado.
- Actualiza la sección "Estado actual" al terminar cada sesión de trabajo.
- Haz commit solo cuando el usuario lo pida.
