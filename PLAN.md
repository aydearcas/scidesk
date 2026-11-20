# SciDesk: plan de desarrollo

**Borrador v0.4, 20 de noviembre de 2026.** Incorpora tus respuestas a la v0.3. Todas las preguntas del plan están contestadas (sección 10). Lo que he supuesto sin preguntarte aparece como *Supuesto*. Cada decisión tomada tiene su ficha en [`docs/decisiones/`](docs/decisiones/).

> **El programa se llama SciDesk** (decidido en P19). Su nombre de trabajo era SciScribe, que se descartó porque ya existe un producto con ese nombre en el mismo sector.

## Novedades de la v0.4

- Decididas: licencia AGPL-3.0 con CLA (P1b, 6.3), historial con instantáneas propias en lugar de git (P15, 6.4) y perfiles de revista creados bajo demanda al elegir revista (P20, 5.9).
- Decidida P12: un proyecto puede tener varios artículos, con biblioteca y directorio de personas comunes. Nueva estructura de carpetas (4) y análisis en 4.1.
- Decididas P21 a P23: el módulo de adaptación a revista no usa IA, se aceptan los cuatro niveles de confidencialidad de los paquetes para LLM, y los comentarios del código y los commits van en inglés.
- Nombre definitivo: **SciDesk** (P19), con nuevas extensiones de archivo: `.scidesk`, `.scidoc` y `.scitable`.
- Nueva función futura con IA: revisar rasgos típicos de texto generado con IA, como rayas, punto y coma y dos puntos en exceso (5.12).

La v0.3 añadió el resumen aparte, los dos modos de biblioteca (propia o Zotero), los perfiles de revista y el módulo de adaptación, la fusión de copias de varios coautores, los paquetes para LLM y las fuentes de Word.

## Decisiones tomadas

| # | Decisión | Consecuencias en el plan |
|---|---|---|
| P1 | **Código abierto público**, dejando abierta la posibilidad de una versión de pago | Licencia de P1b. Motor de citas sustituible |
| P1b | **Licencia AGPL-3.0 con acuerdo de contribución (CLA)** | Los colaboradores externos firman un CLA que permite la licencia dual o una versión de pago. citeproc-js se usa bajo AGPL. Comprobación automática de licencias de las dependencias (6.3) |
| P2 | **Windows y macOS. Se desarrolla primero en Windows** y después se prueba en macOS (tienes un MacBook Air) | La integración continua compila para los dos sistemas desde la fase 1, pero el desarrollo y las pruebas diarias se hacen en Windows. Lo propio de macOS (portapapeles de Word para Mac, motor web de Safari, firma y notarización) se resuelve antes de la primera versión pública (7.7) |
| P3 | **Primero biomedicina y clínica**, en español e inglés; después, cualquier disciplina | Plantillas, comprobaciones y perfiles empiezan por biomedicina, pero el modelo no se ata a ella: tipos de artículo, guías de publicación y perfiles de revista son datos, no código. En el primer arranque eliges tus áreas principales para filtrar plantillas y revistas sugeridas |
| P4 | Coautores con **Word por correo**; la edición simultánea vendrá después | La ida y vuelta con DOCX está en la fase 2. El modelo de documento se diseña para admitir edición simultánea más adelante (5.11 y fase 5) |
| P4b | Varios coautores revisan **en paralelo** y cada uno devuelve su copia; tú lo pasas todo a tu copia maestra | **Fusionar varias copias devueltas es el núcleo de la fase 2**, no un extra (5.11) |
| P5 | **Texto continuo + vista previa paginada** | No hay paginación en vivo. La vista previa y el PDF se deciden en la fase 0 |
| P6 | Ecuaciones: pocas en biomedicina, pero **necesarias para ampliar a otras disciplinas** | El formato las admite desde la versión 1, para no tener que migrar documentos. El editor y la exportación a Word llegan con la ampliación a otras disciplinas (fase 4) |
| P7 | Interfaz en **español e inglés**, con cambio de idioma en las opciones. **El código, en inglés** | Todos los textos de la interfaz van en archivos de traducción desde el primer día. Identificadores, claves del formato, comentarios del código y mensajes de commit, en inglés (P23) |
| P8 | **Cada tabla en su propio archivo** (`tablas/`) y cada figura en `figuras/`, **editables también desde la vista del documento completo** | La tabla se edita dentro del artículo, como en Word, o en su propia pestaña; en los dos casos se modifica el mismo archivo |
| P9 | Documentos base aceptados, **más un documento propio para el resumen y las palabras clave**. Las plantillas por tipo de artículo se hacen según avance el desarrollo | Ver 4 |
| P10 | Revistas Q1–Q2 de reumatología. **Reumatología Clínica es la revista de prueba** | Primer perfil de revista y caso de prueba de principio a fin (5.9) |
| P11 | **Zotero vinculado** (primero Zotero; EndNote y Mendeley después) **o biblioteca propia** dentro del programa, ampliable con nuevos RIS, NBIB… | Dos modos de biblioteca (5.6) |
| P12 | **Un proyecto puede tener varios artículos**: el formato lo admite desde el principio y el MVP muestra uno solo. Biblioteca y directorio de personas comunes al proyecto, sin biblioteca global; tablas y figuras se copian entre artículos | Nueva estructura de carpetas (4) y análisis en 4.1. "Añadir otro artículo" llega en V1 |
| P13 | Incluir el **estilo de cita de Reumatología Clínica** | Existe en el repositorio oficial de estilos CSL, pero es de 2012: hay que comprobar que sigue valiendo (5.9) |
| P14 | Consultar Crossref y PubMed por internet: **sí, como opción que se activa en el programa y explica para qué sirve** | Ajuste de conexión con una explicación por servicio. Todo funciona igual sin red (5.6) |
| P15 | **Historial con instantáneas propias**, no con git | Archivos que se escriben una vez y no se modifican, seguros al sincronizar con OneDrive. Puedes usar git por tu cuenta sobre la carpeta (6.4) |
| P16 | Asistente con IA: **más adelante**; cuando exista el programa se decidirá en qué pasos | Sigue en [Después]. Se añade la idea de los paquetes para LLM (5.12) |
| P17 | Conexión con revsis-app o PICO Creator: **por ahora no** | Sale de la hoja de ruta |
| P18 | **Pila propuesta aceptada**: Tauri + React + TypeScript | Se confirma con los prototipos de la fase 0 |
| P19 | **El programa se llama SciDesk** | Extensiones: `.scidesk` para el manifiesto del proyecto y su carpeta oculta, `.scidoc` para los documentos y `.scitable` para las tablas (*Supuesto*). Comprobaciones y nombres descartados en la ficha 0016 |
| P20 | **Perfiles de revista bajo demanda**: estilo de cita y datos de la revista de fuentes abiertas; el resto, con un paquete para LLM cuando eliges una revista que aún no tiene perfil | Nadie tiene que crear perfiles de todas las revistas por adelantado: el catálogo crece con el uso (5.9) |
| P21 | **El módulo de adaptación a revista no usa IA**: solo formato y requisitos | Lo que no toca tu texto se aplica al exportar; lo demás queda como lista de tareas. La ayuda con IA en la redacción, la corrección y la traducción irá en la futura versión con IA (5.12) |
| P22 | **Paquetes para LLM con cuatro niveles de confidencialidad** (0 público, 1 términos sueltos, 2 fragmentos que eliges, 3 documento completo) | Por defecto solo se ofrecen los niveles 0 y 1. Primeros usos: perfiles de revista y diccionarios de especialidad (5.12) |
| P23 | **Comentarios del código y mensajes de commit en inglés** | El plan y las decisiones siguen en español |
| — | **Fuentes**: todas las habituales de Word (Calibri, Times New Roman, Arial…) y Roboto | Ver 5.2 |
| — | **Módulo de adaptación a revista** | Ver 5.9 |

Prioridad de cada función:
- **[MVP]**: imprescindible en la primera versión usable.
- **[V1]**: en la primera versión completa.
- **[Después]**: interesante, pero no bloquea nada.

---

## 1. Visión

Un procesador de texto de escritorio para escribir artículos científicos de principio a fin: desde crear el proyecto hasta generar el paquete de envío a la revista y responder a los revisores.

Principios que guían todas las decisiones:

1. **Estructura antes que formato.** El programa sabe qué es el título, el resumen, una cita, una tabla o una afiliación. No son simplemente "texto en negrita". Gracias a eso puede numerar, contar palabras, comprobar y exportar sin que tú hagas nada a mano.
2. **Una sola fuente de verdad.** Autores, afiliaciones, referencias, figuras y tablas se definen una vez y aparecen donde haga falta: portada, carta, contribuciones, versión cegada…
3. **Word es un formato de salida de primera clase.** Las revistas y los coautores trabajan con .docx. Exportar a Word tiene que quedar impecable, y volver a importar lo que te devuelven tiene que ser posible.
4. **Archivos abiertos dentro de una carpeta.** No hay base de datos oculta. Se puede copiar, sincronizar con OneDrive o versionar con git, y nunca te quedas atrapado en el formato.
5. **Funciona sin conexión.** Internet solo se usa para buscar metadatos (DOI, PMID) y descargar estilos de cita y perfiles de revista, y siempre como una opción que activas tú y que explica para qué sirve.
6. **Lo que escribes no sale de tu equipo sin que lo decidas.** Nada del manuscrito se envía a ningún servicio de forma automática. Cuando algo sale (una consulta de DOI, un paquete para un LLM), el programa te enseña antes exactamente qué.

## 2. Qué existe y qué hueco cubre

Esto es lo que conozco hasta mediados de 2026. Conviene repasarlo en la fase 0.

