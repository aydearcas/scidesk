# Prototipo 8: documento compuesto

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R32 y 3.3). Decisión resultante: [ficha 0021](../../docs/decisiones/0021-documento-compuesto.md).

## Pregunta

¿Se edita bien una tabla que vive en su propio archivo (`tables/*.scitable`) dentro del documento completo, con deshacer y buscar comunes? Del prototipo 7 quedaban dos cosas para aquí: probar el modo de sugerencias con el teclado real y encajarlo en Tiptap.

## Respuesta

**Sí.** El artículo se compone al cargar en un solo árbol de ProseMirror y se reparte al guardar:
- El resumen (`abstract.scidoc`) entra como un nodo `abstractPart` al principio.
- Cada tabla entra como un nodo `tablePart` (pie, tabla y notas) en el sitio de su `tableRef`, y recuerda de qué archivo viene.

Al guardar se escriben solo los archivos cuyo texto ha cambiado. Deshacer, buscar y reemplazar, la numeración y el modo de sugerencias funcionan sobre todo el artículo como si fuera un solo documento. La pestaña propia de una tabla es otra vista de esa misma parte.

Para que funcione hacen falta cuatro reglas, que salieron de los fallos del prototipo:
1. **Identificadores normalizados al cargar.** Cada bloque recibe un id estable al cargar, y se cambian los que faltan o están repetidos. No se puede dejar a la extensión UniqueID de Tiptap: asigna los ids en diferido, después de crear el editor, y el primer cambio "descubría" ids nuevos, así que cargar, editar y deshacer ya no devolvía los mismos archivos.
2. **Bordes de las partes.** Si se selecciona desde el cuerpo hasta dentro del pie de una tabla y se borra, ProseMirror lleva el resto del pie al párrafo del cuerpo: el texto cambia de archivo sin que se note. Ahora la selección se recorta al lado donde empezó antes de borrar o cortar, y se rechaza cualquier paso que corte un borde a medias.
3. **Una copia de una tabla es una tabla nueva.** Recibe otro id y otro archivo, y también ids nuevos para sus notas y sus párrafos, que si no quedaban repetidos.
4. **Borrar una tabla no borra su archivo.** La referencia sale del cuerpo y el archivo se queda en el disco como "tabla sin referencia", recuperable. Si el borrado es una sugerencia, la marca va en el `tableRef` del cuerpo, no en el `.scitable`.

### Resultados

**Pruebas automáticas** (`tests.html`, en Chromium): **14/14**.

| N.º | Caso | Resultado |
|---|---|---|
| 01 | Cargar y guardar sin cambios no escribe nada, y el formato es estable | Bien |
| 02 | Editar una celda solo cambia su `.scitable` | Bien |
| 03 | Editar el resumen solo cambia `abstract.scidoc` | Bien |
| 04 | Deshacer es común a cuerpo, tabla y resumen (tres ediciones, tres deshacer) | Bien |
| 05 | Buscar y reemplazar en todo el artículo: 7 coincidencias en 3 archivos, un solo paso de deshacer | Bien |
| 06 | Numeración por orden de aparición, con las citas de las notas de tabla en su sitio | Bien |
| 07 | Borrar una selección del cuerpo hasta dentro del pie: no se mueve texto entre archivos | Bien (con la regla 2) |
| 08 | Pegar una copia de una tabla crea un archivo nuevo, sin ids repetidos | Bien (con la regla 3) |
| 09 | Borrar una tabla entera: sale del cuerpo, el archivo se conserva y deshacer la recupera | Bien |
| 10 | Sugerencias de dos autores en cuerpo y tabla: cada registro va a su archivo y sobrevive a reabrir | Bien |
| 11 | Sugerir borrar una tabla entera, y rechazarlo | Bien |
| 12 | La pestaña de la tabla: deshacer común y sincronía en los dos sentidos | Bien |
| 13 | Escribir en la pestaña en modo sugerencias | Bien |
| 14 | Tiempos con 11.900 palabras y 6 tablas | Componer, 34–57 ms; repartir para guardar, 2,5–5 ms; pulsación, 1,0–1,6 ms de mediana |

