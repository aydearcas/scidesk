# 0048. Pantalla de inicio, asistente de nuevo artículo y tabla en su pestaña (láminas 6, 7 y 8)

- **Fecha:** 22/11/2026
- **Estado:** aceptada (las láminas 6, 7 y 8 las revisó el usuario el 22/11/2026; los detalles de abajo los ha decidido el asistente al llevarlas a la ventana y quedan para que el usuario los revise).
- **Pregunta del plan:** propuesta de interfaz 5.7 y 4.5 (D8, ficha 0043); primer punto de lo que faltaba de la fase 1.

## Qué se decide

### Pantalla de inicio (lámina 6)
- **Se ve siempre que no hay un proyecto abierto**, y se vuelve a ella con **Archivo › Cerrar el proyecto** (guarda antes).
- **Tres formas de empezar**, con sus atajos: nuevo artículo, nuevo a partir de un Word y abrir una carpeta. Debajo, «Abrir el proyecto de demostración».
- **Atajos nuevos en los dos esquemas** (`newArticle`, `openProject`):
  - «Word en español»: Ctrl+U nuevo y Ctrl+A abrir, como Word en español;
  - «Internacional»: Ctrl+N y Ctrl+O;
  - dentro del texto, Ctrl+A sigue seleccionando todo, y en un campo de texto no abre nada. Ctrl+U no se oye mientras el asistente está abierto.
- **Recientes**, en la carpeta local de cada equipo (`settings/recent.json`, R26), nunca en el proyecto:
  - hasta 12 proyectos, con su carpeta (los tres últimos niveles), cuándo se abrió y cada artículo con título, tipo, revista, palabras frente al límite y su estado;
  - el estado es «Borrador» o «Con coautores · ronda N» con las copias devueltas, que se leen de `rounds/*/round.json`. «Listo para enviar» llegará con la vista Revista;
  - el resumen de cada artículo se actualiza cuando corren las comprobaciones, y solo se escribe si cambió;
  - un buscador filtra por nombre, carpeta o título, sin tildes.
- **Un reciente cuya carpeta no está** (sincronización sin terminar o carpeta movida) se muestra aparte con «Buscar la carpeta» y «Quitar de la lista». Si la carpeta encontrada es el mismo proyecto (mismo id del manifiesto), ocupa el sitio del antiguo.
- **La barra de estado de inicio** enseña el idioma de la interfaz y el esquema de atajos, que se cambian pulsándolos, la versión y la atribución de citeproc-js.

### Asistente de nuevo artículo (lámina 7)
- **Tres pasos**, con lo que se va a crear siempre a la derecha. Lo de la derecha es el mismo plan del núcleo (`articlePlan`) que luego escribe los archivos.
  1. **Tipo e idiomas:**
     - título provisional;
     - carpeta: en la ventana, Documentos por defecto, con un nombre sacado del título (`folderName`: sin tildes ni palabras vacías, cuatro palabras), que se puede cambiar. Avisa si ya existe y no está vacía;
     - tipo: original, original breve, revisión sistemática, revisión narrativa, caso clínico o carta;
     - idioma del manuscrito y «Título, resumen y palabras clave también en…» (en una carta, «Título también en…»).
  2. **Revista**, opcional:
     - buscador sin tildes sobre un catálogo pequeño (`JOURNAL_CATALOG`): Reumatología Clínica con su perfil incluido, y las revistas cuyo estilo ya trae SciDesk (Medicina Clínica, The Lancet, NEJM, BMJ, JAMA, Nature, Science, Cell), que solo traen su estilo de cita;
     - con perfil, «Lo que pide para original» con palabras, resumen, tablas y figuras, referencias y tipo de revisión, y la fecha en que se comprobó la guía. Si el perfil no recoge el tipo, lo dice;
     - al elegir una revista con perfil se marcan los idiomas que pide (Reumatología Clínica: también en inglés);
     - «Sin revista por ahora».
  3. **Biblioteca:**
     - propia y vacía, o importada de un archivo RIS, NBIB, BibTeX o CSL-JSON (con la importación de la ficha 0035);
     - Zotero aparece desactivado («llega más adelante»);
     - el estilo de cita, por defecto el de la revista.
