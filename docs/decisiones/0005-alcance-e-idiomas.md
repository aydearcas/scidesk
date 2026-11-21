# 0005. Alcance e idiomas

- **Fecha:** 20/11/2026
- **Estado:** aceptada. Actualizada el 21/11/2026 con la revisión de la v0.4 (R19, R28 y P24).
- **Preguntas del plan:** P3, P6, P7, P23 y P24

## Qué se decide
- **Alcance:** primero artículos de biomedicina y clínica, en español e inglés. Después, cualquier disciplina.
- **Ecuaciones:** el formato las admite desde la versión 1; el editor y la exportación a Word llegan con la ampliación a otras disciplinas.
- **Interfaz:** en español y en inglés, con cambio de idioma en las opciones.
- **Código:** en inglés, incluidos los comentarios del código y los mensajes de commit (P23). El plan y las decisiones siguen en español.
- **Nombres fijos de carpetas y archivos del proyecto, en inglés** (P24): `references/`, `people/`, `resources/`, `articles/main/`, `manuscript/article.scidoc`, `abstract.scidoc`, `authors.json`, `tables/`, `figures/`, `exports/`… Dentro del programa se muestran con etiquetas en el idioma de la interfaz. Los nombres que salen del contenido del usuario (el del proyecto, el de un artículo nuevo, el de cada tabla o figura) siguen en su idioma.

## Por qué
- Biomedicina y clínica es el uso real de quien impulsa el proyecto y el que permite probar con artículos reales, pero el programa debe servir para cualquier disciplina.
- En biomedicina hay pocas ecuaciones; en otras disciplinas son imprescindibles. Admitirlas en el formato desde el principio evita migrar documentos.
- La interfaz bilingüe y el código en inglés hacen posible un proyecto abierto e internacional.
- Los nombres en el disco son parte del formato, como sus claves, que ya van en inglés. Con nombres fijos, un proyecto se ve igual en el equipo de cualquier coautor, y cada cual ve las etiquetas en su idioma dentro del programa.

## Qué se descartó
- Un programa solo para biomedicina.
- Interfaz solo en español o solo en inglés.
- Nombres de carpeta en el idioma de la interfaz de cada usuario (el *supuesto* de la v0.4).
- Nombres fijos en español: coherentes con el plan, pero no con el formato ni con un proyecto abierto e internacional.

## Consecuencias
- Tipos de artículo, guías de publicación y perfiles de revista son datos, no código, para poder ampliar a otras disciplinas sin reescribir.
- En el primer arranque se eligen el idioma y las áreas principales, que filtran plantillas y revistas sugeridas.
- Todos los textos de la interfaz van en archivos de traducción (i18next) desde el primer día.
- Las claves del formato `.scidoc` están en inglés.
- **Nombres de carpeta y archivo fijos en el disco**, con etiquetas traducidas dentro del programa (R28). Sustituye al *supuesto* anterior, que creaba las carpetas en el idioma de la interfaz y registraba en el manifiesto cuál era cada una: duplicaba las pruebas y la documentación y complicaba los proyectos compartidos entre alguien con la interfaz en español y alguien en inglés. Van en inglés (P24).
- **Atajos de teclado (R19):** dos esquemas, "Word en español" (Ctrl+N negrita, Ctrl+K cursiva, Ctrl+G guardar…) e "Internacional", que se eligen en el primer arranque junto al idioma y se cambian en Ajustes. Ningún atajo usa Ctrl+Alt, porque en los teclados españoles de Windows AltGr equivale a Ctrl+Alt.
