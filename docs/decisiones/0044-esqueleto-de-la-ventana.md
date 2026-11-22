# 0044. Esqueleto de la ventana de la fase 1

- **Fecha:** 22/11/2026
- **Estado:** aceptada (fase 1). Lleva a la aplicación la propuesta de interfaz ([`docs/interfaz/diseno-interfaz.md`](../interfaz/diseno-interfaz.md), secciones 3, 4, 7 y 9) con las decisiones D1–D8 de la ficha [0043](0043-decisiones-de-interfaz.md).
- **Pregunta del plan:** fase 1, «esqueleto Tauri + React … navegador por conceptos (R28) y esquemas de atajos "Word en español" e "Internacional" (R19)» y «menú contextual» (PLAN.md 5.1, 5.2 y 8); fila «1 (MVP)» de la sección 10 de la propuesta.

## Qué se decide
La ventana provisional (una barra de botones, el editor y tres pestañas a la derecha) se sustituye por la estructura de la propuesta. **Todo lo que ya funcionaba se reutiliza tal cual**: el núcleo, el editor, la cita rápida, la biblioteca, el formulario de autores, el panel de comprobaciones, el pegado desde Word, las exportaciones y el guardado automático con recuperación.

### Estructura (sección 3)
- **Barra de título:**
  - el logotipo;
  - los **menús clásicos** (D4): Archivo, Editar, Insertar, Referencias, Revisar, Ver, **Ajustes** y Ayuda, con el atajo de cada orden según el esquema elegido. Ajustes es un menú propio justo antes de Ayuda, y no una orden de Archivo (decisión del usuario del 22/11/2026). Abre los ajustes, cambia el idioma de la interfaz y elige el esquema de atajos;
  - proyecto › título del artículo;
  - el botón **Exportar**, que despliega Word para coautores, Word para la revista, PDF y portada, cada uno con una línea que dice qué se crea.

  En el navegador lleva además la etiqueta «Vista en el navegador», con la explicación de la vista al pasar el ratón.
- **La cinta de herramientas ocupa todo el ancho de la ventana, justo debajo de la barra de título, y los paneles laterales empiezan debajo de ella** (decisión del usuario del 22/11/2026, al ver la ventana). La propuesta la ponía solo sobre el documento, debajo de las pestañas. Así:
  - la cinta tiene sitio para todos sus botones con su texto;
  - la barra de vistas, el navegador y el panel derecho tienen la misma altura;
  - la cinta queda en un sitio fijo, como en Word.

  Con otra pestaña delante (biblioteca, autores o ajustes), la cinta sigue a la vista con todos sus botones desactivados, para que la ventana no salte al cambiar de pestaña.
- **Barra de vistas** de 72 px con icono y nombre (D2): **Artículo** y **Biblioteca**, que son las vistas que existen en la fase 1, y **Ajustes** abajo. *(Cambiado el 22/11/2026 por decisión del usuario, ficha 0048: Ajustes es un engranaje en la barra de título, a la izquierda de Exportar, y ya no hay menú «Ajustes».)*
- **Navegador por conceptos** (D1), en el panel izquierdo de la vista Artículo:
  - **Manuscrito**, con las palabras frente al límite (en ámbar si lo pasan). Debajo:
    - el título, con sus caracteres solo si la revista los limita;
    - el resumen de cada idioma, con su recuento;
    - cada sección de nivel 1 con sus palabras; las que no cuentan (bibliografía, agradecimientos…) muestran un guion, y la bibliografía, las referencias citadas.
  - **Tablas** y **Figuras**, con el recuento frente al máximo de la revista. Cada una aparece numerada como saldrá («2 · Características basales») y con un triángulo si el texto no la cita.
  - **Autores**, con cuántos firman.
  - **Documentos de envío**: portada y contribuciones (CRediT), las dos «automáticas».

  Al pulsar cada elemento:
  - una sección o el título lleva a su sitio en el texto;
  - una tabla o figura la selecciona y la muestra en Detalles;
  - el resumen y la portada se muestran en Detalles;
  - Autores y Contribuciones abren la pestaña de autores en «Firman» o en «CRediT».

  Un botón de la cabecera cambia a la **vista de archivos**: la carpeta tal como está en el disco, en árbol.
