# 0078. Salto de página y página en blanco

- **Fecha:** 23/11/2026
- **Estado:** hecha por petición del usuario. La pidió el 23/11, antes de dar por cerrado el editor de la fase 1: «insertar página en blanco» e «insertar salto de página» en el menú Insertar.
- **Pregunta del plan:** PLAN 5.2 (el editor) y 5.6 (exportación).

## Qué se decide
- **Un bloque nuevo, `pageBreak`** (con su `id`), entre dos bloques del cuerpo: lo que sigue empieza en una página nueva.
  - No va dentro de un párrafo, una lista, una cita, el resumen, una tabla ni una figura.
  - Es como el `w:br w:type="page"` de Word en un párrafo propio, que es lo que escribe Word con Ctrl+Intro en una línea vacía.
- **Insertar › Salto de página** (Ctrl+Intro en los dos esquemas de atajos, como en Word en español y en inglés). Se pone en el cursor:
  - en mitad de un párrafo o de un título de sección, lo parte: lo que va detrás del cursor pasa a la página siguiente;
  - al principio, va delante; al final, detrás;
  - en el título del artículo, una lista, una cita, el resumen, una tabla o una figura, va detrás de ellos.
  - El cursor queda al principio de lo que sigue. Al final del texto se añade un párrafo vacío para seguir escribiendo en la página nueva.
- **Insertar › Página en blanco,** como en Word: dos saltos con un párrafo vacío en medio, donde queda el cursor.
- **En la hoja,** el salto se ve como en Word con las marcas de formato: una línea discontinua con «Salto de página». Con páginas, lo que sigue pasa a la página siguiente.
  - Se selecciona con un clic.
  - Retroceso al principio del párrafo siguiente lo quita y deja los dos párrafos separados, como en Word.
  - Ctrl+Z lo deshace en un paso.
- **En el Word** (para coautores y para la revista), un párrafo con el salto de página de Word, con el marcador del bloque en el de coautores.
  - Al leer una copia devuelta, los saltos de página y de columna de Word no se leen como texto. Así el salto exportado no vuelve como una propuesta, y un salto que añada un coautor tampoco.
- **En el PDF,** `#pagebreak()` de Typst; dos seguidos con el párrafo vacío dan la página en blanco.

## Por qué
- **Un bloque y no una marca dentro del párrafo:**
  - es lo que se ve y se borra como una pieza;
  - no se mezcla con el texto que se cuenta, se corrige o se compara al fusionar;
  - va igual al Word y al PDF.
- **La revista también lo recibe:** es una decisión del autor sobre su manuscrito. Por ejemplo, que el resumen o la bibliografía empiecen en una página nueva.
- **Ctrl+Intro:** es el atajo de Word, y no lo usaba nada en SciDesk.

## Qué se descartó
- **Un botón en la cinta:** no se pidió. El menú y Ctrl+Intro bastan, como en Word, donde el salto está en Insertar.
- **El salto de sección y el de columna:** no se usan en manuscritos.
- **Leer los saltos de página de Word en «Nuevo desde Word»:** sigue sin traerlos, como hasta ahora. Queda para decidirlo con el usuario.

## Consecuencias
- **Formato:** nodo `pageBreak {id}` en el cuerpo del `.scidoc`. Esquemas regenerados y especificación actualizada; `ID_OF_NODE` le da id.
- **Núcleo:**
  - `docx-export.ts`: un párrafo con `PageBreak` de `docx`, con el marcador del bloque;
  - `typst-export.ts`: `#pagebreak();`;
  - `docx-read.ts`: `w:br` de página o de columna, fuera del texto.
- **Ventana:**
  - `page-break.ts`: el nodo y `insertPageBreak(blank)`;
  - el bloque admitido en el documento (`editor.ts`), con la acción `pageBreak` de los atajos (`shortcuts.ts`, «Ctrl+Intro» en español);
  - Insertar › «Página en blanco» y «Salto de página» (`App.tsx`), con la etiqueta en el idioma de la interfaz (`--page-break-label`);
  - los estilos (`break-after: column` con páginas).
- **Pruebas:**
  - `packages/core/test/page-break.test.ts`: el Word para coautores y para la revista, la copia devuelta sin propuestas y la fuente de Typst;
  - `apps/desktop/src/page-break.test.ts` (6): partir el párrafo, delante y detrás, después del título y de una lista, al final del texto, la página en blanco y Ctrl+Intro.
- **Comprobado:**
  - **en la vista del navegador:**
    - el menú;
    - partir un párrafo y seguir en la página 2;
    - Retroceso;
    - la página en blanco con «Métodos» en la página 3;
    - Ctrl+Z;
    - Ctrl+Intro con el teclado real;
  - **con Word real:** el salto al final de la página 1 sin una línea vacía arriba de la 2, la página en blanco y 4 páginas;
  - **el PDF de Typst:** también 4 páginas, con la página en blanco.
- **Sin probar** en la ventana de Tauri ni en WebKit, donde la hoja es continua y el salto solo se ve como la línea.