- **Lo que se crea según el tipo:**
  - IMRaD para original, original breve y revisión sistemática;
  - introducción y conclusiones para la revisión narrativa;
  - introducción, presentación del caso, discusión y conclusiones para el caso clínico, o las secciones fijas del perfil;
  - una carta: sin resumen, con la apertura del perfil («Señor editor:») y un párrafo;
  - la bibliografía al final.
- **El resumen:**
  - uno por idioma, con palabras clave (una vacía para empezar);
  - estructurado en los tipos IMRaD, con los apartados del perfil en su idioma y, en el otro idioma, los nombres de SciDesk; sin revista, Objetivo, Métodos, Resultados y Conclusiones;
  - sin apartados en la revisión narrativa y el caso clínico.
- **El perfil de la revista se copia** en `resources/journals/<id>.json`, y su estilo propio en `resources/journals/styles/`. El artículo queda con `journal` y el estilo elegido, así que los límites y el estilo valen desde el primer momento.
- **En la vista del navegador**, el artículo nuevo sustituye al proyecto de la vista (almacenamiento del navegador).
- **En la línea de comandos**, `scidesk new` admite `--type`, `--also en`, `--journal` y `--style`, y `scidesk journals` lista el catálogo.
- **Un título vacío** (el del otro idioma) enseña en gris «Título (en)», sin escribir nada en el documento.

### Carpetas en la ventana de Tauri
- **Comandos nuevos:** `open_recent`, `recent_exists`, `default_location`, `pick_location`, `folder_state`, `create_project_folder` y `forget_folder`. `open_project` devuelve ahora también la ruta.
- **La ventana solo puede abrir o crear un proyecto, o preguntar si una carpeta existe o está vacía, dentro de una carpeta que el usuario eligió** en el diálogo del sistema alguna vez, o en su carpeta Documentos. La lista de esas carpetas está en la carpeta local de la aplicación, en `trusted folders.json`. Ese nombre lleva un espacio, que el almacén local no admite, así que la vista web no puede escribirlo. El nombre de una carpeta nueva es un solo segmento válido en Windows y macOS.

### Tabla en su pestaña (lámina 8)
- **La barra de la tabla va en una fila.** Con sitio, como en la lámina (textos y etiquetas «Filas» y «Columnas»); con los dos paneles abiertos en una ventana de unos 1200 px, solo iconos (consulta de contenedor por debajo de 940 px de barra). Lleva:
  - «Filas» (encima, debajo, eliminar) y «Columnas» (izquierda, derecha, eliminar), con iconos;
  - Combinar y Dividir;
  - «Fila de encabezado», que se ve pulsada si la primera fila lo es;
  - alineación izquierda, centro, derecha y «0,0» (decimal), marcadas según las celdas;
  - «Llamada a nota» y «Nota general».
- **«Detalles» de una tabla** (en el manuscrito y en su pestaña):
  - dónde se cita, como «Resultados, párrafo 3» con enlace al párrafo;
  - pie, tamaño (columnas, filas de encabezado y de datos), notas con llamada y generales, y archivo;
  - **celdas seleccionadas** (filas, columnas y alineación), también desde la pestaña de la tabla;
  - anchos de las columnas en una barra proporcional, con las columnas seleccionadas marcadas;
  - qué pasa al exportar: el encabezado se repite en cada página, y la tabla va al final o en su sitio según el perfil (`manuscriptFormat.tables`);
  - sus avisos, con «Ir al texto» y «Es correcto»;
  - «Ver en el manuscrito», «Abrir en su pestaña» y «Quitar del texto».
  - El núcleo da la forma de la tabla (`tableShape`) y dónde se cita (`citedIn`) en `articleOutline`.
