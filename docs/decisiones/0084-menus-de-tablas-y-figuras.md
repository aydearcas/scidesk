# 0084. Menús de las tablas y figuras en el navegador y con la tabla entera seleccionada

- **Fecha:** 23/11/2026
- **Estado:** hecha por petición del usuario (23/11), tras ver el proyecto de la prueba final ([0083](0083-prueba-final-de-la-fase-1.md)).
- **Pregunta del plan:** interfaz (fichas 0044, 0045 y 0079).

## Qué se decide
- **Sin colocar en el texto:**
  - Un clic, izquierdo o derecho, abre su menú. Antes, un clic la metía en el texto al momento.
  - El menú tiene:
    - «Insertar en el texto, donde está el cursor»;
    - «Eliminar del proyecto…», que pide confirmación, guarda antes una instantánea y borra el `.scitable` o `.scifigure`. La imagen de una figura se queda, para que la instantánea pueda devolverla.
  - En el núcleo, `deletePartFile`, que también usa «Deshacer el pegado».
- **Tablas y figuras del texto en el navegador:** el clic derecho abre su menú, en lugar del del navegador web:
  - «Ir a la tabla» o «Ir a la figura»;
  - «Abrir en su pestaña» (solo las tablas);
  - «Eliminar tabla del texto» o «Eliminar figura del texto», que deja el archivo en «Sin colocar».
  - El clic izquierdo sigue llevando a ella.
- **La tabla entera seleccionada** (con su asa o al hacer clic en su borde): el clic derecho da el menú de la tabla, no el del texto. Solo trae:
  - «Abrir en su pestaña» y «Eliminar tabla del texto»;
  - «Insertar tabla»;
  - cortar y copiar.
- **La figura entera seleccionada,** lo mismo: «Eliminar figura del texto», cortar y copiar.

## Por qué
- Un clic que mete una tabla en el texto sin preguntar sorprende. El usuario quería ver antes las opciones.
- Con la tabla entera seleccionada, «Insertar cita», «Añadir nota general» o «Marcar un pendiente» habrían escrito encima de la selección y la habrían quitado del texto. Por eso no se ofrecen.

## «Abrir en su pestaña» para una tabla sin colocar
Lo pidió el usuario después, y se hizo el mismo día (23/11).
- **Cómo funciona:** el menú de una tabla sin colocar ofrece también «Abrir en su pestaña».
  - La pestaña de una tabla del texto es una segunda vista de esa tabla dentro del texto (ficha 0045). Esta no está en el texto, así que su pestaña (`file:<ruta>`, `UnplacedTableTab` en `TableTab.tsx`) tiene un editor propio sobre su archivo, con las mismas herramientas.
  - Cada cambio se escribe en el `.scitable` tras 0,8 s de pausa y al cerrar la pestaña.
  - La pestaña se llama «… · sin colocar», y la línea de debajo dice que lo escrito va a su archivo.
- **Al volver al texto:** «Insertar en el texto» escribe antes lo último de la pestaña y la cierra (`closeFileTab`). «Eliminar del proyecto» también la cierra antes.
- **Limitaciones:**
  - Lo escrito en esa pestaña no pasa por el registro de recuperación: la pausa de escritura es corta por eso.
  - Las citas de una tabla sin colocar no se numeran mientras no esté en el texto.
