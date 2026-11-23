# 0090. Control de cambios en el editor (fase 2a, primer paso)

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11). El usuario pidió empezar la fase 2a. Decidió también (23/11) dejar las citas vivas desde Word para el final de la fase 2, después de la 2b.
- **Pregunta del plan:** fase 2a, «comentarios y control de cambios en el editor, con la implementación elegida en el prototipo 7» (R31, ficha 0020).

## Qué se hizo
1. **La pieza, en el repositorio:**
   - `packages/suggest-changes` (`@scidesk/suggest-changes`) es la copia propia de `@handlewithcare/prosemirror-suggest-changes` 0.1.8 (MIT, con su `LICENSE`), la que eligió el prototipo 7.
   - Es la última versión publicada, tomada de la que ya estaba descargada en el prototipo; no se ha descargado nada nuevo.
   - Lleva el cambio del prototipo: un cambio solo se une al vecino si es del mismo autor (`setCanJoinSuggestion`).
   - Las importaciones van a `@tiptap/pm/*`, para tener una sola copia de ProseMirror.
   - Su `README.md` dice qué se cambió.
2. **Control de cambios en el editor** (`apps/desktop/src/track-changes.ts`), con el mismo enganche `dispatchTransaction` de Tiptap que el prototipo 8:
   - con el control activado, lo que se escribe es una inserción, lo que se borra queda tachado, y el cambio de formato o de un atributo (el nivel de un título) es una modificación;
   - vale en el texto, en el resumen, en los pies, en las notas y en las celdas de las tablas;
   - un bloque entero insertado o borrado lleva la marca en el propio bloque: todos los contenedores la aceptan (`withNodeMarks`, porque Tiptap no deja añadirlo desde otra extensión);
   - la composición de acentos del Mac se convierte en un solo cambio al terminar (prototipo 11).
3. **Autor y fecha de cada cambio:**
   - van al registro `changes` de cada `.scidoc`, `.scitable` o `.scifigure`, que ya preveía el formato;
   - al guardar, cada archivo se queda solo con los cambios que aún contiene (`splitArticle` y `saveComposite` reciben el registro del editor);
   - al abrir, el registro se lee de los archivos.
   - Cada autor tiene su color, el mismo siempre, y al pasar el ratón sale su nombre y la fecha.
4. **Tu nombre:**
   - se pide la primera vez que se activa el control de cambios, como Word, con el de quien firma primero como propuesta;
   - se guarda en los ajustes de este equipo («Tu nombre» en Ajustes), nunca en el proyecto.
5. **Activado o no, en el artículo:** `trackChanges` en `article.json` (opcional; esquema regenerado), como Word guarda `w:trackRevisions` en el documento. El artículo se abre como se dejó.
6. **Dónde se maneja:**
   - Revisar › Control de cambios (Ctrl+Mayús+E en los dos esquemas, el atajo de Word, ya reservado);
   - aceptar o rechazar el cambio del cursor;
   - cambio siguiente y anterior;
   - aceptar o rechazar todos;
   - en el clic derecho sobre un cambio, su autor y su fecha con «Aceptar el cambio» y «Rechazar el cambio»;
   - en la barra de estado, «Control de cambios» mientras está activado (un clic lo desactiva).
   
   Aceptar y rechazar nunca se marcan como cambio, y se deshacen con Ctrl+Z.
7. **Incidencia #11 del original, arreglada en la copia propia:**
   - **El fallo:** Intro y luego Retroceso dejaban el párrafo partido, con un carácter invisible suelto, y «rechazar todo» no devolvía el texto.
   - **El arreglo:** ahora, si el corte de párrafo es una inserción marcada, Retroceso al principio del segundo párrafo, o Suprimir al final del primero, lo quita y vuelve a unir los dos, como en Word (`joinInsertedBreak`).
   - Es más corto que la corrección propuesta en el original (#35, sin publicar), que no se ha copiado.

## Pruebas
- **`track-changes.test.ts`, 6 pruebas:**
  - los contenedores aceptan la marca;
  - inserción y borrado marcados;
  - Intro y Retroceso, e Intro y Suprimir;
  - Retroceso normal sin tocar;
  - rechazar todo devuelve el texto;
  - el registro se queda con los cambios que siguen en el texto.
- **En la vista del navegador, con el teclado:**
  - el diálogo del nombre;
  - escribir y borrar;
  - Intro y Retroceso;
  - cambiar el nivel de un título y escribir en una celda;
  - guardar y recargar: los cambios vuelven con su autor y fecha, y el control sigue activado;
  - el clic derecho con autor y fecha;
  - rechazar un cambio y rechazar todos (el texto queda como estaba);
  - cambio siguiente;
  - desactivarlo desde la barra de estado.
  
  Sin errores en la consola.
- **Sin probar:** en la ventana de Tauri y en el Mac (WebKit, la composición de acentos). El Mac va con las demás pruebas pendientes.

## Qué se descartó
- **Copiar la corrección #35 del original:** no está publicada, son unas 180 líneas y el caso se resuelve con un comando de teclado propio.
- **Un ajuste del equipo para activar o no el control:** en Word es del documento, y así lo verán los coautores.

## Qué queda de la fase 2a
1. Comentarios en el editor y en el panel derecho.
2. El Word para coautores con los cambios (`w:ins`, `w:del`, `w:rPrChange`) y los comentarios. Hoy sale con los cambios aceptados.
3. Importar la copia devuelta y aceptar o rechazar sus propuestas en el texto.
4. Historial con nombre.

Las citas vivas desde un Word, al final de la fase 2 (decisión del usuario del 23/11).
