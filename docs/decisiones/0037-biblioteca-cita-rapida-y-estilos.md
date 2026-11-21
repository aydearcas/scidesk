# 0037. Ver y editar la biblioteca, cita rápida y estilos incluidos

- **Fecha:** 21/11/2026
- **Estado:** aceptada (fase 1).
- **Pregunta del plan:** fase 1, «referencias en modo biblioteca propia: … cita rápida, bibliografía automática y ~15 estilos incluidos» y «ver, buscar, editar y borrar referencias; para cada una se ve en cuántos sitios está citada» (PLAN.md 5.6 y 8). Sigue a la ficha [0035](0035-importar-referencias.md).

## Qué se decide
- **El núcleo tiene un módulo de biblioteca** (`packages/core/src/library.ts`), con los archivos solo por `ProjectFs`:
  - **Dónde se cita cada referencia** (`referenceUses`). Recorre todos los documentos de todos los artículos: cuerpo, resumen, tablas, figuras y cartas. Lo que está en pantalla sin guardar sustituye al documento guardado, así que una referencia citada solo en texto sin guardar cuenta como citada.
  - **Búsqueda rápida** (`searchLibrary`), sin tildes y sin distinguir mayúsculas. Cada palabra escrita tiene que aparecer en los autores, el año, el título, la revista, el DOI, el PMID, la editorial o el ISBN. Pesan más el principio de un apellido y el año exacto, después el principio de una palabra del título y, por último, cualquier otra coincidencia. Los empates se ordenan por primer autor y año.
  - **Formulario de edición** (`referenceFields` y `applyReferenceFields`):
    - Campos de texto: tipo, autores, editores, título, revista o libro, abreviatura, fecha, volumen, número, páginas, editorial, lugar, edición, DOI, PMID, URL, ISBN y fecha de consulta.
    - Una persona por línea, «Apellidos, Nombre». Una línea sin coma es un autor colectivo. Una línea que no se toca conserva el nombre original con sus partículas («van der»).
    - Una fecha que no se toca conserva lo que el formulario no muestra (estación, intervalo).
    - Las variables de CSL que el formulario no enseña (ISSN, resumen…) se conservan.
    - El DOI se guarda sin `https://doi.org/`. Se avisa por campo si el DOI, el PMID o la fecha no son válidos, o si no hay ni título ni autor.
  - **Añadir a mano, editar y borrar** (`addReference`, `updateReference`, `deleteReference`):
    - Un duplicado no se añade, con el mismo criterio de la ficha 0035 (DOI, PMID, o primer autor, año y título).
    - Una edición que convertiría la referencia en la misma obra que otra se rechaza: fusionar duplicados queda para V1.
    - Al editar, se conserva de dónde vino la referencia (`source`, `zotero`).
    - **Una referencia citada no se puede borrar**, porque dejaría citas rotas y el proyecto no validaría. Antes hay que quitar sus citas.
    - La biblioteca se valida antes de escribirla. En un proyecto vinculado a Zotero, todo esto se rechaza: las referencias se editan en Zotero.
  - **Estilo de cada artículo** (`setCitationStyle`): escribe `citationStyle.id` en `article.json`. El estilo de un perfil de revista con archivo propio sigue funcionando, como hasta ahora (`styleResources`).
- **Estilos incluidos: 18**, en `packages/core/assets/styles/`, con catálogo, nombre en el menú y tipo (numérico o autor-año) en `BUNDLED_STYLES`. Son los de PLAN.md 5.6 más Medicina Clínica, Elsevier Harvard y Vancouver con superíndice:
  - el de Reumatología Clínica (propio, ficha 0026);
  - Vancouver (NLM, ICMJE), con y sin superíndice, y Elsevier Vancouver;
  - Medicina Clínica, AMA 11, JAMA, NEJM, The Lancet y BMJ;
  - Nature, Science, Cell e IEEE;
  - APA 7, Harvard (Cite Them Right), Elsevier Harvard y Chicago autor-año.

  Salvo el propio, están sin modificar, con licencia CC BY-SA 3.0 y su atribución en cada archivo. Procedencia:
  - 11 se copiaron de los estilos que instala Zotero 10 y de los del prototipo 2.
  - Science, Cell, The Lancet, NEJM, BMJ, JAMA y AMA se descargaron con permiso del usuario del repositorio oficial de CSL. Son del commit `15ea5749688396c9352b01b7641bcc5fe1b77da5` (20/11/2026).

  Cada archivo, su fuente y su licencia están en [`packages/core/assets/styles/README.md`](../../packages/core/assets/styles/README.md). JAMA es un estilo **dependiente**: el catálogo lo enlaza con su padre (`parent`), que es AMA, y citeproc-js recibe el padre. En la ventana, cada estilo se carga la primera vez que se usa.
