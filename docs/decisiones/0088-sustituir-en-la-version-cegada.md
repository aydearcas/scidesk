# 0088. Sustituir solo en la versión cegada (R9)

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11). El usuario pidió hacer lo que quedaba de la ficha 0087 antes de la fase 2.
- **Pregunta del plan:** R9 (PLAN 5.8): «Para cada hallazgo ofrece sustituirlo solo en la versión cegada, sin tocar el manuscrito».

## Qué se hizo
Los avisos de cegado (ficha 0087) tenían dos salidas: cambiar el texto o marcarlo como correcto. Ahora hay una tercera: **cambiarlo solo en lo que va a la revista** (el Word y el PDF para la revista, y la vista previa). El manuscrito, el Word para coautores y la carpeta del proyecto no cambian.

- **«Sustituir en la versión cegada»**, en los avisos de autor, centro, ciudad, autocita y comité de ética:
  - abre un campo con el texto que irá en su lugar, en el idioma del artículo y editable:
    - «[autor eliminado para la revisión]»;
    - «[centro eliminado para la revisión]»;
    - «[ciudad eliminada para la revisión]»;
    - «[código eliminado para la revisión]»;
    - «[eliminado para la revisión]» para una autocita, que conviene reescribir («Como describieron [autores] en un estudio previo»).
  - Se sustituye **ese texto exacto en todo el artículo** (palabras enteras): manuscrito, resumen, tablas y figuras. Un clic sirve para todas las veces que se nombra el hospital.
  - Del comité de ética solo se sustituye **el código de aprobación**; el nombre del centro ya lo vigila su propio aviso.
  - Si el texto está partido por un formato (parte en cursiva), se sustituye igual, con el formato de su primera letra. No se sustituye a través de una cita o una referencia cruzada.
- **«Llevar a la portada»**, en el aviso de una sección que va en la portada (agradecimientos, contribuciones, conflictos…):
  - la sección, con su título y lo que hay hasta la siguiente sección, sale de la versión cegada;
  - la portada (`exportTitlePage`) la recoge como texto: los agradecimientos, con las personas a las que se agradece en Autores; los conflictos, con su texto y después los que se declaran en Autores (sin el aviso de que nadie los ha declarado); el resto, al final con su título.
- **Cada forma escrita es su propio aviso.** Antes, un párrafo con «Hospital Ficticio del Mar» y luego «Ficticio» daba un solo aviso; si se sustituía el nombre completo, «Ficticio» habría llegado a la revista sin avisar. Ahora:
  - se buscan todas las apariciones, de la forma más larga a la más corta, sin solaparse;
  - hay un aviso por cada forma distinta («Herrera-Gil L», el correo, «Herrera»).
  - El identificador del aviso lleva la forma (`blind-author:<ruta>:<bloque>:<persona>:<forma>`). Los avisos de autor y de centro marcados como correctos antes de este cambio vuelven a salir una vez.
- **En «Avisos»**, lo que cambia la versión cegada no cuenta como pendiente ni en el aviso de la exportación, y se lista aparte: «N cambios en la versión cegada», cada uno con lo que se pone («PI-2019-045» → «[código eliminado para la revisión]») y «Deshacer».
- **Dónde se guarda:** en `article.json`, campo opcional `blinding` (esquema regenerado):
  - `replace`: lista de `{ text, replacement, date }`;
  - `omitSections`: los identificadores de los títulos de sección.
  
  Viaja con el proyecto. Se quita el campo cuando queda vacío.
- **Solo con revisión doble ciego.** Si la revista cambia a otra revisión, lo guardado no se aplica (`blindedArticle` devuelve el artículo tal cual) y se conserva por si vuelve.
- **Núcleo** (`blinding.ts`):
  - `blindedArticle`, que usan `exportDocx` (perfil «journal») y `manuscriptTypst` (PDF y vista previa);
  - `setBlindReplacement` y `setBlindOmitted`;
  - `blindHandling`, que usa `checkArticle`;
  - `omittedSections`, que usa la portada;
  - `defaultBlindReplacement`.
- **Línea de órdenes:**
  - `scidesk blind-replace <dir> <texto> [<sustituto>] [--undo]`;
  - `scidesk blind-omit <dir> <id del título> [--undo]`.

## Pruebas
- **Núcleo** (`blinding.test.ts`):
  - el código del comité en cuatro formas;
  - el nombre completo y la palabra suelta como dos avisos;
  - las sustituciones en el texto, también con el nombre partido por la cursiva;
  - la sección fuera de la versión cegada y en la portada;
  - el Word y el PDF para la revista con los cambios, y el Word para coautores sin ellos;
  - deshacer;
  - sin doble ciego, nada.
- **En la vista del navegador**, con un artículo para Reumatología Clínica:
  - sustituir el código del comité y deshacerlo;
  - llevar «Agradecimientos» a la portada;
  - sustituir una autocita por un texto propio.

## Qué se descartó
- **Sustituir en un solo sitio** (por aviso y bloque). Una sustitución por texto es lo que se espera («el hospital no se nombra en la versión cegada») y no deja huecos al reescribir.
- **Comprobar también el texto sustituto.** Lo escribe el usuario. Si pone un nombre, no se avisa.
- **Sustituir el nombre de un archivo de figura.** El Word no muestra el nombre original; servirá cuando se envíen las figuras aparte.

## Qué queda
- ~~**Los metadatos de las imágenes** (EXIF, autor de un SVG).~~ Hecho en la ficha 0089.
- ~~**Sustituir también a través de una cita**.~~ Hecho en la ficha 0089.
