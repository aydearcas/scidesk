# 0083. Prueba final de la fase 1 con un artículo real, y sus arreglos

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11). La prueba la propuso el plan; el usuario pidió que la hiciera un subagente (Opus, esfuerzo alto) usando el programa, y después que se arreglaran los fallos.
- **Pregunta del plan:** cierre de la fase 1 (PLAN, sección 8).

## Cómo se hizo
- **Quién:** un subagente escribió con SciDesk, en la ventana real de Tauri, un artículo original para Reumatología Clínica a partir del informe de revisión sistemática de dermatomiositis del usuario (privado: no está en el repositorio).
- **Cómo manejó la ventana:** con `apps/desktop/tools/cdp.mjs`, con teclas y clics reales. No tocó el código.
- **Qué hizo, en 13 pasos:**
  - primer arranque y asistente, con 52 referencias sacadas de los campos de EndNote del informe con el prototipo 10;
  - autores ficticios con CRediT;
  - texto, resumen en dos idiomas y citas;
  - una tabla pegada desde Word y otra hecha a mano;
  - corrector, avisos y vista previa;
  - cerrar y reabrir, y recuperar tras matar la ventana;
  - la ronda con un coautor, editada con Word real;
  - Word y PDF para la revista, y portada.
- **El proyecto** se conserva en `Documentos\Prueba fase 1 - Dermatomiositis`, con la ronda y las exportaciones.
- **El informe** del subagente quedó en su carpeta temporal.

## Qué falló y cómo se arregló
1. **«Ir» del panel de avisos desplazaba toda la ventana** y se perdían la barra de título, la cinta y las pestañas, sin forma de recuperarlas.
   - Causa: `scrollIntoView` mueve también los contenedores con `overflow: hidden`, cuando la hoja ya no puede bajar más (cerca del final del texto).
   - Arreglo: `reveal.ts` (`revealIn`, `scrollerOf`) desplaza solo la hoja. Además, «Ir» selecciona el pendiente («XX»…) para escribir encima.
2. **Buscar no llevaba la hoja hasta la coincidencia.**
   - Arreglo: `setFind` y `findStep` la enseñan con `revealIn`, sin quitar el foco de la caja de búsqueda.
3. **Un clic en las palabras clave vacías escribía en el bloque siguiente** (el título del resumen en inglés).
   - No era cosa de las páginas. ProseMirror da ahí una posición entre dos palabras clave, donde no cabe texto, y deja el cursor al navegador, que lo pone en el bloque siguiente.
   - Arreglo: `click-inside.ts` (extensión `ClickInside`). Al pulsar el ratón, si el cursor caería fuera del bloque pulsado o donde no cabe texto, se pone dentro: al final si se pulsa a la derecha o debajo, al principio si no.
4. **El botón «Guardar autores» era blanco sobre blanco:** una regla más específica le quitaba el color. Arreglado igualando la especificidad.
5. **«Deshacer el pegado» dejaba la tabla en «Sin colocar en el texto».**
   - Ahora se borra también su archivo: lo había creado el pegado.
   - Para eso hay `ProjectFs.remove`, con su comando de Rust `remove_file`: solo archivos dentro del proyecto abierto, nunca carpetas ni enlaces.
   - En el núcleo, `discardPastedPart`.
   - Si se rehace con Ctrl+Y, el archivo se vuelve a escribir al guardar.
   - Quitar una tabla del texto de cualquier otra forma sigue conservando su archivo (regla 4 de la ficha 0021).
6. **En el PDF, las columnas de una tabla ancha se montaban** (la GRADE, de 13 columnas y sin anchos guardados).
   - Causa: sin anchos, Typst repartía las columnas según su contenido y la tabla se salía de la página.
   - Arreglo:
     - una tabla de 7 columnas o más sin anchos propios se reparte en columnas iguales;
     - con poco sitio por columna, la letra baja al 80 % o al 70 %, con guiones al partir palabras y menos margen en las celdas.
   - El PDF de la prueba pasa de 13 a 12 páginas y la tabla se lee bien.
7. **Detalles:**
   - Los avisos del núcleo que ve el usuario (pendientes al exportar, tabla pegada sin «Tabla N.», tablas sin título al importar) salen en el idioma de la interfaz (`coreWarning` en `App.tsx`); el núcleo los sigue escribiendo en inglés para la línea de órdenes.
   - La portada ya no lleva el encabezado «Conflictos de interés» vacío cuando nadie ha declarado nada; queda el aviso.
   - El nombre de un proyecto nuevo es el nombre de su carpeta, no el título cortado a mitad de palabra. Desde Word, el título se corta por una palabra, con «…» (`shortTitle`).
   - «;» empieza la palabra clave siguiente, como Intro, y no deja el espacio que se escribe detrás.

Pruebas nuevas: tres del editor con Playwright (el clic en las palabras clave vacías, «Ir» y «;»), y en el núcleo, la del descarte de la tabla pegada, la de la tabla ancha en Typst y la del recorte del título.

## Qué queda, sin arreglar
- **Faltas de funciones:**
  - aceptar o rechazar las propuestas de un coautor (fase 2);
  - poner una tabla en horizontal;
  - atajos para los títulos;
  - ignorar a la vez todos los avisos «no se cita»;
  - las contribuciones CRediT en la portada.
- **Cosas que molestan:**
  - el asistente no cabe en una ventana de portátil (1200 × 820);
  - «Ajustar al ancho» baja al 50 % con el panel derecho abierto;
  - la cita rápida ordena los resultados alfabéticamente, no por el primer autor;
  - al pegar desde Word, las notas a, b y c llegan como una sola;
  - Retroceso tras una lista añade un elemento vacío.
- **Así lo da el estilo:** la página de una cita sale como «7(p1490)», que es como la da el estilo de la revista con números en superíndice.
- **El proyecto de la prueba** sigue llamándose como su título cortado: se creó antes del arreglo.