| Herramienta | Qué hace bien | Qué le falta para este caso |
|---|---|---|
| Word + Zotero/EndNote | Es el estándar; los coautores lo usan | No tiene estructura de proyecto, los documentos satélite van a mano y las figuras y tablas se numeran a mano |
| Overleaf / LaTeX | Estructura, referencias y plantillas de revista | Exige saber LaTeX y casi no se usa en biomedicina |
| Editores de LaTeX en línea con IA (por ejemplo, sciscribe.dev) | Plantillas de revista, ayuda con IA y colaboración | Exigen LaTeX y trabajan en la nube |
| Manuscripts.io, Authorea, Curvenote | Edición estructurada orientada a revistas | Son web o en la nube, con poco control local y una adopción limitada |
| Zettlr / Pandoc / Typst | Texto plano y citas CSL | No son WYSIWYG y pegar tablas de Word es complicado |

El hueco que cubre SciDesk: un editor visual como Word, con la lógica de proyecto de VS Code y todo lo que piden las revistas, empezando por las biomédicas (ICMJE, CRediT, guías EQUATOR, versión cegada, carta de presentación).

## 3. El formato del archivo del artículo (investigación)

### 3.1 Opciones evaluadas

| Formato | Ventajas | Inconvenientes | Veredicto |
|---|---|---|---|
| **DOCX como formato nativo** | Compatibilidad total con Word | XML enorme y ambiguo. Las citas, la numeración y la estructura serían "texto con estilo", y mantenerlas sincronizadas es frágil. Cada guardado podría perder información | Solo como exportación e importación |
| **ODT** | Abierto y estándar | Los mismos problemas que DOCX y nadie lo usa en revistas | No |
| **Markdown / Pandoc** | Texto plano, ideal para git | Las tablas con celdas combinadas, bordes y formato copiadas de Word no caben; habría que extender la sintaxis | No como formato principal, sí como exportación |
| **LaTeX** | Potente | Difícil de editar visualmente y poco usado en biomedicina | Solo exportación [Después] |
| **JATS XML** | Es *el* estándar de las revistas (PubMed Central lo usa), así que la semántica es perfecta | Muy verboso y lento de manipular para la edición diaria | Sí como exportación, y como referencia para diseñar el formato propio |
| **Formato propio en JSON** | Representa exactamente el modelo del editor. Se puede versionar y migrar. Las citas, figuras y referencias cruzadas son objetos, no texto | Hay que diseñarlo y documentarlo, y otros programas no lo abren | **Recomendado** |

### 3.2 Recomendación

**Un formato propio en JSON, legible y versionado, cuyos conceptos copien los de JATS.** Su núcleo es el documento del editor (ProseMirror, ver sección 6) serializado tal cual. Las reglas:

- Se guarda como un archivo `.scidoc` dentro de la carpeta del proyecto. No es un ZIP, porque la propia carpeta ya contiene figuras y tablas.
- Lleva un campo `schemaVersion` y migraciones automáticas, de modo que los documentos antiguos siempre se abren.
- Cada bloque (párrafo, sección, tabla) tiene un identificador estable. Esto permite comentarios, control de cambios y respuestas a revisores que apunten a un sitio concreto.
- **Nunca se guardan números calculados.** Una cita es `{tipo: cita, refs: ["smith2021"]}`, no "[3]", y una figura es una referencia a `figuras/fig-kaplan.png`. La numeración se calcula al mostrar o exportar.
- Las claves del formato están en inglés (P7). El esquema incluye desde la versión 1 los elementos que llegarán más tarde (ecuación, comentario, cambio), para no tener que migrar documentos cuando lleguen (P6).
- Se escribe con formato estable (claves ordenadas, sangría) para que las diferencias entre versiones sean legibles.
- Hay una garantía anti-encierro: el contenido siempre se puede exportar a DOCX, Markdown y JATS sin pérdida de texto.

Ejemplo simplificado:

```json
{
  "schemaVersion": 1,
  "type": "article",
  "content": [
    { "type": "section", "id": "s-intro", "role": "introduction", "content": [
      { "type": "heading", "content": [{ "type": "text", "text": "Introducción" }] },
      { "type": "paragraph", "id": "p-7f3a", "content": [
        { "type": "text", "text": "La artritis reumatoide afecta al 0,5–1 % de la población " },
        { "type": "citation", "refs": [{ "id": "smolen2016" }, { "id": "aletaha2018", "locator": "p. 12" }] },
        { "type": "text", "text": ". Los resultados se muestran en la " },
        { "type": "xref", "target": "tab-basal" }
      ]}
    ]},
    { "type": "tableRef", "id": "tab-basal", "src": "tablas/caracteristicas-basales.scitable" }
  ]
}
```

## 4. Estructura de un proyecto nuevo

Un proyecto corresponde a un estudio y puede contener varios artículos: el protocolo, el artículo principal, los análisis secundarios… (decidido en P12; análisis en 4.1).

El asistente "Nuevo artículo" crea el proyecto con su primer artículo y te pregunta:
- El tipo de artículo.
- El idioma o idiomas. Reumatología Clínica, por ejemplo, pide el título, el resumen y las palabras clave también en inglés.
- La revista objetivo (opcional) y el estilo de cita.
- El modo de la biblioteca: propia o vinculada a Zotero (5.6).

Y genera esto:

```
mi-estudio/
├── mi-estudio.scidesk          ← manifiesto: artículos, idiomas, modo de biblioteca, versión del formato
├── referencias/                   ← común a todo el proyecto
│   ├── biblioteca.json            ← biblioteca en CSL-JSON (con la clave de Zotero si está vinculada)
│   └── importaciones/             ← copia de cada RIS o NBIB importado, para trazabilidad
├── personas/
│   └── personas.json              ← ficha de cada persona: nombre, forma de cita, ORCID, correo, grado y afiliaciones
├── recursos/                      ← común: diccionario del proyecto, abreviaturas y perfiles de revista descargados
├── articulos/
│   └── principal/                 ← el primer artículo; el explorador oculta este nivel mientras solo haya uno
│       ├── articulo.json          ← tipo, revista objetivo y estilo de cita de este artículo
│       ├── manuscrito/
│       │   ├── articulo.scidoc    ← el cuerpo del artículo
│       │   └── resumen.scidoc     ← resumen y palabras clave, en uno o dos idiomas
│       ├── autores.json           ← quién firma, orden, afiliaciones usadas, CRediT, correspondencia y conflictos
│       ├── documentos/
│       │   ├── carta-presentacion.scidoc ← plantilla con campos de la revista, el editor, el título y los autores
│       │   ├── portada.scidoc     ← se genera a partir de autores.json y personas.json (title page)
│       │   ├── contribuciones.scidoc ← se genera a partir de la matriz CRediT
│       │   ├── declaraciones.scidoc  ← financiación, conflictos, ética, disponibilidad de datos, uso de IA
│       │   └── respuesta-revisores/  ← una por ronda de revisión [V1]
│       ├── figuras/               ← imágenes originales y sus metadatos (pie, fuente, licencia)
│       ├── tablas/                ← cada tabla en su archivo .scitable
│       ├── suplementario/
│       │   └── material-suplementario.scidoc ← con su propia numeración (Tabla S1, Figura S1)
│       └── exportaciones/         ← DOCX, PDF y paquetes de envío generados (se pueden borrar y regenerar)
└── .scidesk/                       ← caché, historial de versiones y ajustes locales (oculta)
```

- **Varios artículos (P12).** Lo común está en la raíz del proyecto y lo de cada artículo, en `articulos/<nombre>/`. Un segundo artículo es otra carpeta, por ejemplo `articulos/protocolo/`. Mientras solo haya uno, el explorador muestra directamente su contenido, así que el proyecto se ve como si tuviera un solo nivel.
- **El resumen va aparte.** Tiene sus propias reglas (límite de palabras, apartados del resumen estructurado, número de palabras clave) y muchas revistas lo piden en dos idiomas. En un archivo propio se cuenta y se comprueba por separado. La vista del documento completo lo muestra en su sitio, encima del cuerpo, y se edita allí igual que las tablas.
- **Tablas y figuras en archivos propios (P8).** Así se pueden (a) colocar en el texto o al final según la revista, (b) reutilizar en el material suplementario y (c) editar en su propia pestaña. También se editan directamente en la vista del documento completo: es el mismo archivo.
- **El manifiesto tiene una extensión propia** (`.scidesk`), así que basta con hacer doble clic en él para abrir el proyecto en Windows o en macOS. *Supuesto.*
- **Los nombres de las carpetas** se crean en el idioma de la interfaz (en inglés serían `references/`, `people/`, `articles/`, `tables/`…) y el manifiesto registra cuál es cada una, para que el programa no dependa de nombres fijos. *Supuesto*, consecuencia de P7.

Cada tipo de artículo trae su plantilla de secciones. Se harán según avance el desarrollo (P9): primero el original y después el orden lo marcarán los tipos de Reumatología Clínica y lo que vayas necesitando.
- **Original:** IMRaD.
- **Revisión sistemática:** PRISMA 2020.
- **Ensayo clínico:** CONSORT.
- **Estudio observacional:** STROBE.
- **Caso clínico:** CARE.
- **Protocolo:** SPIRIT o PRISMA-P.
- **Estudio cualitativo:** COREQ.
- Además: original breve, revisión narrativa, carta al editor y guía de práctica clínica.

### 4.1 Un proyecto, varios artículos (decidido en P12)

