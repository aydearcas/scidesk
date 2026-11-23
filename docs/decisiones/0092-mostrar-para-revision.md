# 0092. Mostrar para revisión y ajustes de la barra de revisión

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11), a petición del usuario al probar la barra de revisión (ficha 0091).

## Qué se hizo
1. **Cómo se ven los cambios, como en Word.**
   - El usuario pidió que, al desactivar el control de cambios, se viera el texto como quedará tras los cambios, y que al activarlo volvieran los tachados y subrayados, «como en Word».
   - En Word eso lo decide el desplegable «Mostrar para revisión», que es independiente del botón. Por eso se han hecho las dos cosas:
     - **El desplegable**, en la barra de revisión (`MARKUP_VIEWS`, `setMarkupView` en `track-changes.ts`):
       - **Todas las marcas:** inserciones subrayadas y borrados tachados, del color de su autor.
       - **Marcas simples:** el texto final, con una línea roja en el margen de cada párrafo, título o celda que tiene un cambio.
       - **Sin marcas:** el texto final.
       - **Original:** el texto de antes de los cambios.
     - **El botón lo cambia, como pidió el usuario:** al activar el control de cambios se pasa a «Todas las marcas» y al desactivarlo a «Sin marcas». Lo mismo al abrir un artículo, según cómo se dejó. Después se puede elegir otra vista en el desplegable.
   - Solo cambia la vista (un atributo `data-markup` de la página y CSS): los cambios siguen en el documento hasta que se aceptan o se rechazan. También la sigue la pestaña de una tabla.
   - El «¶» de un párrafo partido lleva ahora una clase (`change-pilcrow`, anotado en el `README.md` de `packages/suggest-changes`) para ocultarlo en las vistas sin marcas.
2. **La barra de revisión:**
   - **Los botones del principio:**
     - sin la etiqueta «Cambios»;
     - aceptar, rechazar, anterior y siguiente, solo con su icono (flechas más grandes), con el nombre al pasar el ratón;
     - «Aceptar todos» y «Rechazar todos» siguen con texto.
   - **El idioma del texto es un desplegable** (español, inglés de EE. UU. y del Reino Unido), con el del cursor elegido.

## Pruebas
En la vista del navegador:
- con un cambio (sustituir «población» por «gente»), las cuatro vistas muestran lo que deben: con todas las marcas, las dos palabras; con marcas simples y sin marcas, «gente»; en la original, «población»; la línea en el margen, solo con marcas simples;
- desactivar el control pasa a «Sin marcas», y activarlo, a «Todas las marcas»;
- la barra a 1.700 px de ancho;
- rechazar todo.

Sin errores en la consola.
