# 0025. DOCX con marcas y campos: biblioteca `docx`, plantilla de referencia y especificación de las marcas

- **Fecha:** 21/11/2026
- **Estado:** aceptada (resultado del prototipo 3 de la fase 0). Concreta las marcas de [0003](0003-coautores-con-word-y-fusion.md) (R3) y confirma la exportación a DOCX de [0010](0010-pila-tecnologica.md) (R35).
- **Pregunta del plan:** R3 y R35 (prototipo 3 de la sección 8)

## Qué se decide

### Biblioteca y plantilla
- **Exportar a DOCX con la biblioteca `docx` (MIT).** Dos piezas van como fragmentos de OOXML escritos a mano dentro de la biblioteca (`ImportedXmlComponent.fromXmlString`):
  - los campos complejos con resultado formateado (citas, `REF`, `SEQ`, bibliografía);
  - los `SEQ`, que se escriben con su número ya puesto. El `SequentialIdentifier` de la biblioteca los deja «sucios» y Word pide actualizar los campos al abrir.
- **Los estilos salen de una plantilla de referencia** (`.dotx`) con `externalStyles`. Se buscan por su nombre interno de Word (`heading 1`, `caption`, `title`), no por su identificador, que Word traduce («Ttulo1», «Descripcin» en un Word en español).
- **La plantilla del programa se guarda sin datos personales,** y el exportador escribe siempre el autor del archivo de forma explícita.

### Marcas del perfil para coautores (R3)
| Qué | Cómo |
|---|---|
| Cada bloque, también los de las celdas, pies y notas | Marcador oculto `_SD_b_<id>` que **abarca el contenido** del bloque |
| Cada tabla o figura | `_SD_t_<id>` o `_SD_f_<id>` desde el pie hasta la última nota |
| Su número | `_SDn_<id>` alrededor del campo `SEQ Tabla \* ARABIC` (o `SEQ Figura`), con la etiqueta del idioma del documento |
| Cada referencia cruzada | `REF _SDn_<id> \h` con el número como resultado; «tabla» va fuera, como texto |
| Cada cita | Campo de Zotero `ADDIN ZOTERO_ITEM CSL_CITATION {json}` con `citationID` = id de la cita en SciDesk, el CSL-JSON de cada referencia y el resultado de citeproc-js con su formato |
| La bibliografía | `ADDIN ZOTERO_BIBL` con las entradas de citeproc-js |
| El documento | Propiedades `ZOTERO_PREF_n` (estilo de la revista) y `SciDesk` (proyecto, artículo e instantánea de partida); **además**, un marcador `_SDs_<instantánea>` al principio, porque las propiedades se pierden al copiar el texto a otro documento |

Los nombres de marcador solo admiten letras, cifras y `_` (hasta 40 caracteres): el id `b-4e114f5c` se escribe `_SD_b_4e114f5c`.

### Reglas para importar (fase 2)
- **La identidad de un bloque se confirma siempre por contenido.** El marcador es una pista, no la verdad.
  - Si un marcador abarca varios párrafos, el bloque es el que más se parece al enviado, y el resto son párrafos nuevos, partidos o pegados.
  - Si dos marcadores empiezan en el mismo párrafo, es una unión.
  - Un bloque sin marcador se alinea por contenido, con el plan B.
- **Las citas se reconocen por `citationID`.**
  - Si una cita aparece dos veces (un movimiento con control de cambios, `w:moveFrom`/`w:moveTo`), manda la viva.
  - Si su resultado no coincide con lo que da citeproc-js, se señala: alguien escribió encima.
- **Una referencia cruzada se lee por el marcador al que apunta,** nunca por su texto. Si el destino se borró, Word escribe ahí «¡Error! No se encuentra el origen de la referencia.».
- **Lo insertado por un coautor** (citas escritas a mano, tablas con Insertar título) llega como texto o como campos de Word sin marcas de SciDesk, y se trata como contenido nuevo.

### Perfil para la revista
Sin marcadores, campos ni propiedades personalizadas, con el autor vacío. Las citas y los números se escriben como texto con su formato.

## Por qué
- **Word abre la exportación sin avisos ni reparaciones.** Un artículo de 3.229 palabras con dos tablas (celdas combinadas), una figura y 37 referencias ocupa 16 páginas con el formato de *Reumatología Clínica*. Lleva 125 marcadores ocultos y 40 campos. Si Word actualiza todos los campos, ningún resultado cambia. Exportar tarda unos 0,4 s.
- **Las marcas aguantan lo que hace un coautor en Word.** Se probaron 16 ediciones (8 también con el control de cambios activado):
  - Escribir en cualquier sitio de un párrafo, partirlo o unirlo, y abrir y guardar, conservan todos los marcadores.
  - Con el control de cambios activado, también borrar un párrafo, reescribirlo, borrar una cita o moverla.
  - Copiar todo el texto a un documento nuevo conserva todos los marcadores y campos.
  - Borrar o reescribir un párrafo *sin* control de cambios pierde su marcador, que es lo seguro.
  - Insertar o pegar algo justo al principio de un bloque hace que quede dentro de su marcador.
- **Los campos `SEQ` y `REF` funcionan en Word como los propios de Word.** Si un coautor inserta una tabla con «Insertar título» y actualiza los campos, las tablas pasan a 1, 2 y 3 y las referencias cruzadas del texto se actualizan solas.
- **El formato de Zotero** deja abierta la colaboración con coautores que usan Zotero, y su `citationID` sobrevive a todas las ediciones salvo el borrado.

## Qué se descartó
- **Marcador de punto** (vacío, al principio de cada bloque). Aguanta que se reescriba el párrafo entero, pero al borrar un párrafo o una tabla salta al párrafo siguiente, y al mover acaba en otro bloque. Un marcador que cambia de sitio atribuye el identificador a otro texto; uno que se pierde solo obliga a alinear por contenido.
- **`SimpleField` (`w:fldSimple`) de la biblioteca para las citas:** solo admite un resultado de texto sin formato, y la cita necesita el superíndice.
- **Escribir el DOCX entero a mano:** la biblioteca resuelve bien tablas, imágenes, secciones, pies de página y propiedades. Solo los campos complejos necesitan XML propio.

## Consecuencias
- **Formatos de la fase 0:** la especificación de las marcas (tabla de arriba) entra en el esquema único de formatos.
- **Corte vertical y fase 2a:** el lector (`read-docx.mjs` del prototipo) da los párrafos con sus marcadores, el texto aceptando o rechazando los cambios marcados y los campos clasificados. Es la base del importador.
- **Prototipo 5 (Zotero):**
  - Comprobar con Zotero abierto que su complemento reconoce estas citas y la bibliografía y las actualiza («Refresh») sin perder el `citationID`, y qué hace con referencias que no están en su biblioteca (`uris` vacíos).
  - Comprobar también en Word visible que un coautor con Zotero instalado abre y guarda la copia sin problemas. Desde COM, `SaveAs2` se colgaba en algunos casos, también sin el complemento, y no se averiguó la causa.
- **Prototipo 6:** las copias pasadas por Google Docs, LibreOffice o Word para Mac quedan para él, con el plan B. El lector y la comparación de este prototipo sirven de punto de partida.
- **Pendiente en la exportación:** comentarios y cambios marcados (con la correspondencia de [0020](0020-control-de-cambios.md)), notas al pie, ecuaciones, portada aparte y el perfil de formato de la revista más allá de la plantilla.
- Detalle, escenarios y cifras en [`prototypes/03-docx-markers/README.md`](../../prototypes/03-docx-markers/README.md).