De un mismo estudio suelen salir varios artículos: el protocolo, el artículo principal, los análisis secundarios, una comunicación a un congreso o una versión en otro idioma. Se valoraron tres opciones:
- **A. Un artículo por proyecto**, como proponía la v0.2.
- **B. Un proyecto con varios artículos** que comparten lo común.
- **C. Además, una biblioteca global**, compartida entre proyectos.

Comparación de A y B:

| | A. Un artículo | B. Varios artículos |
|---|---|---|
| Sencillez de la interfaz, la numeración y la exportación | Máxima: todo se refiere a un artículo | Hay que saber siempre en qué artículo estás, y el explorador tiene un nivel más |
| Biblioteca | Una por artículo: se repiten las importaciones entre artículos del mismo estudio | Una para todo el estudio: se importa y se deduplica una sola vez |
| Autores y afiliaciones | Se vuelven a escribir en cada proyecto | Un directorio de personas del estudio, del que cada artículo elige sus autores, su orden, sus afiliaciones, su CRediT y su autor de correspondencia |
| Tablas y figuras comunes (por ejemplo, las características basales) | Se copian entre proyectos y pueden acabar siendo distintas | Se pueden reutilizar, pero con el riesgo de la fila siguiente |
| Cambios en algo compartido | No existe el problema | Corregir una referencia o una tabla para el artículo 2 cambia el 1, que quizá ya está enviado o publicado. Hay que "congelar" lo que usa cada artículo al enviarlo |
| Historial de versiones | Uno por proyecto, sencillo | Tiene que ser por artículo: restaurar el artículo 1 no debe tocar el 2 |
| Comprobaciones | Directas | Se calculan por artículo: "referencias sin citar" mira las del artículo, no todas las del estudio |
| Enviar a un coautor o llevarlo a otro equipo | Se copia la carpeta | Hace falta "exportar este artículo como proyecto independiente" |
| Cambiar de idea más tarde | Pasar de A a B obliga a migrar los proyectos | Un proyecto B con un solo artículo se comporta como A |

**Decisión:**
1. **El formato es B desde el principio, con una interfaz de un solo artículo en el MVP.** El asistente crea un proyecto con un artículo, y el explorador oculta el nivel extra mientras solo haya uno. "Añadir otro artículo al proyecto" llega en V1. Así no habrá que migrar nada.
2. **Compartido por todo el proyecto:** la biblioteca, el directorio de personas, el diccionario y la lista de abreviaturas, y los perfiles de revista descargados.
3. **Propio de cada artículo:** manuscrito y resumen, lista de autores (quiénes firman, en qué orden y con qué afiliaciones, elegidos del directorio de personas), CRediT, documentos (carta, portada, declaraciones), material suplementario, tablas, figuras, revista objetivo, exportaciones e historial.
4. **Las tablas y figuras se copian entre artículos, no se enlazan.** Un enlace vivo es cómodo hasta que cambias sin querer un artículo ya enviado.
5. **Cada versión con nombre de un artículo guarda los datos exactos de las referencias citadas y de sus autores**, para que la versión enviada se pueda reproducir siempre, aunque luego se corrija la biblioteca o el directorio.
6. **Sin biblioteca global (C) por ahora.** En el modo Zotero, la biblioteca global ya es Zotero. En el modo de biblioteca propia basta con "importar referencias de otro proyecto".

**¿Por qué personas comunes, si no todas firman todos los artículos?** Lo común no es la lista de autores, sino la ficha de cada persona. Cada artículo elige del directorio quiénes firman y en qué orden; el resto de personas del directorio no aparece en ese artículo.

| | Directorio común; cada artículo elige (elegido) | Lista propia en cada artículo |
|---|---|---|
| Datos de cada persona (nombre y forma de cita, ORCID, correo, grado, afiliaciones) | Se escriben una vez | Se repiten en cada artículo. "Copiar autores de otro artículo" ayuda, pero después cada copia va por su lado |
| Una corrección (un ORCID mal escrito, un correo nuevo) | Llega a todos los artículos en curso | Hay que repetirla en cada artículo, y es fácil que alguno se quede sin corregir |
| Elegir autores al crear un artículo | El programa propone las personas del estudio | Se copian de otro artículo o se escriben |
| Alguien cambia de centro entre el protocolo y el artículo de resultados | Cada artículo elige qué afiliaciones de esa persona usa | Natural: cada artículo tiene las suyas |
| Artículo ya enviado | Sus versiones con nombre guardan los datos tal como estaban, igual que con las referencias | Sin riesgo |
| Personas que no firman (agradecimientos, miembros de un grupo o consorcio) | Caben en el mismo directorio | Otra lista más en cada artículo |
| Proyecto con un solo artículo | No se nota la diferencia | — |

Reparto de los datos:
- **En el directorio**, lo que no depende del artículo: nombre, forma de cita, ORCID, correo, grado y todas las afiliaciones conocidas. El directorio indica en qué artículos aparece cada persona.
- **En cada artículo**, lo que sí depende de él: quiénes firman, el orden, qué afiliaciones de cada persona se usan, CRediT, autor de correspondencia, contribución igual y conflictos de interés.

## 5. Funciones propuestas

### 5.1 Proyectos y espacio de trabajo
- **[MVP]** Asistente "Nuevo artículo" con plantillas y abrir carpeta existente. Lista de proyectos recientes.
- **[MVP]** En el primer arranque eliges el idioma de la interfaz (español o inglés) y tus áreas principales, que filtran plantillas y revistas sugeridas (P3 y P7). Se pueden cambiar después en las opciones.
- **[MVP]** Interfaz al estilo de VS Code:
  - Explorador de archivos del proyecto a la izquierda.
  - Editor con pestañas en el centro (artículo, carta, tabla 2…).
  - Panel lateral derecho. **Su contenido se decide al diseñar la interfaz en la fase 1**, según lo que resulte útil al escribir. Candidatos: esquema del documento, referencias, comentarios, comprobaciones, propiedades del elemento seleccionado (tabla, figura, cita) e historial. La maqueta de [`sciscribe-chatgpt/SciScribe-captura.png`](sciscribe-chatgpt/SciScribe-captura.png) usa cuatro pestañas: esquema, referencias, comentarios y comprobaciones.
- **[MVP]** Menú contextual (clic derecho) en el texto, en las celdas de tabla y en los pies de figura, con lo que tiene sentido en cada sitio: insertar cita, referencia cruzada, comentario o carácter especial.
- **[MVP]** Guardado automático e indicador de cambios sin guardar.
- **[V1]** Aviso si el proyecto está abierto en otro equipo, para no pisar cambios al sincronizar la carpeta con OneDrive o Dropbox entre el PC y el MacBook.
- **[V1]** Paleta de comandos (Ctrl+Shift+P) y atajos configurables.
- **[V1]** Historial de versiones con nombre ("Enviado a Reumatología Clínica", "Revisión 1"), comparar dos versiones y restaurar. Por debajo, instantáneas propias (6.4, decidido en P15).
- **[Después]** Plantillas de proyecto propias: guardar un proyecto como plantilla.

### 5.2 Editor de texto (lo de Word que importa en un artículo)
- **[MVP]** Estilos semánticos: título, títulos de sección de nivel 1 a 3, párrafo, cita en bloque, lista numerada o con viñetas. El aspecto (fuente, tamaño, interlineado) se define en los estilos del documento, no párrafo a párrafo, y el perfil de revista puede imponer el suyo al exportar.
- **[MVP]** **Fuentes**: se pueden usar todas las instaladas en el equipo, incluidas las habituales de Word (Calibri, Aptos, Cambria, Times New Roman, Arial) y Roboto, para el documento y para cada estilo.
  - Las fuentes de Microsoft no se pueden incluir en el instalador: su licencia no lo permite, sea cual sea la nuestra. En Windows ya están instaladas. En macOS, Times New Roman y Arial vienen con el sistema, pero Calibri y Cambria solo están si tienes Office.
  - Por eso el programa incluye equivalentes libres con las mismas medidas, para que el texto ocupe lo mismo: Carlito (Calibri), Caladea (Cambria), Liberation Serif (Times New Roman), Liberation Sans (Arial) y Liberation Mono (Courier New). Roboto es libre y se incluye tal cual.
  - El DOCX conserva el nombre original de la fuente, así que quien lo abra en Word verá Calibri. El PDF incrusta la fuente que se haya usado.
- **[MVP]** Negrita, cursiva, subrayado, superíndice, subíndice, versalitas, alineación, sangría.
- **[MVP]** Deshacer y rehacer, buscar y reemplazar (con expresiones regulares y "solo en esta sección").
- **[MVP]** Caracteres especiales con acceso rápido a los científicos: ±, ≤, ≥, µ, α–ω, ×, espacio duro, guion largo.
- **[MVP]** Recuento de palabras **por sección** y según las reglas de la revista: el texto principal sin resumen, referencias, tablas ni pies. El resumen se cuenta aparte.
- **[MVP]** Corrector ortográfico en español e inglés con diccionario personal por proyecto (términos médicos).
- **[V1]** Diccionarios de especialidad (por ejemplo, de reumatología: fármacos, escalas como DAS28 o HAQ, abreviaturas habituales). Se pueden crear o ampliar con un paquete para LLM sin enviar nada del artículo (5.12).
- **[V1]** Notas al pie.
- **[V1]** Comentarios anclados a texto, con respuestas y marcado como resuelto.
- **[V1]** Control de cambios: aceptar o rechazar, por autor, y ver el final o el original.
- **[V1]** Vista de página / vista previa de impresión (ver el riesgo 7.2) **[P5]**.
- **[Después]** Ecuaciones con editor visual, que se exportan a Word como ecuaciones nativas. Llegan con la ampliación a otras disciplinas **[P6]**.
- **[Después]** Modo concentración, tema oscuro y estadísticas de escritura.

