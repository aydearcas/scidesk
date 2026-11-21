# 0021. Documento compuesto: cómo se compone, se reparte y se protege cada parte

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 8 de la fase 0)
- **Pregunta del plan:** R32 (prototipo 8 de la sección 8)

## Qué se decide
- **Se confirma el documento compuesto de [0006](0006-estructura-del-proyecto.md).** Al cargar, el artículo forma un solo árbol de ProseMirror:
  - El resumen entra como un nodo `abstractPart {src}` al principio.
  - Cada tabla entra como un nodo `tablePart {id, src}`, con pie (`tableCaption`), tabla y notas (`tableNote {id}`), en el sitio de su `tableRef` del cuerpo.
  - Al guardar se reparte: cada parte vuelve a su archivo y **solo se escriben los archivos cuyo texto ha cambiado**, con escritura atómica.
- **Formato de los archivos:**
  - `article.scidoc` lleva el cuerpo con un `tableRef {id, src}` por tabla.
  - Cada `.scitable` tiene como `doc` un nodo `tablePart {id}`.
  - Cada archivo lleva su propio registro `changes` ([0020](0020-control-de-cambios.md)) solo con los cambios de su contenido. Al cargar se juntan.
  - Todos se escriben con claves ordenadas y sangría fija, para que lo que no cambia dé los mismos bytes.
- **Reglas que necesita el documento compuesto:**
  1. **Ids normalizados al cargar.** El núcleo asigna los ids de bloque que falten, cambia los repetidos y quita los U+200B sin marca antes de crear el editor. No se deja a la extensión UniqueID, que los asigna en diferido.
  2. **Bordes de las partes.** Las partes son aislantes. Una selección que cruza el borde de una parte se recorta al lado donde empezó antes de borrar o cortar, y cualquier paso que corte un borde a medias se rechaza.
  3. **Una copia de una tabla es una tabla nueva**, con id, archivo (`tables/<id>.scitable`) e ids de sus bloques nuevos.
  4. **Borrar una tabla no borra su archivo.** La referencia sale del cuerpo y el archivo se queda como "tabla sin referencia", recuperable desde el navegador. Borrar el archivo es una acción aparte. Si el borrado es una sugerencia, la marca va en el `tableRef` del cuerpo.
- **La pestaña propia de una tabla es una segunda vista de la misma parte.** Usa el patrón de editor anidado de ProseMirror, pero sin estado propio que se guarde: cada paso se traslada al documento principal, y los cambios del principal vuelven a la pestaña. Deshacer, sugerencias y guardado ocurren en un solo sitio. No es la "isla" que descartaba 0006, porque no tiene historial ni archivo propios.
- **El modo de sugerencias se conecta en Tiptap** con el enganche `dispatchTransaction` de las extensiones de Tiptap 3 (resuelve lo pendiente de [0020](0020-control-de-cambios.md)).

## Por qué
- Con estas reglas pasan las 14 pruebas automáticas del prototipo: editar una celda o el resumen solo cambia su archivo, deshacer es común a las tres partes, buscar y reemplazar toca tres archivos en un solo paso de deshacer, la numeración cuenta las citas de las tablas en su sitio, las sugerencias de cada autor van al archivo que toca y sobreviven a reabrir, y la pestaña y el documento se siguen en los dos sentidos.
- Con el teclado y el ratón reales también funcionan escribir, Intro, Ctrl+Z, editar desde la pestaña y borrar una selección que cruza el borde.
- Rinde de sobra: con 11.900 palabras y 6 tablas, componer tarda 34–57 ms, repartir para guardar 2,5–5 ms y cada pulsación 1–1,6 ms de mediana.
- Sin la regla 1, cargar, editar y deshacer no devolvía los mismos archivos. Sin la 2, borrar desde el cuerpo hasta el pie de una tabla movía el resto del pie al cuerpo, es decir, de un archivo a otro sin que se notara. Sin la 3, la copia de una tabla repetía los ids de sus notas.

## Qué se descartó
- Un editor con estado propio por tabla, sincronizado con el documento (ya descartado en 0006).
- Dejar los ids de bloque a UniqueID.
- Borrar el archivo de una tabla al quitarla del texto: un descuido se pierde para siempre y deja de ser recuperable al cerrar el programa.
- Dejar que una edición cruce el borde de una parte.

## Consecuencias
- **La copia propia de suggest-changes necesita también la corrección de Intro seguido de Retroceso** (#35 del proyecto original, unas 180 líneas). Con el teclado real se reproduce la incidencia #11: queda un párrafo vacío sin marca, y "rechazar todo" no devuelve el documento original. Se integra al empezar la fase 1.
- Fase 1:
  - Recortar también al escribir o pegar encima de una selección que cruza un borde, que ahora simplemente se rechaza.
  - Pasar a la pestaña de la tabla las decoraciones de numeración.
  - Mostrar en el navegador las tablas sin referencia.
  - Aplicar el mismo mecanismo a las figuras (pie en `figures/`) y a varios artículos que comparten tablas (P12).
- Quedan para otros prototipos: el comportamiento en WebKit (11) y el pegado real desde Word dentro de una celda y de una tabla entera (1).
- Detalle, casos y resultados en [`prototypes/08-composite-document/README.md`](../../prototypes/08-composite-document/README.md).
