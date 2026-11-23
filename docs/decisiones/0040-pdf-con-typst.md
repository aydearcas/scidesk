# 0040. PDF del manuscrito con Typst

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1). Lleva a la aplicación lo que decidió la ficha [0024](0024-vista-previa-y-pdf-con-typst.md) con el prototipo 4.
- **Pregunta del plan:** fase 1, «exportar DOCX … y PDF con Typst (R30), con el formato que pide Reumatología Clínica» (PLAN.md 5.10 y 8).

## Qué se decide
- **El núcleo escribe la fuente de Typst** (`packages/core/src/typst-export.ts`, `manuscriptTypst`):
  - **El mismo contenido y orden que el DOCX para la revista** (ficha 0033), con las mismas funciones (documento compuesto, numeración de tablas y figuras por primera cita, letras de las notas):
    - títulos en cada idioma;
    - resumen por idioma con sus palabras clave;
    - texto con negrita, cursiva, superíndice y subíndice;
    - listas;
    - tablas con encabezado repetido, celdas combinadas, alineación, anchos relativos, solo líneas horizontales y notas con letras;
    - figuras con su texto alternativo;
    - referencias cruzadas, y la bibliografía donde está el encabezado de referencias.
  - **Las citas y la bibliografía llegan ya formateadas por citeproc-js**, como fragmentos con su formato. Typst no formatea ninguna, así que el PDF y el DOCX dicen lo mismo, con el estilo que tenga el artículo.
  - **El formato del perfil de revista:**
    - interlineado: el «doble» de Word es 1,4 em entre líneas con ascendente y descendente como bordes de la línea, y sin espacio extra entre párrafos, como el DOCX;
    - tamaño, márgenes y páginas numeradas;
    - números de línea si el perfil los pide;
    - justificado y guiones;
    - tablas al final y lista de pies de figura si el perfil lo pide.
  - **Las celdas y las notas van a espacio sencillo**, como en el DOCX.
  - **Fuentes:** la del perfil (por omisión Calibri) seguida de sus equivalentes libres: Carlito para Calibri, Liberation Serif o Tinos para Times New Roman, Liberation Sans o Arimo para Arial (ficha 0011). La última es una de Typst, para que siempre salga algo. Solo se avisa si no está ni la fuente pedida ni sus equivalentes.
  - **Cegado como el DOCX para la revista:** sin autores, ni siquiera en los metadatos (`author: ()`). La portada sigue aparte (ficha 0034).
  - **Escapado** de todo lo que significa algo en Typst (`# $ * _ ` < > @ [ ] ~ " / = + - \`) y de «1.» al principio de un párrafo, que Typst tomaría por una lista.
  - **Una marca invisible por bloque** (`#metadata("b-…") <b-…>`), para que la vista previa sepa en qué página cae cada párrafo cuando llegue.
  - La fecha del documento va en la fuente: la necesita PDF/A.
- **Typst compila en Rust** (`apps/desktop/src-tauri/src/pdf.rs`, Typst 0.15, Apache-2.0):
  - Las fuentes del sistema y las de Typst se cargan una sola vez.
  - Solo se le dan a Typst la fuente y los archivos del paquete (las imágenes de las figuras). No lee nada del disco y no alcanza nada fuera de lo que recibe.
  - PDF etiquetado por omisión, y PDF/UA-1, PDF/A-2a y PDF/A-4 como opciones.
  - **En la ventana:** el comando `compile_pdf` se ejecuta fuera del hilo de la ventana, y el botón «PDF para la revista» guarda el PDF en `exports/<artículo>-revista.pdf`.
  - **En la línea de comandos:** el binario `scidesk-pdf` (en el mismo paquete de Rust) compila un paquete de Typst. `scidesk export --profile pdf [--standard ua-1] [--typst]` lo usa y, con `--typst`, deja también la fuente en `exports/<artículo>-typst/`. Si el binario no está compilado, lo dice y explica cómo compilarlo.
- **En la vista en el navegador** no hay Rust: el botón ofrece la fuente de Typst como enlace.
- **Vite ya no vigila `src-tauri/`.** Cargo bloquea los archivos de `target/` mientras compila, y el vigilante, al fallar, dejaba de ver cambios de la propia página. Esa era la causa de las versiones «a medias» que se vieron al probar las fichas 0038 y 0039.

## Por qué
- **El PDF lo pide la fase 1** para el envío, y el prototipo 4 ya había medido Typst como biblioteca: compila en milisegundos y no depende del motor web, así que sale igual en Windows y en macOS.
- **Generar la fuente en el núcleo y compilar en Rust:** la fuente sale del mismo código que el DOCX, en TypeScript, y Typst está en Rust. El binario de la línea de comandos usa el mismo `pdf.rs` que la ventana, así que lo que se prueba es lo que se usa.
- **Pruebas:**
  - 4 nuevas en el núcleo, 42 en total:
    - el escapado y las fuentes;
    - la demostración: título, citas del estilo, bibliografía, marcas, párrafos con caracteres especiales o que empiezan por «2.», sin autores;
    - el ejemplo de artrosis de rodilla con el formato de Reumatología Clínica: doble espacio, 12 pt, márgenes, resumen en dos idiomas, dos tablas con celdas combinadas y notas, referencia cruzada y lista de pies al final, o la imagen con su texto alternativo si las figuras van en el texto;
    - compilar el ejemplo a PDF, también PDF/UA-1, con el binario. Esta prueba se salta si el binario no está compilado.
  - 2 nuevas de Rust, 6 en total: compilar una fuente con una imagen (PDF, imagen de página, PDF/UA-1 y PDF/A-2a) y no alcanzar archivos que no se le dieron.
  - **Revisado a ojo:** el ejemplo da 18 páginas, 178 KB, sin avisos. Las imágenes de las páginas muestran el título en dos idiomas, el resumen, el doble espacio, la tabla 1 con su encabezado de dos niveles y sus notas, la bibliografía de citeproc-js y la lista de pies.
  - **En la ventana (navegador):** el botón ofrece la fuente de Typst, que es la misma que compila la línea de comandos.

## Qué se descartó
- **Compilar Typst en la interfaz con WebAssembly:** ya descartado en la ficha 0024; con Tauri es más sencillo y rápido en Rust.
- **Que Typst numere tablas, figuras y citas:** el DOCX numera por primera cita y citeproc-js formatea; con dos sistemas podrían no coincidir.
- **Incluir las imágenes tras la lista de pies de figura:** el DOCX para la revista no las incluye, porque las figuras se mandan aparte.
- **Quitar el espacio antes de una cita en superíndice** (regla del prototipo 4): el DOCX no lo hace. Si se quita, se hará en los dos a la vez.

## Consecuencias
- **Prueba pendiente en la ventana real de Tauri:** el comando compila y sus piezas pasan las pruebas, pero el botón solo se ha probado en el navegador.
- **Sigue pendiente de la ficha 0024:**
  - ~~validar con veraPDF los PDF/UA y PDF/A antes de ofrecerlos en la interfaz~~ (quitado del plan, [0080](0080-sin-verapdf.md));
  - probar en un equipo sin Calibri con las fuentes libres incluidas (hoy SciDesk no instala Carlito);
  - vigilar el tamaño del binario.
- **La vista previa paginada** (ficha 0004) puede reutilizar esto: la misma fuente con sus marcas por bloque, un `World` vivo en Rust y la página como imagen.
- **Faltan en el PDF:** imágenes TIFF y EPS (se avisa), notas al pie y ecuaciones, como en el DOCX.