- **Zona central con pestañas:**
  - **un manuscrito por artículo del proyecto** (ficha 0015). Al abrir el proyecto, cada artículo tiene su pestaña, con su título, y el primero está a la vista. Pulsar otra pestaña de manuscrito:
    - guarda lo que hay en pantalla;
    - conserva el estado del editor, con su historial de deshacer;
    - muestra el otro artículo, con su navegador, sus avisos, su estilo y su barra de estado.

    Cada documento empieza con su propio historial: Ctrl+Z nunca vuelve a otro documento. Una pestaña de manuscrito se cierra mientras quede otra abierta. Con más de un artículo, la cabecera del navegador es un selector de artículo, como dice la propuesta (sección 3.1). El editor es uno solo y nunca se desmonta, así que cambiar de pestaña no lo rehace;
  - la **Biblioteca** como vista grande: el `LibraryPanel` de la ficha 0037 con un filtro (todas, citadas, sin citar). En la vista Biblioteca, el panel izquierdo lleva los filtros con su recuento, las importaciones (archivo, fecha y número de referencias) y el botón «Importar referencias…»;
  - los **Autores** como vista grande: el formulario de la ficha 0038, ahora en pestaña. Un punto en la pestaña avisa de cambios sin guardar, y «Descartar cambios» sustituye a «Cancelar»;
  - **Ajustes**.

  Un punto en la pestaña del manuscrito avisa de lo que no se ha guardado todavía.
- **Panel derecho** con tres pestañas fijas y su recuento:
  - **Avisos**: el panel de comprobaciones de la ficha 0041, ahora agrupado por nivel (impide el envío, conviene revisar, información), con «Ir», «Es correcto» y «No aplica» (D7);
  - **Revisión**: importar la copia que devuelve un coautor y ver sus propuestas (ficha 0032). Los comentarios y la fusión llegarán aquí en la fase 2;
  - **Detalles**: lo que esté seleccionado:
    - una cita: sus referencias, con página, prefijo y sufijo, y «Editar la cita»;
    - una tabla o figura, o una referencia cruzada: número, pie, notas, si se cita, el archivo y la imagen de la figura;
    - una referencia elegida en la biblioteca: su ficha, cómo sale en la bibliografía con el estilo actual y dónde está citada, con enlaces al texto;
    - el resumen y la portada.

  Al pulsar con el ratón una cita, una tabla, una figura o una referencia cruzada en el texto, el panel pasa a Detalles.
- **Barra de estado**, donde cada elemento informa y casi todos son botones:
  - revista y tipo de artículo;
  - estilo de cita, que se cambia ahí mismo;
  - idioma del artículo;
  - palabras frente al límite, que abre Avisos con el reparto por secciones desplegado;
  - avisos por nivel, con su forma;
  - estado del guardado;
  - la atribución de citeproc-js que pide la CPAL (ficha 0026), siempre a la vista.
- **Los dos paneles laterales se pliegan** (botones en la fila de pestañas y menú Ver) y **se ensanchan arrastrando su borde** (200 a 520 px). Lo que está abierto y el ancho se guardan con los ajustes del equipo. Con una ventana estrecha (menos de 900 px), los paneles se superponen al texto en lugar de estrecharlo.

