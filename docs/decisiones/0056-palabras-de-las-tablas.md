# 0056. Contar o no las palabras de las tablas

- **Fecha:** 22/11/2026
- **Estado:** aceptada (petición del usuario del 22/11/2026: «algunas revistas las incluyen en el límite y otras no»); la forma la propuso el asistente y el usuario la aprobó.
- **Pregunta del plan:** comprobaciones (R12, ficha 0041) y perfil de revista (ficha 0031).

## Qué se decide
- **Es un dato del perfil de cada revista**, por tipo de artículo: `limits.wordsIncludeTables`. Es opcional, con su fuente como los demás datos del perfil, y dice si el límite de palabras cuenta el texto de las tablas (pie, celdas y notas).
- **Cada artículo puede cambiarlo** con `countTableWords` en `article.json`:
  - `true` o `false` mandan;
  - `null` o ausente: lo que diga el perfil;
  - si el perfil tampoco lo dice, no cuentan, que es lo que se hacía hasta ahora.
- **El recuento:**
  - las palabras de cada tabla se suman a la sección donde está colocada, solo si cuentan y solo en las secciones que cuentan (nunca en la bibliografía ni en los apéndices);
  - el informe de las comprobaciones da siempre `tableWords`, `tableWordsCounted` y quién lo decide (`tableWordsBy`: el artículo, la revista o el valor por defecto);
  - el aviso de límite de palabras y la barra de estado usan el total que corresponde.
- **En la pestaña «Avisos»**, si el artículo tiene tablas:
  - «Texto · con tablas» o «· sin tablas»;
  - debajo, «Palabras de las tablas: N» con un selector de tres opciones. La primera dice lo que dice la revista: «Como la revista: cuentan», «Como la revista: no cuentan» o «Como la revista (no lo dice: no cuentan)». Las otras dos son «Cuentan en este artículo» y «No cuentan en este artículo»;
  - en «Palabras por sección», «(+38 de tablas)» o «(38 de tablas, no cuentan)».
- **En la línea de comandos:**
  - `scidesk table-words <carpeta> on|off|journal`;
  - `scidesk check` dice cuántas palabras tienen las tablas y si cuentan.
- **Los esquemas** de `article.json` y del perfil de revista se han regenerado. Los dos campos son opcionales: los proyectos que ya existen siguen siendo válidos.

## Por qué
- **Las revistas no coinciden:** unas cuentan las tablas en el límite de palabras y otras no. Es un dato de su guía, como el propio límite.
- **El ajuste del artículo** cubre una revista sin ese dato en el perfil, un perfil equivocado o una instrucción del editor.
- **Por defecto no cuentan:** es lo más habitual y lo que hacía SciDesk hasta ahora, así que ningún recuento cambia sin que nadie lo pida.

## Qué se descartó
- **Un ajuste del equipo**, igual para todos los artículos: depende de la revista, no de quien escribe.
- **Contar también los pies de las figuras:** el usuario habló de tablas. Si alguna revista lo pide, irá como otro dato del perfil.

## Consecuencias
- **El perfil de Reumatología Clínica no lo dice todavía.** Hay que leer su guía para rellenarlo con su fuente.
- **Prueba nueva** en `checks.test.ts`:
  - por defecto no cuentan;
  - el perfil hace que cuenten;
  - el artículo lo cambia y se guarda;
  - `null` vuelve al perfil;
  - las secciones siempre suman el total.
- **Probado en la vista del navegador** con la demostración: 54 palabras sin la tabla y 92 con ella (+38 en «Resultados»).
