# 0024. Vista previa y PDF con Typst como biblioteca de Rust

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 4 de la fase 0). Confirma [0004](0004-texto-continuo-con-vista-previa.md) y R30.
- **Pregunta del plan:** R30 (prototipo 4 de la sección 8)

## Qué se decide
- **La vista previa paginada y el PDF se hacen con Typst 0.15 integrado como biblioteca en el núcleo de Rust** (crates `typst`, `typst-pdf`, `typst-render` y `typst-kit`, todos Apache-2.0).
- **El núcleo mantiene un `World` vivo durante la sesión.** Cada vez que el documento cambia, el exportador entrega la fuente de Typst regenerada (`Source::replace`) y Typst recompila solo lo que cambió.
- **La vista previa muestra la página donde está el cursor**, dibujada como imagen. Cada párrafo lleva una marca invisible con su identificador de bloque, y el *introspector* de Typst da su página y su posición para sincronizar la vista previa con el editor y para la lista EQUATOR.
- **Las citas y la bibliografía llegan a Typst ya formateadas por citeproc-js.** Typst no formatea citas.
- **El exportador a Typst** escapa todos los caracteres con significado en Typst, quita el espacio antes de las citas en superíndice, usa el separador «Tabla 1.», pone la fecha del documento y escribe la bibliografía como la entrega citeproc-js.
- **PDF etiquetado por defecto,** con PDF/UA-1 y PDF/A (2a o 4) como opciones de exportación.

## Por qué
- **Compila de forma incremental muy por debajo de lo que necesita una vista previa.** Con un artículo real de tamaño (3.229 palabras, 13 páginas, dos tablas, 37 referencias):
  - Recompilar tras escribir un carácter tarda 8–10 ms; si se entrega la fuente entera regenerada, 10–11 ms.
  - Dibujar la página tarda 8 ms y el PDF, 6–7 ms.
  
  Con 9.700 palabras (31 páginas), recompilar sube a 24–34 ms.
- **Cumple el formato de manuscrito:** números de línea por página, páginas numeradas, interlineado amplio, tablas con celdas combinadas y notas, y citas en superíndice del estilo de la revista.
- **Genera PDF/UA-1 y PDF/A sin trabajo extra**, más allá de la fecha del documento.
- **No depende del motor web:** el resultado es el mismo en Windows y en macOS. Es la primera de las tres condiciones para mantener Tauri (R37, [0010](0010-pila-tecnologica.md)), que queda cumplida junto con el corrector en WebAssembly ([0023](0023-corrector-ortografico.md)).

## Qué se descartó
- **paged.js** para la vista previa (ya descartado en R30): depende del motor web.
- **El sistema de bibliografía de Typst** (hayagriva): la referencia para el formato es citeproc-js, y el PDF y el DOCX tienen que coincidir.
- **Compilar Typst en la interfaz** con su versión WebAssembly: es la alternativa si se pasara a Electron, pero con Tauri es más sencillo y rápido en Rust.

## Consecuencias
- **Corte vertical de la fase 1:** medir el camino completo de una tecla a la página nueva en pantalla, con un exportador a Typst incremental que reutilice las citas ya formateadas.
- ~~**Validar con veraPDF** los PDF/UA y PDF/A antes de ofrecerlos.~~ Quitado del plan el 23/11/2026 ([0080](0080-sin-verapdf.md)).
- **Fuentes:** probar en un equipo sin Calibri, con las fuentes libres incluidas ([0011](0011-fuentes-tipograficas.md)), y vigilar el tamaño del binario, que es de 48 MB sin optimizar.
- **La caché de memoización** de Typst se vacía periódicamente en sesiones largas.
- **Quedan por probar** figuras con imagen, notas al pie, ecuaciones y la portada aparte.
- **Para el prototipo 2:** comprobar el estilo de *Reumatología Clínica* (una capa de 2012 sobre «NLM con superíndice») y la licencia real de citeproc-js, que npm declara como «CPAL-1.0 OR AGPL-1.0».
- Detalle y cifras en [`prototypes/04-typst-preview/README.md`](../../prototypes/04-typst-preview/README.md).