**Con el teclado y el ratón reales** (en el navegador integrado de la aplicación, que es Chromium):
- **Escribir e Intro** en modo sugerencias quedan marcados con el autor elegido, también dentro del pie de una tabla. Intro dentro del pie no crea bloques sueltos. Ctrl+Z lo deshace sin dejar nada pendiente.
- **La pestaña de la tabla:** escribir en ella cambia el documento principal, y Ctrl+Z desde la pestaña lo deshace en las dos vistas.
- **Seleccionar del cuerpo al pie y pulsar Retroceso:** se borra el texto del cuerpo hasta el borde y el pie queda intacto.
- **Intro y después Retroceso en modo sugerencias:** se reproduce la incidencia #11 de suggest-changes. Queda un párrafo vacío sin marca, y "rechazar todo" no devuelve el documento original. La corrección propuesta (#35, unas 180 líneas, sin integrar en la versión publicada) es imprescindible en la copia propia.

**Tiptap y suggest-changes:** Tiptap 3 permite a una extensión interceptar cada transacción antes de aplicarla (`dispatchTransaction({ transaction, next })`, activo por defecto). Ahí se conecta el modo de sugerencias del prototipo 7, con la corrección del autor y el registro de cambios.

### Formato que sale de aquí

- `article.scidoc`: el cuerpo, con un `tableRef {id, src}` en el sitio de cada tabla (y la marca de sugerencia si la hay), y su registro `changes`.
- `abstract.scidoc`: un `doc` con los bloques del resumen y su registro.
- `tables/*.scitable`: `doc` es un nodo `tablePart {id}` con `tableCaption`, `table` y `tableNote {id}`, más su propio registro `changes`.
- `article.json` dice qué archivo es el cuerpo y cuál el resumen.
- Todos se escriben con claves ordenadas y sangría de dos espacios (`stableStringify`), de modo que lo que no cambia da los mismos bytes.

## Lo que este prototipo no cubre

- **WebKit:** todo se ha probado en Chromium. Repetirlo en el MacBook es el prototipo 11.
- **Portapapeles real:** copiar y pegar una tabla entera con Ctrl+C y Ctrl+V, y pegar desde Word dentro de una celda (prototipo 1). El caso 08 inserta la copia desde código.
- **Escribir o pegar encima de una selección que cruza un borde:** ahora se rechaza y no pasa nada. En la fase 1 hay que recortarla también en esos casos, como al borrar.
- **Numeración en la pestaña:** la pestaña no muestra los números de las citas ni las letras de las notas, porque las decoraciones de numeración viven en la vista principal. Hay que pasárselas.
- Arrastrar una tabla a otro sitio, las figuras (mismo mecanismo, no probado), varios artículos que comparten tablas (P12) y el guardado automático.
- El servidor de Vite hace de sistema de archivos (escritura atómica con archivo temporal y renombrado), en lugar de Tauri.

## Cómo se ejecuta

Requisitos: Node 24.

```powershell
npm install
npm run fixture
npm run dev
```

`npm install` aplica la corrección de suggest-changes del prototipo 7. Después:
- **Pruebas automáticas:** abre `http://localhost:5178/tests.html`.
- **Prototipo interactivo:** abre `http://localhost:5178/`. A la izquierda está el documento completo, en el centro la pestaña de una tabla y a la derecha los archivos tal como están en el disco. "Volver a los archivos de partida" deshace todo lo guardado.

Los archivos de partida están en `fixture-project/`, generados con `npm run fixture`. La copia de trabajo es `fixture-work/` y no se guarda en git.

## Archivos

- `src/editor.js`: extensiones de Tiptap (partes, pie, notas, cita, referencia cruzada, numeración, copias de tablas, bordes de las partes, marcas de sugerencia y el enganche con suggest-changes).
- `src/composite.js`: componer, normalizar, repartir, numerar, buscar y reemplazar.
- `src/table-tab.js`: la pestaña de la tabla como segunda vista.
- `src/main.js`, `index.html`, `src/style.css`: el prototipo interactivo.
- `src/tests.js`, `tests.html`: las pruebas automáticas.
- `vite.config.js`: el servidor con la pequeña API de archivos.
- `tools/make-fixture.mjs`: genera el proyecto de partida. `tools/patch-suggest-changes.mjs`: la corrección del prototipo 7.
