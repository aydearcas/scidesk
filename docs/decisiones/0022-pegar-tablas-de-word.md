# 0022. Pegar tablas de Word: limpiador de HTML de Office y citas del portapapeles

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 1 de la fase 0, confirmado con Ctrl+V real; repetido en el Mac con el prototipo 11). La parte de formato de celda se cerró al especificar `.scitable` ([0031](0031-formatos-v1-con-un-solo-esquema.md)): alineación por celda y anchos relativos de las columnas.
- **Pregunta del plan:** riesgo 7.1 y R23 (prototipo 1 de la sección 8)

## Qué se decide
- **El pegado desde Word usa el analizador de HTML de ProseMirror con un limpiador propio del HTML de Office** delante, como `transformPastedHTML` de Tiptap. El limpiador:
  1. Convierte a Unicode los caracteres de las fuentes de símbolos (Wingdings, Wingdings 2, Symbol).
  2. Quita el guion o el número de las listas de Word, que llegan como texto, y convierte esos párrafos en listas.
  3. Marca como encabezado las filas que Word repite en cada página (`<thead>`).
  4. Convierte una tabla anidada en un párrafo por fila, conservando el formato.
  5. Descarta todo lo que no esté en el `<body>`, que lleva rutas locales del equipo y del documento de origen.
- **Lo que se conserva de una tabla pegada:** la estructura (celdas combinadas), el texto, los párrafos y las listas de cada celda, la negrita, la cursiva, el superíndice y el subíndice, y las filas de encabezado.
- **Propuesta para `.scitable`:**
  - Conservar también la alineación horizontal de cada celda y los anchos relativos de las columnas.
  - Descartar bordes, sombreado, fuentes y tamaños, que pone el estilo de la revista. Descartarlos no es una pérdida: una tabla de revista no los lleva.
- **Citas al pegar desde Word:**
  - Se leen los campos que vienen en los comentarios condicionales del HTML (`<!--[if supportFields]>`).
  - Para las citas de EndNote que guardan sus datos aparte (`EN.CITE.DATA`), se lee también el RTF del portapapeles.
  - Si no se encuentra el registro, se busca en la biblioteca por el texto de la cita. El lector de los campos es el mismo que el de importar un Word (prototipo 10).

## Por qué
- **Con el limpiador, las 135 tablas de un informe real del usuario quedan bien.** Son unas 10.800 celdas, con celdas combinadas en casi todas, superíndices, sombreado, filas de encabezado, símbolos y una tabla anidada. Sin limpiador quedan 83.
- **La estructura llega intacta siempre.** Los fallos sin limpiador son concretos y se corrigen en el limpiador: una «P» donde Word muestra ✓, «- » delante del texto de una lista, filas de encabezado sin marcar y la tabla anidada.
- **Pegar es rápido:** 8 ms de mediana y 76 ms la tabla mayor.
- **Con Ctrl+V real** (pegado a mano en Chromium, el motor de WebView2), las cuatro tablas más difíciles quedan igual de bien. El evento de pegado entrega también `text/rtf`.
- **El portapapeles sí lleva las citas, pero no todas en el HTML.** De 16 citas de EndNote, el HTML trae el campo de las 16 pero el registro completo de solo 6. El RTF los trae todos.

## Qué se descartó
- **Pegar el HTML de Word sin limpiar:** 52 de 135 tablas con fallos.
- **mammoth.js o un conversor genérico de HTML a texto:** pierden celdas combinadas o formato a propósito.
- **Leer solo el HTML para las citas:** se pierden 10 de cada 16 registros de EndNote.
- **Reproducir los bordes y el sombreado de Word:** no tienen sitio en una tabla de revista y complicarían el esquema.

## Consecuencias
- **El RTF llega en el propio evento de pegado** (`text/rtf`), así que el limpiador y el lector de citas pueden trabajar en la interfaz, sin leer el portapapeles desde Rust. Falta comprobarlo en WKWebView.
- **WebKit y Word para Mac** (prototipo 11, [0030](0030-tauri-confirmado.md)):
  - 10 de 12 tablas quedan perfectas.
  - El limpiador reconoce también los símbolos de Wingdings en el bloque privado de Unicode y descarta las marcas `<o:p>`. Windows sigue en 135/135.
  - Safari pierde dos espacios al reescribir el HTML de Word: se reponen contrastando con el `text/plain`.
  - **Safari no entrega `text/rtf`, ni los campos de las citas:** las citas de EndNote pegadas llegan solo como texto. En el Mac se necesita el portapapeles nativo desde Rust (fase 1) o tratarlas como citas escritas a mano (R24).
- **Fase 1:**
  - Al pegar pie, tabla y notas juntos, crear una tabla de SciDesk con su pie y sus notas como objetos (R11).
  - Recuperar las citas de los campos.
  - Pasar el centrado de Word (`align=center`) a la alineación de la celda.
- El HTML del portapapeles lleva la ruta del documento de origen: nunca se guarda ni se envía a ningún sitio.
- Detalle, recuentos y cómo se midió, en [`prototypes/01-paste-word-tables/README.md`](../../prototypes/01-paste-word-tables/README.md).
