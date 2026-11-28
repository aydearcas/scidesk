# 0104. Citas vivas al crear un artículo desde un Word (final de la fase 2)

- **Fecha:** 28/11/2026
- **Estado:** hecha (28/11). El usuario pidió seguir con el desarrollo; es lo último de la fase 2, que el usuario dejó para el final (23/11, ficha [0090](0090-control-de-cambios-en-el-editor.md)).
- **Pregunta del plan:** R1, «citas de Zotero, Mendeley y EndNote de un Word importado convertidas en citas vivas»; prototipo 10 y ficha [0028](0028-importar-citas-de-un-word.md); «Nuevo desde Word», ficha [0036](0036-nuevo-articulo-desde-word.md).

## Qué fallaba
«Nuevo desde Word» traía las citas como el texto que mostraban («[1]», «¹,²») y la bibliografía como párrafos de texto, con la biblioteca vacía. Había que volver a citar todo a mano.

## Qué se decide
1. **Los campos de cita se leen del propio documento**, sin el gestor (`word-citations.ts`, el lector del prototipo 10 pasado al núcleo):
   - **EndNote:** `ADDIN EN.CITE` con el XML en el código o, si es largo, en base64 en el `w:fldData` del campo `EN.CITE.DATA` que lleva dentro. Cada referencia es su registro completo, identificado por base de datos y número de registro. La página (`Pages`), el prefijo, el sufijo y «omitir autor» pasan a la cita.
   - **Zotero y Mendeley Desktop:** el JSON de la cita, con los datos y el URI de cada elemento, su localizador, prefijo y sufijo.
   - **La bibliografía:** el campo `EN.REFLIST` o `ZOTERO_BIBL`, que ocupa un párrafo por entrada. Los campos se siguen a lo largo del documento, no solo dentro de un párrafo.
   - Lo que está dentro de un cambio marcado como borrado no cuenta.
2. **La biblioteca del proyecto** se llena con una referencia por cada una distinta, en el orden de su primera cita:
   - en CSL-JSON (EndNote XML convertido con las reglas del prototipo 10; los datos de Zotero, normalizados como al importar referencias);
   - con su origen (`endnote-field`, `zotero-field` o `mendeley-field`, el nombre del Word y su clave);
   - lo que no cabe en CSL, aparte (`unmapped`).
3. **Antes de sustituir nada se compara con la bibliografía del propio documento** (ficha 0028). Si tiene un número de entradas distinto del de referencias citadas, las citas se quedan como texto, con un aviso que lo explica. Una cita sin datos de su referencia (sin formatear, o de Mendeley Cite) también se queda como texto.
4. **Cada cita pasa a ser una cita viva** con sus referencias, en el texto, las tablas, sus notas y los pies. Lo que mostraba desaparece, porque SciDesk lo numera. Los párrafos de la bibliografía que escribió el gestor no entran: SciDesk escribe la suya bajo el título «Bibliografía».
5. **El estilo:**
   - el de las preferencias de Zotero del documento, si SciDesk lo tiene (el Word para coautores lo lleva);
   - si no, según lo que muestran las citas: con números en superíndice, Vancouver (NLM) en superíndice; con números entre corchetes o paréntesis, Vancouver (NLM); con autor y año, APA.
6. **En la ventana**, el mensaje de «Nuevo desde Word» lo dice («2 citas vivas de Zotero, con sus 2 referencias en la biblioteca»), y los avisos nuevos salen en el idioma de la interfaz. `scidesk from-word` lo da en su JSON (`citations`, `references`, `citationManager`, `citationStyle`).

## Cómo se comprobó
- **Pruebas nuevas** en `packages/core/test/word-citations.test.ts`:
  - un Word sintético de EndNote con dos citas (la segunda con su XML en base64 y una página) y su bibliografía: dos referencias en CSL-JSON (autores, revista, DOI, año), las citas vivas con sus referencias y la página, sin el texto que mostraban ni la bibliografía del gestor;
  - con una bibliografía de tres entradas, las citas se quedan como texto y el aviso lo explica;
  - el Word para coautores que exporta SciDesk vuelve con las mismas citas (las mismas referencias por título y las mismas páginas) y el mismo estilo.
- **Con los tres Word reales del usuario** (en local; su contenido no entra en el repositorio). Las 164 citas de EndNote entraron vivas, igual que en el prototipo 10:
  - 45, 64 y 55 citas, con 23, 19 y 52 referencias;
  - 22, 18 y 47 referencias con DOI, y 19, 14 y 48 con PMID;
  - ninguna sin título ni autor;
  - **SciDesk da a cada cita los mismos números que el Word** (45/45, 64/64 y 55/55), y la bibliografía tiene las mismas entradas;
  - en abrir el más grande, el de 137 tablas, se tardó 2,6 s.
- Pasan las 251 pruebas de npm y las 12 pruebas del editor en Chromium.
- **En la vista del navegador**, «Nuevo desde Word» con el Word para coautores de la demostración da sus 2 citas vivas, con superíndice como el estilo de la revista, y la biblioteca con las 2 referencias y las veces que se citan. Sin errores en la consola.

## Por qué
- Es la forma más habitual de empezar con SciDesk: el artículo ya está en Word, con sus citas de EndNote o Zotero. Sin esto, habría que volver a citarlo todo.
- Comparar con la bibliografía del documento evita sustituir citas por otras distintas sin que el usuario lo vea.

## Qué se descartó
- **Pedir el gestor de referencias** (abrir EndNote o Zotero): el documento ya lleva los datos.
- **Conservar la bibliografía del gestor como texto** junto a la de SciDesk: estaría repetida.
- **Elegir el estilo exacto de EndNote**: el documento no lo dice de forma fiable; se elige uno equivalente y se cambia en la barra de estado.

## Consecuencias
- Con esto, la fase 2 cumple lo que pedía el plan. Lo siguiente es la **fase 3** (el proyecto completo y la revista).
- Quedan:
  - **Mendeley Cite**, el complemento nuevo: no hay un ejemplo, y sus citas se quedan como texto;
  - **las citas en notas al pie**: «Nuevo desde Word» todavía no lee las notas al pie;
  - **las citas de EndNote «sin formatear»** (`{Autor, año #n}`), que no llevan el registro.
- Pegar desde Word con citas de EndNote (ficha 0042) sigue trayéndolas como texto. El portapapeles lleva los mismos datos (en el HTML y el RTF), así que se podrá hacer con el mismo lector.
