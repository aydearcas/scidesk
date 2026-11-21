# 0034. Portada aparte, generada desde los autores y el directorio de personas

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1).
- **Pregunta del plan:** fase 1, «portada aparte» en el formato de Reumatología Clínica (PLAN.md 5.3, 5.9 y 8)

## Qué se decide
- **La portada se genera como un DOCX propio** (`exports/<artículo>-portada.docx`, o `-title-page.docx` si el artículo está en inglés) a partir de `authors.json` y `people.json`. No se guarda nada nuevo: es una vista de esos datos.
- **Contenido:**
  - los títulos en cada idioma y el título corto;
  - la línea de autores con los números de afiliación en superíndice (numeradas por orden de primera aparición en la lista de autores), `*` para el autor de correspondencia y `†`, `‡`… para cada grupo de contribución igual;
  - las afiliaciones como «servicio, centro, ciudad, país», con el nombre del país en el idioma del artículo, sacado del código ISO;
  - la nota de contribución igual;
  - el autor de correspondencia con su correo;
  - los miembros de un autor de grupo;
  - los conflictos de interés, en una sola frase si todos los autores declaran lo mismo, o uno por autor;
  - los agradecimientos a las personas del directorio que no firman.
- **Formato:** la misma plantilla y el mismo formato del perfil de revista que el manuscrito ([0033](0033-docx-del-manuscrito.md)). Sin marcas de SciDesk ni metadatos de autor, porque no vuelve de los coautores.
- **Avisos** en el idioma del artículo: faltan los autores, falta el correo del autor de correspondencia o ningún autor declara conflictos.
- **El manuscrito para la revista no nombra a ningún autor** (los autores no están en el cuerpo y los metadatos se vacían), así que con la portada aparte el envío es apto para la revisión doble ciego de Reumatología Clínica. Las comprobaciones de cegado del texto (R9: el hospital, el comité de ética, las autocitas) siguen en V1.
- **Dónde se exporta:** la ventana tiene botones para la portada y para el DOCX para la revista; en la línea de comandos, `scidesk export --profile title-page`.

## Por qué
- Reumatología Clínica pide la portada aparte con los autores, las afiliaciones, los agradecimientos y los conflictos (PLAN.md 5.9). Con la ficha de cada persona en el directorio y lo de cada artículo en `authors.json` (ficha 0015), la portada no necesita escribirse a mano.
- **Con el ejemplo de artrosis de rodilla:** Word abre la portada sin avisos, en una página, con las 3 afiliaciones numeradas, la autora de correspondencia, la contribución igual de dos autores y el grupo en los agradecimientos. 3 pruebas automáticas nuevas (14 en el núcleo).
- Las pruebas encontraron un fallo en los datos de ejemplo: el correo de una autora llevaba tilde («lucía.herrera@…»). Se corrigió el generador de ejemplos.

## Qué se descartó
- **Mantener la portada como un `.scidoc` editable:** repetiría los datos de `authors.json` y se desincronizaría. Si hace falta texto libre en la portada, irá en `title-page.scidoc` como añadido, más adelante.
- **Poner las afiliaciones en el orden del directorio:** las revistas las numeran por orden de aparición.

## Consecuencias
- **Falta el formulario de autores en la ventana** para rellenar `authors.json` y `people.json`. Llega con el esqueleto de la interfaz; hoy se editan los archivos o se usan los del ejemplo.
- La declaración de financiación, la de ética y el resto de declaraciones van en `declarations.scidoc` (V1), no en la portada.