### Editor (sección 4.3)
- **Cinta de una sola fila:**
  - deshacer y rehacer;
  - estilo del párrafo (párrafo y títulos 1 a 3; el título del artículo se muestra pero no se elige);
  - negrita, cursiva, subrayado, superíndice y subíndice. Los botones llevan **N, K y S** con «Word en español» y **B, I y U** con el internacional;
  - **color del texto y resaltado** con los colores de Word: dos paletas en lugar de los desplegables provisionales de la ficha 0043;
  - las inserciones:
    - **Cita**, destacada con el acento;
    - **Referencia cruzada**, que despliega las tablas y figuras numeradas;
    - **Tabla** y **Figura** como sitios: una tabla vacía de 3 × 3 con fila de encabezado, o una figura a partir de una imagen PNG, JPEG, TIFF o SVG;
    - **carácter especial**: ±, ≤, ≥, ×, µ, °, →, guiones, espacio duro y letras griegas.

  Si la ventana es estrecha, el texto de «Referencia cruzada» se oculta y queda el icono.
- **Burbuja de selección:** al seleccionar texto aparece encima negrita, cursiva, subrayado y Cita.
- **Menú contextual mínimo**, que actúa sobre lo que hay bajo el puntero:
  - en el texto: insertar cita, referencia cruzada, marcar un pendiente («[PENDIENTE]», que el panel de avisos detecta), cortar, copiar y seleccionar todo;
  - sobre una cita: editarla o quitarla.
- **Referencia cruzada (Ctrl+Mayús+R):** un buscador como el de la cita rápida, por número o por palabras del pie. Inserta «tabla » y el número, salvo que la palabra ya esté escrita justo antes.
- **Las tablas y figuras se ven en el texto con su número y su pie** («Tabla 2 · Características basales») y la marca «sin citar en el texto», en lugar de la ruta de su archivo.

### Buscar y reemplazar (PLAN 5.2)
Pedido por el usuario al ver que Ctrl+F abría la barra de búsqueda de WebView2, que busca en toda la ventana:
- **Una barra propia sobre el manuscrito** (`FindBar.tsx`, arriba a la derecha del papel). Se abre con Ctrl+B en «Word en español» o Ctrl+F en los dos esquemas, y con Ctrl+L o Ctrl+H se abre con la fila de reemplazar. También está en el menú Editar.
- **Cómo busca:**
  - lo que se escribe se busca al momento, sin distinguir mayúsculas salvo que se pida («Aa»);
  - todas las coincidencias se resaltan, la actual en otro tono, con «n de m»;
  - Intro y F3 van a la siguiente, y Mayús+Intro y Mayús+F3 a la anterior;
  - la búsqueda empieza en la coincidencia que hay en el cursor o justo después, como Word, y la selecciona;
  - si había una selección corta, se busca esa.
- **Reemplazar** cambia la actual y pasa a la siguiente. **Reemplazar todo** lo hace en un solo paso, así que un Ctrl+Z lo deshace entero, y el mensaje lo dice.
- **Esc cierra la barra**, quita los resaltados y devuelve el cursor al texto, con la última coincidencia seleccionada.
- **Busca en los bloques de texto del manuscrito.** Una cita, una referencia cruzada o un salto de línea cuentan como un carácter que nunca coincide, así que no se busca a través de ellos. La bibliografía generada no se busca.
- **Por qué el editor abre la barra él mismo:** ProseMirror se reserva Ctrl+B, Ctrl+I, Ctrl+Y y Ctrl+Z en el texto (su `captureKeyDown` evita la negrita y la cursiva propias del navegador), así que Ctrl+B nunca llegaba a la ventana. El editor abre el buscador con su atajo, como hace con la cita.

### Atajos (sección 9, D6)
- **Dos esquemas en `apps/desktop/src/shortcuts.ts`**, que leen el editor y la ventana en cada pulsación, así que cambiar de esquema no obliga a recargar:

  | Acción | Word en español | Internacional |
  |---|---|---|
  | Negrita, cursiva, subrayado | Ctrl+N, Ctrl+K, Ctrl+S | Ctrl+B, Ctrl+I, Ctrl+U |
  | Guardar | Ctrl+G | Ctrl+S |
  | Buscar, reemplazar | Ctrl+B (y Ctrl+F), Ctrl+L | Ctrl+F, Ctrl+H |
  | Cita | Ctrl+Mayús+C | Ctrl+Mayús+C |
  | Referencia cruzada | Ctrl+Mayús+R | Ctrl+Mayús+R |
  | Superíndice, subíndice | Ctrl+., Ctrl+, | Ctrl+., Ctrl+, |
  | Deshacer, rehacer | Ctrl+Z, Ctrl+Y | Ctrl+Z, Ctrl+Y |

  Comentario, modo de sugerencias y paleta de órdenes tienen su atajo reservado y Ajustes dice que llegan más adelante. Ctrl+F busca también con «Word en español», donde está libre, porque es la costumbre de cualquier programa.
