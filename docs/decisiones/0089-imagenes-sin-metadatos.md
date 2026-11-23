# 0089. Imágenes sin metadatos, figuras aparte y lo último del cegado (R9)

- **Fecha:** 23/11/2026
- **Estado:** hecha (23/11). El usuario pidió terminar lo que quedaba del cegado (fichas 0087 y 0088) antes de la fase 2.
- **Pregunta del plan:** R9 (PLAN 5.8): «metadatos del archivo».

## Qué se hizo
1. **Imágenes sin metadatos para la revista** (`packages/core/src/image-metadata.ts`, `stripImageMetadata`). Una foto o una figura puede decir quién la hizo y dónde. Se quitan siempre en lo que va a la revista (Word y PDF), haya o no doble ciego; el Word para coautores lleva las imágenes tal cual.
   - **JPEG:**
     - se quitan EXIF (autor, cámara, GPS, programa), XMP, IPTC/Photoshop, los comentarios y los demás segmentos de aplicación;
     - se conservan JFIF, el perfil de color (ICC) y la transformación de color de Adobe;
     - si la foto va girada por su EXIF, lleva un EXIF mínimo con solo la orientación, para que no salga tumbada.
   - **PNG:** se quitan los fragmentos de texto (`tEXt`, `zTXt`, `iTXt`, con Author o Comment), `eXIf` y la fecha (`tIME`); el perfil de color se queda.
   - **GIF:** se quitan los comentarios y el XMP; el bucle de una animación se queda.
   - **SVG:** se quitan `<metadata>`, los comentarios, los paquetes XMP, los datos de Inkscape (nombre del archivo, ruta de exportación) y los datos privados de Illustrator. El título y la descripción se quedan, porque son la accesibilidad.
   - Una imagen que no se entiende va tal cual: la exportación no falla por ella.
2. **Las figuras aparte, limpias y con un nombre neutro.** Reumatología Clínica pide las figuras como archivos aparte: el Word para la revista solo lleva sus pies. Quien subiera los archivos originales mandaría sus metadatos y su nombre («fig1_soler.png»). Ahora, cuando el perfil pide la lista de pies:
   - el Word para la revista guarda también cada figura en `exports/<artículo>-revista-figuras/`, sin metadatos y con el nombre de su número («figura-1.png»);
   - el mensaje de la exportación dice dónde están (`figureFiles` en el resultado).
3. **El texto alternativo de las figuras** también va a la revista: el `descr` del Word y el `alt` del PDF. Ahora:
   - se revisa como el resto del texto (autor, centro, ciudad, autocita, comité), con «en el texto alternativo de la figura» en el aviso;
   - las sustituciones de la versión cegada lo cambian también.
4. **Sustituir a través de una cita.** Ahora se sustituye también «Como describimos [3] en nuestro estudio previo», que antes no se cambiaba si había una cita en medio:
   - las citas, las referencias cruzadas, las llamadas a notas y el texto borrado cuentan como nada, igual que en las comprobaciones;
   - la sustitución las atraviesa y las conserva después del texto nuevo: «[eliminado para la revisión] [3], la prevalencia…»;
   - la numeración de las citas no cambia.

## Pruebas
- **Núcleo** (`image-metadata.test.ts`), con archivos construidos byte a byte:
  - PNG con autor, perfil, EXIF y fecha;
  - JPEG con EXIF girado y autor, XMP, perfil, Photoshop y comentario;
  - GIF con comentario, bucle y XMP;
  - SVG de Inkscape con metadatos;
  - imágenes desconocidas o rotas.
- **Núcleo** (`blinding.test.ts`):
  - autocita con una cita en medio, sustituida y con la cita conservada;
  - texto alternativo con el hospital, avisado y sustituido;
  - con Reumatología Clínica, la figura aparte, limpia y llamada «figura-1.png»;
  - con una revista que quiere las figuras en el Word, la imagen sin el autor y el `descr` sustituido;
  - el Word para coautores, con todo;
  - el PDF, también.
- **Con imágenes reales de Windows (GDI+, en local):**
  - un JPEG con autor, copyright y orientación 6, y un PNG con autor, limpiados y vueltos a abrir;
  - mismos píxeles;
  - la foto conserva solo la orientación (6);
  - ni «Herrera» ni el hospital en los bytes.
- **No probado en Word real ni en la vista del navegador:** el cambio en la ventana es una etiqueta y un mensaje, y el Word recibe las mismas imágenes, que Windows ya abre.

## Qué se descartó
- **Avisar de los metadatos en vez de quitarlos.** No hay nada que decidir: a la revista no le sirven.
- **Quitar también el perfil de color o la orientación.** Cambiarían cómo se ve la figura.
- **Recodificar las imágenes.** Perdería calidad, y quitar los bloques basta.

## Qué queda
- **TIFF y EPS** siguen aplazados (ficha 0068). Una figura TIFF se copia tal cual a la carpeta de figuras aparte, sin limpiar.
- **El paquete de envío completo** (fase 3), del que la carpeta de figuras es un adelanto.