### 5.3 Autores, afiliaciones y documentos satélite
- **[MVP]** Formulario de autores con estos datos:
  - Nombre y apellidos (con forma de cita, p. ej. "Pérez-García J").
  - Grado académico, ORCID y correo.
  - Afiliaciones (reutilizables entre autores) y autor de correspondencia.
  - "Contribución igual" y autoría de grupo o consorcio.
- **[MVP]** Las fichas de las personas viven en el directorio común del proyecto, y cada artículo elige quién firma, en qué orden y con qué afiliaciones (4.1).
- **[MVP]** El bloque de autores del artículo y la portada se generan solos: superíndices de afiliación, orden y datos de correspondencia. Si cambias un autor, cambia en todas partes.
- **[V1]** Matriz CRediT con los 14 roles (autores × roles, con grado de participación: principal, igual o de apoyo). A partir de ella se generan:
  - El documento de contribuciones en el formato de la revista: tabla CRediT, frase con iniciales ("JPG y AML diseñaron…") o criterios ICMJE.
  - Una comprobación de que cada autor cumple los 4 criterios ICMJE.
- **[V1]** Carta de presentación con campos combinados (revista, editor, título, tipo de artículo, autor de correspondencia, fecha) y párrafos tipo editables.
- **[V1]** Declaraciones con plantillas: financiación, conflictos de interés, aprobación ética y consentimiento, disponibilidad de datos, registro (PROSPERO, ClinicalTrials.gov), uso de IA y agradecimientos.
- **[Después]** Ayuda para el formulario de conflictos ICMJE de cada autor (por ejemplo, enviar a cada coautor la lista de datos que necesita).

### 5.4 Tablas
- **[MVP]** Editor de tablas: insertar o borrar filas y columnas, combinar celdas, alineación por columna (decimales), bordes de estilo científico (solo líneas horizontales) y sombreado.
- **[MVP]** La tabla se edita dentro de la vista del documento completo o en su propia pestaña; en los dos casos se modifica su archivo (P8).
- **[MVP]** **Pegar desde Word y Excel conservando el formato**: celdas combinadas, negritas, sangrías de la primera columna, bordes y superíndices de notas. Es el riesgo técnico número 1 (7.1).
- **[MVP]** Título y notas de la tabla (abreviaturas, ᵃ ᵇ ᶜ). La numeración es automática por orden de primera mención.
- **[V1]** Colocar las tablas dentro del texto o "todas al final" según el perfil de revista, sin tocar el documento.
- **[V1]** Importar desde CSV o Excel.
- **[Después]** Tablas que salen de los datos, por ejemplo una tabla de características basales generada desde un CSV.

### 5.5 Figuras
- **[MVP]** Insertar imagen (PNG, JPG, TIFF, SVG) copiándola a `figuras/`, con pie de figura y numeración automática.
- **[V1]** Comprobación de requisitos: resolución en ppp según el tamaño de impresión, modo de color y formato admitido por la revista.
- **[V1]** Exportar las figuras como archivos separados con el nombre que pide la revista (`Figure1.tiff`), convirtiendo el formato si hace falta.
- **[V1]** Figuras con paneles (A, B, C) y lista de pies de figura al final del manuscrito.
- **[Después]** Generar el diagrama de flujo PRISMA a partir de los números.

### 5.6 Referencias

**Dos modos de biblioteca (P11).** Se elige al crear el proyecto y se puede cambiar después: al vincular más tarde, las referencias se emparejan por DOI, PMID o título.

*Modo biblioteca propia: el "gestor" está dentro del programa*
- **[MVP]** Importar la biblioteca inicial en estos formatos:
  - RIS (.ris).
  - PubMed / MEDLINE (.nbib, .txt).
  - BibTeX (.bib).
  - CSL-JSON.
  - EndNote XML (.xml) **[V1]**.
  - EndNote etiquetado (.enw) **[V1]**.
- **[MVP]** **Añadir más referencias en cualquier momento** importando nuevos archivos. Cada importación se guarda en `referencias/importaciones/` y muestra un resumen: cuántas referencias son nuevas, cuántas ya estaban y cuáles han cambiado.
- **[MVP]** Eliminar duplicados al importar (por DOI, PMID y título normalizado) y avisar.
- **[MVP]** Ver, buscar, editar y borrar referencias. Para cada una se ve en cuántos sitios está citada.

*Modo vinculado a Zotero* **[V1]** (después vendrán EndNote y Mendeley)
- Eliges una biblioteca o una colección de Zotero y SciDesk la lee a través de la API local de Zotero (Zotero 7 o posterior). Hace falta tener Zotero abierto en el mismo equipo y activar en Zotero la opción "Permitir que otras aplicaciones de este equipo se comuniquen con Zotero".
- Lo que añades en Zotero (por ejemplo, con su conector del navegador) aparece en SciDesk.
- El proyecto guarda una copia de cada referencia citada con su clave de Zotero. Así se abre y se exporta en otro equipo o sin Zotero. Al volver a abrirlo con Zotero, se actualizan los cambios y se avisa de las referencias borradas allí.
- **[Después]** Escribir en Zotero desde SciDesk, por ejemplo al añadir una referencia por DOI. Zotero 10 lo permite a través de su API local, con un permiso que concedes en un diálogo de Zotero.
- **[Después]** EndNote no tiene una API comparable: lo razonable es usar su exportación EndNote XML y reimportarla para actualizar. Mendeley Reference Manager tiene una API en la nube que habrá que estudiar.

*En los dos modos*
- **[V1]** Añadir una referencia pegando un DOI, PMID o ISBN; los metadatos se buscan en Crossref y PubMed. **Es una opción que se activa en el programa y explica para qué sirve (P14)**: completar y corregir los metadatos de las referencias, sin enviar nada del manuscrito. Sin conexión, todo lo demás funciona igual.
- **[V1]** Abreviaturas de revista del catálogo NLM (necesarias para Vancouver).
- **[V1]** Comprobar si hay artículos retractados (base de Retraction Watch vía Crossref).
- **[Después]** Adjuntar PDF a una referencia.

**Citar**
- **[MVP]** Cita rápida: un atajo de teclado **o el clic derecho** (en el texto, en una celda de tabla o en un pie de figura) abre un buscador (autor, año, título) y Enter inserta la cita. Se pueden poner varias en la misma cita.
- **[MVP]** Prefijo, sufijo y localizador ("p. 12") y "omitir autor" en los estilos autor-año.
- **[MVP]** Numeración automática por orden de aparición. Los rangos se compactan ([1–3, 5]) y se recalculan al mover texto.
- **[MVP]** Bloque de bibliografía que se actualiza solo. Puede ir en el artículo o en el suplementario.
- **[MVP]** Cambiar de estilo de cita al instante.
- **[MVP]** Estilos incluidos de serie: Vancouver/ICMJE, AMA 11, APA 7, Harvard, NLM, Nature, Science, Cell, The Lancet, NEJM, BMJ, JAMA, IEEE, Chicago, Elsevier Vancouver y **Reumatología Clínica** (P13).
- **[V1]** Buscador del repositorio oficial de estilos CSL (más de 10 000 estilos, uno por revista), con descarga.
- **[V1]** Avisos de referencias de la biblioteca sin citar, citas rotas y referencias incompletas (sin año, sin revista…).

### 5.7 Referencias cruzadas y numeración
- **[MVP]** "Insertar referencia cruzada" a tabla, figura, sección, ecuación o material suplementario. El texto ("Tabla 2", "Figura 1B", "Tabla S3") se mantiene actualizado.
- **[V1]** Comprobar que tablas y figuras se citan en orden y que todas se citan al menos una vez.

### 5.8 Comprobaciones antes del envío (el "corrector de manuscrito")
Un panel que se va actualizando mientras escribes:
- **[V1]** Límites de la revista: palabras del resumen y del texto, número de palabras clave, de referencias, de figuras, de tablas y de autores, y caracteres del título.
- **[V1]** Abreviaturas: lista automática, uso antes de definirlas, definidas pero no usadas y definición repetida en el resumen y en el texto.
- **[V1]** Tablas, figuras y referencias sin citar o fuera de orden.
- **[V1]** Secciones obligatorias del tipo de artículo y declaraciones que faltan.
- **[V1]** Formato numérico: separador decimal coherente, "p < 0,05" frente a "p<.05" según el estilo, espacio entre número y unidad e intervalos de confianza coherentes.
- **[V1]** Variante del inglés que pide la revista (británico o americano), con avisos de palabras escritas en la otra.
- **[Después]** Rasgos típicos de texto generado con IA: rayas, punto y coma y dos puntos en exceso, con umbrales ajustables (5.12).
- **[Después]** Lista de verificación de la guía EQUATOR (PRISMA, CONSORT, STROBE…): cada ítem se enlaza a la parte del texto que lo cumple y se exporta la checklist rellena con números de página.

### 5.9 Perfiles de revista y adaptación a revista

**Qué reúne un perfil de revista** **[V1]**:
- Estilo de cita.
- Límites por tipo de artículo: palabras, referencias, figuras, tablas y autores.
- Resumen: si es estructurado y con qué apartados, límite de palabras, idiomas y número de palabras clave.
- Formato de envío: interlineado, fuente y tamaño, márgenes, números de línea y de página, tablas al final o en el texto, y figuras en archivos separados con sus requisitos.
- Tipo de revisión: si es ciega, con portada separada y manuscrito anonimizado.
- Declaraciones exigidas y dónde van, formato de las contribuciones y documentos opcionales (puntos destacados, resumen gráfico).

