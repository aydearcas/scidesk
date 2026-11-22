# 0058. Vista previa paginada con Typst

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise). Lleva a la ventana lo que decidió la ficha 0024 (prototipo 4) y usa la fuente de Typst de la ficha 0040.
- **Pregunta del plan:** R30; propuesta de interfaz 4.7 («Vista previa»).

## Qué se decide
- **Un botón en la fila de pestañas** (y Ver › Vista previa) abre la vista previa al lado del editor, en el 42 % del ancho (entre 300 y 720 px). Queda abierta o cerrada en los ajustes del equipo (`preview`).
- **Enseña el PDF para la revista tal como lo compone Typst**, con la misma fuente que «PDF para la revista» (ficha 0040):
  - cegado;
  - formato del perfil;
  - citas de citeproc-js.
  Lo compone con **lo que hay en pantalla, guardado o no**: `manuscriptTypst` acepta `live`, como las comprobaciones.
- **Una nota fija** dice: «Como el PDF para la revista. La paginación en Word puede variar».
- **En Rust** (`src-tauri/src/preview.rs`), un `World` de Typst que vive toda la sesión:
  - cada cambio sustituye el texto de su único archivo (`Source::replace`), así que Typst solo vuelve a maquetar lo que cambió;
  - las imágenes de las figuras solo se envían cuando cambian;
  - una fuente que no compila deja en pantalla las últimas páginas buenas, con el error.
  - **Comandos:** `preview_compile` devuelve las páginas, el tamaño de cada una y dónde empieza cada bloque. `preview_page` devuelve una página como PNG, a la resolución de la pantalla y al ancho del panel. Los dos se ejecutan fuera del hilo de la ventana.
- **Cuándo se compone:** después de cada pausa al escribir, cuando la ventana ya recalcula las comprobaciones (200 ms). Una composición a la vez; si llega otra mientras tanto, se hace una más al terminar. Solo se dibujan las páginas que están a la vista, con un margen.
- **Ida y vuelta con el editor**, gracias a la marca invisible de cada bloque (`<b-…>`, ficha 0040), que da su página y su altura:
  - **un clic en una página** lleva el editor al último párrafo que empieza por encima del punto;
  - **la página del párrafo con el cursor** se marca con el color de acento y se trae a la vista si no lo está.
- **En la vista del navegador** no hay Rust: el panel dice que la vista previa la compone Typst en la ventana de escritorio.

## Por qué
- **Es lo siguiente de la fase 1**, y el usuario la quiere para ver el manuscrito como lo verá la revista, mientras el editor conserva su propio aspecto (fichas 0046 y 0049).
- **Un `World` vivo y `Source::replace`:** es lo que el prototipo 4 midió como incremental.
- **PNG y no SVG:** el renderizador ya estaba en el proyecto (`typst-render`, para las pruebas), y una imagen por página es sencilla de mostrar y de escalar.

## Qué se descartó
- **Recompilar en cada tecla:** la ventana ya espera una pausa para las comprobaciones, y la vista previa no necesita ir más deprisa que eso.
- **Mostrar solo la página del cursor**, como decía la ficha 0024: con el panel al lado se ven varias a la vez, y la del cursor queda marcada.

## Consecuencias
- **Medidas:**

  | Qué | Tiempo |
  |---|---|
  | Componer tras una edición, compilación optimizada, artículo de ejemplo de 17 páginas (`timing`, con `PREVIEW_BENCH`) | ~5 ms |
  | Primera composición (carga de las fuentes del sistema) | ~1 s |
  | Dibujar una página a 2 px/pt | ~20 ms |
  | Componer en `tauri dev`, sin optimizar, con el artículo de demostración alargado a 5 páginas | 60–270 ms |

  Lo último es de la compilación de desarrollo. Si molesta al probar, se puede compilar optimizado el código de Typst en desarrollo (`[profile.dev.package."*"] opt-level = 2`), a cambio de una primera compilación más larga.
- **Probado en la ventana real de Tauri** con la demostración:
  - se compone y dibuja;
  - el número de páginas sigue al texto que se escribe;
  - un clic en la página 1 lleva a «Introducción»;
  - el cursor en «Bibliografía» marca la página 2.
- **Probado en la vista del navegador:** el aviso de que no está disponible.
- **Pruebas nuevas:**
  - 3 de Rust: páginas, tamaños y bloques; una fuente rota no borra las páginas; solo ids de bloque;
  - una medida que no se ejecuta por defecto (`timing`);
  - una del núcleo: la fuente con `live`.
- **Pendiente:**
  - números de línea si el perfil los pide (ya los pone el PDF; comprobar que se ven bien en el panel);
  - poner el editor y la vista previa lado a lado como dos pestañas cualesquiera (propuesta de interfaz 4.1);
  - la vista previa en WebKit (Mac), que no se ha probado;
  - medir con el documento de 369 páginas.
