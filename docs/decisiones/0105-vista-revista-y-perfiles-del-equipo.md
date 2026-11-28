# 0105. Vista «Revista»: el formulario del perfil y los perfiles del equipo (primer paso de la fase 3)

- **Fecha:** 28/11/2026
- **Estado:** hecha (28/11), propuesta pendiente de revisar por el usuario. El usuario eligió empezar la fase 3 por los perfiles de revista.
- **Pregunta del plan:** PLAN 5.9, «Cómo lo hace el usuario» (decidido el 23/11, ficha [0086](0086-perfil-de-reumatologia-clinica.md)); P20 (perfiles bajo demanda); formato del perfil, ficha [0031](0031-formatos-v1-con-un-solo-esquema.md).

## Qué faltaba
La revista solo se elegía al crear el artículo, y solo Reumatología Clínica tenía perfil. Las demás revistas del catálogo traían solo su estilo de cita, sin límites ni requisitos, y no había forma de crear un perfil, corregirlo ni cambiar la revista de un artículo ya creado.

## Qué se decide
1. **Una vista «Revista»**, la tercera de la barra de vistas (Artículo, Biblioteca, Revista, Historial).
   - **A la izquierda**, las revistas que conoce el programa, en grupos: la de este artículo (con una marca si su copia no coincide con la del equipo), tus perfiles, las copias del proyecto que el equipo no tiene, las incluidas en SciDesk y las que solo traen su estilo de cita. Arriba, un buscador sin tildes y «Nuevo perfil de revista» (nombre y enlace a la guía).
   - **En el centro**, el formulario del perfil, con la guía al lado.
2. **El formulario** recoge todo lo que tiene el formato del perfil, en apartados plegables: la revista (nombre, abreviatura, ISSN, editorial, página, acceso abierto y áreas), las fuentes (tipo, enlace y fecha de lectura), el estilo de cita y los idiomas, el resumen (estructurado o no, sus apartados por idioma y las palabras clave), los tipos de artículo (nombre en la guía, los once límites, secciones fijas, apertura y resumen propio), el formato del manuscrito, la revisión, las declaraciones (obligatoria y dónde va) con el formato de las contribuciones, los documentos opcionales, las figuras, el envío y las notas.
   - Lo que la guía no dice se deja en blanco («— no lo dice») y no se guarda.
   - Lo que el esquema no acepta (un ISSN incompleto, un número con decimales) se marca en rojo en su sitio, con «Ir al primero», y no se puede guardar.
3. **La guía al lado.** Se pega su texto en el panel de la derecha, que se queda en este equipo y nunca en el proyecto. Si seleccionas una frase y pulsas ❝ junto a un dato, la frase queda como su cita (`quote`). La cita se puede escribir o corregir a mano. Es la misma pantalla en la que se revisará lo que devuelva el paquete para LLM: no habrá trabajo doble.
4. **Los perfiles se guardan en el programa** («Guardar en el programa»), en la carpeta local de datos de cada equipo (`journals/<id>.json`, y la guía en `journals/<id>.guide.txt`), con la hora en que se guardaron (`updated`, campo nuevo del perfil).
   - Un perfil del equipo sustituye al incluido en SciDesk que tiene el mismo id: cambiar Reumatología Clínica y guardarlo lo deja como «Tu perfil».
   - Un perfil incluido que se usa sin cambiarlo no se copia al equipo.
   - Un perfil del equipo se puede borrar de él («Borrar de este equipo», con confirmación); los proyectos conservan su copia.
5. **La copia del proyecto no cambia sola.** El artículo sigue usando `resources/journals/<id>.json`, y la vista compara esa copia con la del equipo:
   - si la del equipo es más reciente, lo dice y ofrece «Actualizar la copia del proyecto»; también al abrir el proyecto, en un mensaje con ese botón;
   - si la del proyecto es más reciente (viene de otro equipo o de un coautor), ofrece abrirla en el formulario para guardarla;
   - si el equipo no la tiene, se abre la del proyecto para guardarla en el programa.
6. **Cambiar la revista de un artículo** («Usar en este artículo», o «Quitar la revista de este artículo»):
   - guarda antes una instantánea automática (motivo nuevo `before-journal`, «Antes de cambiar de revista»);
   - copia el perfil (y su estilo propio, si lo tiene) a `resources/journals/`;
   - el estilo de cita pasa a ser el de la revista si el artículo tenía el de la revista anterior o no tenía revista; un estilo que eligió el usuario se queda;
   - el texto no cambia: los avisos, el recuento frente a los límites, la barra de estado y las exportaciones siguen al perfil nuevo al momento. Lo que haya que hacer en el texto será cosa del módulo de adaptación (siguiente paso).