**¿Se puede obtener automáticamente? ¿Está al día?** Solo en parte:

| Dato | ¿Automático? | De dónde | ¿Está al día? |
|---|---|---|---|
| Estilo de cita | Sí | Repositorio oficial de estilos CSL (más de 10 000, mantenido por voluntarios) | En general sí, pero algunos estilos son antiguos. El de Reumatología Clínica es de 2012, y su guía actual muestra referencias con el formato de Elsevier y DOI |
| Identificación de la revista: ISSN, editorial, abreviatura NLM, acceso abierto | Sí | Catálogo de revistas de la NLM (dominio público), OpenAlex y DOAJ (abiertos) | Sí, se actualizan continuamente |
| Área temática, para sugerir revistas según tus áreas | Sí | OpenAlex | Sí |
| Cuartil (Q1, Q2…) | En parte | JCR (Clarivate, de pago) o SJR (Scimago, consulta gratuita; hay que comprobar si se puede reutilizar) | Una vez al año |
| Límites, estructura del resumen, palabras clave, formato de envío, revisión ciega y declaraciones | **No** | Solo la "guía para autores" de cada revista, en texto libre (web o PDF). Existen directorios de enlaces, como el de la Mulford Library (más de 6000 revistas de ciencias de la salud), pero no datos estructurados | Cambia sin aviso y a veces está incompleta: la guía actual de Reumatología Clínica no da el límite de palabras del resumen |

**Cómo se consiguen los perfiles (decidido en P20).** Nadie tiene que preparar por adelantado los perfiles de todas las revistas, que son decenas de miles. Se crean **bajo demanda**, cuando alguien elige una revista:
1. **Lo automático se rellena solo**: estilo de cita, ISSN, abreviatura, editorial y área, desde las fuentes abiertas de la tabla anterior.
2. **Si la revista ya está en el catálogo**, se descarga su perfil. El catálogo es un repositorio público de perfiles, como el de estilos CSL. El programa incluye de serie un perfil genérico (ICMJE) y el de Reumatología Clínica.
3. **Si no está**, el programa ofrece un paquete para LLM (5.12) con la guía de la revista (enlace o texto) y el esquema del perfil. El LLM devuelve el perfil con una cita literal de la guía para cada dato, y tú lo revisas campo por campo. No hay problema de confidencialidad, porque la guía es pública. El perfil verificado se puede aportar al catálogo, que así crece con el uso.
4. **Perfiles base por editorial** *(Supuesto)*: las revistas de una misma editorial (Elsevier, Springer Nature, Wiley…) comparten buena parte de la guía. Un perfil de revista puede heredar del de su editorial y guardar solo lo que cambia, lo que reduce mucho el trabajo de cada perfil nuevo.
5. **Formato abierto de perfil**: un archivo JSON con esquema publicado, en el que cada dato lleva su fuente (enlace a la guía) y la fecha en que se comprobó.
6. **Aviso de caducidad**: si un perfil se comprobó hace más de un año, el programa lo avisa y enlaza la guía.

**Módulo de adaptación a revista** **[V1]**

Al elegir revista o cambiar de revista, el módulo compara el proyecto con el perfil y muestra un informe en dos partes:
- **Lo que se aplica solo al exportar, sin tocar tu texto**: estilo de cita, formato de página, orden y nombres de los apartados, tablas al final o en el texto, nombres de los archivos de figura, portada separada y versión cegada, y declaraciones en su sitio.
- **Lo que tienes que hacer tú**, como lista de tareas enlazada al texto: recortar palabras del resumen o del texto, cambiar los apartados del resumen estructurado, reducir referencias o figuras, añadir palabras clave, poner el título en inglés o escribir una declaración que falta.

Sustituye a "cambiar de revista tras un rechazo" de la v0.2, que pasa de [Después] a V1. El módulo no usa IA y se limita al formato y los requisitos (decidido en P21). Adaptar el estilo de redacción queda para la futura versión con IA (5.12).

**Primer caso: Reumatología Clínica** (guía para autores consultada el 20 de noviembre de 2026)

| Dato | Lo que pide |
|---|---|
| Original | Hasta 3000 palabras de texto, 6 figuras, 6 tablas y 30 referencias; aconseja no pasar de 6 autores |
| Original breve | 1500 palabras, 15 referencias, 2 tablas o figuras y 6 autores |
| Caso clínico | 600 palabras, 1 figura y 1 tabla, 10 referencias; apartados fijos (resumen y abstract, introducción, observación clínica, discusión y conclusiones) |
| Carta al editor | 600 palabras, 1 figura o tabla, 10 referencias y 4 autores; empieza por "Señor editor" |
| Resumen | Estructurado en "Antecedentes y objetivo", "Pacientes o Materiales y métodos", "Resultados" y "Discusión y Conclusiones". **La guía actual no da el límite de palabras** (una versión anterior decía 250 para originales) |
| Palabras clave | Hasta 6 |
| Idiomas | Se publica en español y en inglés; el título se da también en inglés |
| Revisión | Doble ciego: portada aparte (autores, afiliaciones, agradecimientos y conflictos) y manuscrito anonimizado |
| Formato | Doble espacio, letra de 12 puntos, márgenes laterales de 2 a 2,5 cm y todas las páginas numeradas; sin justificar ni partir palabras |
| Referencias | Números en superíndice por orden de aparición. Los ejemplos de la guía siguen el formato de Elsevier con DOI; el estilo CSL de la revista es de 2012 y deriva del de la NLM, así que hay que comprobar si coinciden |
| Declaración de uso de IA | En un apartado propio, antes de las referencias |
| Opcionales | Puntos destacados (de 3 a 5, de 85 caracteres como máximo) y resumen gráfico |
| Figuras | En archivos separados; fotografías a 300 ppp como mínimo, dibujos de líneas a 1000 ppp y combinadas a 500 ppp; pies de figura en una lista aparte |
| Envío | Editorial Manager |

Esta tabla ya muestra el problema: la guía es buena, pero le falta un dato importante y su estilo de cita hay que verificarlo contra los ejemplos.

### 5.10 Exportación y envío
- **[MVP]** **DOCX**:
  - Usa estilos de Word reales (Título, Título 1…), para que la revista y los coautores puedan trabajar con él.
  - Las tablas son tablas de Word nativas, no imágenes.
  - Aplica interlineado, fuente, márgenes, números de línea y numeración de páginas según el perfil.
- **[MVP]** PDF para leer o revisar.
- **[V1]** **Paquete de envío**: un ZIP o carpeta con todo lo que pide la revista, con sus nombres:
  - Manuscrito.
  - Manuscrito **cegado**, sin autores, afiliaciones, agradecimientos ni metadatos del archivo.
  - Portada.
  - Figuras separadas.
  - Tablas.
  - Material suplementario.
  - Carta de presentación.
  - Documentos opcionales que admita la revista (por ejemplo, los puntos destacados).
- **[V1]** Exportar el DOCX con comentarios y control de cambios.
- **[V1]** Markdown y HTML.
- **[Después]** JATS XML, LaTeX y un DOCX con citas "vivas" de Zotero para coautores que usan Zotero.

### 5.11 Revisión por pares y colaboración
- **[V1]** **Ronda de revisión con coautores** (fase 2). Es tu forma real de trabajar (P4b): varios coautores revisan en paralelo y cada uno devuelve su copia.
  1. "Enviar a coautores" exporta el DOCX y guarda automáticamente la versión de partida ("Enviado a coautores 20/11").
  2. Cada coautor revisa su copia en Word, con o sin control de cambios, y te la devuelve.
  3. "Importar revisiones" admite varios DOCX a la vez. Cada uno se compara con la versión de partida. Se recogen sus cambios marcados, sus comentarios y también **los cambios hechos sin activar el control de cambios**, que se detectan al comparar.
  4. Una vista de fusión reúne las propuestas de todos los coautores, párrafo a párrafo, cada una con su nombre y su color. Cuando dos coautores tocan la misma frase, se muestran juntas para elegir una o combinarlas.
  5. Aceptas o rechazas cada propuesta, todas las de un coautor o todas a la vez. Los comentarios se convierten en hilos de comentarios del programa.
  6. Las citas y referencias cruzadas se reconocen gracias a unas marcas invisibles que lleva el DOCX exportado. Si un coautor escribe una cita a mano ("Smith 2020"), queda señalada para que la vincules a la biblioteca.

  Esto sustituye el paso manual de trasladar cada copia a tu copia maestra.
- **[V1]** **Respuesta a revisores**:
  - Pegas los comentarios de la revista y se separan en puntos.
  - Para cada punto escribes la respuesta y enlazas el cambio del manuscrito.
  - Se genera la carta de respuesta con citas del texto nuevo.
- **[V1]** Generar la versión con cambios marcados frente a la versión enviada, como piden las revistas en la revisión.
- **[Después]** Edición simultánea sobre el mismo documento (fase 5). Se prepara desde el principio:
  - ProseMirror tiene integración madura con **Yjs** (CRDT, el mismo enfoque que usan muchos editores colaborativos), así que el editor elegido ya lo admite.
  - Los identificadores estables de bloque y que no se guarden números calculados (sección 3.2) son justo lo que necesita un CRDT.
  - Habrá que decidir el transporte cuando llegue el momento:
    - Un servidor de sincronización propio, que podría ser la parte de pago.
    - Sincronización entre iguales.
    - Una carpeta compartida en OneDrive o Dropbox, con limitaciones.
  - Los coautores tendrían que usar SciDesk. Mientras no lo hagan, la vía sigue siendo Word.

### 5.12 IA y paquetes para LLM (opcional)

