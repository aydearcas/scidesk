# 0060. El idioma de un fragmento en el editor y en las exportaciones

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise). Lleva a la ventana la marca `lang` que el formato tenía desde la ficha 0031 (R20) y que la ficha 0057 dejó pendiente.
- **Pregunta del plan:** R20 (idioma por fragmento [V1], adelantado a la fase 1), R29.

## Qué se decide
- **Dónde va el idioma**, como ya preveía el formato:
  - en un fragmento, la marca `lang` (`<span lang="en">` en el editor);
  - en un párrafo, su atributo `lang`;
  - en el resumen de cada idioma, el de su sección;
  - si no, el del artículo.
  Solo se escribe una marca o un atributo cuando el idioma **cambia** respecto a lo que lo rodea.
- **Cómo se pone** (no se ve en el texto, como en Word):
  - **Revisar › Idioma: español / Idioma: inglés**: con texto seleccionado, solo ese fragmento; sin selección, el párrafo, y se quitan las marcas que ya repiten el idioma nuevo;
  - **la barra de estado** muestra el idioma en el cursor («inglés (fragmento)» si es una marca) y es un selector que hace lo mismo que el menú;
  - **el menú de una palabra subrayada** que sí es del otro idioma ofrece «Marcar «Rheumatoid Arthritis Impact of Disease» como inglés». El tramo crece por las palabras vecinas que son de ese idioma y no del de aquí, y por las que valen en los dos solo si quedan entre dos de ellas; nunca pasa de un punto, dos puntos, un paréntesis o unas comillas.
  Todo se deshace con Ctrl+Z.
- **Lo que viene de Word**, al pegar y con «Nuevo desde Word»: Word marca con un idioma casi cada tramo de texto, y se equivoca a menudo. Por eso:
  1. se quitan las marcas que repiten el idioma de alrededor y las que están sobre texto sin letras;
  2. las que quedan se **comprueban con los diccionarios**: un fragmento conserva la marca solo si tiene al menos tantas palabras exclusivas del idioma marcado como del idioma de alrededor;
  3. una marca a un idioma sin diccionario (alemán, por ejemplo) se quita si la mayoría de sus palabras son del idioma de alrededor;
  4. los nombres que no están en ningún diccionario conservan la marca, que no molesta.
  Al pegar, la comprobación llega un instante después y no ocupa un paso del historial. En la línea de comandos (`scidesk from-word`) se usa el mismo corrector en Node (`@scidesk/spell/node`).
- **En el Word exportado:**
  - el idioma por defecto del documento es el del artículo; antes era siempre el de la plantilla (es-ES), y un artículo en inglés llegaba a los coautores con todo marcado como español;
  - cada fragmento en otro idioma lleva su `w:lang` (en-US, es-ES…), igual que el resumen en el otro idioma y sus etiquetas.
- **En el PDF** (Typst): `#text(lang: …)` en cada fragmento o párrafo en otro idioma, y `#set text(lang: …)` en el resumen de otro idioma. Sirve para partir palabras y para el idioma de cada parte en el PDF etiquetado.
- **En el núcleo** (`lang.ts`): `normalLang` (la etiqueta ordenada: `EN-us` → `en-US`), `sameLang` (es y es-ES son el mismo; en-GB y en-US, no), `cleanLangMarks` y `verifyLangMarks`, con el corrector pasado como función. Así el núcleo no carga diccionarios por su cuenta.

## Por qué
- **Era lo que más subrayados dejaba:** con el diccionario de especialidad (ficha 0059), casi todo lo que queda en los textos del usuario es inglés sin marcar dentro de un texto en español: títulos de cuestionarios, nombres de escalas y citas literales.
- **Las marcas de Word no son fiables tal cual.** En el informe de 135 tablas del usuario, Word marca como inglés el 13–15 % del texto. Dentro de esas marcas hay 5.145 palabras solo inglesas y 635 solo españolas, y unas 220 de 750 tiradas son en realidad español («Bibliografía», «Enzimas musculares», listas de fármacos). Tras la comprobación, las palabras solo españolas bajan a 76 y no queda ninguna tirada que parezca español. En las dos revisiones narrativas, la única marca era el título «Bibliografía», marcado como inglés, y desaparece.
- **El Word de los coautores** usa esos idiomas para su propio corrector: con el idioma bien puesto no les subraya todo el resumen en inglés ni el artículo entero si está en inglés.

## Qué se descartó
- **Copiar las marcas de Word sin comprobarlas:** un tercio de las tiradas marcadas como inglés serían español, y el corrector las subrayaría enteras.
- **Quitar todas las marcas de Word:** se perdería el inglés bien marcado, que es la mayoría.
- **Mostrar el idioma en el propio texto** (subrayado o color): Word no lo hace, y chocaría con el subrayado del corrector. El idioma se ve en la barra de estado. Si el usuario lo quiere visible, se puede añadir como opción.
- **Aceptar en un texto en español las palabras que valen en inglés:** taparía erratas (ficha 0059).
- **Un submenú de idiomas:** por ahora solo hay diccionarios de español e inglés. Con más idiomas, el selector de la barra de estado crecerá.

## Consecuencias
- **Probado en la vista del navegador:**
  - en «Usamos el cuestionario Rheumatoid Arthritis Impact of Disease en la consulta», el menú de «Rheumatoid» ofrece marcar el título entero como inglés, sin «en la consulta», y los subrayados desaparecen;
  - la barra de estado dice «inglés (fragmento)» dentro del título;
  - al pegar HTML de Word, «Bibliografía de enzimas musculares», marcado como inglés, queda en español, y «Health Assessment Questionnaire» conserva `en-US`;
  - Revisar › Idioma: inglés en un párrafo subraya sus palabras en español y quita la marca que sobraba, y Ctrl+Z lo deshace todo;
  - sin errores en la consola.
- **Probado con los Word del usuario** («Nuevo desde Word» en el núcleo y `scidesk from-word`), solo en local.
- **Arreglado de paso:** el corrector no volvía a mirar un párrafo cuando solo cambiaban sus marcas o atributos (los pasos sin desplazamiento); ahora sí.
- **Pruebas nuevas:** 5 en `packages/core/test/lang.test.ts` (etiquetas; marcas que repiten el idioma; comprobación con diccionarios; validez en el formato; idioma por defecto y fragmentos en el DOCX y en Typst).
- **Sin probar** en la ventana real de Tauri ni en el MacBook; el pegado se probó con un evento sintético, no con el portapapeles real de Word.
- **Pendiente:**
  - leer el idioma de los estilos de Word (hoy solo el de cada tramo);
  - leer `w:lang` en las copias devueltas por los coautores (hoy se ignora; no crea propuestas);
  - más idiomas cuando haya diccionarios;
  - «No revisar la ortografía» para un fragmento (`w:noProof` en Word).
