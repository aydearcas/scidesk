# 0010. Pila tecnológica

- **Fecha:** 20/11/2026
- **Estado:** aceptada y confirmada por los prototipos de la fase 0; **Tauri confirmado frente a Electron** ([0030](0030-tauri-confirmado.md)). Actualizada el 21/11/2026 con la revisión de la v0.4 (R29 a R35, R37 y R38) con el prototipo 7 ([0020](0020-control-de-cambios.md)) con el prototipo 3 ([0025](0025-docx-con-marcas-y-campos.md)) y con el prototipo 2 ([0026](0026-citas-con-citeproc-js.md)).
- **Pregunta del plan:** P18

## Qué se decide
Tauri 2 (Rust) para la aplicación de escritorio, React + TypeScript + Vite para la interfaz, ProseMirror (vía Tiptap, solo piezas libres) como editor, citeproc-js como motor de citas y la biblioteca `docx` más un traductor propio para exportar a Word. El detalle está en PLAN.md, 6.1.

Lo que la v0.4 dejaba por decidir y la revisión ha fijado:
- **Tauri se mantiene con tres condiciones** (R37); si falla alguna, se pasa a Electron al final de la fase 0. **Se cumplen las tres** (prototipo 11, [0030](0030-tauri-confirmado.md)):
  1. Lo que más cambia entre motores web no depende del motor: corrector propio y PDF con Typst.
  2. El pegado de tablas y la edición básica se prueban en el MacBook en la fase 0.
  3. Las pruebas del editor se ejecutan a diario también sobre WebKit (el de Playwright funciona en Windows).
- **Corrector ortográfico propio** (R29) con diccionarios de Hunspell y subrayados dibujados por el editor. Motor: **`spellbook` (Rust, MPL-2.0) compilado a WebAssembly en un *web worker***, elegido con el prototipo 9 ([0023](0023-corrector-ortografico.md)); coincide con Hunspell en 13.217 palabras salvo una.
- **PDF y vista previa con Typst** (R30), con las citas ya formateadas por citeproc-js ([0004](0004-texto-continuo-con-vista-previa.md)).
- **Comentarios y control de cambios: implementación propia** sobre una pieza libre (R31). **El prototipo 7 eligió `@handlewithcare/prosemirror-suggest-changes`** (MIT), en una copia propia, con los cambios como marcas con `id` y un registro de autores en `.scidoc` ([0020](0020-control-de-cambios.md)); se descartó `@manuscripts/track-changes-plugin` (Apache-2.0).
- **Documento compuesto** al cargar y repartido al guardar (R32, [0006](0006-estructura-del-proyecto.md)).
- **Núcleo sin interfaz** en TypeScript, con una **línea de comandos** (`scidesk export`, `scidesk check`) sobre él (R33).
- **Un solo esquema por formato**, que genera tipos, validación y JSON Schema; el `.scidoc` es el JSON de ProseMirror tal cual (R34).
- **DOCX** con plantilla de referencia, validación contra el esquema de OOXML, prueba local con Word real y prueba de ida y vuelta (R35). **El prototipo 3 confirmó la biblioteca `docx`**, con los campos complejos escritos como fragmentos de OOXML propios y los estilos de la plantilla buscados por su nombre interno ([0025](0025-docx-con-marcas-y-campos.md)).
- **Rendimiento y seguridad desde el primer día** (R38): citas y referencias cruzadas como nodos sencillos, no componentes de React; comprobaciones como funciones puras fuera del hilo de la interfaz; política de contenido estricta, permisos de Tauri limitados a la carpeta del proyecto, SVG solo como imagen y lectura de ZIP y XML protegida.

## Por qué
- Tauri es seguro por diseño, con acceso nativo a archivos en Windows y macOS, y lleva Typst y el código en Rust de forma directa. El tamaño del instalador, que era el argumento principal de la v0.4, importa poco en un procesador de texto. Su coste oculto es que en macOS el editor corre sobre WebKit y no sobre el Chromium de Windows; las tres condiciones lo acotan.
- React tiene el ecosistema más grande y el que mejor se integra con el editor.
- ProseMirror es el estándar para documentos estructurados (nodos propios, tablas complejas) y tiene integración madura con Yjs para la edición simultánea futura. En Tiptap, los comentarios, el control de cambios y la conversión a DOCX son extensiones de pago, así que se hacen aparte.
- citeproc-js es la implementación de referencia de CSL. El prototipo 2 confirmó que renumera en vivo en unos 2 ms con 50 referencias; se incluye desde su repositorio en un commit fijo ([0026](0026-citas-con-citeproc-js.md)).
- El corrector del motor web no admite idioma por fragmento ni diccionario del proyecto, y se comporta distinto en cada sistema.
- El control de cambios es la función más difícil de un editor y determina cómo se guardan los cambios en `.scidoc`; no se cierra el esquema sin probarlo.
- Un núcleo sin interfaz permite ejecutar las pruebas del corpus en segundos, que herramientas externas trabajen con un proyecto sin meter IA en el programa, y es la base del servidor de la fase 5.

## Qué se descartó
- Electron, por ahora: más homogéneo entre sistemas, pero más pesado y con más superficie de seguridad. Es la alternativa si falla alguna de las tres condiciones.
- Lexical, Slate, CKEditor 5 u ONLYOFFICE como editor.
- Las extensiones de pago de Tiptap.
- Pandoc en el núcleo (licencia GPL y menos control).
- paged.js para el PDF y la vista previa.
- El corrector del motor web y nspell, que va justo de memoria y velocidad con el diccionario español.
- Una capa de traducción entre el JSON de ProseMirror y el `.scidoc`: daría un formato más limpio a cambio de más código y más errores posibles.

## Consecuencias
- Ninguna pieza de la pila es incompatible con la licencia elegida, y no se usa código GPL ni AGPL de terceros ([0012](0012-licencia-agpl.md), PLAN.md, 6.3).
- Las bibliotecas jóvenes (control de cambios, corrector) van detrás de una interfaz propia, como el motor de citas, para poder cambiarlas.
- Los once prototipos de la fase 0 confirman o corrigen esta decisión (PLAN.md, 8). Hechos: el 7 (control de cambios, [0020](0020-control-de-cambios.md)) y el 8 (documento compuesto, [0021](0021-documento-compuesto.md)), que confirma Tiptap 3: su enganche `dispatchTransaction` sirve para el modo de sugerencias; y el 1 (pegar tablas de Word, [0022](0022-pegar-tablas-de-word.md)), que confirma el analizador de ProseMirror con un limpiador propio del HTML de Office; y el 9 (corrector, [0023](0023-corrector-ortografico.md)), que elige spellbook compilado a WebAssembly en un *worker*; y el 4 (Typst, [0024](0024-vista-previa-y-pdf-con-typst.md)), que confirma Typst como biblioteca de Rust. Con el 9 y el 4 se cumple la primera de las tres condiciones de Tauri; la segunda depende del prototipo 11 en el MacBook.