- **Las marcas pierden sus atajos propios de Tiptap.** Así Ctrl+B no pone negrita con «Word en español», donde es buscar.
- **Ctrl+Alt nunca es un atajo**: una pulsación con Alt no se interpreta, porque en un teclado español de Windows es AltGr (@, #, [, ]…).
- **Un atajo de formato pulsado fuera del texto no hace nada.** Tampoco abre el «guardar página» del navegador con Ctrl+S.
- **Las herramientas propias de WebView2 quedan anuladas** (`BROWSER_KEYS` en `shortcuts.ts`): su barra de búsqueda (Ctrl+F, F3, Mayús+F3, Ctrl+G y Ctrl+Mayús+G si el esquema no los usa) y su diálogo de imprimir (Ctrl+P). La barra busca en toda la ventana (navegador, paneles, avisos), no solo en el documento, como observó el usuario al probarla. Tauri 2.12 no permite apagar los atajos del navegador de WebView2, porque no expone la opción que sí tiene wry, la capa que usa por debajo. Por eso la ventana los anula al pulsarlos, y Ctrl+F abre el buscador propio (ver «Buscar y reemplazar»).
- **Por defecto, «Word en español» con la interfaz en español** e «Internacional» con la inglesa, mientras no se elija otro.

### Ajustes de este equipo
Ajustes tiene el idioma de la interfaz, el esquema de atajos y la tabla de los dos esquemas. Se guardan **por equipo, no en el proyecto**: en la carpeta local de datos de la aplicación (`settings/interface.json`, con los comandos `local_*` de la ficha 0039), y en el navegador, en su almacenamiento.

### Estilo visual (sección 7)
- Acento `#0B6477` (D3), fondo `#F4F5F7`, barras `#EEF0F3`, papel blanco y líneas finas. Solo los menús flotantes llevan sombra.
- Todos los colores son variables con nombre en `styles.css`, para poder añadir el tema oscuro más adelante sin tocar los componentes.
- La fuente es la del sistema (Segoe UI en Windows, San Francisco en macOS), a 13 px, con cifras de ancho fijo en los recuentos.
- **Los cuatro niveles de aviso llevan forma además de color**: octógono rojo, triángulo ámbar, círculo verde con marca y círculo azul con «i».
- Los iconos son de línea, de 24 px con trazo de 1,7, dibujados en `icons.tsx`, así que la aplicación no depende de una biblioteca de iconos.
- Transiciones de 120 ms, ninguna si el sistema pide reducir el movimiento.

### Núcleo
- `addArticle` (`project.ts`) añade otro artículo al proyecto, con la biblioteca y el directorio de personas en común. Escribe su carpeta en `articles/<carpeta>/` con la plantilla de `createProject` (una carta, sin IMRaD) y escribe el manifiesto al final, así que un fallo deja el proyecto como estaba.
- `createDemoProject(fs, nombre, { letter: true })` añade una carta en inglés que cita las dos referencias. Es la que abre el botón de la demostración en la ventana, para probar dos manuscritos en sus pestañas; la línea de órdenes y las pruebas siguen con un solo artículo.

`packages/core/src/outline.ts`:
- `articleOutline` da al navegador el título, las tablas y figuras con su número (el mismo que la exportación), su pie, sus notas y si se citan, y el resumen por idioma con sus palabras clave;
- `addEmptyTable` y `addFigure` crean la tabla vacía y la figura a partir de una imagen, con el primer número libre (`tables/tabla-<n>.scitable`, `figures/figura-<n>.<ext>` y `.scifigure`).

### Textos
Todos los textos nuevos están en `i18n.ts`, en español y en inglés, bajo `ui`.

## Choques con lo ya hecho, y qué se ha decidido
- **El resumen todavía no se edita en la ventana.** El editor solo muestra el cuerpo: el resumen dentro del manuscrito llega con el documento compuesto en la ventana. Mientras tanto, el navegador lo enseña con su recuento y Detalles muestra su texto y sus palabras clave, sin editarlo.
- **«Guardar una versión con nombre» (Ctrl+G o Ctrl+S) guarda ahora**, porque las versiones con nombre llegan con el historial (V1). Cuando lleguen, el atajo hará lo que dice la propuesta.
- **Sin campo «Buscar o ejecutar una orden»** en la barra de título. El plan deja la paleta de órdenes y la búsqueda para V1 (PLAN 5.1). Su atajo está reservado.
- **Sin selector Edición/Sugerencias ni Vista previa** en la fila de pestañas:
  - el modo de sugerencias es de la fase 2;
  - la vista previa con Typst necesita su propio trabajo (una vista que se recompila al escribir).

  Quedan pendientes de la fase 1.
- **La carta de presentación y las declaraciones no aparecen en «Documentos de envío»**, porque son de V1 (PLAN 5.3). Están la portada y las contribuciones, que ya se generan.
- **Sin tema oscuro.** La hoja de estilos provisional seguía el tema del sistema con colores improvisados. La propuesta no diseña el tema oscuro todavía (sección 7), así que la ventana es clara hasta que se diseñe; los colores ya son variables.
- **«Pegar» no está en los menús**: un menú no puede leer el portapapeles del navegador. El menú Editar recuerda Ctrl+Mayús+V para pegar solo texto.
- **«Insertar tabla» crea un archivo vacío de inmediato**, porque cada tabla vive en su archivo. Si luego se quita del texto, el archivo queda, como dice la regla de la ficha 0021. El contenido de la tabla se editará con la tabla en su pestaña.

## Por qué
- **La estructura no cambia de una fase a otra** (sección 10 de la propuesta): lo que llega después (Revisión con fusión, Revista, Historial, Buscar) tiene ya su sitio en la barra de vistas, en el panel derecho y en los menús, y solo se añade.
- **Reutilizar en lugar de rehacer:** la biblioteca y los autores pasan de panel o diálogo a vista grande con dos cambios pequeños (un filtro y el modo `asView`). Ninguna función del núcleo cambia, solo se añaden dos.
- **Los atajos se resuelven en un solo sitio** (`actionFor`): el editor, la ventana, los menús, la cinta y Ajustes enseñan y usan la misma tabla, así que no pueden contradecirse.
- **Pruebas:**
  - **Núcleo**, 3 nuevas (55 en total):
    - el navegador numera tablas y figuras como la exportación y como el panel de avisos, con pie, notas y si se citan;
    - la tabla vacía y la figura crean archivos válidos con el primer número libre, y se rechaza una imagen que no se puede exportar;
    - el segundo artículo de la demostración comparte la biblioteca, se comprueba y se exporta por su cuenta, y no se puede crear dos veces en la misma carpeta.
  - **Ventana**, 9 nuevas, que `npm test` ya ejecuta:
    - en `shortcuts.test.ts`: los dos esquemas, la cita en Ctrl+Mayús+C en los dos, ningún Ctrl+Alt (AltGr no es atajo), una acción por tecla, los nombres de las teclas en cada idioma y las teclas que se quitan a WebView2;
    - en `find.test.ts`: las coincidencias a través del formato, con y sin mayúsculas, y nunca a través de una cita.
  - **En el navegador** (configuración `desktop-web`, 1440 × 900), sin errores en la consola:
    - abrir la demostración y reabrirla tras recargar;
    - recuperar lo escrito al recargar antes del guardado;
    - insertar una tabla, una figura con su imagen y una referencia cruzada: la tabla deja de estar «sin citar» en el navegador, el texto y los avisos;
    - editar una cita desde Detalles añadiendo otra referencia;
    - Ctrl+K y Ctrl+S (cursiva y subrayado) con «Word en español» sin que Ctrl+B ponga negrita;
    - Ctrl+B con el internacional;
    - cambiar a inglés;
    - la biblioteca con una referencia en Detalles y el salto a sus citas;
    - añadir un autor en la vista de autores;
    - exportar Word para coautores, Word para la revista, la fuente de Typst y la portada;
    - importar la copia devuelta en Revisión;
    - pegar HTML de Word con una tabla;
    - el menú contextual, los menús, la vista de archivos, «Ir» desde un aviso y la sección en el navegador;
    - la demostración con dos manuscritos: las dos pestañas con su título, y la carta con su navegador (selector de artículo), sus avisos y su barra de estado («Carta», «inglés»);
    - la cinta a todo el ancho, desactivada con la biblioteca delante;
    - **escribir en un manuscrito, pasar al otro y volver**, con el teclado de verdad salvo donde se indica:
      - el texto de cada uno se conserva;
      - con cambios sin guardar y sin esperar al guardado automático (texto insertado y cambio de pestaña en el mismo instante), el documento se guarda al cambiar: no estaba en el disco antes y sí después;
      - Ctrl+Z, pulsado 12 veces en la carta, vuelve exactamente a su texto original y se para ahí, sin mostrar nunca el otro artículo;
      - en el artículo principal, el historial sobrevive a dos cambios de pestaña: Ctrl+Z quita primero la última frase y luego la primera, se para en el texto original y deja rehacer;
      - lo deshecho también se guarda.
- **Fallo corregido de paso** (venía de la ficha 0039): «Proyecto de demostración» daba a veces «the folder is not empty». Al borrar la demostración anterior del almacenamiento del navegador, el bucle recorría las claves por índice mientras las borraba, y Chrome puede reordenarlas, así que alguna se quedaba (por ejemplo `articles/main/authors.json`). Ahora se reúnen primero las claves y después se borran (`platform.ts`). Con la clave sobrante aún en el almacenamiento, la demostración se abre a la primera. Afecta solo a la vista en el navegador.
- **La prueba de los 18 estilos (ficha 0037) tiene ahora un límite de 20 s.** Tarda casi 5 s sola, justo el límite por defecto de Vitest, y con las pruebas nuevas en paralelo lo pasaba a veces.

### En la ventana real de Tauri (22/11/2026)
La ventana de desarrollo (`tauri dev`, unida al servidor de Vite que ya estaba en marcha) se manejó con el protocolo de depuración de WebView2 (puerto local). Las teclas y los clics que envía llegan a la página como de verdad. La persona usuaria eligió la carpeta en los dos diálogos nativos y pulsó a mano las combinaciones que solo se pueden probar con el teclado. Resultados:
- **Atajos** de «Word en español»:
  - Ctrl+N, Ctrl+K y Ctrl+S ponen negrita, cursiva y subrayado, y Ctrl+B no pone negrita;
  - Ctrl+Mayús+C abre la cita rápida con el foco en el buscador;
  - Ctrl+Mayús+R abre la referencia cruzada;
  - Ctrl+G guarda.

  Con el teclado de verdad, Ctrl+N, Ctrl+Mayús+C y Ctrl+Mayús+R no abren otra ventana, ni el inspector, ni recargan la página. Ctrl+F sí abría la barra de búsqueda de WebView2: ahora se anula (ver Atajos).
- **Menú contextual** sobre una cita: editarla o quitarla, referencia cruzada, pendiente, cortar, copiar y seleccionar todo, con el foco en el menú.
- **Dos manuscritos:** cada uno conserva su texto, y Ctrl+Z en la carta vuelve a su texto original sin pasar al otro.
- **Figura** desde un PNG.
- **PDF** compilado por Typst en Rust: 2 páginas, con el aviso de texto alternativo de la figura.
- **Ajustes** en `%LOCALAPPDATA%\app.scidesk.desktop\settings\interface.json`: el esquema internacional se conserva al cerrar y volver a abrir la aplicación, y la cinta muestra B, I y U.
- **Proyecto en el disco** (creado con `scidesk demo` y abierto con «Abrir proyecto…»): se escribe y se cierra la aplicación a la fuerza a los 0,6 s. El texto no está en el disco y el registro de recuperación sí, en la carpeta local de datos. Al reabrir:
  - sale «Cambios sin guardar»;
  - «Recuperar» devuelve el texto y lo guarda;
  - el registro se borra;
  - no quedan archivos temporales de la escritura atómica.

  Exportar el Word para coautores escribe el DOCX en `exports/` y la instantánea en `.scidesk/history/`.

- **Buscar y reemplazar** en la ventana real:
  - Ctrl+B abre la barra con el foco;
  - «artritis» da «1 de 2» con las dos resaltadas, e Intro pasa a «2 de 2»;
  - Esc la cierra, quita los resaltados y deja la palabra seleccionada;
  - Ctrl+F la vuelve a abrir con esa palabra, y Ctrl+L añade la fila de reemplazar;
  - «Reemplazar todo» hace 2 reemplazos, y un solo Ctrl+Z los deshace;
  - con el teclado de verdad, Ctrl+F, F3 y Ctrl+P ya no abren la búsqueda ni el diálogo de imprimir de WebView2.

Con esto quedan probadas en la ventana real lo que tenían pendiente las fichas 0039 (recuperación) y 0040 (el PDF en la ventana).

## Qué se descartó
- **Rehacer la biblioteca y los autores para la vista grande.** Se reutilizan los componentes de las fichas 0037 y 0038.
- **Una biblioteca de iconos (Lucide)**: haría falta una dependencia nueva para unos 30 iconos.
- **El componente de burbuja de Tiptap** (`@tiptap/extension-bubble-menu`): otra dependencia. Una burbuja propia de 40 líneas basta.
- **Guardar los ajustes en el proyecto:** son de quien usa el equipo, no del artículo.

## Consecuencias
- **En la vista del navegador, algunos atajos de «Word en español» no se pueden probar con el teclado**: Chrome se queda Ctrl+N (ventana nueva), y Ctrl+Mayús+C y Ctrl+Mayús+R son sus herramientas de desarrollo y la recarga. En la ventana de Tauri funcionan (ver «En la ventana real de Tauri»).
- **Las capturas de `docs/interfaz/capturas/` siguen siendo las de la maqueta.** Las de esta ventana, tomadas al probarla, están fuera del repositorio.
- **Falta de la fila «1 (MVP)»:**
  - la pantalla de inicio y el asistente de nuevo artículo, que esperan a las láminas de D8; mientras tanto, un inicio mínimo con los botones de siempre;
  - la vista previa;
  - la tabla en su pestaña y editada en el documento;
  - el resumen editable en su sitio;
  - los subrayados de aviso en el texto;
  - el selector de idioma por fragmento;
  - plegar los paneles con un atajo.
- **Falta en Tauri:** el diálogo nativo de imagen (la prueba llenó el campo de archivo directamente).
- **Falta del buscador:**
  - «solo en esta sección»;
  - buscar en el resumen, las tablas y los pies (cuando se editen en su sitio);
  - buscar en todo el proyecto (V1, R22);
  - las expresiones regulares (V1, R43).
- **Pedir a Tauri la opción de apagar los atajos del navegador** (la de wry), o añadirla con un parche, para no depender de anular cada tecla.
- **Varios artículos en la ventana son por ahora solo una prueba:** no hay orden para crear un artículo nuevo (llegará con el asistente) y la vista Autores, las exportaciones y la Revisión actúan sobre el artículo a la vista.
