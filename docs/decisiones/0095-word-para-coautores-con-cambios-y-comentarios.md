# 0095. El Word para coautores con los cambios marcados y los comentarios (fase 2a, tercer paso)

- **Fecha:** 27/11/2026
- **Estado:** hecha (27/11). El usuario pidió seguir con este paso después de los comentarios en el editor (ficha 0094).
- **Pregunta del plan:** fase 2a, «el Word para coautores con cambios y comentarios»; correspondencia con Word de la ficha [0020](0020-control-de-cambios.md); pasos pendientes de las fichas [0090](0090-control-de-cambios-en-el-editor.md) y [0094](0094-comentarios-en-el-editor.md).

## Qué se hizo
1. **Los cambios marcados salen como los de Word** (`docx-export.ts`). Hasta ahora el Word para coautores salía con los cambios aceptados. Ahora lleva cada uno con el autor y la fecha de su registro `changes`:
   - una inserción va en `w:ins`, y un borrado en `w:del` con `w:delText`; una cita o una referencia cruzada borradas son campos borrados (`w:delInstrText`);
   - un cambio de formato va como `w:rPrChange` con el formato anterior. La pieza de control de cambios lo guarda como el texto viejo borrado y el mismo texto insertado con el formato nuevo, con un solo `id`. Se reparte por tramos cuando el formato cambia a mitad;
   - un párrafo, título, lista o cita en bloque insertado o borrado entero lleva también su marca de párrafo (`w:pPr/w:rPr/w:ins` o `w:del`): al rechazar la inserción en Word, el párrafo desaparece;
   - un Intro con el control de cambios (un U+200B marcado a cada lado del corte) es la marca de párrafo insertada; un párrafo unido, la marca de párrafo borrada. El U+200B no llega al Word;
   - en las tablas, una fila insertada o borrada lleva su marca de fila (`w:trPr/w:ins`, `w:del`); en las figuras, la imagen y su párrafo. Una tabla o figura insertada o borrada entera lleva la marca en su sitio del texto (`tableRef`, `figureRef`), y ahora pasa a su parte en el documento compuesto;
   - en las palabras clave, el «; » va con la palabra que se inserta o se borra: al aceptar todo se lee bien la lista. Las palabras clave ya no salen como un solo texto sin formato: cada una lleva sus marcas, sus cambios y sus comentarios;
   - un cambio sin entrada en el registro sale a nombre de «SciDesk», con la fecha de la exportación; cada elemento de revisión tiene su propio `w:id`;
   - si el artículo tiene activado el control de cambios, el Word también (`w:trackRevisions` en `settings.xml`).
2. **Los comentarios salen con sus respuestas** (`docx-export.ts`, `placeComments`):
   - cada comentario abarca su texto, también de un párrafo a otro. Al exportar se escribe un final después de cada trozo del texto comentado; al cerrar el archivo se deja solo el último y se pone detrás la referencia del comentario;
   - cada respuesta es un comentario de Word que contesta al primero (`commentsExtended.xml`, `paraIdParent`) y abarca el mismo texto, como los escribe Word;
   - un hilo resuelto sale como resuelto (`w15:done`);
   - van autor, iniciales, fecha y texto, con un párrafo por línea. Se usa lo que la biblioteca `docx` 9.16 ya sabe hacer (`comments`, `parentId`, `resolved`).
3. **El Word para la revista y el PDF salen con todo aceptado y sin comentarios**, como antes, pero ahora del todo:
   - las citas se numeran sin las borradas (`acceptedView`). Antes, una cita borrada pero sin aceptar contaba para la numeración y su referencia salía en la bibliografía de la revista;
   - una tabla o figura borrada no sale ni en su sitio ni al final;
   - en las listas, un elemento borrado no sale ni cuenta en la numeración.
   En el Word para coautores, una cita borrada lleva el texto que tenía (se calcula aparte con todas las citas).
4. **Al importar la copia devuelta, lo que ya iba no vuelve como propuesta** (`settleSentChanges` en `docx-read.ts`, `round.ts`):
   - los cambios que llevaba la copia se reconocen por autor y fecha (`revisionKey`), sacados del registro de la instantánea enviada (`sentRevisionKeys`). Word conserva los dos al guardar; los `w:id` los renumera;
   - una inserción enviada cuenta como texto normal y un borrado enviado como ausente, igual que en los bloques enviados, que tienen los cambios aceptados;
   - lo que hace la coautora sigue siendo suyo:
     - si rechaza una inserción mía, la propuesta es quitar ese texto, sin marcar;
     - si rechaza un borrado mío, la propuesta es volver a poner el texto;
     - si acepta, no hay propuesta;
     - si borra con marcas parte de una inserción mía, la propuesta es un borrado marcado, a su nombre.
   - Una tabla o figura borrada no entra en los bloques enviados.
