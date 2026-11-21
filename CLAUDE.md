# SciDesk

Procesador de texto de escritorio para escribir artículos científicos, con lógica de proyecto al estilo de VS Code: carpeta con la estructura del artículo, autores, carta de presentación, contribuciones CRediT, figuras, tablas y gestión de referencias con estilos CSL.

Antes se llamaba `nobs-papers`; el proyecto se trasladó a esta carpeta el 20 de noviembre de 2026. Su nombre de trabajo fue SciScribe hasta el 20 de noviembre de 2026, cuando se cambió a SciDesk porque ya existe un producto con ese nombre en el mismo sector (decisión 0016). La carpeta del repositorio sigue llamándose `sciscribe`.

## Estado actual (21 de noviembre de 2026)
- Fase: planificación. Todavía no hay código.
- El plan de desarrollo está en `PLAN.md` (borrador v0.5). Incorpora la revisión de la v0.4 (`docs/revision-plan-v0.4.md`, R1 a R45) con los comentarios del usuario; el resultado de cada propuesta está en la sección 0 de esa revisión. Las que no tenían comentario (R41 a R44, el tablero de R5 y parte de R45) las confirmó el usuario el 21 de noviembre.
- Todas las preguntas del plan (P1 a P24) están contestadas. El siguiente paso es la fase 0: reservar dominios y nombres, hacer los once prototipos de riesgo y especificar los formatos con un solo esquema.
- **Pendiente de que el usuario la revise:** una propuesta de interfaz en `docs/interfaz/diseno-interfaz.md`, con ocho decisiones abiertas (D1 a D8). La maqueta está en un lienzo de diseño privado, <https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x>, con siete láminas (escribir, fusión de revisiones, revista y envío, biblioteca, autores y CRediT, cita rápida y estilo visual). Hay una captura de cada lámina en `docs/interfaz/capturas/`. La maqueta se comprobó solo en local (renderizada con Edge), no dentro del lienzo. Faltan las láminas de respuesta a revisores, inicio y tabla en su pestaña. **Hay que ajustarla a la v0.5:** muestra funciones que la revisión ha descartado o aplazado (recortes y "mover a recortes", aprobación de la versión final por los coautores y envíos anteriores o bitácora), y la hoja de envío pasa a prioridad baja.
- Decisiones tomadas (fichas en `docs/decisiones/`):
  - Código abierto público con posible versión de pago. Licencia AGPL-3.0 con acuerdo de contribución (CLA).
  - Windows y macOS; se desarrolla primero en Windows. El pegado de tablas y la edición básica se prueban en el MacBook Air ya en la fase 0, y las pruebas del editor se ejecutan a diario también en WebKit. Firma del instalador de Windows: por ahora, como el software libre habitual (sin certificado comercial).
  - Primero biomedicina y clínica, en español e inglés; después, cualquier disciplina. Ecuaciones con la ampliación.
  - Interfaz en español e inglés, seleccionable. Código, comentarios del código y mensajes de commit en inglés. Dos esquemas de atajos ("Word en español" e "Internacional"), cambiables en Ajustes; ningún atajo con Ctrl+Alt.
  - Nombres de carpeta y archivo fijos en el disco y en inglés (`references/`, `people/`, `articles/main/`, `tables/`, `figures/`…), con etiquetas traducidas en el programa (P24). Los nombres que salen del contenido (proyecto, tablas) siguen en el idioma del usuario. A la izquierda, un navegador por conceptos, no el árbol de archivos.
  - Coautores con Word por correo; varios revisan en paralelo, así que fusionar las copias devueltas es el núcleo de la fase 2, que se divide en 2a (una copia) y 2b (la ronda completa). La fusión es a tres bandas (lo enviado, tu copia actual y cada copia devuelta), con marcas del DOCX especificadas, plan B cuando se pierden y filtro de ruido. La edición simultánea, más adelante.
  - Un único mecanismo de propuestas para todo lo que entra de fuera (coautores, LLM, copias en conflicto, versiones antiguas): un LLM es un coautor más.
  - Se puede empezar un artículo a partir de un Word existente (básico en el MVP; citas de Zotero, Mendeley y EndNote en la fase 2).
  - Texto continuo + vista previa paginada. Vista previa y PDF con Typst (no coinciden con la paginación de Word).
  - Cada tabla y figura en su archivo, editables también desde el documento completo mediante un documento compuesto al cargar y repartido al guardar. Notas de tabla como objetos. Resumen y palabras clave en un documento propio.
  - Referencias: biblioteca propia ampliable o vinculada a Zotero (EndNote y Mendeley después). Consultas a Crossref y PubMed opcionales y explicadas, con verificación de referencias y búsqueda en PubMed desde el buscador de citas.
  - Comprobaciones sin IA: coherencia de cifras, manuscrito cegado, pendientes, tres niveles de aviso y avisos que se pueden ignorar (panel mínimo en el MVP).
  - Revista de prueba: Reumatología Clínica (también su estilo de cita).
  - Perfiles de revista bajo demanda: estilo y datos de la revista de fuentes abiertas; el resto, con un paquete para LLM al elegir una revista sin perfil, y catálogo público que crece con el uso.
  - Historial de versiones con instantáneas propias (un archivo por instantánea, que solo se añade), no con git. En la carpeta del proyecto solo viaja el historial; la caché y el estado de la ventana van a la carpeta de datos de la aplicación. Cada exportación a DOCX guarda una instantánea desde la fase 1. Escritura atómica con recuperación tras un cierre inesperado.
  - Todas las fuentes típicas de Word y Roboto: fuentes del sistema más equivalentes libres.
  - Por ahora, sin IA en el programa. El módulo de adaptación a revista solo aplica formato y requisitos. Más adelante habrá una versión con IA, cuyas funciones principales serán ayudar en la redacción, corregirla y traducir (también revisar rasgos típicos de texto generado con IA).
  - Paquetes para LLM (el usuario los procesa fuera del programa) con cuatro niveles de confidencialidad; por defecto, solo los niveles 0 y 1.
  - Sin conexión con revsis-app ni PICO Creator por ahora.
  - Pila: Tauri 2 + React + TypeScript + Tiptap/ProseMirror, citeproc-js y exportación DOCX con la biblioteca `docx` y plantilla de referencia (a confirmar con los once prototipos de la fase 0). Tauri se mantiene con tres condiciones; si falla alguna, Electron. Corrector ortográfico propio con diccionarios de Hunspell, control de cambios propio sobre una pieza libre, núcleo sin interfaz con línea de comandos y un solo esquema por formato. El `.scidoc` es el JSON de ProseMirror tal cual.
  - No se usa código GPL ni AGPL de terceros, para no cerrar la licencia dual.
  - Descartado o aplazado en la revisión de la v0.4: devolver a los coautores lo hecho con sus propuestas, aprobación final en el programa, ayudas para recortar, recortes y bloques que no se exportan, nota de apoyo por cita, estudio del trabajo previo y prueba en un PC de hospital. Para más adelante: resumen bilingüe lado a lado y bitácora de envíos.
  - Nombre: SciDesk. Extensiones: `.scidesk` (manifiesto del proyecto y carpeta oculta), `.scidoc` (documentos) y `.scitable` (tablas).
  - Un proyecto puede tener varios artículos (formato preparado desde el principio, MVP con uno). Biblioteca y directorio de personas comunes; cada artículo elige quién firma. Tablas y figuras se copian entre artículos. Sin biblioteca global.
- Pendiente del usuario: reservar scidesk.app, scidesk.dev y los nombres en GitHub, npm y crates.io.
- Formato propuesto del artículo: JSON propio `.scidoc`, versionado y alineado con los conceptos de JATS (PLAN.md, sección 3).

## Cómo trabajar en este repositorio
- El usuario escribe en español; responde y redacta el plan y las decisiones en español.
- El código (identificadores y comentarios) y los mensajes de commit se escriben en inglés.
- Cada decisión importante se documenta en `docs/decisiones/` (qué, por qué y qué se descartó), se añade a su índice y se refleja en este archivo.
- El usuario revisa los documentos con comentarios en archivos `.trmd` (un ZIP con `document.md`, `comments.json` y `manifest.json`): extráelo y lee los comentarios con su texto anclado.
- Actualiza la sección "Estado actual" al terminar cada sesión de trabajo.
- Haz commit solo cuando el usuario lo pida.
