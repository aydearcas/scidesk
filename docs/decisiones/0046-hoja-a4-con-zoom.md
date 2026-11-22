# 0046. La hoja del editor es un A4 con zoom al ancho

- **Fecha:** 22/11/2026
- **Estado:** aceptada (decisión del usuario del 22/11/2026, al probar la ventana).
- **Pregunta del plan:** fase 1, editor (PLAN.md 5.2); propuesta de interfaz, sección 4.1.

## Qué se decide
- **La hoja del manuscrito es un A4** (21 × 29,7 cm) con márgenes de 2,5 cm y texto de 12 pt. Desde el principio tiene el alto de una página entera, aunque el texto sea corto. Si el texto pasa de una página, la hoja crece: sigue siendo texto continuo, porque la paginación real es la de la vista previa con Typst.
- **Zoom de la hoja.** Lo que se elija se guarda en los ajustes de cada equipo (`zoom` en `settings/interface.json`).
  - **«Ajustar al ancho»** (por defecto): la hoja llena el ancho que dejan los paneles, como «Ancho de página» en Word, entre el 50 y el 200 %. Con 1920 px y los dos paneles abiertos sale al 152 %; con 1440 px, al 91 %.
  - Pasos fijos del 50 al 300 %, con − y + y un desplegable en la barra de estado, el menú Ver y Ctrl + rueda del ratón sobre la hoja. Sin esto último, la vista web ampliaría toda la ventana.
- **El zoom no usa `zoom` ni `transform` de CSS.** Todas las medidas y tamaños de letra de la hoja se multiplican por una variable (`--zoom`), y dentro de ella los tamaños van en `em`. Así ProseMirror calcula bien las posiciones del ratón y del cursor.
- **Un clic en la parte vacía de la hoja**, debajo del texto, pone el cursor al final, como en Word.
- La pestaña de una tabla usa el mismo zoom, con una hoja más ancha que el A4.

## Por qué
- **Lo pidió el usuario.** En pantalla completa, la hoja de 800 px dejaba mucho espacio vacío a los lados. Además, la hoja crecía al escribir en lugar de parecer una página desde el principio.
- **Se descartó ensanchar la hoja con el mismo tamaño de letra:** las líneas serían muy largas y la hoja dejaría de parecer una página.
- **Por qué no `zoom` de CSS:** con él, ProseMirror ha tenido problemas para calcular las coordenadas en algunos motores.

## Qué se descartó
- Una hoja más ancha que un A4, con el mismo tamaño de letra.
- `zoom` o `transform: scale` de CSS sobre la hoja.

## Consecuencias
- Con una ventana estrecha y los dos paneles abiertos, «Ajustar al ancho» llega al mínimo del 50 % y la letra se lee mal. Conviene cerrar un panel o elegir un zoom fijo, que puede sacar una barra horizontal.
- **El tamaño de letra del texto es otra cosa.** El usuario propuso un modo de fuente libre, con tamaño por selección y «Adaptar a la revista», frente a un modo adaptado a la revista. Está pendiente de su confirmación, y afecta al formato `.scidoc` (marcas nuevas).
- Probado en la vista del navegador a 1024, 1440 y 1920 px. Sin probar en la ventana de Tauri ni en WebKit.
