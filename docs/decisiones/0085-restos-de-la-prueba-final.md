# 0085. Los restos de la prueba final de la fase 1, y las páginas horizontales

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11). El usuario pidió hacer los restos de la ficha 0083 antes de la fase 2, con tres matices:
  - las contribuciones CRediT en la portada, como opción desactivada por defecto;
  - el asistente, para una pantalla de 1366 × 768;
  - poner en horizontal no solo una tabla, sino cualquier página o varias a la vez, y que sea más fácil que en Word.
- **Pregunta del plan:** cierre de la fase 1 (PLAN, sección 8).

## Qué se hizo

### Páginas horizontales (petición del usuario)
- **El modelo.** Cada bloque del cuerpo puede llevar `landscape: true`: párrafo, título de sección, lista, cita en bloque, salto de página, y una tabla o figura en su sitio del texto.
  - Los bloques seguidos que lo llevan comparten sus páginas horizontales, que empiezan y acaban en página nueva.
  - No hay saltos de sección que poner ni quitar. Lo horizontal va con el contenido: mover una tabla horizontal la mueve con su orientación.
  - En la tabla o la figura, el dato es de su sitio en el texto (`tableRef`/`figureRef`), no de su archivo: `composeArticle` lo pasa a la parte, `splitArticle` lo devuelve al sitio, y la pestaña de una tabla sin colocar no lo escribe en el `.scitable`.
  - Esquemas regenerados (atributo opcional).
- **Cómo se decide** (`apps/desktop/src/landscape.ts`):
  - «Página horizontal» marcable en el clic derecho del texto. Se aplica a todos los bloques que toca la selección, así que varias páginas a la vez son una selección.
  - «Tabla en página horizontal» y «Figura en página horizontal» en su clic derecho y en su menú del navegador.
  - Insertar › Página horizontal.
  - Un selector «Vertical/Horizontal» en la barra de estado, que dice cómo está lo del cursor.
  - Todo es un paso de deshacer.
- **En el editor:**
  - Las hojas siguen siendo verticales, porque las páginas son columnas CSS de un solo ancho.
  - Lo horizontal empieza y acaba en hoja nueva, con un tinte, una barra en el margen y la etiqueta «Página horizontal» al principio (decoraciones, también sobre las vistas de las partes).
  - La vista previa, el PDF y el Word lo enseñan en horizontal.
- **En el Word:**
  - Una sección por tramo de una orientación, cada una en página nueva, con el mismo pie, márgenes y números de línea; los números de página siguen.
  - Las tablas y figuras de una página horizontal toman el ancho del texto horizontal.
  - Si la revista pide las tablas al final, cada tabla horizontal lleva su sección allí.
  - Comprobado con Word real: la tabla va en su página horizontal con todo el ancho. La copia devuelta vuelve sin propuestas.
- **En el PDF:** `#set page(flipped: …)` en cada cambio. Comprobado compilando con Typst: la tabla y el párrafo en sus páginas horizontales.

### Los demás restos de la prueba
1. **Retroceso tras una lista** (`list-backspace.ts`).
   - Antes: `joinBackward` metía el párrafo en un elemento nuevo de la lista.
   - Ahora, como en Word: el texto del párrafo pasa al final del último elemento (al más hondo, si hay listas anidadas), y un párrafo vacío desaparece.
2. **Notas a, b y c al pegar desde Word** (`splitNotes` en `paste-table.ts`).
   - Word escribe a menudo todas las notas en un párrafo («a. … b. … c. …»), o con saltos de línea que llegan como espacios.
   - Una letra empieza nota nueva cuando:
     - es la siguiente en orden;
     - va detrás de un final de frase o de un espacio ancho;
     - si va escrita como texto (no en superíndice), alguna celda la llama.
   - Las llamadas escritas juntas en un superíndice («a,b,c») pasan a una llamada por letra, con las comas.
   - El texto de delante de la primera letra queda como nota general.
3. **Orden de la cita rápida** (`searchLibrary`): el apellido del primer autor pesa más que el de un coautor, y a igual peso va antes quien firma más arriba. «García» enseña primero los artículos de García.
4. **Ignorar todos los «no se cita».**
   - Con dos o más avisos del mismo tipo (referencias, tablas o figuras sin citar), una fila al principio de su grupo los marca todos como «es correcto» o «no aplica», con su nota y en una sola escritura.
   - `ignoreWarning` acepta varios identificadores.
5. **CRediT en la portada.**
   - Casilla «Poner las contribuciones en la portada» en la pestaña CRediT de Autores.
   - Desactivada por defecto: `creditOnTitlePage` en `authors.json`, opcional; esquema regenerado.
   - Con ella marcada, la portada lleva «Contribuciones de los autores (CRediT)» con los roles de cada autor y su grado.
6. **Atajos de los títulos.**
   - Ctrl+1, Ctrl+2 y Ctrl+3 para los títulos 1 a 3, y Ctrl+0 para volver a párrafo, en los dos esquemas.
   - Word usa Ctrl+Alt+1…, que en un teclado español es AltGr.
   - Se quitan los Ctrl+Alt propios de Tiptap.
   - Se ven en el selector de estilo de la cinta y en Ajustes.
7. **El asistente en un portátil.**
   - Cabe en 1366 × 768: la cabecera y los botones quedan siempre a la vista, y el centro y «Lo que se va a crear» se desplazan por dentro.
   - En Tauri, si la ventana (1200 × 820) no cabe en la pantalla, se abre maximizada.
8. **«Ajustar al ancho» con el panel derecho.**
   - Con poco sitio, ajusta el texto y 1 cm de cada margen (como «Ancho del texto» de Word), hasta el 100 %. El resto de los márgenes se corta igual por los dos lados.
   - Con el panel derecho abierto: a 1200 px pasa del 60 % al 70 %, y a 1366 px, del 81 % al 95 %.
   - Si ni el texto cabe, la hoja se desplaza de lado como antes.

## Pruebas
- **Nuevas:**
  - Vitest: Retroceso tras una lista, las notas partidas y las llamadas juntas, el orden de la cita rápida, ignorar varios avisos, CRediT en la portada, los atajos de títulos y las páginas horizontales en el editor.
  - Núcleo: documento compuesto, secciones del Word, copia devuelta sin propuestas y fuente de Typst.
  - Playwright: Ctrl+2 / Ctrl+0 y Retroceso tras una lista.
- `npm run ci` en verde.
- Probado en la vista del navegador:
  - el asistente a 1366 × 690;
  - el zoom;
  - la página horizontal desde Insertar y desde el navegador;
  - la barra de estado.

## Qué se descartó
- **Hojas horizontales de verdad en el editor.** Las páginas del editor son columnas CSS del mismo ancho: una hoja más ancha en medio rompería el reparto en páginas. Se queda la banda, y la vista previa enseña el resultado real.
- **Guardar la orientación en el archivo de la tabla.** Es del sitio donde se coloca. Una tabla copiada a otro artículo no tiene por qué ir horizontal allí.
- **Ctrl+Mayús+1…** para los títulos: depende de la distribución del teclado («!» en el teclado español).

## Qué queda
- «Nuevo desde Word» no lee todavía las secciones horizontales de un Word existente.
- Ver en el editor la paginación real de las páginas horizontales: hoy cuenta como si fueran verticales.