5. **Posiciones de las propuestas en el bloque** (`proposals.ts`, `pmOffset`): el texto que se compara no lleva el texto borrado ni los U+200B de un corte. Ahora las posiciones de cada propuesta se pasan a las del propio bloque, contando lo que se saltó. La comprobación de integridad se hace antes, sobre el texto que se compara. Una inserción justo donde había un trozo saltado queda delante de él; el principio de un tramo, detrás.
6. **`scidesk comments <dir> [--all]`** (`comments.ts` en el núcleo, `articleComments`): los comentarios en el orden del texto, con el texto comentado, el archivo, las respuestas y, con `--all`, los resueltos. Lo había dejado pendiente la ficha 0094.

## Cómo se comprobó
- Siete pruebas nuevas en `packages/core/test/tracked-docx.test.ts`, sobre el artículo de `tracked-fixture.ts`. El artículo trae los cambios de cada tipo y dos comentarios: uno de dos párrafos con una respuesta y otro resuelto.
  - Comprueban el XML del Word para coautores y que el de la revista sale todo aceptado y sin comentarios.
  - Comprueban que la copia sin tocar no da propuestas.
  - Una coautora simulada añade una frase con marcas, rechaza una inserción y acepta un borrado: salen exactamente sus dos propuestas, con integridad correcta.
  - También se prueban los comentarios en orden y la colocación de los finales.
- **Con Word real** (local, salida fuera del repositorio):
  - abre el archivo y ve los 9 cambios con su tipo, autor y fecha; los 3 comentarios, con la respuesta en el hilo de su comentario y el resuelto marcado; y el control de cambios activado;
  - «Aceptar todo» da el mismo texto que la vista aceptada de SciDesk;
  - después de una edición marcada y otra sin marcar con `word-edit.ps1` y de guardar, Word conserva el autor y la fecha de todos los cambios enviados;
  - al reimportar, la copia sin tocar no da propuestas y la editada da exactamente las dos ediciones.
- Las 233 pruebas de npm pasan.

## Por qué
- Sin los cambios en el Word, el coautor no ve qué está aún pendiente de decidir, y aceptarlos todos al exportar mezclaba lo propuesto con lo decidido.
- El autor y la fecha son lo único que Word conserva de cada revisión, así que son lo que permite saber, al volver la copia, qué iba ya en ella.
- La vista aceptada es la que ya usaban los bloques enviados, la comprobación de integridad y el recuento de palabras. Pasar los cambios enviados a esa vista al importar no toca la fusión de la ficha [0029](0029-fusion-de-copias-devueltas.md).

## Qué se descartó
- **Reconocer los cambios enviados por su `w:id`**: Word lo renumera al guardar.
- **Reconocerlos por su texto**: falla cuando Word parte o junta los tramos, o cuando la coautora acepta una parte.
- **Dejar los U+200B en el Word**: Word no sabe qué son y se quedaban invisibles en la copia del coautor.
- **Escribir los cambios de atributo (nivel de un título, alineación) como `w:pPrChange`**: por ahora salen con el valor nuevo, como si estuvieran aceptados.

## Consecuencias
- **Siguiente paso de la fase 2a:** traer de la copia devuelta los comentarios nuevos del coautor, sus respuestas y los hilos que resuelve, como propuestas de tipo `comment`. Hoy el lector los ignora, así que tampoco dan falsas propuestas. Después, aceptar o rechazar las propuestas en el editor, con las posiciones que ya son las del bloque.
- Si el coautor tiene activado en Word «Quitar información personal al guardar», los cambios enviados vuelven sin autor ni fecha y no se reconocen: saldrían como propuestas suyas. Habrá que reconocerlos también por su texto cuando eso pase.
- Las filas insertadas o borradas llevan su marca, pero las tablas cambiadas de estructura (columnas, celdas combinadas) siguen sin marcas de Word (ficha 0020).
- Las fechas de los comentarios salen con milisegundos, como las escribe la biblioteca `docx`; Word las acepta.
- Sin probar con Word para Mac, LibreOffice ni Google Docs.
