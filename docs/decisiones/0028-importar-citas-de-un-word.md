# 0028. Importar las citas de un Word: EndNote y Zotero desde el propio documento

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 10 de la fase 0). Concreta R1 y la importación de citas de [0007](0007-referencias.md).
- **Pregunta del plan:** R1, prototipo 10 de la sección 8

## Qué se decide
- **Leer las citas del propio documento, sin el gestor de referencias instalado.** Se recorren el texto, las notas al pie y las notas finales, también dentro de las tablas, y se ignoran las citas dentro de cambios marcados como borrados.
  - **EndNote:** cada campo `ADDIN EN.CITE` lleva el XML `<EndNote><Cite>…<record>…</record></Cite></EndNote>`. El XML está en el código del campo o, si es largo, en el `<w:fldData>` (base64, UTF-8) del campo anidado `ADDIN EN.CITE.DATA`.
  - **Zotero:** el JSON de `ADDIN ZOTERO_ITEM CSL_CITATION`.
  - **Mendeley Desktop:** el mismo JSON, en `ADDIN CSL_CITATION`.
  - **Mendeley Cite** (controles de contenido) queda pendiente de un ejemplo real.
- **Una referencia por identidad, en orden de primera cita:**
  - EndNote: `db-id` + número de registro;
  - Zotero y Mendeley: URI.
  
  Si el proyecto ya tiene la referencia (mismo DOI o PMID), se enlaza a la existente.
- **EndNote XML se convierte a CSL-JSON** con la tabla del prototipo (`prototypes/10-import-word-citations/src/endnote-to-csl.mjs`):
  - DOI de `electronic-resource-num`;
  - PMID de `accession-num`;
  - PMCID de los campos personalizados;
  - organizaciones como nombre literal.
  
  Lo que no se convierte se muestra, no se descarta en silencio.
- **La importación se comprueba con el propio documento antes de sustituir nada.** Deben coincidir con la bibliografía del documento el número de referencias, su orden y los números que muestra cada cita. Si no cuadra, se avisa.
- **La bibliografía del documento no se importa como texto:** la genera SciDesk con su estilo.

## Por qué
- **Con tres Word reales del usuario se recupera todo.** Son dos revisiones narrativas y un informe de RS con 137 tablas, con 164 citas de EndNote, 113 de ellas con los datos en `EN.CITE.DATA`. En cada documento:
  - la biblioteca tiene exactamente las referencias de su bibliografía (23, 19 y 52), en el mismo orden;
  - los números de todas las citas coinciden con los que da citeproc-js (45/45, 64/64 y 55/55);
  - los datos de cada registro (apellidos, título, año, volumen, primera página y revista) aparecen en la entrada del documento, con dos excepciones que son del propio documento.
- **Zotero funciona igual.** Las copias del prototipo 5 actualizadas con Zotero se importan igual de bien: 37 de 37 referencias, 33 de 33 citas.
- **No hace falta el gestor.** Los registros completos viajan dentro de cada cita, así que no se necesita EndNote ni acceso a la biblioteca del autor.

## Qué se descartó
- **Reconstruir las referencias a partir de la bibliografía en texto:** es menos fiable, y los registros completos ya están en las citas.
- **Exigir EndNote instalado o una exportación EndNote XML** para importar un Word.

## Consecuencias
- **«Nuevo artículo a partir de un Word»** (fase 1 en versión básica, citas en la fase 2) usa este lector.
- **El mismo lector sirve para las copias de coautores (fase 2):** reconoce las citas que inserta un coautor con EndNote o con Zotero.
- **Los registros de EndNote traen datos de calidad variable** (autores mal escritos, títulos que faltan en la salida). La verificación de referencias contra PubMed y Crossref (R10) es la que debe señalarlos.
- **Quedan sin probar:**
  - Mendeley Cite;
  - citas de EndNote «sin formatear» (`{Autor, año #n}`, que se resolverían como citas escritas a mano, R24);
  - estilos autor-año;
  - citas en notas al pie.
- **Rendimiento:** leer un Word de 1 MB con 137 tablas tarda 1,9 s. Se hace en segundo plano.
- Detalle y cifras en [`prototypes/10-import-word-citations/README.md`](../../prototypes/10-import-word-citations/README.md). Los documentos del usuario y lo que se extrae de ellos no están en el repositorio.
