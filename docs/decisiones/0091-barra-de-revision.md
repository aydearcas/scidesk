# 0091. «Revisar» abre una barra de revisión

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11), a petición del usuario mientras probaba el control de cambios (ficha 0090).

## Qué se hizo
- **«Revisar» en la barra de título ya no despliega un menú.** Es un botón que se activa y se desactiva; activado, se ve marcado (`toggle` en `MenuDef`, `Menus.tsx`).
- **Abre una barra de revisión debajo de la cinta** (`ReviewBar.tsx`):
  - va a todo el ancho de la ventana y queda fija como la cinta, no dentro de la hoja como la barra de tabla (lo pidió así el usuario);
  - si está abierta o no se recuerda en los ajustes del equipo (`reviewBar`).
- **La barra lleva lo que tenía el menú, en tres grupos:**
  - **Cambios:** control de cambios (marcado si está activado), aceptar y rechazar el cambio del cursor (desactivados si no hay ninguno), anterior, siguiente, aceptar todos y rechazar todos.
  - **Revisión:** avisos, copia devuelta y autores.
  - **Idioma y corrección:** ortografía, autocorrección, español, inglés de EE. UU. y del Reino Unido (marcado el del cursor) y homogeneizar el inglés.
- **Ventanas estrechas:** la barra sigue en una fila. Por debajo de unos 1320 px desaparecen los títulos de grupo y los botones con icono se quedan solo con el icono, con su nombre al pasar el ratón; si aun así no cabe, se desplaza en horizontal.
- **Ctrl+Mayús+E** sigue activando y desactivando el control de cambios, y el clic derecho sobre un cambio sigue ofreciendo aceptarlo o rechazarlo.

## Pruebas
En la vista del navegador:
- abrir y cerrar la barra;
- activar el control de cambios desde ella;
- escribir y aceptar el cambio desde la barra;
- deshacer;
- desactivarlo.

Sin errores en la consola. Las pruebas del editor no usaban el menú.
