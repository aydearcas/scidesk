# 0066. «Solo en esta sección» al buscar, y «Mantener formato de origen» al pegar

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise).
- **Pregunta del plan:** PLAN 5.2 (buscar y reemplazar «también solo en esta sección») y R23 (opciones de pegado como en Word).

## Qué se decide
- **«§» en la barra de buscar y reemplazar**: limita la búsqueda, el resaltado y «Reemplazar todo» a la sección donde está el cursor.
  - La sección empieza en su título y llega hasta el siguiente título del mismo nivel o superior, con sus subsecciones: «Métodos» incluye «Pacientes».
  - Dentro del resumen, una tabla o una figura, es esa parte.
  - Antes del primer título, es lo que hay hasta él.
  - El aviso del botón nombra la sección («Solo en «Introducción»») y otra pulsación vuelve a buscar en todo.
  - El rango sigue a los cambios, así que reemplazar no lo descoloca. Al cerrar la barra se olvida.
- **«Mantener formato de origen» al pegar desde Word**, como el botón de opciones de pegado de Word:
  - en el modo «Fuente libre» (ficha 0047), tras pegar texto de Word sin tablas, un aviso ofrece «Mantener formato de origen»;
  - al pulsarlo, se deshace el pegado y se repite conservando la fuente y el tamaño de Word, como marcas `fontFamily` y `fontSize`. Se conservan los de cada fragmento y también los que vienen del estilo del párrafo en la hoja de estilos del portapapeles (`p.MsoNormal` → Calibri 11);
  - por defecto sigue siendo «Combinar formato», que conserva negrita, cursiva, índices, color y resaltado y toma la fuente del documento. «Solo texto» sigue en Ctrl+Mayús+V;
  - si el texto ha cambiado desde el pegado, el aviso pide volver a pegar en lugar de adivinar.
- **Las marcas de fuente y tamaño se leen juntas** de un mismo `<span>`: antes, la primera regla consumía el elemento y la segunda no llegaba a leerse.

## Por qué
- «Solo en esta sección» lo pedía el plan desde la v0.4: se cambia un término en los métodos sin tocar la discusión.
- **El aviso solo aparece en «Fuente libre»:** en «Fuente adaptada a la revista», las fuentes propias se ocultan (ficha 0047) y mantenerlas no se vería. Así se evita un aviso en cada pegado.
- **Rehacer el pegado en lugar de convertir lo ya pegado:** el HTML de Word ya no está en el documento y las fuentes del estilo del párrafo solo están en el portapapeles.

## Qué se descartó
- **Un menú de opciones de pegado sobre el texto pegado** (el botón flotante de Word): más interfaz que diseñar. El aviso con su acción cumple la misma función. Si el usuario prefiere el botón, se hace.
- **Mantener también márgenes, sangrías y espaciado de Word:** el formato del documento lo marca la revista (R23).

## Consecuencias
- **Probado en la vista del navegador:**
  - un pegado de Word con hoja de estilos queda primero sin fuentes y, con «Mantener formato de origen», con Calibri 11 en el texto y Arial 14 y el color en el fragmento, sin duplicar el texto; la cinta muestra la fuente y el aviso de «fuente propia» (ficha 0047) cuenta los fragmentos;
  - «§» deja «artritis» en 1 de 1 dentro de «Introducción», frente a 4 en todo el documento;
  - sin errores en la consola.
- **Pruebas nuevas:** el alcance de una sección (subsecciones, nivel, texto antes del primer título) en `apps/desktop/src/find.test.ts`.
- **Sin probar** con el portapapeles real de Word: el pegado se simuló con su HTML.
