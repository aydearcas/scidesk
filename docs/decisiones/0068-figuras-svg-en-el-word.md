# 0068. Figuras SVG en el Word

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise).
- **Pregunta del plan:** PLAN 5.4, «Insertar imagen (PNG, JPG, TIFF, SVG)». Lo dejó pendiente la ficha 0033 («TIFF y SVG: hoy se avisa y se pone el nombre del archivo»).

## Qué se decide
- **Una figura SVG va al Word como SVG, con una PNG de reserva**, como hace Word al insertar un SVG:
  - Word 2016 y posteriores dibujan el SVG, que se ve nítido a cualquier tamaño;
  - las versiones anteriores y otros programas muestran la PNG.
- **La PNG la dibuja el lado de Rust con resvg**, la misma biblioteca que ya usa Typst para los SVG del PDF:
  - con las fuentes del equipo, así que el texto de un gráfico sale con su fuente (Arial y Times New Roman si el SVG pide una genérica);
  - al doble de su tamaño, con el lado mayor en 2400 píxeles como mucho (unos 16 cm a 300 ppp);
  - sobre fondo blanco;
  - sin leer archivos de fuera del SVG.
- **El tamaño de la figura en el Word es el del propio SVG** (su ancho y alto, o su `viewBox`), reducido al ancho del texto si no cabe, como las demás imágenes.
- **Dónde se dibuja:**
  - en la ventana, el comando `raster_image`;
  - en la línea de órdenes, `scidesk-pdf --raster <imagen> <salida.png>`. `scidesk export` lo usa si el binario está compilado; si no, avisa como antes;
  - en la vista del navegador, el propio navegador sobre un lienzo (canvas).
- Si no se puede dibujar, la exportación avisa con el motivo y deja el nombre del archivo, como antes.

## Por qué
- **SVG con PNG de reserva, y no solo PNG:** es lo que hace Word y lo que esperan los coautores. Además, el SVG no pierde calidad al ampliarlo.
- **Rust y resvg:** ya estaban en el programa a través de Typst (resvg: Apache-2.0 o MIT; tiny-skia: BSD-3-Clause). No ha hecho falta descargar nada nuevo.
- **El núcleo recibe el dibujante inyectado** (`rasterize` en los recursos de la exportación), como el compilador de Typst: el núcleo sigue sin depender de la plataforma.

## Qué se descartó
- **Dibujar la PNG en TypeScript:** haría falta un intérprete de SVG con fuentes en JavaScript. El navegador lo hace solo en la vista de pruebas.
- **TIFF, aplazado por el usuario al final del desarrollo** (22/11/2026: «apunta el manejo de TIFF como desarrollo futuro cuando se haya acabado todo»). Ni Word a través de la biblioteca `docx`, ni los navegadores, ni Typst leen TIFF, así que hoy una figura TIFF se queda en su nombre de archivo, con un aviso. Cuando se retome:
  - hará falta convertirlo con el crate `tiff` (MIT), que no está descargado, y pedir permiso para descargarlo;
  - la misma función `to_png` daría la PNG de un TIFF para el Word, el PDF y el editor.

## Consecuencias
- **Pruebas nuevas:**
  - en Rust (`raster.rs`), el tamaño, los colores y el texto dibujado de un SVG, el límite de 2400 píxeles y lo que no se puede leer;
  - en `packages/core/test/manuscript.test.ts`:
    - el SVG y la PNG en `word/media`, el tamaño del SVG en el dibujo;
    - la copia para coautores vuelve sin propuestas;
    - el aviso sin dibujante y cuando el dibujante falla;
    - el binario `scidesk-pdf --raster` de verdad.
- **Comprobado con Word real** (`tools/word-inspect.ps1`) con la demostración y su gráfico SVG:
  - se abre sin avisos y la figura se ve en su sitio, con su pie;
  - actualizar los campos no cambia nada;
  - la PNG de reserva tiene el texto de los ejes.
- **Probado en la vista del navegador:** el Word para coautores de la demostración lleva `image1.svg` e `image1.png`, sin aviso y sin errores en la consola.
- **Sin probar** el comando `raster_image` en la ventana real de Tauri (sí la misma función de Rust y el binario).
