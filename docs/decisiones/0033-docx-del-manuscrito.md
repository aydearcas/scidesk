# 0033. DOCX del manuscrito completo: resumen, tablas, figuras, plantilla y formato de la revista

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1). Amplía el exportador del corte vertical ([0032](0032-corte-vertical.md)) y concreta dos marcas de la ficha [0025](0025-docx-con-marcas-y-campos.md) que no estaban especificadas: el texto generado y las llamadas a notas.
- **Pregunta del plan:** fase 1, «el DOCX exportado cumple la guía de Reumatología Clínica sin retoques» (PLAN.md, sección 8)

## Qué se decide
- **El DOCX lleva el manuscrito completo:**
  - los títulos;
  - el resumen de cada idioma con sus apartados y sus palabras clave («Palabras clave: a; b; c»);
  - el cuerpo y la bibliografía donde está el encabezado con papel `references`;
  - las tablas, con su pie, celdas combinadas, alineación por celda, anchos relativos de columna, filas de encabezado que se repiten en cada página y notas;
  - las figuras (PNG, JPEG, GIF o BMP, ajustadas al ancho del texto, con su texto alternativo), con su pie y sus notas;
  - las referencias cruzadas.
- **Numeración calculada al exportar:**
  - las tablas y las figuras, por orden de primera referencia cruzada (y, si no se citan, por su posición);
  - las letras de las notas específicas, por orden de primera llamada dentro de su tabla (R11);
  - las citas, en el orden del documento compuesto, con las de las tablas en el sitio donde se cita cada tabla.
- **Formato de tabla de revista:** solo líneas horizontales (arriba, bajo el encabezado y al final), sin bordes verticales ni sombreado (ficha 0022).
- **Plantilla de referencia:** `packages/core/assets/reference.dotx`, la del prototipo 3, hecha con Word y sin datos personales. Sus estilos se buscan por su nombre interno (`heading 1`, `caption`, `title`).
- **Formato del perfil de revista sobre la plantilla:**
  - el interlineado, el cuerpo y la fuente se aplican al estilo Normal;
  - los márgenes laterales se toman del perfil;
  - la página se numera, salvo que el perfil diga lo contrario;
  - los números de línea van si el perfil los pide.

  Con Reumatología Clínica: doble espacio, 12 puntos, márgenes de 2,5 cm y páginas numeradas.
- **El estilo de cita propio del perfil** (`resources/journals/styles/*.csl`, ficha 0026) se usa cuando el artículo elige ese estilo. Si no, se usa un estilo incluido con SciDesk o el archivo que indique el artículo.
- **Perfil «para coautores»:** las tablas y las figuras van donde se citan, para revisar cómodamente.
- **Perfil «para la revista»:**
  - las tablas van al final, una por página, si el perfil dice `tables: end`;
  - si el perfil pide la lista de pies de figura, los pies van en «Pies de figura» al final y las imágenes no se incrustan (se entregan aparte, V1).
- **Marcas nuevas en el DOCX para coautores** (completan la tabla de la ficha 0025 y la sección 9 de la especificación de formatos):
  - **El texto generado va antes del marcador del bloque:** «Tabla 1. », la letra de una nota y «Palabras clave: ». El lector lo guarda aparte (`lead`) y no lo compara, así que nunca vuelve como cambio del coautor.
  - **La letra de una nota es su número:** en la nota va dentro de un marcador `_SDn_n_…`, y cada llamada desde una celda es un campo `REF _SDn_n_… \h` con la letra en superíndice, igual que una referencia cruzada. Al importar, cada `REF _SDn_` cuenta como un solo carácter, como el nodo `noteRef` o `xref` en ProseMirror.
  - **Los encabezados que escribe la exportación** («Resumen», «Abstract», «Bibliografía», «Pies de figura») no llevan marcador y no se toman como párrafos nuevos al importar.
- **La importación compara con la versión enviada completa:** títulos, resumen y cuerpo, con cada tabla y figura en el sitio donde se cita. Las propuestas de una celda, un pie o una nota se anclan en el archivo `.scitable` o `.scifigure` correspondiente.

## Por qué
- **Con el ejemplo de artrosis de rodilla** (`packages/formats/examples/knee-oa`, con el perfil de Reumatología Clínica): Word abre el DOCX sin avisos (16 páginas, modo de compatibilidad 15, 131 marcadores ocultos). Al actualizar todos los campos (33 citas, 2 `SEQ Tabla`, 1 `SEQ Figura`, 3 referencias cruzadas, 4 llamadas a notas y la bibliografía), ningún resultado cambia. Las páginas muestran el doble espacio, el número de página y las tablas con el formato de revista y las letras de las notas.
- **Ida y vuelta:** la copia sin tocar da 0 propuestas. Una copia editada en Word real, con un cambio sin marcar en el resumen, otro en el pie de una tabla, un cambio marcado en una celda y un borrado marcado en una nota, da las 4 propuestas, cada una anclada en su archivo y con su autor, y la integridad cuadra.
- **Pruebas automáticas:** 5 nuevas (manuscrito completo, copia sin cambios, edición en una celda, perfil para la revista con tablas al final y lista de pies, tamaño de imagen y formato de página). En total, 11 en el núcleo y 21 en los formatos.

## Qué se descartó
- **Dejar el «Tabla 1.» y las letras de las notas dentro del marcador del bloque:** volvían como cambios del coautor en cada copia.
- **Escribir las llamadas a notas como texto en superíndice:** al importar no se distinguían de una letra escrita por el coautor.
- **Definir los estilos en código:** la plantilla los da, y el perfil solo ajusta el formato de página.
- **Incrustar las imágenes en el DOCX para la revista cuando la revista las pide aparte.**

## Consecuencias
- **Pendiente en la exportación:**
  - la portada aparte y el manuscrito cegado (R9) para la revisión doble ciego;
  - TIFF y SVG (hoy se avisa y se pone el nombre del archivo);
  - la alineación decimal (hoy, a la derecha);
  - las listas dentro de celdas;
  - los cambios marcados y los comentarios en el DOCX (V1);
  - las figuras como archivos separados y el paquete de envío (V1).
- **El navegador del proyecto en la ventana** sigue mostrando solo el cuerpo: las tablas, las figuras y el resumen se exportan, pero todavía no se editan en la ventana. Es el documento compuesto de la ficha 0021, que llega con el esqueleto de la interfaz.
- **Las pruebas con Word real son locales:** `packages/core/tools/word-inspect.ps1` (abre el DOCX, actualiza los campos y saca imágenes de páginas) y `tools/word-edit.ps1` (ahora con una lista de ediciones en JSON).
- Actualiza la sección 9 de [`docs/formatos/especificacion-formatos.md`](../formatos/especificacion-formatos.md).
