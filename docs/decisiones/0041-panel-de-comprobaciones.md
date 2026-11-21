# 0041. Panel de comprobaciones mínimo: límites, recuentos, pendientes y elementos sin citar

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1). El texto de los botones para ignorar sigue a PLAN.md 5.8 («es correcto», «no aplica») y queda sujeto a la decisión de interfaz D7.
- **Pregunta del plan:** R12 y R43, «panel de comprobaciones mínimo: límites de palabras, pendientes y elementos sin citar, con tres niveles y avisos que se pueden ignorar» (PLAN.md 5.8 y 8).

## Qué se decide
- **El núcleo comprueba cada artículo** (`packages/core/src/checks.ts`, `checkArticle`). Son reglas sobre los archivos del proyecto: sin IA y sin conexión. Lo que está en pantalla sin guardar sustituye a lo guardado, así que el panel sigue al texto.
- **Recuentos:**
  - **Palabras como las cuenta Word**: lo que hay entre espacios, si lleva una letra o una cifra («%» o «=» sueltos no cuentan). Las citas y las referencias cruzadas no cuentan.
  - **Por sección** (encabezados de nivel 1). Los subencabezados cuentan, como en Word.
  - **El texto** suma las secciones desde la primera hasta la última, sin bibliografía ni las secciones finales: agradecimientos, financiación, conflictos, ética, consentimiento, disponibilidad de datos, registro, uso de IA, contribuciones y apéndices. Las tablas, las figuras y el título no cuentan. Las secciones que no cuentan se ven, marcadas.
  - **Resumen por idioma**, sin sus encabezados ni sus palabras clave. También palabras clave por idioma, caracteres del título, referencias citadas en el artículo, tablas, figuras y autores.
- **Límites:** los del perfil de revista para el tipo de artículo.
  - Ya entran todos los que tiene el perfil (PLAN.md los dejaba casi todos para V1, pero con los recuentos hechos cuestan poco): palabras del texto y del resumen, referencias, tablas, figuras, tablas y figuras juntas, autores, palabras clave y caracteres del título.
  - Pasarse de un límite **impide el envío**. Pasarse del número de autores **aconsejado**, o quedarse corto de palabras clave, **conviene revisarlo**.
  - Si el artículo no tiene revista, o el perfil no tiene límites para su tipo, se avisa como **información**.
- **Pendientes** (R12): en todos los documentos del artículo, también en las celdas de las tablas, los pies y las notas, y en el resumen.
  - **Qué cuenta como pendiente:** XX (o más X); ?? (o más); [REF], [CITA], [TODO], [PENDIENTE], [COMPROBAR] y [CHECK] en cualquier caja; TODO, FIXME, PENDIENTE y COMPROBAR sueltos solo en mayúsculas.
  - **Qué no cuenta:** «comprobar» en minúsculas, que es una palabra normal, ni «Xavier» o «XXL».
  - **Nivel:** conviene revisar.
  - **Al exportar** el DOCX o el PDF para la revista se avisa de cuántos quedan.
- **Sin citar:**
  - una tabla o una figura que ninguna referencia cruzada cita (conviene revisar);
  - una referencia de la biblioteca que este artículo no cita (información, porque la biblioteca es común a todo el proyecto).
- **Avisos ignorados:**
  - **Identificador estable:** cada aviso tiene uno, como `word-limit`, `abstract-word-limit:es`, `uncited-table:<id>` o `pending:<documento>:<bloque>:<marca>:<n.º>`. Así, editar en otro sitio no cambia el de los demás.
  - **Guardar:** «Es correcto» o «No aplica», con una nota opcional, se guarda en `article.json` (`ignoredWarnings`, el campo que ya preveía el formato, ficha 0031).
  - **Revisar:** un aviso ignorado no vuelve a salir entre los activos, pero se sigue listando aparte y se puede restaurar.
- **En la ventana**, la pestaña «Comprobaciones» del panel derecho tiene:
  - **los recuentos** frente a los límites («2864 / 3000», en rojo si se pasa) y las palabras por sección;
  - **los avisos** con su nivel y su texto en el idioma de la interfaz;
  - **«Ir»**, que lleva al párrafo, o al sitio de la tabla o la figura;
  - **«Es correcto» y «No aplica»**, con una nota;
  - **los ignorados**, que se pueden restaurar.

  La pestaña dice cuántos avisos hay que no son informativos.
- **Línea de comandos:**
  - `scidesk check` muestra, además de la validación, los recuentos por sección y los avisos de cada artículo.
  - `scidesk ignore <proyecto> <id> [--as correct|not-applicable] [--note …] [--restore]` marca o restaura un aviso.

## Por qué
- **Es la cara del programa frente a Word** (R43). Con los recuentos hechos, enseñarlos frente a los límites de Reumatología Clínica cuesta poco.
- **Un panel que no se puede silenciar se deja de mirar** (R12). El identificador estable hace que lo ignorado no vuelva.
- **Pruebas:**
  - 5 nuevas en el núcleo, 47 en total:
    - recuento de palabras y reconocimiento de pendientes;
    - el ejemplo de artrosis de rodilla como original de Reumatología Clínica: 37 referencias frente a 30 impide el envío, y con límites más estrictos salen los seis avisos de límite;
    - una revisión narrativa, sin límites en el perfil;
    - pendientes en el texto y en una celda de tabla, con identificadores que no cambian al añadir un párrafo antes;
    - el aviso del DOCX para la revista;
    - ignorar, recargar y restaurar;
    - tablas y referencias sin citar.
  - **En la ventana (navegador):**
    - al escribir «(XX % [REF])» salen los dos pendientes;
    - «Ir» lleva al párrafo;
    - «Es correcto» con una nota lo guarda en `article.json` y baja el contador de la pestaña;
    - «Restaurar» lo devuelve.

## Qué se descartó
- **Contar «comprobar» en minúsculas como pendiente**, como sugería R12: es una palabra frecuente en el texto científico en español.
- **Contar las citas como palabras:** las revistas cuentan el texto, y el número o el «(Alonso, 2025)» depende del estilo.
- **Avisar de cada referencia sin citar como algo que revisar:** la biblioteca es del proyecto y puede tener referencias de otros artículos.

## Consecuencias
- **Queda para V1** (PLAN.md 5.8):
  - abreviaturas, coherencia de cifras (R8), manuscrito cegado (R9), secciones y declaraciones obligatorias, formato numérico, variante del inglés y tablas y figuras fuera de orden;
  - un atajo para crear un pendiente, que espera a los esquemas de atajos (D6).
- **Los avisos se pueden añadir sin tocar el panel:** cada uno es un código con sus parámetros y su texto en `i18n.ts`.
- **Las palabras «del texto» son una convención:** si una revista cuenta de otra forma (con agradecimientos, sin la introducción…), el perfil de revista tendrá que decirlo.