- **La cita se muestra como la escribe el estilo.** En el editor, la cita ya no es siempre un superíndice: se construye con los fragmentos de citeproc-js (superíndice, cursiva) como nodos de texto, nunca con su HTML, porque los datos vienen de archivos importados. Así, «(Alonso & Benítez, 2025)» en APA y «¹» en Vancouver con superíndice.
- **En la ventana**:
  - **Cita rápida**: un diálogo que se abre con **Ctrl+Mayús+Y** (Cmd en el Mac) o con el botón «Citar…».
    - Se escribe autor, año o palabras del título. Las flechas mueven la selección e Intro añade la referencia a la cita.
    - Intro con la búsqueda vacía inserta la cita. Retroceso quita la última referencia y Esc cierra.
    - Cabe más de una referencia por cita, cada una con prefijo, página y sufijo.
    - Con una cita seleccionada, el diálogo la edita en lugar de insertar otra.
  - **Selector de estilo** en la barra: las citas y la bibliografía cambian al momento.
  - **Pestaña «Biblioteca»** en el panel derecho, junto a «Propuestas de la copia»:
    - buscar;
    - lista con cuántas veces se cita cada referencia, contando el texto sin guardar;
    - «Nueva referencia»;
    - formulario de edición con los campos según el tipo, el origen de la referencia y los campos guardados aparte;
    - borrar en dos pasos, desactivado si la referencia está citada.

  Es un panel mínimo: su sitio definitivo depende de las decisiones de interfaz D1–D8.
- **Línea de comandos:**
  - `scidesk library <proyecto> [--search <palabras>]` muestra la biblioteca con sus usos.
  - `scidesk ref-delete <proyecto> <id>` borra una referencia.
  - `scidesk styles` lista los estilos incluidos.
  - `scidesk style <proyecto> <estilo>` elige el estilo; acepta el id, el nombre de archivo o el nombre.

## Por qué
- **Es lo que faltaba para citar de verdad:** hasta ahora la ventana citaba eligiendo en un desplegable una referencia cada vez, y la biblioteca solo crecía importando.
- **El atajo:** Zotero usa Ctrl+Alt+C, que no se puede usar (AltGr en los teclados españoles). Word en español ocupa casi todas las combinaciones de Ctrl+Mayús con letra (Ctrl+Mayús+C copia el formato y Ctrl+Mayús+K pone versalitas), y Ctrl+Mayús+I y Ctrl+Mayús+R los usa el navegador. Ctrl+Mayús+Y está libre en los dos. Es provisional hasta los dos esquemas de atajos (R19, D6), y el clic derecho llegará con el menú contextual.
- **No borrar lo citado** evita citas que apuntan a nada, que el validador rechaza al abrir (ficha 0031).
- **Pruebas:**
  - 6 nuevas en el núcleo, 28 en total:
    - usos, también con texto sin guardar;
    - búsqueda por apellido sin tilde, año, palabras del título, revista y parte del DOI;
    - el formulario de ida y vuelta, que deja igual cada referencia de los archivos de prueba, y sus errores;
    - añadir, editar y borrar, con duplicados y referencias citadas;
    - los 18 estilos formatean el proyecto de demostración en español y en inglés; el dependiente nombra a su padre, que está incluido;
    - cambiar el estilo cambia el DOCX exportado.
  - En la ventana (navegador, con el núcleo simulado):
    - una cita de dos referencias insertada solo con el teclado;
    - editar esa cita para quitar una referencia y poner la página 12;
    - pasar a APA (citas autor-año sin superíndice), a Vancouver con superíndice y a cada uno de los 6 descargados (JAMA, The Lancet, NEJM, BMJ, Science y Cell);
    - editar una referencia: un DOI no válido da su aviso y uno en forma de enlace se limpia; citas y bibliografía cambian al momento;
    - un duplicado por DOI rechazado;
    - una referencia nueva añadida y borrada;
    - el botón de borrar desactivado en una citada;
    - la exportación para coautores funciona.

    Sin errores en la consola y sin peticiones fuera de la aplicación.

## Qué se descartó
- **Mostrar la cita con el HTML de citeproc-js:** el texto viene de archivos importados.
- **Borrar una referencia citada quitando sus citas:** se pierde texto sin que se vea. Primero se quitan las citas.
- **Fusionar al editar una referencia que coincide con otra:** se rechaza. Fusionar duplicados es V1 (ficha 0035).
- **Incluir estilos de notas al pie** (Chicago notas, MHRA): el editor y la exportación no tienen notas al pie todavía.

## Consecuencias
- **Actualizar un estilo** es copiar el archivo nuevo del repositorio de CSL y apuntar en el README de los estilos el commit del que sale. La prueba de los estilos lo cubre sin cambios.
- **Queda para el resto de la fase 1:**
  - el clic derecho para citar (con el menú contextual);
  - «omitir autor» en los estilos autor-año;
  - la bibliografía dentro del texto en el editor (hoy va debajo de la página);
  - el aviso de un locator que el estilo no muestra (el de Vancouver de NLM no muestra la página).
- **Queda para V1:** fusionar duplicados, el buscador del repositorio de estilos (PLAN.md 5.6), añadir una referencia por DOI o PMID y la búsqueda en PubMed desde la cita rápida (R24), que salen a la red y piden permiso.
- **El estilo del perfil de revista y el del artículo:** elegir un estilo incluido sustituye el del perfil en `article.json`. Volver al de la revista se hará al aplicar el perfil (fase 3).