**Versión con IA** **[Después]**: por ahora el programa no usa IA (P16 y P21). Más adelante habrá una versión que la incluya, con tu clave de API y solo cuando lo pidas, y en qué pasos se decidirá cuando el programa exista. Una de sus funciones principales será **ayudar en la redacción, corregirla y traducir** (por ejemplo, pasar el resumen al inglés o adaptar el estilo de redacción a una revista). Otros candidatos:
- Revisar el inglés.
- Recortar el resumen al límite.
- Comprobar que las cifras del resumen coinciden con las de los resultados.
- Sugerir palabras clave MeSH.

**Revisar rasgos típicos de texto generado con IA** **[Después]**, con un paquete para LLM o con la API del asistente:
- Qué busca: rayas (—) usadas como incisos, punto y coma en exceso y dos puntos "descriptivos" ("El resultado: una mejora…"). La lista de patrones se puede ampliar.
- Primer paso, sin IA: el programa cuenta esos signos por párrafo y por sección y señala los que pasan de un umbral (por ejemplo, por cada 1000 palabras). No son errores, porque la raya y el punto y coma son correctos; el problema es el abuso. Por eso los umbrales se pueden ajustar y dependen del idioma. Este aviso aparece en el panel de comprobaciones (5.8).
- Segundo paso, con IA: los párrafos señalados van en un paquete (nivel 2) o a la API, y vuelven propuestas de otra redacción, que aceptas o rechazas una a una como en el control de cambios.

**Paquetes para LLM** **[V1]**, al estilo de revsis-app. En lugar de conectar el programa a un modelo, SciDesk prepara un paquete (una carpeta o un ZIP) con:
- Las instrucciones para el LLM.
- Los datos de contexto.
- El esquema de la respuesta esperada.

Tú lo procesas con el LLM que prefieras (por ejemplo, Claude con una skill) e importas la respuesta. El programa la valida contra el esquema, te la enseña y aceptas elemento a elemento.

Ventajas: no hace falta clave de API ni conexión desde el programa, eliges el modelo y ves exactamente qué sale de tu equipo.

**Niveles de confidencialidad (decidido en P22).** Cada paquete declara su nivel, y antes de crearlo el programa muestra la lista exacta de lo que contiene:

| Nivel | Qué sale de tu equipo | Ejemplos |
|---|---|---|
| 0. Público | Nada del proyecto; solo información pública o general que eliges tú (un área, una revista) | Crear el perfil de una revista a partir de su guía. Catálogo de términos y abreviaturas de una especialidad para el corrector. Párrafos tipo de carta de presentación según el tipo de artículo |
| 1. Términos sueltos | Palabras o listas, sin el texto que las rodea | Palabras que el corrector no reconoce, para validarlas. Abreviaturas usadas, para proponer su forma desarrollada |
| 2. Fragmentos que eliges | Solo el texto que seleccionas | El resumen, para sugerir palabras clave MeSH. Los párrafos señalados por rasgos típicos de la IA, para proponer otra redacción |
| 3. Documento completo | Todo el manuscrito | Revisión del inglés, solo si la pides expresamente |

Por defecto solo se ofrecen los niveles 0 y 1. Nada específico de la investigación entra en un paquete sin que lo elijas.

Primeros usos, según el momento de la escritura:
- Al crear el proyecto o elegir área: diccionario y abreviaturas de la especialidad (nivel 0).
- Al elegir una revista que no está en el catálogo: crear su perfil (nivel 0, ver 5.9).
- Antes de enviar: validar términos desconocidos y abreviaturas (nivel 1).

La respuesta importada se trata como datos no confiables: se valida contra el esquema y nunca se ejecuta.

**Conexión con revsis-app y PICO Creator:** por ahora no (P17).

## 6. Arquitectura técnica propuesta

### 6.1 Pila tecnológica

| Pieza | Recomendación | Alternativas | Motivo |
|---|---|---|---|
| Aplicación de escritorio | **Tauri 2** (Rust + WebView2 en Windows y WKWebView en macOS) | Electron | Instalador pequeño (~10 MB frente a ~100 MB), seguro por diseño y con acceso nativo a archivos. Electron es más homogéneo entre sistemas, pero más pesado |
| Interfaz | **React + TypeScript + Vite** | Svelte, Vue | El ecosistema más grande y el que mejor se lleva con el editor |
| Traducción de la interfaz | **i18next** (MIT), con archivos en español e inglés desde el primer día | — | P7 |
| Motor del editor | **ProseMirror** (vía **Tiptap**, núcleo MIT) | Lexical, Slate, CKEditor 5, ONLYOFFICE embebido | ProseMirror es el estándar para documentos estructurados: esquema estricto, nodos personalizados (cita, referencia cruzada), tablas con celdas combinadas y una base probada para comentarios y control de cambios. Solo se usarán piezas libres; algunas extensiones de Tiptap son de pago y las haríamos nosotros |
| Motor de citas | **citeproc-js** (el de Zotero y Mendeley) en un *web worker* | hayagriva (Rust, MIT/Apache) | citeproc-js es la implementación de referencia de CSL y es la más fiel. **Licencia: CPAL/AGPL** (ver 6.3) |
| Lectura de formatos de referencias | citation-js (MIT) para RIS, BibTeX y CSL-JSON, y analizadores propios para NBIB y EndNote XML | — | NBIB y EndNote XML son sencillos de analizar y conviene controlarlos |
| Zotero | API local de Zotero (HTTP en el propio equipo), detrás de una interfaz propia | Better BibTeX | La interfaz propia permite añadir EndNote y Mendeley después sin tocar el resto |
| Exportar DOCX | Biblioteca `docx` (MIT) más un traductor propio de nuestro documento a OOXML | Pandoc | Control total de estilos, tablas, comentarios y cambios |
| Importar DOCX y fusionar revisiones | Lector OOXML propio (JSZip + XML) y comparación propia por bloques, con jsdiff (BSD) para el texto | mammoth.js (pierde formato a propósito) | Hacen falta comentarios, cambios, tablas con formato y detectar los cambios no marcados |
| PDF | Por decidir en la fase 0: vista paginada en el propio editor con paged.js e impresión a PDF del motor web, o **Typst** integrado en Rust | LibreOffice sin interfaz | Typst da una calidad tipográfica excelente y funciona sin conexión |
| Fuentes | Fuentes del sistema más equivalentes libres incluidos: Carlito, Caladea, Liberation y Roboto | — | 5.2 |
| Ecuaciones (fase 4) | MathLive (edición) y LaTeX → MathML → OMML (Word) | KaTeX solo para mostrar | Word necesita OMML para que las ecuaciones sean editables |
| Ortografía | Corrector del motor web o nspell con diccionarios de LibreOffice (es/en) | Hunspell nativo en Rust | Por decidir en la fase 0 |
| Historial de versiones | **Instantáneas propias** (P15) | git con gitoxide o libgit2 | Ver 6.4 |
| Pruebas | Vitest (unidades), Playwright (interfaz) y archivos de referencia para DOCX | — | Exportar a Word se rompe con facilidad: hacen falta comparaciones automáticas |

### 6.2 Esquema de módulos