7. **El asistente de nuevo artículo** ofrece primero tus perfiles («Tu perfil»), y las revistas que solo traen su estilo dicen que sus límites se rellenan en la vista «Revista».
8. **En el núcleo**, `journal-profiles.ts`: `storedProfiles`, `saveStoredProfile`, `forgetStoredProfile`, la guía (`storedGuide`, `saveStoredGuide`), `knownJournals` y `searchKnownJournals`, `newProfile` (desde un nombre o una revista del catálogo, con su estilo y sus áreas), `copyProfile`, `profileIdFor`, `profileIssues`, `guideRead` y `profileIsOld` (más de un año, PLAN 5.9 punto 6), `copyState`, `writeProjectJournal` y `setArticleJournal`.
9. **En la línea de órdenes**: `scidesk journal <dir>` dice la revista del artículo y cómo está su copia; con un id (del equipo, del proyecto o incluido) o un archivo `.json` la cambia (con la instantánea); `--none` la quita y `--update-copy` actualiza la copia. `scidesk journals` lista también los perfiles del equipo, y `scidesk new --journal` los usa. Las tres admiten `--store` para otra carpeta de datos.

## Cómo se comprobó
- **Pruebas nuevas** en `packages/core/test/journal-profiles.test.ts` (9): un perfil nuevo válido desde un nombre o desde una revista del catálogo, ids sin repetir, guardar, listar y borrar (con la guía aparte), rechazar uno inválido, los perfiles del equipo antes del catálogo y en lugar del incluido, copiar con otro id, guía de hace más de un año, cuál de dos copias es más reciente, y cambiar la revista de un artículo con el estilo que sigue a la revista o el que eligió el usuario, también al volver a abrir el proyecto.
- **Prueba del editor** nueva en Chromium: elegir Reumatología Clínica para la demostración (3000 palabras en la barra de estado), cambiar el límite a 3500 y guardarlo (la copia del proyecto sigue en 3000 y la vista lo dice), y actualizar la copia (3500).
- **En la vista del navegador**: usar el perfil incluido, cambiar un límite con su cita sacada de la guía pegada, guardar, actualizar la copia, volver a abrir el proyecto (el perfil y la guía siguen ahí), crear un perfil nuevo, un ISSN incompleto en rojo, y el asistente con «Tu perfil». Sin errores en la consola.
- `scidesk journal` y `scidesk journals --store` con un proyecto de demostración y una carpeta de datos temporal.
- Pasan las 260 pruebas de npm y las 13 del editor en Chromium.

## Por qué
- El plan decidió que los perfiles se hacen uno a uno y bajo demanda, con un formulario que sirva sin IA y como pantalla de revisión del paquete para LLM. Este paso da lo que necesita cualquier revista que no sea Reumatología Clínica.
- Guardar los perfiles en el equipo permite reutilizarlos en otros proyectos, y la copia en el proyecto hace que viaje con él a otro equipo o a un coautor.
- Que la copia no cambie sola evita que un artículo ya enviado cambie de límites o de formato sin que el usuario lo vea.

## Qué se descartó
- **Abrir la guía dentro del programa** (en un marco): las revistas suelen impedirlo y la ventana de Tauri no deja navegar a otros sitios. Se pega su texto, y el enlace se copia (en la vista del navegador, se abre).
- **Abrir el enlace en el navegador del sistema desde la ventana de Tauri**: necesita un complemento nuevo (`tauri-plugin-opener`), que es una descarga y requiere permiso. Por ahora, «Copiar el enlace».
- **Sacar los datos del texto de la guía con patrones**: descartado ya en PLAN 5.9.
- **Actualizar la copia del proyecto al guardar el perfil**: contradice lo decidido (la copia nunca cambia sola).
- **Guardar el texto de la guía en el proyecto**: no hace falta para usarlo, y es texto de la revista.

## Consecuencias
- Siguen, en el orden del plan:
  - **el paquete para LLM** (PLAN 5.12, ficha [0018](0018-paquetes-llm.md)), que devuelve el perfil a este formulario;
  - **el módulo de adaptación a revista**: el informe de lo que se aplica solo al exportar y de lo que tienes que hacer tú al cambiar de revista;
  - **los perfiles base por editorial** (`extends`), que el formulario todavía no muestra.
- No hay aviso de «el perfil tiene más de un año» en el panel de avisos: solo en la vista «Revista».
- Los proyectos que ya tienen una copia vieja del perfil de Reumatología Clínica pueden actualizarla desde la vista, después de guardarlo como tuyo.
- Sin probar en la ventana de Tauri ni en WebKit.
