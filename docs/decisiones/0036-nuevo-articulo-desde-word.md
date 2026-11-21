# 0036. Nuevo artículo a partir de un Word (versión básica)

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1). Las citas vivas a partir de los campos de EndNote, Zotero y Mendeley siguen en la fase 2 ([0028](0028-importar-citas-de-un-word.md)).
- **Pregunta del plan:** R1, «"Nuevo artículo a partir de un Word", en versión básica: secciones, tablas y figuras» (PLAN.md 5.1 y 8)

## Qué se decide
- **Se crea un proyecto nuevo a partir de un DOCX**, en una carpeta vacía. El Word original no se toca ni se envía a ningún sitio.
- **Qué se reconoce:**
  - **Estilos por su nombre interno.** Word traduce los identificadores («Ttulo1»), así que se miran el nombre, la herencia de estilos y el nivel de esquema.
  - **El título** (estilo Título), y uno segundo como título en el otro idioma.
  - **Los encabezados**, con su nivel y el papel deducido de su texto: introducción, métodos (con «Pacientes y métodos» y «Material y métodos»), resultados, discusión, conclusiones, referencias, agradecimientos, financiación, conflictos, ética y uso de IA, en español y en inglés.
  - **El resumen:** lo que va bajo un encabezado «Resumen», «Abstract» o «Summary», con una sección por idioma y la línea «Palabras clave:» convertida en palabras clave.
  - **Los párrafos,** con negrita, cursiva, superíndice y subíndice.
  - **Las listas** con viñetas o numeradas (planas por ahora).
  - **Los cambios marcados se toman aceptados.** De los campos se queda su resultado; las citas quedan como texto hasta la fase 2.
  - **Las tablas,** cada una en su `.scitable`:
    - con celdas combinadas horizontal y verticalmente, filas de encabezado, alineación y anchos relativos;
    - con su pie, el párrafo «Tabla N.» de antes o de después, o el título escrito en una sola celda que ocupa toda la primera fila, con número o sin él;
    - con sus notas: los párrafos cortos que siguen a la tabla y empiezan por «Abreviaturas», «Nota», «Fuente», una letra o un símbolo, o una abreviatura con dos puntos («IC: …»).
  - **Las imágenes** (PNG, JPEG, GIF, TIFF, SVG, EPS o PDF) se extraen a `figures/`, cada una con su `.scifigure` y su pie «Figura N.».
  - **Las referencias cruzadas escritas a mano** («tabla 2», «Figure 1») pasan a ser referencias cruzadas vivas cuando esa tabla o figura existe.
- **Avisos** para lo que no encaja:
  - tablas sin pie (agrupadas en un solo aviso);
  - imágenes EMF o WMF (no pueden ser figuras todavía);
  - dos tablas con el mismo número;
  - falta el estilo Título (se usa el nombre del archivo);
  - la bibliografía llega como texto.
- **El editor de la ventana muestra todo lo importado:**
  - listas y referencias cruzadas, numeradas como en la exportación;
  - el sitio de cada tabla y figura, como un bloque que no se edita y que dice en qué archivo vive (editarla dentro del documento llega con el esqueleto de la interfaz, ficha 0021);
  - si el documento trae algo que el editor no sabe mostrar, la ventana lo dice en lugar de quedarse en blanco.
- **Dónde:** el botón «Nuevo desde Word…» de la ventana (en Tauri, pide una carpeta vacía) y `scidesk from-word <carpeta vacía> <archivo.docx>`.

## Por qué
- Es la puerta de entrada para los artículos ya empezados (R1) y uno de los criterios de «terminado» de la fase 1: «un Word tuyo ya empezado se importa con sus secciones, tablas y figuras».
- **Con el Word sintético del corpus** (hecho con Word, estilos en español): título, resumen con 6 palabras clave, 16 encabezados (introducción, conclusiones y referencias con su papel), 2 tablas con celdas combinadas y 3 notas, y 2 referencias cruzadas. El proyecto valida y se vuelve a exportar sin avisos.
- **Con un DOCX que exporta SciDesk:** resumen en dos idiomas y la figura con su imagen y su pie.
- **Con los tres Word reales del usuario,** solo en local (no entran en el repositorio y no se muestra su contenido):
  - los tres dan proyectos válidos, en 1 a 4 segundos;
  - el informe de 135 tablas se vuelve a exportar a DOCX sin avisos;
  - 9 de sus tablas tienen pie (2 con «Tabla N.» y 7 con el título en la primera fila) y se reconocen 38 notas. Las otras 126 tablas de verdad no tienen pie en el documento, y así se avisa.
- **Pruebas:** 3 nuevas (22 en el núcleo).

## Qué se descartó
- **Reconocer los títulos por el tamaño o la negrita del texto:** demasiados falsos positivos. Los estilos y el nivel de esquema son lo que Word usa para el índice.
- **Tomar como pie cualquier párrafo que empiece por «Tabla»** fuera de la primera fila de la tabla: en el texto hay frases que empiezan así.
- **Copiar el Word original dentro del proyecto:** el usuario lo conserva donde estaba.

## Consecuencias
- **Queda para la fase 2:**
  - las citas vivas desde los campos (con el lector del prototipo 10);
  - los comentarios y los cambios marcados como propuestas.
- **Queda para el resto de la fase 1:**
  - los autores y las afiliaciones del Word, que hoy quedan como párrafos del cuerpo;
  - las listas anidadas;
  - las notas al pie;
  - las imágenes EMF y WMF (con la conversión de imágenes en Rust, PLAN.md 6.2);
  - las llamadas de nota en las celdas (hoy las notas son todas generales).
