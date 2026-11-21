# Diseño de la interfaz de SciDesk

**Propuesta v0.1, 20 de noviembre de 2026. Las decisiones D1–D8 (sección 12) las tomó el usuario el 21 de noviembre de 2026** ([ficha 0043](../decisiones/0043-decisiones-de-interfaz.md)): todas como se proponían, con la cita en Ctrl+Mayús+C, «Es correcto» y «No aplica» para los avisos, y color del texto y resaltado en la cinta. La maqueta está pendiente de ajustarse a la v0.5 del plan (recortes, aprobación final y envíos anteriores fuera) y de las láminas de D8.

La maqueta está en un lienzo de diseño con siete láminas: [Interfaz de SciDesk](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x). Es privada, solo la ves tú. En el lienzo puedes comentar sobre cada lámina, cambiar textos y probar otros colores de acento en la lámina de estilo.

| Lámina | Qué enseña |
|---|---|
| [1 · Escribir](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x#artboard-Main) | La ventana principal: navegador del artículo, editor y panel de avisos |
| [2 · Fusión de revisiones](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x#artboard-Fusion) | Una ronda con tres coautores: propuestas, un conflicto y una cita escrita a mano |
| [3 · Revista y envío](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x#artboard-Revista) | Adaptación a la revista, paquete de envío y origen de cada requisito |
| [4 · Biblioteca](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x#artboard-Biblioteca) | Lista de referencias, filtros y ficha de una referencia |
| [5 · Autores y CRediT](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x#artboard-Autores) | Orden de firma, matriz CRediT y cómo queda en el artículo |
| [Cita rápida](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x#artboard-Citar) | El buscador de citas |
| [Estilo visual](https://claude.ai/artifact/AysNFJETjAz7f1VYK3kr5x#artboard-Estilo) | Colores, tipografía, elementos del texto y controles |

Las láminas 1 a 5 están enlazadas entre sí por la barra de vistas, así que en el modo de reproducción del lienzo se puede pasar de una a otra.

Hay una captura de cada lámina en [`capturas/`](capturas/), tomada el 21 de noviembre de 2026: [escribir](capturas/1-escribir.png), [fusión de revisiones](capturas/2-fusion-de-revisiones.png), [revista y envío](capturas/3-revista-y-envio.png), [biblioteca](capturas/4-biblioteca.png), [autores y CRediT](capturas/5-autores-y-credit.png), [cita rápida](capturas/cita-rapida.png) y [estilo visual](capturas/estilo-visual.png). Si el lienzo cambia, las capturas no se actualizan solas.

## 1. Qué tomo del boceto y qué cambio

El boceto de ChatGPT acierta en la idea general: tres zonas, el documento en el centro y las comprobaciones a la vista. Lo he usado como punto de partida y no como modelo. Estos son los cambios y su motivo:

| En el boceto | En esta propuesta | Motivo |
|---|---|---|
| Árbol de archivos (`autores.json`, `articulo.scribe`) | Navegador por conceptos: secciones, tablas y figuras con su número y su estado | Quien escribe piensa en "la tabla 2", no en un archivo |
| El esquema del documento está en el panel derecho | El esquema está dentro del navegador, bajo "Manuscrito" | Navegar va a la izquierda. La derecha queda para lo que hay que atender |
| No hay barra de formato | Una fila con estilo, negrita, cursiva, índices e inserciones | Es un procesador de texto. Sin ella, lo básico queda escondido en menús |
| Cuatro pestañas a la derecha: esquema, referencias, comentarios y comprobaciones | Tres: avisos, revisión y detalles | Las referencias necesitan anchura y pasan a una pestaña central |
| Comentario flotando entre el texto y el panel | Los comentarios viven en el panel derecho, alineados con su texto | El panel hace de margen y no se pierde anchura |
| "Insertar cita" arriba a la derecha y "Exportar a Word" abajo | Insertar, en la barra de herramientas. Exportar, arriba a la derecha | Cada acción en el sitio donde se espera |
| Barra de progreso "3 de 6 comprobaciones" | Avisos en tres niveles, con recuento | Lo que importa es qué impide enviar, no un porcentaje |
| Iconos sin texto en la barra lateral | Iconos con su nombre debajo | No todo el mundo viene de VS Code |
| No hay sitio para biblioteca, autores, fusión ni revista | Cada una tiene su vista | Son las funciones que dan valor al programa |

## 2. Principios

1. **El manuscrito manda.** La interfaz es discreta y el texto es lo que más se ve.
2. **Objetos, no archivos.** El programa enseña secciones, tablas, figuras, autores y referencias. Los archivos existen y se pueden ver, pero no son la vista principal.
3. **Un sitio para cada cosa.** A la izquierda se navega, en el centro se trabaja, a la derecha está lo que pide atención y abajo está el estado.
4. **Todo aviso lleva a su sitio y a su arreglo.** Un aviso sin botón para ir al texto o para resolverlo es ruido.
5. **Se escribe sin soltar el teclado.** Citar, referenciar una tabla o dejar un pendiente tienen atajo. El ratón queda para organizar.
6. **Nada sale del equipo sin enseñarlo antes.** Exportar, consultar un DOI o crear un paquete para un LLM muestran exactamente qué sale.
7. **El color significa algo.** Se reserva para avisos, coautores y el elemento activo. Nunca es el único indicador: siempre va con una forma o un texto.
8. **Igual en Windows y en macOS**, salvo lo que cada sistema impone: menús, Ctrl o Cmd y botones de ventana.

## 3. Estructura de la ventana

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Menú · Proyecto › Artículo · Buscar o ejecutar una orden · [Exportar]         │
├──────┬──────────────┬───────────────────────────────────────┬─────────────────┤
│      │              │ Pestañas abiertas                     │ Avisos          │
│ Vis- │ Panel        │ Barra de herramientas                 │ Revisión        │
│ tas  │ de la vista  │                                       │ Detalles        │
│      │ elegida      │ Documento                             │                 │
│      │              │                                       │                 │
├──────┴──────────────┴───────────────────────────────────────┴─────────────────┤
│ Revista · estilo de cita · idioma · palabras · avisos · ronda · guardado      │
└───────────────────────────────────────────────────────────────────────────────┘
```

Los dos paneles laterales se pliegan con un atajo y arrastrando su borde. Con los dos plegados queda solo el documento, que es el modo de concentración que el plan deja para más adelante y que así sale gratis.

### 3.1 Barra de vistas y panel izquierdo

La barra de vistas tiene seis entradas, con icono y nombre. Cada una cambia el contenido del panel izquierdo.

| Vista | Panel izquierdo | Qué abre en el centro |
|---|---|---|
| **Artículo** | Navegador por conceptos | Manuscrito, tablas, figuras, autores y documentos |
| **Buscar** | Búsqueda y reemplazo en todo el proyecto, con los resultados agrupados por documento | El resultado elegido |
| **Biblioteca** | Filtros e importaciones | La lista de referencias |
| **Revisión** | Rondas con coautores, comentarios abiertos y respuesta a revisores | El manuscrito en modo de fusión |
| **Revista** | Estado del artículo, envíos y aprobaciones | Adaptación, requisitos, paquete y hoja de envío |
| **Historial** | Línea de tiempo de versiones | Comparación entre dos versiones |

Abajo, separados, están Ajustes y Ayuda.

**El navegador del artículo** (lámina 1) sustituye al árbol de archivos:

- **Manuscrito**, con sus secciones como hijas. Cada una enseña sus palabras. Las secciones se arrastran para reordenarlas. El total se pone en ámbar cuando pasa del límite de la revista.
- **Resumen**, dentro del manuscrito, con su recuento frente al límite.
- **Tablas** y **Figuras**, numeradas como saldrán en el artículo y con el recuento frente al máximo de la revista. Una tabla que no se cita en el texto lleva una marca.
- **Material suplementario**.
- **Autores**.
- **Documentos de envío**: carta, portada, contribuciones y declaraciones. Los que se generan solos lo indican.
- **Recortes**: lo que has quitado y no quieres perder.

Un botón en la cabecera cambia a la vista de archivos, que enseña la carpeta tal como está en el disco. Sirve para quien quiera verla y para depurar.

Con varios artículos en el proyecto, la cabecera del navegador es un selector de artículo. El mismo selector está en la barra de título.

### 3.2 Zona central

Pestañas, como en VS Code. Una pestaña puede ser:

- Un documento: manuscrito, carta, declaraciones o material suplementario.
- Una tabla o una figura en su propia pestaña.
- Una vista grande: biblioteca, autores, revista y envío, o comparación de versiones.

Dos pestañas se pueden poner lado a lado. Usos previstos: manuscrito y vista previa, resumen en español y en inglés, manuscrito y comentarios de un revisor.

### 3.3 Panel derecho

Tres pestañas, siempre las mismas, con su recuento:

- **Avisos.** Las comprobaciones, agrupadas en "Impiden el envío", "Conviene revisar" y "Correcto". Cada aviso tiene un botón para ir al texto, a veces uno para resolverlo ("Añadir apartado", "Definir aquí") y uno para marcarlo como correcto. Abajo, cuántos has marcado como correctos, con acceso para revisarlos.
- **Revisión.** Comentarios y cambios propuestos, en el orden del texto y alineados con él. Al entrar en una fusión, aquí están las tarjetas de propuestas.
- **Detalles.** Las propiedades de lo que esté seleccionado. De una cita: sus referencias, página, prefijo y sufijo. De una tabla: título, notas y colocación. De una figura: archivo, resolución, pie, texto alternativo y licencia. De una referencia: su ficha y dónde está citada. De un requisito de la revista: de dónde sale.

Al hacer clic en un texto comentado, el panel pasa a Revisión y enfoca ese hilo. Al hacer clic en un subrayado de aviso, pasa a Avisos.

### 3.4 Barra de título

De izquierda a derecha: menús, proyecto y artículo, campo de búsqueda y órdenes, y el botón Exportar.

- **Menús**: Archivo, Editar, Insertar, Referencias, Revisar, Ver y Ayuda. En macOS van en la barra del sistema. Hacen falta: son donde se busca una función que no se encuentra y donde se aprenden los atajos.
- **Buscar o ejecutar una orden** hace de paleta de comandos y de "ir a". Encuentra secciones, tablas, referencias, órdenes y ajustes.
- **Exportar** despliega: Word para coautores, Word para la revista, PDF, paquete de envío y enviar a coautores. Antes de generar nada enseña qué se va a crear y con qué formato.

### 3.5 Barra de estado

Cada elemento informa y es un botón:

| Elemento | Al pulsarlo |
|---|---|
| Revista y tipo de artículo | Abre Revista y envío |
| Estilo de cita | Cambia el estilo |
| Idioma del texto donde está el cursor | Cambia el idioma del fragmento |
| Palabras frente al límite | Reparto por secciones |
| Avisos por nivel | Abre el panel de avisos |
| Ronda en curso | Abre la fusión |
| Guardado y última versión | Abre el historial |

## 4. El editor

### 4.1 Lienzo

- Texto continuo, sin saltos de página, en una columna centrada de unos 70 caracteres de ancho sobre papel blanco.
- A la derecha de cada título de sección, sus palabras.
- El bloque de autores y afiliaciones se ve en su sitio, pero no se edita ahí: indica que se genera solo y enlaza a Autores.
- El resumen y las tablas se editan en su sitio dentro del manuscrito, aunque cada uno viva en su archivo.

### 4.2 Elementos dentro del texto

Están todos en la lámina de estilo.

| Elemento | Aspecto | Al pasar el ratón | Al pulsar |
|---|---|---|---|
| Cita | Fondo suave del color de acento | Tarjeta con las referencias | Editar: página, prefijo, sufijo, quitar una, abrir en la biblioteca |
| Referencia cruzada | Subrayado de puntos | Miniatura de la tabla o figura | Con Ctrl, salta a ella |
| Comentario | Fondo ámbar suave | Primera línea del hilo | Abre el hilo en el panel |
| Propuesta de cambio | Inserción subrayada y borrado tachado, en el color de su autor y con sus iniciales | Autor y fecha | Aceptar o rechazar |
| Aviso | Subrayado ondulado ámbar | El texto del aviso | Abre el aviso en el panel |
| Falta de ortografía | Subrayado ondulado rojo | — | Sugerencias y "añadir al diccionario del proyecto" |
| Pendiente | Etiqueta gris con borde discontinuo | — | Editar o resolver |
| Bloque que no se exporta | Texto gris con una etiqueta | — | Volver a incluirlo |

### 4.3 Barra de herramientas, burbuja y menú contextual

- **Barra de herramientas**, una sola fila: deshacer y rehacer, estilo del párrafo, negrita, cursiva, subrayado, superíndice y subíndice, **color del texto y resaltado** (con los colores de Word, ficha 0043), y las inserciones (cita, referencia cruzada, tabla, figura, símbolo). Los botones de negrita y cursiva llevan N y K, como en Word en español, o B e I con el esquema internacional.
- **Burbuja de selección.** Al seleccionar texto aparece junto a él una barra pequeña con formato, citar, comentar y cambiar el idioma.
- **Menú contextual.** Lo que tiene sentido en cada sitio: en el texto, cita, referencia cruzada, comentario, pendiente y mover a recortes. En una celda, además, las órdenes de tabla.
- **Barra de tabla.** Al entrar en una tabla aparece sobre ella una barra con filas, columnas, combinar celdas, alineación decimal y notas.

### 4.4 Cita rápida

Lámina "Cita rápida". Es la acción más repetida, así que es la más cuidada:

1. Se abre con el atajo, con el botón Cita o con el botón derecho. También dentro de una tabla o de un pie de figura.
2. Se escribe autor, año o palabras del título. La lista enseña autores, año, título, revista, el número que tiene ya la referencia en este artículo y cuántas veces está citada.
3. Intro inserta. Tab añade la referencia y sigue buscando otra para la misma cita. Ctrl+Intro abre página, prefijo y sufijo.
4. El pie de la ventana enseña cómo quedará la cita con el estilo actual.
5. Si no está en la biblioteca, la última fila ofrece buscarla en PubMed, y dice que solo sale del equipo esa búsqueda.

### 4.5 Tablas y figuras

- Una tabla se ve en el manuscrito con su título, su cuerpo y sus notas. Las abreviaturas del pie se generan solas y lo indican.
- Al pegar desde Word o Excel, un aviso breve resume lo conservado y lo descartado ("Se han conservado 3 celdas combinadas. Se han descartado los colores de fondo"), con un botón para deshacer.
- En su propia pestaña, la tabla ocupa todo el ancho y el panel de detalles enseña sus propiedades.
- Una figura enseña la imagen, el pie y, si los hay, los avisos de resolución o formato.

### 4.6 Modos de escritura

Dos modos, con un selector siempre visible en la fila de pestañas, junto al botón de vista previa:

- **Edición.** Lo que escribes cambia el texto.
- **Sugerencias.** Lo que escribes queda como propuesta tuya.

Un tercer estado, la fusión, se activa solo al importar revisiones. Cambia la barra de herramientas por la barra de fusión.

### 4.7 Vista previa

Un botón en la fila de pestañas abre la vista previa paginada al lado del editor. Enseña el PDF con el formato de la revista: interlineado, números de línea y página. Una nota fija avisa de que la paginación en Word puede variar. Al pulsar en un punto de la vista previa, el editor va a ese párrafo.

## 5. Las vistas grandes

### 5.1 Biblioteca (lámina 4)

- **Panel izquierdo.** Filtros con recuento: todas, citadas en este artículo, sin citar, incompletas, posibles duplicadas y sin verificar. Debajo, las importaciones, cada una con su fecha y su número de referencias. Al final, el modo de la biblioteca y el botón para vincular a Zotero.
- **Centro.** Buscador, añadir por DOI o PMID, buscar en PubMed y verificar. La lista tiene el número de cada referencia en la bibliografía del artículo, autores, año, título, revista, veces citada y estado.
- **Panel derecho.** La ficha de la referencia elegida, su verificación, los sitios donde está citada, que son enlaces al texto, y cómo sale en la bibliografía con el estilo actual.

### 5.2 Autores y CRediT (lámina 5)

- **Quién firma y en qué orden.** Una fila por autor, que se arrastra para cambiar el orden. Enseña cómo se cita, la afiliación, el ORCID y quién lleva la correspondencia. Los autores se añaden desde el directorio del proyecto o se crean nuevos.
- **Matriz CRediT.** Los 14 papeles por autor. Cada casilla cambia entre principal, igual, apoyo y nada. Encima, los avisos de autoría del ICMJE.
- **Panel derecho.** Cómo quedan el bloque de autores y el texto de contribuciones, en el formato que pide la revista, y en qué documentos se usan esos datos.

### 5.3 Revisión: rondas con coautores y fusión (lámina 2)

- **Panel izquierdo.** La ronda en curso con una tarjeta por coautor: cuándo devolvió su copia, cuántas propuestas quedan y, si no ha contestado, la fecha límite y un botón para copiar un recordatorio. Debajo, el botón para importar copias, que se puede usar varias veces, y los filtros de lo que se muestra. Los cambios de solo formato vienen ocultos.
- **Centro.** El manuscrito con las propuestas dentro del texto, cada una con el color y las iniciales de su autor. Una barra de fusión sustituye a la de formato: progreso, anterior y siguiente, filtro por coautor, aceptar en bloque y cerrar la ronda.
- **Conflictos.** Cuando dos coautores cambian la misma frase, se muestra un bloque con tu texto y las dos versiones, una debajo de otra, con un botón para usar cada una y otro para combinarlas a mano.
- **Panel derecho.** Una tarjeta por propuesta, alineada con el texto, con aceptar y rechazar. Las tarjetas dicen cuándo un cambio se hizo sin control de cambios, y ofrecen vincular una cita escrita a mano si coincide con una referencia de la biblioteca.
- Los párrafos sin propuestas se pliegan, para recorrer solo lo que hay que decidir.
- Antes de empezar se guarda sola una versión, y la barra de estado lo dice.

### 5.4 Revista y envío (lámina 3)

- **Panel izquierdo.** El estado del artículo en una lista de pasos, los envíos anteriores y la aprobación de la versión final por los coautores.
- **Cabecera.** Revista, tipo de artículo, tipo de revisión, sistema de envío, y cuándo y con qué fuente se comprobó el perfil.
- **Adaptación.** Dos columnas, como pide el plan. "Tienes que hacerlo tú" es una lista de tareas con un botón que lleva al sitio. "Se aplica solo al exportar" es una lista de lo que el programa hará sin tocar tu texto.
- **Requisitos.** El perfil completo, dato a dato.
- **Paquete de envío.** Cada archivo que se va a generar, con su nombre y su estado.
- **Hoja de envío.** Cada campo que pide el sistema de la revista, con un botón de copiar.
- **Panel derecho.** Al elegir un requisito, enseña la cita literal de la guía de la que sale, la fecha en que se comprobó y un botón para corregir el dato. También avisa de los datos que la guía actual no da.

### 5.5 Respuesta a revisores

No tiene lámina todavía. Propuesta:

- **Panel izquierdo.** Los puntos de cada revisor, numerados, con su estado: sin responder, respondido o con cambio enlazado.
- **Centro, en dos mitades.** A un lado el punto del revisor y tu respuesta. Al otro, el manuscrito con los cambios hechos desde la versión enviada.
- Para enlazar un cambio a un punto se selecciona el texto cambiado y se pulsa "Enlazar a este punto". La carta de respuesta cita el texto nuevo.
- **Exportar** genera la carta de respuesta, el manuscrito limpio y el manuscrito con los cambios marcados.

### 5.6 Historial

- **Panel izquierdo.** Línea de tiempo con las versiones con nombre destacadas ("Enviado a coautores, ronda 2", "Enviado a Reumatología Clínica") y las automáticas agrupadas por día.
- **Centro.** Comparación de dos versiones con el mismo aspecto que una propuesta de cambio. Se puede restaurar la versión entera o traer solo un párrafo, que entra como propuesta.

### 5.7 Inicio y nuevo artículo

- **Inicio.** Proyectos recientes con el estado de cada artículo, y tres acciones: nuevo artículo, nuevo artículo a partir de un Word y abrir una carpeta.
- **Nuevo artículo.** Un asistente de tres pasos: tipo de artículo e idiomas, revista (opcional, con buscador) y biblioteca. El último paso enseña la estructura que se va a crear.
- **Primer arranque.** Idioma de la interfaz, esquema de atajos y áreas principales.

## 6. Cuando algo sale del equipo

El principio 6 del plan se concreta en un mismo diálogo para todos los casos: exportar, consultar un registro o crear un paquete para un LLM.

- Arriba, qué va a salir, en una frase.
- En el centro, la lista exacta: archivos con su nombre o datos que se envían.
- En los paquetes para LLM, el nivel de confidencialidad con su número y su nombre, y un botón para ver el contenido antes de crearlo.
- Abajo, el botón de la acción con su nombre completo ("Crear el paquete", "Buscar en PubMed") y el de cancelar.

Las consultas a Crossref y PubMed piden permiso la primera vez, explican para qué sirven y después se indican en la barra de estado.

## 7. Estilo visual

Lámina "Estilo visual". La dirección es una mesa de trabajo: interfaz neutra, papel blanco y un solo color de acento.

- **Superficies.** Gris muy claro de fondo, paneles casi blancos y papel blanco. Líneas finas en lugar de sombras. Solo los menús flotantes llevan sombra.
- **Acento.** Propongo un verde azulado oscuro (`#0B6477`). Se distingue en la barra de tareas de Word (azul), Excel (verde), PowerPoint (naranja) y Zotero (rojo). En la lámina de estilo puedes probar tres alternativas: azul tinta, violeta y teja.
- **Significado.** Cuatro niveles, cada uno con un color y una forma distinta: octógono rojo para lo que impide el envío, triángulo ámbar para lo que conviene revisar, círculo verde con marca para lo correcto y círculo azul para la información.
- **Coautores.** Seis colores oscuros, cada uno con su fondo suave. Siempre van con las iniciales, así que no dependen de distinguir el color.
- **Tipografía de la interfaz.** La fuente del sistema: Segoe UI en Windows y San Francisco en macOS. Tamaño base de 13 px. Las cifras, con ancho fijo para que no bailen. En la maqueta se usa Inter porque es la que más se les parece en un navegador.
- **Tipografía del documento.** La que elijas para el documento, como establece la decisión 0011. En la maqueta, la equivalente libre de Times New Roman.
- **Medidas.** Filas de 28 px, controles de 28 a 30 px, esquinas de 6 a 8 px.
- **Iconos.** De línea, con trazo de 1,7 px. Lucide (licencia ISC) cubre casi todos.
- **Movimiento.** Mínimo: transiciones de 120 ms en paneles y menús, ninguna al escribir.
- **Tema oscuro.** No se diseña ahora, pero todos los colores se definen como variables con nombre, así que añadirlo después no obliga a tocar los componentes.

Todos los pares de texto y fondo de la maqueta cumplen el contraste mínimo de 4,5 a 1.

## 8. Textos de la interfaz

- De tú, en frases cortas y sin jerga. Nunca se nombra un formato de archivo si no hace falta.
- Los botones dicen lo que hacen con un verbo: "Añadir apartado", "Ir al texto", "Usar esta".
- Los avisos dicen qué pasa y dónde: "DAS28 se usa antes de definirla. Primera aparición en Métodos, párrafo 1".
- Para descartar un aviso se usa "Es correcto" o "No aplica", no "Ignorar". Refleja mejor la decisión de quien escribe (D7, ficha 0043).
- Los estados vacíos explican qué aparecerá ahí. Ejemplo, en la lista de envíos: "Todavía no se ha enviado. Cada envío quedará aquí con su fecha, su número de manuscrito, la decisión y la versión exacta que se mandó".
- Sin formas con género para referirse a quien usa el programa: "Correspondencia", no "Autor para correspondencia".
- Todos los textos van en archivos de traducción desde el principio, en español e inglés.

## 9. Teclado y accesibilidad

Atajos propuestos, todos configurables. Ninguno usa Ctrl+Alt, que en los teclados españoles de Windows equivale a AltGr.

| Acción | Esquema "Word en español" | Esquema internacional |
|---|---|---|
| Negrita, cursiva, subrayado | Ctrl+N, Ctrl+K, Ctrl+S | Ctrl+B, Ctrl+I, Ctrl+U |
| Guardar una versión con nombre | Ctrl+G | Ctrl+S |
| Buscar, reemplazar | Ctrl+B, Ctrl+L | Ctrl+F, Ctrl+H |
| Insertar cita | Ctrl+Mayús+C (decidido, D6) | Igual |
| Insertar referencia cruzada | Ctrl+Mayús+R | Igual |
| Comentario | Ctrl+Mayús+M | Igual |
| Modo de sugerencias | Ctrl+Mayús+E, como en Word | Igual |
| Buscar o ejecutar una orden | Ctrl+Mayús+P | Igual |
| Propuesta siguiente y anterior, en la fusión | F8 y Mayús+F8 | Igual |
| Aceptar y rechazar la propuesta, en la fusión | Ctrl+Intro y Ctrl+Retroceso | Igual |

Como el guardado es automático, el atajo de guardar se aprovecha para crear una versión con nombre.

Accesibilidad:

- Toda la interfaz se puede recorrer con el teclado, con el foco siempre visible.
- Los controles son botones, enlaces y campos reales, con nombre para los lectores de pantalla.
- El color nunca es el único indicador.
- El tamaño de la interfaz y el del texto del documento se cambian por separado.
- La interfaz respeta el ajuste del sistema para reducir el movimiento.

## 10. Qué se construye en cada fase

| Fase | Interfaz |
|---|---|
| 1 (MVP) | La estructura de la ventana completa. Vista Artículo con el navegador. Editor con barra de herramientas, burbuja y menú contextual. Cita rápida. Biblioteca sin verificación. Autores sin CRediT. Panel derecho con Avisos (límites, pendientes y elementos sin citar) y Detalles. Inicio, nuevo artículo e importar un Word. Vista previa |
| 2 | Vista Revisión: rondas, fusión, comentarios y modo de sugerencias. Vista Historial |
| 3 | Vista Revista: adaptación, requisitos, paquete, hoja de envío y estado. CRediT. Verificación en la biblioteca. Respuesta a revisores. Vista Buscar. Selector de artículo |

La estructura no cambia de una fase a otra. En la fase 1 las vistas que no existen todavía no aparecen en la barra de vistas.

## 11. Dónde va cada función del plan

| Sección del plan | Dónde está en la interfaz |
|---|---|
| 5.1 Proyectos y espacio de trabajo | Inicio, asistente de nuevo artículo, navegador del artículo, búsqueda de órdenes, vista Historial |
| 5.2 Editor de texto | Zona central, barra de herramientas, burbuja, menú contextual y barra de estado (idioma y palabras) |
| 5.3 Autores, afiliaciones y documentos satélite | Pestaña Autores, directorio de personas y grupo "Documentos de envío" del navegador |
| 5.4 Tablas | En el manuscrito y en su pestaña, con la barra de tabla y el panel de detalles |
| 5.5 Figuras | Grupo "Figuras" del navegador, pestaña de figura y avisos de resolución |
| 5.6 Referencias | Cita rápida, vista Biblioteca y estilo de cita en la barra de estado |
| 5.7 Referencias cruzadas y numeración | Botón y atajo de referencia cruzada. Los números del navegador |
| 5.8 Comprobaciones antes del envío | Pestaña Avisos del panel derecho, subrayados en el texto y recuento en la barra de estado |
| 5.9 Perfiles de revista y adaptación | Vista Revista: adaptación y requisitos, con la fuente de cada dato en el panel de detalles |
| 5.10 Exportación y envío | Botón Exportar y pestañas "Paquete de envío" y "Hoja de envío" |
| 5.11 Revisión por pares y colaboración | Vista Revisión: rondas, fusión y respuesta a revisores |
| 5.12 Paquetes para LLM | Menú Archivo y los puntos donde se usan (crear un perfil de revista, validar términos), con el diálogo de la sección 6 |

## 12. Decisiones que te pido

| # | Decisión | Mi propuesta |
|---|---|---|

**Decididas el 21/11/2026** (ficha 0043): D1–D5 y D8 como se proponen; D6 sí, con la cita en Ctrl+Mayús+C en los dos esquemas; D7, «Es correcto» y «No aplica»; en D8, primero inicio y tabla en su pestaña, y ajustar la maqueta a la v0.5.

| # | Decisión | Mi propuesta |
|---|---|---|
| D1 | ¿Navegador por conceptos o árbol de archivos como vista principal? | Por conceptos, con la vista de archivos como alternativa |
| D2 | ¿Barra de vistas con nombres visibles? | Sí. Ocupa 72 px en lugar de 48 |
| D3 | ¿Color de acento? | Verde azulado `#0B6477`. Las alternativas están en la lámina de estilo |
| D4 | ¿Menús clásicos en la barra de título en Windows? | Sí |
| D5 | ¿Los comentarios en el panel derecho, en lugar de globos sobre el margen? | Sí |
| D6 | ¿Dos esquemas de atajos, con "Word en español" por defecto cuando la interfaz está en español? | Sí |
| D7 | ¿"Es correcto" como forma de descartar un aviso? | Sí |
| D8 | ¿Qué láminas hago a continuación? | Respuesta a revisores, inicio con el asistente de nuevo artículo y tabla en su pestaña con el aviso de pegado |