```
┌───────────────────────── Interfaz (React, español e inglés) ─────────────────────────┐
│ Explorador │ Pestañas del editor (Tiptap/ProseMirror)     │ Panel derecho            │
│            │  · nodos: cita, xref, tabla, figura,         │ (contenido por decidir)  │
│            │    ecuación, comentario, cambio              │                          │
├────────────┴──────────────────────────────────────────────┴──────────────────────────┤
│ Servicios (TypeScript, en workers cuando pesan)                                      │
│  Proyecto · Numeración · Citas (citeproc) · Biblioteca (propia o Zotero) ·           │
│  Comprobaciones · Perfiles y adaptación a revista · Paquetes para LLM ·              │
│  Exportadores (DOCX, PDF, MD, JATS) · Importador DOCX y fusión de revisiones         │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Núcleo Tauri (Rust): archivos, vigilancia de la carpeta, diálogos, historial,        │
│ fuentes del sistema, conversión de imágenes, PDF (Typst), red (Crossref, PubMed)     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Licencias: AGPL-3.0 con CLA (decidido en P1b)

*Esto no es asesoramiento legal. Antes de publicar conviene que lo revise alguien especializado.*

**¿Hay incompatibilidades con la pila? No.** Todas las piezas de la sección 6.1 se pueden usar con cualquiera de las licencias candidatas para tu código. La única con condiciones es citeproc-js, y tiene salida en todos los casos. Este es el inventario:

| Componente | Licencia | Efecto sobre nuestra licencia |
|---|---|---|
| Tauri, React, Vite, ProseMirror, Tiptap (núcleo), Yjs, citation-js, docx, i18next, MathLive, KaTeX, paged.js, nspell | MIT (Tauri: MIT o Apache-2.0) | Ninguno: son permisivas y compatibles con todo |
| TypeScript, Typst | Apache-2.0 | Ninguno. Solo es incompatible con la GPL-2.0 "solo", que no está entre las candidatas |
| jsdiff | BSD-3-Clause | Ninguno |
| JSZip | MIT o GPL-3.0, a elegir | Se usa como MIT |
| **citeproc-js** | **CPAL-1.0 o AGPL-3.0, a elegir** | Con AGPL o GPL-3.0 se usa bajo AGPL. Con MIT, Apache, MPL o una versión cerrada se usa bajo CPAL, que obliga a publicar los cambios que hagamos al propio citeproc-js y puede exigir mostrar una atribución en la interfaz (pantalla de inicio o "Acerca de"). En la fase 0 se lee su anexo de atribución para saber exactamente qué pide |
| hayagriva (alternativa a citeproc-js) | MIT o Apache-2.0 | Ninguno |
| gitoxide / libgit2 (solo si el historial usa git) | MIT o Apache-2.0 / GPL-2.0 con excepción de enlace | Ninguno: la excepción permite usar libgit2 desde programas con cualquier licencia |
| Estilos y traducciones de CSL | CC BY-SA 3.0 | Son datos, no código: no afectan a la licencia del programa. Si modificamos un estilo, se publica con la misma licencia y citando la fuente |
| Diccionarios ortográficos | Español: GPL, LGPL o MPL, a elegir. Inglés: permisiva | Van en archivos aparte; se usan bajo LGPL o MPL. Ninguno |
| Fuentes libres (Carlito, Caladea, Liberation, Roboto) | SIL OFL 1.1 o Apache-2.0, según la fuente | Se pueden incluir en cualquier programa, también de pago; lo único que no se puede es venderlas sueltas |
| Fuentes de Microsoft (Calibri, Times New Roman…) | Propietarias | No se pueden incluir con ninguna licencia; se usan las instaladas en el equipo (5.2) |
| WebView2 (Windows) y WKWebView (macOS) | Del sistema operativo | No se distribuyen con el programa |
| Pandoc | GPL-2.0 o posterior | Se evita en el núcleo; como mucho, una herramienta externa opcional |
| Extensiones de pago de Tiptap | Comercial | No se usan |

Para que siga siendo así, en la integración continua se añade una comprobación automática de licencias de las dependencias (cargo-deny para Rust y license-checker para npm).

**Las opciones para tu código, comparadas:**

| | MIT | Apache-2.0 | MPL-2.0 | GPL-3.0 | AGPL-3.0 |
|---|---|---|---|---|---|
| Qué puede hacer otro con tu código | Todo, incluido un producto cerrado basado en el tuyo | Igual que MIT | Igual, pero si modifica tus archivos tiene que publicar esos archivos | Usarlo y venderlo, pero lo que distribuya tiene que ser GPL y con su código | Igual que GPL y, además, si lo ofrece como servicio en red también tiene que publicar el código |
| Protección frente a un competidor que cierre tu programa | Ninguna | Ninguna | Baja | Alta en el escritorio | Alta en el escritorio y en un servidor |
| Licencia de patentes explícita | No | Sí | Sí | Sí | Sí |
| Tu versión de pago | Libre, pero cualquiera puede hacer lo mismo | Igual que MIT | Libre para tus archivos nuevos | Necesitas ser titular de todo el código (acuerdo de contribución, CLA) para vender una versión cerrada | Igual que GPL |
| Atrae contribuciones externas | Mucho | Mucho | Bastante | Bastante | Menos, sobre todo si además pides firmar un CLA |
| Para quien solo usa el programa (investigadores, hospitales) | Sin obligaciones | Sin obligaciones | Sin obligaciones | Sin obligaciones | Sin obligaciones: la AGPL solo afecta a quien modifica y distribuye o lo ofrece como servicio |
| Futuro servidor de sincronización (fase 5) | Cualquiera puede montar uno cerrado con tu código | Igual que MIT | Casi igual | Cualquiera puede ofrecer como servicio una versión modificada sin publicarla | Quien ofrezca una versión modificada como servicio tiene que publicarla |
| Tiendas de aplicaciones (App Store de Apple) | Sin problema | Sin problema | Sin problema | Sus condiciones chocan con la GPL cuando publica un tercero; tú, como titular, sí puedes | Igual que GPL |

Algunas ideas que ayudan a decidir:
- **Ninguna licencia impide que otros distribuyan gratis tu programa compilado.** El valor de una versión de pago tiene que venir de la comodidad (instaladores firmados con actualizaciones), del servicio (sincronización) o del soporte, no de la licencia.
- **Empezar restrictivo deja abiertas más puertas.** Si eres titular de todo el código (con CLA), puedes pasar más adelante de AGPL a MIT. Al revés no: las versiones que ya hayas publicado como MIT seguirán siéndolo para siempre.
- **El CLA es lo que permite la licencia dual.** Un DCO (la alternativa ligera, en la que el colaborador solo certifica que su aportación es suya) no te da derecho a relicenciar. Hay herramientas que automatizan la firma del CLA en GitHub (por ejemplo, CLA Assistant).

**Decisión: AGPL-3.0 con CLA**, porque:
1. El modelo de pago más probable (servicio de sincronización, fase 5) es justo el que protege la AGPL.
2. Mantiene abiertas todas las opciones, incluida pasar a una licencia más permisiva más adelante.
3. No pone ninguna obligación a quien solo usa el programa.

Lo que se pierde: menos contribuciones externas y ninguna empresa podrá construir un producto cerrado sobre SciDesk (que es lo que se busca).

Alternativas descartadas: **GPL-3.0**, que en el escritorio protege igual pero no cubre un futuro servidor, y **Apache-2.0**, que favorece la difusión y las contribuciones a cambio de no proteger frente a productos cerrados.

### 6.4 Historial de versiones: instantáneas propias en lugar de git (decidido en P15)

Lo que se quiere (5.1): guardar versiones con nombre ("Enviado a coautores 20/11"), instantáneas automáticas en momentos clave (antes de importar revisiones, al exportar para la revista, una vez al día), comparar dos versiones y restaurar. Hay dos formas de guardarlo por debajo.

**Opción 1: git invisible.** Cada versión sería un commit en un repositorio oculto, escrito con una biblioteca de Rust dentro del programa (sin instalar git).

Ventajas:
- Probado y fiable: cada versión solo guarda lo que cambió, comprimido, y la integridad se comprueba con huellas criptográficas.
- Formato abierto: si SciDesk desapareciera, el historial se podría abrir con cualquier herramienta de git, y un usuario avanzado podría subirlo a GitHub.
- El formato `.scidoc` (JSON estable y legible) produce diferencias razonables.
- Trae ramas y fusiones, por si algún día hicieran falta.

Inconvenientes:
- **Se lleva mal con OneDrive y Dropbox.** Un repositorio git tiene archivos que se modifican en cada operación (referencias, índice, paquetes). Si la carpeta se sincroniza entre el PC y el MacBook y se trabaja en los dos antes de que termine la sincronización, el historial puede corromperse o duplicarse.
- **Figuras pesadas.** Un TIFF de 20–50 MB se guarda entero cada vez que cambia, porque git no comprime bien los archivos binarios.
- **Choca con tu propio git.** Si la carpeta del proyecto ya está dentro de un repositorio tuyo, un `.git` oculto interfiere (se evita guardándolo con otro nombre dentro de `.scidesk/`).
- **Las diferencias de git no sirven para personas.** git compara líneas de JSON, no frases. Hay que programar igualmente una comparación propia por párrafos y palabras, y la fusión de revisiones de coautores se hace a nivel de documento (5.11), no con la fusión de git.
- **Más dependencias.** gitoxide (Rust) todavía no cubre todo git, y libgit2 añade código en C que complica la compilación en Windows y macOS.

**Opción 2: instantáneas propias.** Cada archivo se guarda una sola vez por contenido distinto, comprimido, con su huella como nombre (en `.scidesk/historial/objetos/`). Cada versión es un pequeño JSON con su nombre, fecha, autor y la lista de archivos con sus huellas. Cada versión pertenece a un artículo e incluye los datos comunes que usa (referencias citadas y fichas de sus autores), para que restaurar un artículo no toque los demás (4.1).

Ventajas:
- **Los archivos se escriben una vez y no se modifican nunca.** La sincronización solo añade archivos, así que no hay conflictos posibles: si el PC y el MacBook crean una versión a la vez, salen dos archivos distintos.
- Una figura que no cambia no ocupa más espacio, y las instantáneas automáticas antiguas se pueden olvidar conservando las que tienen nombre.
- Mucho más sencillo: unos cientos de líneas de código, sin dependencias, y con un formato documentado.

Inconvenientes:
- Es un formato propio, aunque sencillo y documentado, y no trae ramas.
- Reinventa una parte pequeña de git.

**Decisión: instantáneas propias.** Cambia la propuesta de la v0.2, porque lo que git hace mejor (ramas y fusiones) aquí no se usaría: la fusión de revisiones se hace sobre el documento. Además, sincronizar la carpeta entre dos equipos es justo donde git es frágil. Para no perder lo bueno de git:
- El historial va detrás de una interfaz propia, igual que el motor de citas, así que se podría cambiar a git más adelante.
- **[Después]** "Exportar el historial a un repositorio git".
- Si quieres usar git por tu cuenta, puedes: el proyecto es una carpeta normal y tu git solo tiene que ignorar `.scidesk/`.

## 7. Riesgos técnicos y cómo atacarlos

| # | Riesgo | Por qué es difícil | Plan |
|---|---|---|---|
| 7.1 | **Pegar tablas de Word con formato** | Word pone en el portapapeles HTML con estilos `mso-*`, celdas combinadas con `rowspan`/`colspan`, bordes por celda y párrafos dentro de las celdas | Prototipo en la fase 0 con 10 tablas reales tuyas, un limpiador específico de HTML de Office y pruebas con esas tablas |
| 7.2 | **Paginación tipo Word mientras se escribe** | Los editores web son de flujo continuo; paginar en vivo es caro y con errores | Decidido: editar en flujo continuo (como el "modo borrador" de Word) con una vista previa paginada al lado o a demanda. Para enviar a una revista importa el DOCX, no cómo se ve la página **[P5]** |
| 7.3 | **Fidelidad del DOCX exportado** | OOXML es enorme, y Word y LibreOffice lo interpretan distinto | Generar con estilos con nombre, probar en Word real y comparar automáticamente con DOCX de referencia |
| 7.4 | **Ida y vuelta con Word y fusión de varias copias** | Hay que traducir los cambios de Word (`w:ins`, `w:del`, cambios de formato) a marcas de ProseMirror y al revés. Además, varios coautores devuelven copias a la vez y algunos no activan el control de cambios | Fase 2, justo después del MVP. Primero exportar y después importar, con un corpus de rondas reales (versión enviada más las copias devueltas, anonimizadas si hace falta). Los cambios no marcados se detectan comparando con la versión enviada. Desde la fase 1, el DOCX exportado ya lleva marcas invisibles en citas y referencias cruzadas para poder reconocerlas al reimportar |
| 7.5 | **Ecuaciones en Word** | La conversión de MathML a OMML no es perfecta | Su prioridad va ligada a la ampliación a otras disciplinas (P6). El formato las admite desde la versión 1 |
| 7.6 | **Rendimiento con documentos largos** | Con 8000 palabras, 80 referencias y 6 tablas, citeproc puede ir lento si recalcula todo | Recalcular de forma incremental en un *worker* y numerar con un retraso de ~200 ms |
| 7.7 | **Windows y macOS** | Tauri usa WebView2 (Chromium) en Windows y WKWebView (Safari) en macOS: el portapapeles de Word en Mac genera otro HTML, y la ortografía y la impresión difieren. Distribuir en macOS exige firma y notarización (cuenta de desarrollador de Apple, de pago anual) | Se desarrolla en Windows (P2). La integración continua (GitHub Actions) compila y prueba en los dos sistemas desde la fase 1 para detectar pronto lo que se rompe. Pruebas a mano en el MacBook Air al cerrar cada fase, incluido el corpus de tablas pegadas desde Word para Mac. Firma de macOS solo cuando haya una versión pública |
| 7.8 | **Dependencia de Zotero** | La API local solo funciona con Zotero abierto, y cambia entre versiones (Zotero 10 cambió cómo numera las versiones de los registros) | El proyecto guarda una copia de lo citado y nunca necesita Zotero para abrirse. Adaptador propio y pruebas con cada versión mayor de Zotero |
| 7.9 | **Perfiles de revista desactualizados** | Las guías cambian sin aviso y a veces están incompletas | Fuente y fecha en cada dato, aviso a los 12 meses y catálogo abierto a correcciones. El programa recuerda que el perfil no sustituye a leer la guía antes de enviar |
| 7.10 | **Fuentes que no están en el equipo** | Las fuentes de Microsoft no se pueden distribuir; si faltan, el texto se ve con otra fuente y cambian los saltos de línea | Equivalentes libres con las mismas medidas (5.2) y un aviso cuando se sustituye una fuente |

## 8. Hoja de ruta por fases

Cada fase termina con algo que puedes usar y probar. Los tamaños son relativos (S, M, L, XL).

### Fase 0: decisiones y prototipos de riesgo (S–M)
- Cerrar las preguntas de la sección 10. Reservar scidesk.app, scidesk.dev y los nombres en GitHub, npm y crates.io (P19). Preparar el texto del CLA (P1b).
- Prototipos desechables, cada uno respondiendo a una pregunta concreta:
  1. Pegar 10 tablas de Word reales en Tiptap: ¿cuántas quedan bien?
  2. citeproc-js con 50 referencias y 3 estilos, entre ellos el de Reumatología Clínica comparado con los ejemplos de su guía, renumerando en vivo.
  3. Exportar a DOCX un artículo con tabla, figura y citas, y abrirlo en Word.
  4. Vista paginada (paged.js) frente a PDF con Typst.
  5. Leer una colección de Zotero por su API local y convertirla a CSL-JSON.
  6. Comparar con la versión enviada un DOCX devuelto sin control de cambios: ¿se recuperan bien los cambios?
- Especificar el formato `.scidoc` v1, `autores.json`, el manifiesto `.scidesk` con varios artículos (P12), `personas.json` y el esquema del perfil de revista.
- **Terminado cuando:** las respuestas están escritas en `docs/decisiones/` y la pila de la sección 6 está confirmada o corregida.

### Fase 1: MVP, "escribo un artículo para Reumatología Clínica y lo envío en Word" (L)
Se desarrolla y se prueba en Windows; la integración continua compila también para macOS.
- Esqueleto Tauri + React con la interfaz en español e inglés, asistente de proyecto con plantilla IMRaD y explorador de archivos.
- Editor con estilos semánticos, fuentes, formato básico, buscar y reemplazar, caracteres especiales, recuento de palabras por sección (con el resumen aparte), ortografía y menú contextual.
- Autores y afiliaciones: bloque de autores y portada automáticos.
- Referencias en modo biblioteca propia: importar RIS, NBIB, BibTeX y CSL-JSON (también después de la importación inicial), eliminar duplicados, cita rápida, bibliografía automática y ~15 estilos incluidos, entre ellos el de Reumatología Clínica.
- Tablas: editor en el documento y en pestaña propia, y pegado desde Word. Figuras: insertar y pie. Referencias cruzadas numeradas.
- Exportar DOCX y PDF con el formato que pide Reumatología Clínica (doble espacio, 12 puntos, páginas numeradas, portada aparte). Guardado automático.
- **Terminado cuando:** puedes escribir de verdad un original corto de principio a fin y el DOCX exportado cumple la guía de Reumatología Clínica sin retoques.

### Fase 2: coautores con Word (XL)
- Comentarios y control de cambios en el editor.
- Exportar a DOCX con comentarios y cambios.
- **Ronda de revisión con coautores** (5.11): versión de partida, importar varias copias a la vez (con y sin control de cambios), vista de fusión y citas reconocidas.
- Historial de versiones con nombre (P15).
- **Terminado cuando:** mandas el artículo a tres coautores, dos te lo devuelven con control de cambios y uno sin él, y lo integras todo en tu copia maestra desde una sola vista, sin perder citas ni formato.

### Fase 3: el proyecto completo y la revista (L)
- CRediT, contribuciones, carta de presentación, declaraciones y material suplementario con numeración S.
- Perfiles de revista (catálogo y creación con un paquete para LLM), módulo de adaptación a revista, panel de comprobaciones y abreviaturas.
- Biblioteca vinculada a Zotero. Más estilos (buscador del repositorio CSL), DOI y PMID en línea (opcional), EndNote XML y .enw, y comprobación de retractados.
- Plantillas PRISMA, CONSORT, STROBE y CARE, y las demás según se necesiten.
- Añadir otros artículos al proyecto (P12), con "exportar este artículo como proyecto independiente".
- Paquete de envío con versión cegada.
- Respuesta a revisores y versión con cambios marcados frente a la enviada.
- **Terminado cuando:** envías un artículo real a Reumatología Clínica y respondes a su revisión desde el programa.

### Fase 4: extras (M cada uno, a elegir)
- Ampliación a otras disciplinas: ecuaciones, plantillas y perfiles de otras áreas.
- Paquetes para LLM de diccionarios de especialidad y abreviaturas.
- Asistente con IA integrado, en los pasos que se decidan (P16), y revisión de rasgos típicos de texto generado con IA (por paquete o por API).
- JATS, LaTeX, EndNote y Mendeley, escribir en Zotero, listas de verificación EQUATOR enlazadas, diagrama PRISMA, tablas desde datos e instalador firmado con actualizaciones automáticas.

### Fase 5: edición simultánea (XL)
- Yjs sobre ProseMirror, presencia (quién está editando dónde) y comentarios en tiempo real.
- Transporte por decidir: servidor propio de sincronización (candidato a parte de pago) o entre iguales.
- Fuera del alcance hasta que las fases 1–3 estén en uso real.

### Antes de cualquier versión publicable
- Búsqueda formal de anterioridad de la marca SciDesk por alguien especializado y, si va a haber versión de pago, registro de la marca (P19). CLA preparado (P1b).
- Adaptación y pruebas en macOS en el MacBook Air: portapapeles de Word para Mac, ortografía, impresión, firma y notarización.
- Auditoría de seguridad: archivos no confiables (DOCX, RIS, perfiles y respuestas de LLM importados), permisos de Tauri, red, conexión local con Zotero y actualizaciones.
- Pruebas con 3 o 4 artículos reales tuyos.

## 9. Cómo trabajaremos
- Iteraciones cortas: cada sesión termina con algo que funciona y un commit.
- `CLAUDE.md` en la raíz guarda las decisiones y el estado, para que cualquier sesión nueva continúe sin perder contexto.
- `docs/decisiones/` contiene un archivo corto por decisión importante: qué se eligió, por qué y qué se descartó.
- Un corpus de prueba en `tests/corpus/` con tablas de Word, archivos RIS y NBIB, DOCX reales y rondas de revisión con coautores (anonimizados si hace falta). Es la mejor protección contra regresiones al importar y exportar.
- Idiomas: el código (identificadores, comentarios) y los mensajes de commit, en inglés (P23); el plan y las decisiones, en español.
- Plataforma: desarrollo y pruebas diarias en Windows; macOS en el MacBook Air al cerrar cada fase.

## 10. Preguntas abiertas

*Contestadas todas: P1 a P23, con P1b (ver "Decisiones tomadas" al principio).*

No queda ninguna pregunta abierta. El siguiente paso es la fase 0 (sección 8):
- Reservar scidesk.app, scidesk.dev y los nombres en GitHub, npm y crates.io.
- Hacer los seis prototipos de riesgo.
- Especificar los formatos: `.scidoc`, `autores.json`, `personas.json`, el manifiesto `.scidesk` y el esquema del perfil de revista.