- **Al pegar tablas desde Word**:
  - el mensaje dice qué se ha descartado: sombreado, bordes verticales y fuente, leídos del HTML de las tablas y no de los estilos de Word que van delante;
  - lleva un botón **«Deshacer el pegado»**;
  - la pestaña de cada tabla pegada enseña el aviso de la lámina 8 («Pegada desde Word: es la Tabla 2, con su archivo…», lo conservado y lo descartado) hasta que se cierra;
  - el pegado es siempre un paso propio del historial (`closeHistory`): ni «Deshacer el pegado» ni Ctrl+Z se llevan lo escrito justo antes, que ProseMirror juntaría si pasó menos de medio segundo;
  - deshacer usa el paso de Ctrl+Z si no ha cambiado nada desde el pegado; si no, quita del texto las tablas pegadas. En los dos casos su archivo queda en «Sin colocar en el texto» (regla 4 de la ficha 0021).

### Guardar y Ajustes (decisiones del usuario del 22/11/2026)
- **«Guardar ahora» tiene icono**: un disquete al principio de la cinta, delante de Deshacer, como la barra de acceso rápido de Word. Lleva un punto del color de acento mientras hay cambios sin guardar, y al pasar el ratón dice el atajo (Ctrl+G en «Word en español», Ctrl+S en «Internacional») y si está guardado y a qué hora. Funciona en cualquier pestaña, como el menú y el atajo.
- **Ajustes pasa de abajo a la izquierda (barra de vistas) a la barra de título**, a la izquierda de Exportar, con un icono de engranaje que sustituye al de controles deslizantes: una rueda con ocho dientes y un agujero, dibujada como contorno cerrado (la primera versión, un anillo con rayos, se parecía al icono de «modo claro»). Al pasar el ratón dice «Ajustes». El disquete y el engranaje van algo más grandes que el resto de iconos.
- **La barra de título va en el verde azulado del programa** (`--accent`, #0B6477), con menús, textos e iconos en blanco y Exportar en blanco con texto verde azulado. Los menús desplegados siguen con fondo claro y texto oscuro.
- **La barra de vistas de la izquierda conserva su fondo claro**, y sus botones (Artículo, Biblioteca) son cuadrados verde azulado con icono y nombre en blanco. El activo va más oscuro y con un borde blanco. **Los títulos de grupo del navegador** (Manuscrito, Tablas, Figuras, Autores, Documentos de envío…) son bandas en un tono pastel del mismo verde azulado (#DCEDF0), con texto e icono en el verde oscuro (#084F5E). Se probó antes un verde sólido con texto blanco, y el usuario prefirió el pastel. En la vista Biblioteca, el filtro «Todas» va en el verde azulado sólido con texto blanco y cifra en blanco grisáceo; «Citadas en este artículo» sigue en el pastel; el filtro «Sin citar» va en el amarillo de aviso en tono pastel (#FFF3CD), con un borde algo más oscuro (#E2BC5A) y el texto en ámbar oscuro; se probó antes un amarillo lima. Las importaciones van en gris claro (#ECEEF1). Los colores están en variables (`--chrome`, `--chrome-ink`…), para cuando llegue el tema oscuro.
- **Un «?» en un círculo junto al nombre de un campo** que necesita explicación (componente `HelpTip`): al pasar el ratón, o al llegar con el teclado, explica qué es y cómo rellenarlo, por encima de los paneles y dentro de la ventana. El primero, en «Forma de cita» del directorio de personas. Su texto es también la descripción accesible del botón.
- **Se quita el menú «Ajustes» de la barra de menús** (que la ficha 0044 había puesto por decisión del usuario): ya está el engranaje. El idioma de la interfaz y el esquema de atajos se cambian en la pestaña de Ajustes y, en la pantalla de inicio, en la barra de estado. Los menús quedan Archivo, Editar, Insertar, Referencias, Revisar, Ver y Ayuda.

### Formato
- **`abstract.scidoc` puede no tener ninguna sección** (`AbstractDoc` sin mínimo): es el resumen de una carta. El documento compuesto ya no pone `abstractPart` cuando está vacío. Esquemas regenerados.
- **Importar un Word con «Palabras clave:» sin palabras** da una palabra clave vacía en lugar de un bloque inválido. Pasa al volver a importar el Word de un artículo recién creado.

## Por qué
- **El asistente y la derecha comparten el plan del núcleo**, así que lo que se enseña es exactamente lo que se crea, y la línea de comandos crea lo mismo.
- **Los recientes son de cada equipo**: dependen de dónde está la carpeta en ese equipo y no deben viajar con el proyecto.
- **Limitar la ventana a carpetas elegidas por el usuario** mantiene el principio de que la vista web no alcanza nada fuera de lo que el usuario abrió (PLAN 6.6), ahora que puede reabrir proyectos por su ruta.
- **Ctrl+A en el texto sigue seleccionando todo**, porque quitarle esa costumbre a quien escribe cuesta más que abrir desde el menú. Fuera del texto abre, como en Word.
- **«Deshacer el pegado» no borra archivos:** ningún paso de la ventana borra archivos del proyecto, y el archivo queda a la vista en «Sin colocar».

## Qué se descartó
- Guardar los recientes en el proyecto, o confiar en cualquier ruta que mande la vista web.
- Crear el proyecto sin preguntar dónde, o proponer otra carpeta distinta de Documentos.
- Repetir el encabezado con una casilla, porque no hay atributo en el formato. La exportación ya lo repite siempre (ficha 0033).
- Ajustar los anchos arrastrando el borde de una columna (en la lámina): queda pendiente.

## Consecuencias
- **Probado en la vista del navegador**, con Ctrl+U, el teclado y clics, sin errores en la consola:
  - inicio y recientes;
  - asistente con Reumatología Clínica en original (dos idiomas, resumen estructurado, límites activos) y carta («Señor editor:», sin resumen);
  - cerrar y reabrir;
  - detalles de una tabla y celdas desde su pestaña;
  - pegado simulado de una tabla de Word, con el aviso y «Deshacer el pegado».
- **Pruebas:** 103 de Vitest (nuevas: plan del artículo, catálogo, creación con revista, carta, forma de la tabla, atajos) y 9 de Rust (nombres de carpeta, lista de carpetas fuera del almacén, carpeta libre, vacía u ocupada).
- **Probado en la ventana real de Tauri el 22/11** (protocolo de depuración de WebView2; los diálogos de carpeta los contestó el usuario):
  - Ctrl+U abre el asistente y propone `Documentos › prueba-scidesk-tauri`; «Cambiar…» con el diálogo del sistema; aviso de carpeta ocupada;
  - creación con Reumatología Clínica y un RIS: carpeta, perfil, estilo, `references/imports/refs.ris` y 2 referencias en el disco; guardado automático del título en inglés;
  - cerrar, reciente con su ruta, reabrir; carpeta renombrada fuera del programa: aparte como perdida; «Buscar la carpeta» con la carpeta nueva sustituye al reciente antiguo (mismo id);
  - los comandos rechazan rutas no elegidas (`not chosen`) y nombres con `..` (`bad name`);
  - pegado de una tabla de Word, su pestaña con el aviso y las celdas seleccionadas, «Deshacer el pegado».
- **Corregido tras la prueba en Tauri:** «Deshacer el pegado» se llevaba el párrafo escrito justo antes (ahora el pegado cierra el paso del historial); la barra de la tabla no cabía con los dos paneles (ahora iconos); `folder_state` y `recent_exists` decían si existía cualquier ruta (ahora solo en carpetas elegidas).
- **Sin probar en WebKit** (MacBook).
- **Pendiente:**
  - el primer arranque (idioma, esquema y áreas);
  - Zotero en el paso 3;
  - más revistas en el catálogo y el paquete para LLM de las revistas sin perfil;
  - «Listo para enviar»;
  - arrastrar el borde de una columna;
  - nuevo artículo dentro de un proyecto abierto (hoy, cada artículo nuevo es un proyecto nuevo; `addArticle` ya acepta las mismas opciones).
