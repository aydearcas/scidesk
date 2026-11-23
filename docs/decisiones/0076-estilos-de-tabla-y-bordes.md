# 0076. Estilos de tabla y bordes de celda

- **Fecha:** 23/11/2026
- **Estado:** hecha por decisión del usuario («ambos, estilos predefinidos y opciones de bordes por celda… las típicas de Word», 23/11). Adelanta a la fase 1 lo que la revisión de la v0.4 (R43) había dejado para la V1.
- **Pregunta del plan:** PLAN 5.4 (tablas) y R43.

## Qué se decide
- **Estilo de tabla** (atributo nuevo `style` de la tabla), uno de cuatro:
  - **Tres líneas:** arriba (1 pt), bajo el encabezado (½ pt) y abajo (1 pt). Es el de las revistas biomédicas y el de siempre.
  - **Líneas entre filas:** además, ½ pt entre todas las filas.
  - **Cuadrícula:** todas las líneas, de ½ pt.
  - **Sin líneas.**
  - Si la tabla no tiene estilo propio, se usa el de la revista (dato nuevo `manuscriptFormat.tableStyle` del perfil); si la revista no lo dice, tres líneas.
  - **Elegir un estilo quita los bordes propios de todas las celdas de la tabla**, como hace Word al aplicar un estilo de tabla, para que el estilo se vea entero. Es un solo paso que se deshace con Ctrl+Z. Lo encontró el usuario: una «Cuadrícula» aplicada sobre celdas con «Sin borde» de antes quedaba a medias.
- **Bordes propios de cada celda** (atributo nuevo `borders`), como los de Word:
  - por lado (arriba, abajo, izquierda, derecha), cada uno con estilo de línea (continua, doble, discontinua, punteada, o ninguna), grosor (los de Word, de ¼ a 6 pt) y color;
  - van **sobre el estilo**: una celda puede quitar una línea del estilo o poner otra.
- **Las líneas viven en las aristas de la cuadrícula** de la tabla (`resolveBorders` en el núcleo), así que dos celdas vecinas dibujan siempre la misma línea, también con celdas combinadas. El editor, el Word y el PDF dibujan lo que calcula el núcleo.
- **En la barra de tabla** (la del manuscrito, ficha 0075, y la de la pestaña), un grupo nuevo, «Bordes», con el botón del menú de bordes (con el icono de «Todos los bordes») y, a su derecha, el de los estilos (orden e icono decididos por el usuario):
  - **Estilo**: «Como la revista (…)», «Tres líneas», «Líneas entre filas», «Cuadrícula» y «Sin líneas»;
  - **Bordes**: el menú de Word sobre las celdas seleccionadas (borde inferior, superior, izquierdo y derecho, sin borde, todos los bordes, bordes externos, bordes internos, borde horizontal interior y borde vertical interior), más «Quitar los bordes propios (los del estilo de tabla)»;
  - el **lápiz** del mismo menú: estilo de línea, grosor y color (automático y los colores de Word), con una muestra. Se conserva mientras la ventana está abierta, como en Word.
  - Al poner un borde en el límite de la selección, se pone también en la celda vecina del otro lado. Así un «sin borde» quita de verdad la línea compartida, como hace Word.
  - **El panel no se cierra al aplicar un borde** (pedido por el usuario), para poner varios a la misma selección; se cierra al pulsar fuera o con Escape.
  - **El panel marca los bordes que ya tiene la selección** (pedido por el usuario): un preajuste está marcado si todas sus líneas están puestas («Sin borde», si no hay ninguna). Pulsar uno marcado lo quita; uno sin marcar lo pone con el lápiz, como en Word. «Bordes internos» y sus variantes se desactivan cuando la selección no tiene celdas por dentro.
- **En el editor**, donde no hay línea se ve una cuadrícula discontinua muy tenue, como «Ver cuadrícula» de Word, **solo en la tabla donde está el cursor** (pedido por el usuario): al salir de ella se oculta, sin que nada se mueva. Nunca se exporta.
- **En el Word**, los bordes de cada celda (`w:tcBorders`, con estilo, grosor en octavos de punto y color). **En el PDF**, el trazo de cada celda (`table.cell(stroke: …)`). Typst no tiene línea doble, así que se dibuja una continua del doble de grosor.

## Por qué
- **Los dos:** los estilos dan en un clic lo habitual y coherente; los bordes por celda cubren los casos especiales, por ejemplo separar grupos de filas.
- **El estilo de la revista por defecto:** quien no toca nada envía lo que pide la revista.
- **Aristas y no lados sueltos:** en Word, cada celda guarda sus lados y dos vecinas pueden contradecirse; calcularlo por aristas da un solo resultado, igual en los tres sitios.

## Qué se descartó
- **Sombreado de celdas:** no se pidió. Se puede añadir con el mismo modelo.
- **Bordes diagonales** del menú de Word: no se usan en manuscritos.
- **Traer los bordes al pegar o importar desde Word:** las tablas de Word suelen venir con la «cuadrícula» del estilo «Tabla con cuadrícula», que la revista no quiere. Se siguen descartando (ficha 0022); el estilo de la revista los sustituye.

## Consecuencias
- **Formato:** `style` en `table` y `borders` en `tableCell` y `tableHeader` de `.scitable`; `tableStyle` en el perfil de revista. Todo opcional; esquemas y especificación actualizados.
- **Núcleo:** `table-borders.ts` (`resolveBorders`, `tableStyleOf`, `tableNodeBorders`). El Word y el PDF usan ahora las líneas calculadas en lugar de las tres líneas fijas.
- **Ventana:**
  - `table-lines.ts`: decoraciones con caché por tabla y órdenes `setTableStyle` y `applyBorders`;
  - `TableLinesTools.tsx`: el menú de estilos y el panel de bordes, fuera de la barra con un portal, porque la barra es un contenedor de CSS que los recortaría;
  - `FloatingPanel` en `Menus.tsx`.
- **Pruebas nuevas** (`packages/core/test/table-borders.test.ts`):
  - los cuatro estilos;
  - los bordes propios y «ninguno» sobre el estilo, y las aristas compartidas;
  - las celdas combinadas;
  - qué estilo manda;
  - el Word y el PDF.
- **Comprobado:**
  - **con Word real:** la cuadrícula, un borde doble rojo y uno discontinuo azul, como en el editor;
  - **en la vista del navegador:** «Cuadrícula» desde la barra, y un recuadro rojo de 1½ pt alrededor de cuatro celdas, que se guardan sin errores; el panel abierto tras aplicar, con «Sin borde», «Borde inferior» y «Borde superior» marcados según la celda y quitar uno pulsándolo otra vez; la cuadrícula que aparece al entrar en la tabla y se oculta al salir.
- **Sin probar** en la ventana de Tauri ni en WebKit.
