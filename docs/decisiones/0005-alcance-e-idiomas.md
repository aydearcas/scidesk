# 0005. Alcance e idiomas

- **Fecha:** 20/11/2026
- **Estado:** aceptada (queda por concretar si comentarios y commits van en inglés: P23)
- **Preguntas del plan:** P3, P6 y P7

## Qué se decide
- **Alcance:** primero artículos de biomedicina y clínica, en español e inglés. Después, cualquier disciplina.
- **Ecuaciones:** el formato las admite desde la versión 1; el editor y la exportación a Word llegan con la ampliación a otras disciplinas.
- **Interfaz:** en español y en inglés, con cambio de idioma en las opciones.
- **Código:** en inglés.

## Por qué
- Biomedicina y clínica es el uso real de quien impulsa el proyecto y el que permite probar con artículos reales, pero el programa debe servir para cualquier disciplina.
- En biomedicina hay pocas ecuaciones; en otras disciplinas son imprescindibles. Admitirlas en el formato desde el principio evita migrar documentos.
- La interfaz bilingüe y el código en inglés hacen posible un proyecto abierto e internacional.

## Qué se descartó
- Un programa solo para biomedicina.
- Interfaz solo en español o solo en inglés.

## Consecuencias
- Tipos de artículo, guías de publicación y perfiles de revista son datos, no código, para poder ampliar a otras disciplinas sin reescribir.
- En el primer arranque se eligen el idioma y las áreas principales, que filtran plantillas y revistas sugeridas.
- Todos los textos de la interfaz van en archivos de traducción (i18next) desde el primer día.
- Las claves del formato `.scidoc` están en inglés. Las carpetas del proyecto se crean en el idioma de la interfaz y el manifiesto registra cuál es cada una (*supuesto*).
