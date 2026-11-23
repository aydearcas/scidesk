# 0070. Numeración de las secciones

- **Fecha:** 23/11/2026
- **Estado:** hecha. La idea es del usuario; la propuesta se le presentó y la aceptó («Sí, empieza», 23/11). Es el primer paso de la propuesta, que sigue con añadir secciones (ver «Consecuencias»).
- **Pregunta del plan:** ninguna; la pidió el usuario al probar la cinta.

## Qué se decide
- **La numeración es un ajuste del artículo, no texto.** Los números se calculan, como «Tabla 1.», y se renumeran solos al mover, añadir o quitar secciones.
- **Tres opciones:** sin numerar, «1.» y «1.1.» (como Elsevier) y «1» y «1.1» (como Springer).
- **Dónde se guarda y qué manda:**
  - en `article.json`, `sectionNumbering` («1.», «1» o «none»);
  - si no está, manda el dato nuevo del perfil de revista (`manuscriptFormat.sectionNumbering`, con su fuente);
  - si la revista no lo dice, sin numerar, que es lo habitual en biomedicina.
- **Qué se numera:** los títulos de nivel 1 a 3 del cuerpo.
  - Nunca el título del artículo ni el resumen.
  - Las secciones finales de nivel 1 no llevan número: bibliografía, agradecimientos, financiación, conflicto de intereses, ética, consentimiento, disponibilidad de datos, registro, uso de IA, contribuciones y apéndices. Como subsecciones (por ejemplo, «Consideraciones éticas» dentro de Métodos) sí se numeran.
  - Un título marcado sin número (atributo nuevo `numbered: false`) se queda sin número, y sus subsecciones también; la sección siguiente de su nivel sigue la cuenta.
  - Una subsección antes de cualquier sección da «0.1», como Word.
- **En la ventana:**
  - el número se dibuja delante de cada título, como decoración, nunca como texto;
  - el navegador muestra las secciones con su número;
  - un menú junto a «Manuscrito», en el navegador, elige la numeración: «Como la revista», «Sin numerar», «1. y 1.1.» o «1 y 1.1»;
  - el menú contextual de un título tiene «Numerar esta sección», marcable.
- **En el Word**, la numeración es de Word:
  - una lista multinivel propia (`numId` 9000) ligada a los estilos Título 1, 2 y 3 de la plantilla, con un espacio tras el número;
  - los títulos sin número llevan `numId 0`, también el «Resumen», la bibliografía y la lista de pies de figura;
  - si un coautor añade una sección con el estilo «Título 1», Word la numera sola; los números nunca son texto, así que la copia devuelta no los trae.
- **En el PDF**, el número va como texto delante del título, escapado («2\\.») para que Typst no lo tome por una lista. Así coincide siempre con el editor y el Word.
- **Línea de órdenes:** `scidesk section-numbering <carpeta> none|1.|1|journal`, que además lista los títulos con su número.

## Por qué
- **Calculada y no escrita:** como las tablas y figuras, para que nunca se desordene al mover secciones ni vuelva como cambio de un coautor.
- **Lista de Word ligada a los estilos y no texto generado:** es lo que hace Word al numerar títulos, y es lo único que numera una sección que añada un coautor.
- **Las secciones finales sin número:** es lo que hacen las revistas que numeran (Elsevier, Springer). Agradecimientos o bibliografía con número serían un error de formato.
- **Por defecto, sin numerar:** en biomedicina casi ninguna revista numera; el perfil de cada revista lo cambia.

## Qué se descartó
- **Numeración con números romanos o letras:** ninguna revista del sector la pide; se añade si aparece.
- **Numerar con la numeración propia de Typst** (`#set heading(numbering:)`): numeraría también el «Resumen» y las subsecciones de una sección sin número.

## Consecuencias
- **Formato:** `sectionNumbering` en `article.json` y en el perfil de revista, y `numbered` en el título (todos opcionales; esquemas y especificación actualizados).
- **Arreglado de paso:** en el Word para coautores, el nombre de una imagen que no se puede incrustar (`[figures/…]`) volvía como párrafo nuevo al importar la copia. Ahora va delante del marcador de la figura y el lector lo trata como texto generado.
- **Pruebas nuevas** (`packages/core/test/sections.test.ts`):
  - las reglas (niveles, secciones finales, «sin número», «0.1»);
  - qué ajuste manda (artículo, revista o ninguno) y que se guarda;
  - el Word: estilo de título con su `numPr`, la lista en `numbering.xml` en su orden, `numId 0` en la bibliografía y sin números en el texto, y la copia devuelta sin propuestas;
  - la fuente de Typst, y que sin numeración el Word no cambia.
- **Comprobado con Word real:**
  - Word calcula los mismos números que SciDesk («Resumen» y «Bibliografía» sin número; 1., 2., 2.1., 3., 4.);
  - una sección «Limitaciones» añadida con el estilo «Título 1» sale como 4., y «Discusión» pasa a 5.;
  - al importar esa copia vuelve una sola propuesta, «Limitaciones», sin número, con la integridad bien.
- **Comprobado en el PDF** (imagen de la página) y **en la vista del navegador:** el menú, los números en el editor y el navegador, una subsección «2.1.» y «Numerar esta sección».
- **Sin probar** en la ventana de Tauri y en WebKit.
- **Siguiente paso de la propuesta aceptada:**
  - añadir secciones desde el navegador, con su tipo;
  - deducir el tipo de un título escrito a mano;
  - avisos de las declaraciones que pide la revista;
  - más adelante, referencias cruzadas a secciones.
- **Pendiente:** que «Nuevo desde Word» detecte si los títulos del Word están numerados.
