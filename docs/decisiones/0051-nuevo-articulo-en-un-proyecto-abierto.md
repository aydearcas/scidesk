# 0051. Nuevo artículo dentro de un proyecto abierto

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al retomar la fase 1, en el orden de lo pendiente; falta que el usuario la revise).
- **Pregunta del plan:** P12 y ficha 0015 («Añadir otro artículo al proyecto»); lo pendiente de la ficha 0048.

## Qué se decide
- **El mismo asistente de nuevo artículo** sirve para añadir un artículo al proyecto abierto. Se abre desde:
  - Archivo › Nuevo artículo;
  - el atajo del esquema;
  - un botón nuevo en la cabecera del navegador («Nuevo artículo en este proyecto…»).
- **Con un proyecto abierto, el paso 1 pregunta «Dónde»:**
  - **«En este proyecto»**, que es la opción por defecto. Comparte la biblioteca, las personas y los perfiles de revista con los otros artículos.
  - **«En un proyecto nuevo»**, que es el asistente de siempre, con su carpeta.
- **En este proyecto, la carpeta del artículo** es `articles/<nombre>`:
  - el nombre sale del título, como el de un proyecto nuevo;
  - si ya está usado, se añade «-2», «-3»…;
  - se puede cambiar, y el asistente avisa si coincide con otro artículo (sin distinguir mayúsculas) o tiene caracteres no válidos.
- **En este proyecto, el paso 3** ofrece:
  - la biblioteca del proyecto, con su número de referencias;
  - o la del proyecto más un archivo (RIS, NBIB, BibTeX o CSL-JSON), que se añade sin duplicados.
  Si la biblioteca está vinculada a Zotero, solo se muestra esa colección (ficha 0052).
- **El perfil de la revista se copia** a `resources/journals/` con su estilo, si el proyecto no lo tenía. Si ya lo tenía, se respeta la copia del proyecto, que puede estar completada a mano o con un paquete para LLM.
- **Al crearlo**:
  - se guarda lo que había en pantalla;
  - el proyecto se vuelve a cargar con el artículo nuevo a la vista, en su pestaña, junto a las de los otros;
  - un aviso dice dónde está.
- **En el núcleo:**
  - `articleFolder(project, title)`;
  - `addArticle` con `journal` y `readStyle`; escribe el manifiesto al final, como antes;
  - `scidesk add-article <carpeta> --title … [--folder …] [--type …] [--journal …]`.

## Por qué
- **El formato ya admitía varios artículos** (ficha 0015) y la ventana ya los mostraba (ficha 0044). Faltaba la forma de crearlos.
- **Un solo asistente** evita dos formas de crear un artículo con reglas distintas. Lo que se va a crear se sigue viendo a la derecha.
- **«En este proyecto» por defecto:** quien tiene un proyecto abierto y pide un artículo nuevo suele querer otro artículo del mismo estudio (protocolo, análisis secundario, carta).

## Qué se descartó
- **Un diálogo aparte, más corto**, para añadir artículos: repetiría el asistente sin la revista ni el resumen por idioma.
- **Sobrescribir el perfil de revista del proyecto** con el del catálogo: perdería lo que se haya completado.

## Consecuencias
- **Probado en la vista del navegador** con la demostración: «Protocolo del estudio» con Reumatología Clínica entra como tercer artículo. Tiene carpeta propia, IMRaD con resumen en español e inglés (lo pide la revista), su pestaña y el selector del navegador.
- **Pruebas nuevas** en `new-article.test.ts`:
  - carpeta libre;
  - perfil y estilo copiados;
  - perfil existente respetado;
  - carpeta repetida rechazada sin distinguir mayúsculas.
- **Sin probar en la ventana de Tauri.** Aquí no hay diálogos nuevos: escribe dentro de la carpeta ya abierta.
- **Pendiente:**
  - copiar autores de otro artículo del proyecto al crearlo (PLAN 4.1);
  - borrar o renombrar un artículo.
