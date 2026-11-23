# 0071. Añadir, mover y dar tipo a las secciones

- **Fecha:** 23/11/2026
- **Estado:** hecha. Es el segundo paso de la propuesta que aceptó el usuario el 23/11 (ficha 0070).
- **Pregunta del plan:** ninguna; la pidió el usuario («un usuario podría querer añadir alguna sección más si una revista lo requiere»).

## Qué se decide
- **El tipo de una sección es el suyo o el que dice su nombre.**
  - Un título sin tipo propio que se llama «Agradecimientos», «Funding», «Conflicto de intereses», «Disponibilidad de datos», «Contribución de los autores», «Apéndice A»… se reconoce con unas reglas por nombre (`roleFromName`).
  - Son las mismas reglas de «Nuevo desde Word», ampliadas con objetivo, presentación del caso, consentimiento, disponibilidad de datos, registro, contribuciones y apéndices.
  - El tipo efectivo (`headingRole`) cuenta para:
    - el límite de palabras: una sección final no cuenta;
    - la numeración (ficha 0070): una sección final de nivel 1 no lleva número;
    - el sitio de la bibliografía en el Word y en el PDF.
  - Se guarda un tipo solo cuando se elige. Si cambias el nombre de un título sin tipo propio, su tipo cambia con él.
- **«Añadir sección» en el navegador:**
  - un botón «+» junto a «Manuscrito» abre la lista de tipos, con los nombres en el idioma de la interfaz:
    - las del cuerpo (objetivo, presentación del caso, conclusiones…) y las finales (responsabilidades éticas, consentimiento, registro, contribuciones, agradecimientos, financiación, conflicto de intereses, disponibilidad de datos, uso de IA, bibliografía, apéndice);
    - no ofrece las que ya están, salvo los apéndices;
    - al final, «Otra sección…»;
  - **cada tipo va a su sitio habitual:** antes de la primera sección que suele ir detrás. Por ejemplo, «Conclusiones» va tras «Discusión» y antes de las finales, y «Financiación», antes de «Conflicto de intereses» y de la bibliografía;
  - el título se escribe en el idioma del artículo y el cursor queda en su primer párrafo;
  - **«Otra sección…»** pone «Nueva sección», sin tipo, tras la sección donde está el cursor, nunca entre las finales. El nombre queda seleccionado para escribir encima.
- **Menú de una sección**, con el clic derecho en el navegador o «Sección…» en el menú contextual de un título:
  - **Añadir sección…** (la misma lista; «Otra sección» va tras esta);
  - **Añadir subsección**, al final de la sección, con el nombre seleccionado;
  - **Subir** y **Bajar**: la sección se mueve con todo su contenido (texto, subsecciones, tablas y figuras) entre las de su nivel;
  - **Tipo de sección**: «Según el nombre (…)» o cualquiera de los tipos;
  - **Quitar el título (deja el texto)**: el título pasa a párrafo.
  - Cada orden es un paso que se deshace con Ctrl+Z.
- **Arrastrar una sección en el navegador** (pedido por el usuario al probarlo), además de «Subir» y «Bajar»:
  - como en una lista ordenable (pedido por el usuario al probarlo): la sección va «cogida» bajo el puntero, por el punto donde se agarró y con su ancho, el puntero es una mano cerrada, y las demás se apartan en directo (con una transición corta) para dejar un hueco punteado donde caerá;
  - el texto cambia solo al soltar, de una vez, con todo lo que tiene la sección (subsecciones, tablas y figuras); Ctrl+Z lo deshace;
  - Escape cancela el arrastre; un clic sin mover sigue llevando a la sección;
  - con eventos del puntero, no con el arrastre nativo del navegador, que Tauri intercepta en Windows para soltar archivos.
- El menú flotante se queda dentro de la ventana y se desplaza si es largo.

## Por qué
- **Deducir el tipo del nombre:** casi todo el mundo escribe sus secciones a mano. Sin esto, unos «Agradecimientos» contaban para el límite de palabras y se numeraban.
- **No guardar el tipo deducido:** si el usuario cambia el nombre, el tipo debe seguirle. Un tipo elegido en el menú sí se guarda y manda.
- **Cada tipo en su sitio:** el usuario no tiene que saber el orden que esperan las revistas. El orden de las secciones finales es el habitual en biomedicina; si una revista pide otro, se mueven con «Subir» y «Bajar».
- **El menú en el navegador:** es donde se ve la estructura del artículo.

## Qué se descartó
- **Un tipo «Limitaciones»:** no está entre los tipos del formato. Es una sección más («Otra sección») o una subsección de la discusión.

## Consecuencias
- **Núcleo** (`sections.ts`): `roleFromName`, `headingRole`, `BODY_ORDER`, `CLOSING_ORDER`, `placeSection` y `sectionSpan`; las reglas por nombre de «Nuevo desde Word» salen de aquí. Etiquetas de las secciones finales en `SECTION_LABELS` (español e inglés).
- **Ventana:** `sections-edit.ts` (añadir, subsección, mover, tipo y quitar el título), el botón y el menú de la sección en `Navigator.tsx`, y menús flotantes en `App.tsx`. El formato no cambia.
- **Pruebas nuevas** (`packages/core/test/sections.test.ts`):
  - los nombres reconocidos y uno que no («Limitaciones del estudio»);
  - unos «Agradecimientos» escritos a mano no se numeran ni cuentan;
  - el sitio de cada tipo y de «Otra sección», y lo que abarca cada sección.
- **Probado en la vista del navegador:**
  - «Conclusiones» se colocó antes de «Bibliografía» con el cursor listo;
  - «Subir» la puso delante de «Discusión», con su texto, y Ctrl+Z lo deshizo de una vez;
  - «Otra sección…» con el nombre «Agradecimientos» se reconoció (no cuenta: «—» en el navegador);
  - el menú de tipo desde el título;
  - arrastrar «Discusión» delante de «Métodos» y soltar en la mitad de abajo de una sección (queda detrás), la línea de destino y Escape;
  - «Resultados» subió con su tabla y su figura, que siguen en su sitio y numeradas;
  - sin errores en la consola.
- **Sin probar** en la ventana de Tauri y en WebKit.
- **Siguiente paso de la propuesta:** avisos cuando la revista pide en el manuscrito una declaración (financiación, conflictos, uso de IA…) que falta, con un botón que la añade; y si fija las secciones y no coinciden.
