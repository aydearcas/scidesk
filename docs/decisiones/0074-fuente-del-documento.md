# 0074. Fuente del documento

- **Fecha:** 23/11/2026
- **Estado:** hecha; falta que el usuario la vea en la ventana (último paso visual de la cinta).
- **Pregunta del plan:** PLAN 5.2, «Fuentes»: en el MVP se elige la fuente del documento. Lo dejó pendiente la ficha 0047, junto con que el modo «Fuente adaptada a la revista» usara la del perfil.

## Qué se decide
- **Dos fuentes, cada una con su papel:**
  - **la que recibe la revista**: la del perfil (fuente y tamaño); en lo que no diga, la del documento;
  - **la del documento**, en la que se escribe el artículo: la elegida en el artículo; en lo que no se elija, la de la revista; y si tampoco la dice, Calibri 12.
- **Dónde se usa cada una:**
  - **«Fuente adaptada a la revista»** (la vista por defecto) muestra el texto con la de la revista: es como lo recibirá;
  - **«Fuente libre»** lo muestra con la del documento; los selectores de fuente y tamaño de la cinta la ponen en su sitio de la lista, con su nombre, y elegirla quita la fuente propia de un fragmento (ficha 0047);
  - **el Word para coautores** lleva la del documento, más las fuentes propias de los fragmentos;
  - **el Word y el PDF para la revista** llevan siempre la de la revista.
- **Se elige en Ver › «Fuente del documento…»**, un diálogo con:
  - la fuente y el tamaño, cada uno con la opción «Como la revista (…)», que dice qué da la revista o «no lo dice: Calibri»;
  - una muestra con lo elegido;
  - una línea con lo que recibe la revista siempre.
- Se guarda en `article.json` (`documentFont`, con `family` y `size` opcionales). Lo que no esté sigue a la revista.

## Por qué
- **La revista manda en lo que se le envía** (R23), pero cada autor escribe con la letra que le resulta cómoda: el modo libre y el Word para coautores son para eso.
- **Un ajuste del artículo y no del equipo:** la fuente forma parte del documento; si otro abre el proyecto, lo ve igual.
- **Calibri 12 como último recurso:** es lo que mostraba el editor hasta ahora y la fuente por defecto de Word.

## Qué se descartó
- **Una fuente por estilo** (títulos en una, texto en otra): V1, según el plan.
- **Elegir la fuente del documento desde la cinta:** los selectores de la cinta son para fragmentos; mezclar las dos cosas confunde. El diálogo deja claro qué recibe la revista.

## Consecuencias
- **Núcleo:** `document-font.ts` (`documentFontsOf`, `setDocumentFont`); el Word aplica a «Normal» la fuente que toca según para quién es, y el PDF usa la de la revista. Hasta ahora, sin fuente en el perfil, el Word quedaba con la de la plantilla; ahora lleva la del documento (Calibri 12 por defecto, igual que se ve en el editor).
- **Formato:** `documentFont` opcional en `article.json` (esquema y especificación actualizados).
- **Ventana:**
  - las variables `--doc-font` (con las equivalentes libres, y `serif` o `sans-serif` al final) y `--doc-size` en la hoja;
  - la cinta recibe la fuente del documento;
  - el diálogo `DocumentFontDialog.tsx`.
- **Pruebas nuevas** (`packages/core/test/document-font.test.ts`):
  - las reglas: por defecto, la propia, la de la revista, solo el tamaño, el límite de tamaño;
  - el estilo «Normal» del Word para coautores frente al de la revista;
  - la fuente de Typst.
- **Probado en la vista del navegador:** el diálogo, Times New Roman 11 en la hoja y en la cinta, y el mensaje.
- **Sin probar** en la ventana de Tauri y en WebKit (en el Mac, Calibri y Cambria no vienen con el sistema: se ven Carlito y Caladea).
