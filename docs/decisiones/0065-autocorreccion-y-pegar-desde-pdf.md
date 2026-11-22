# 0065. Autocorrección científica y pegar desde PDF

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al seguir la fase 1 en su orden; falta que el usuario la revise, en especial los guiones de los rangos y las comillas en español).
- **Pregunta del plan:** R18 (autocorrección científica) y R23 (pegar desde un PDF).

## Qué se decide
- **Autocorrección al teclear** (`apps/desktop/src/autocorrect.ts`): reglas que se aplican al escribir el carácter que las completa. Cada cambio es un paso propio del historial: Ctrl+Z, o Retroceso justo después, devuelve lo que se escribió.
  - `+-` → ±, `<=` → ≤, `>=` → ≥, `->` → →, y «2 x 2» → 2 × 2. La «x» solo cambia entre números separados por espacios; «el eje x» no cambia.
  - **Espacio duro entre número y unidad** (5 mg, 37 °C, 10 mL, 2 h, 50 %), para que no se separen al final de una línea. Se aplica al escribir el espacio, la coma, el punto, el punto y coma, los dos puntos o el paréntesis que siguen a la unidad, o al escribir «%» tras «número espacio». No añade espacios que no se hayan escrito.
  - **Signo menos** (−) en un número negativo: «-0,5» tras un espacio, un paréntesis o «=» pasa a «−0,5». Los guiones dentro de una palabra o de un identificador (ard-2023, COVID-19) no cambian.
  - **Rangos de números:** en inglés, «5-10» pasa a «5–10» (guion corto o *en dash*). En español se deja el guion, que es lo que pide la *Ortografía* de la RAE para los intervalos («páginas 23-45»).
  - **Comillas según el idioma del fragmento:** «» en español, como recomienda la RAE, y “” y ‘’ en inglés (con el apóstrofo ’). Abren tras un espacio, un paréntesis o al principio, y si no, cierran.
  - **Revisar › Autocorrección científica** la enciende o la apaga, y se guarda en los ajustes del equipo (`autocorrect`, activada por defecto).
- **Pegar desde un PDF** (`apps/desktop/src/pdf-paste.ts`): un PDF entrega una línea por cada línea de la página.
  - El texto que lo parece (al menos dos líneas, de unos 35 caracteres o más de media, y la mayoría sin terminar en punto) se vuelve a poner en párrafos.
  - Las líneas se unen con un espacio.
  - Una palabra cortada con guion se une («funcio-/nal» → «funcional») si sigue en minúscula; un compuesto cortado en su propio guion lo conserva («anti-/TNF» → «anti-TNF»).
  - Empieza un párrafo nuevo tras una línea en blanco, antes de un elemento de lista («1.», «a)», «•») y tras una línea corta que termina una frase.
  - Un aviso dice cuántos párrafos han salido. **Ctrl+Mayús+V pega las líneas tal cual.**
  - Otro texto sin formato (una lista de títulos, frases completas de un correo) se pega como antes.

## Por qué
- **R18:** escribir ±, ≤ o × con el menú de caracteres especiales es lento, y los espacios entre número y unidad y el signo menos son errores tipográficos que las revistas corrigen después.
- **Reglas al teclear, no una pasada al final:** el usuario ve el cambio en el momento y lo deshace si no lo quiere, como en Word.
- **Guion o guion corto según el idioma:** la convención de las revistas en inglés es el guion corto en los rangos, y la de la RAE en español es el guion. Si las revistas en español que usa el usuario piden otra cosa, se cambia la regla.
- **PDF:** copiar un párrafo de un artículo en PDF y tener que unir a mano una docena de líneas es de lo más tedioso al escribir con bibliografía.

## Qué se descartó
- **El texto automático** («ar» + Tab → «artritis reumatoide»), también de R18: **aplazado por decisión del usuario** (22/11). Además necesitaría una lista por proyecto en el formato y una forma de editarla.
- **Espacio duro antes de % según el estilo de la revista:** no se añaden espacios; solo se convierte en duro el que se escribe.
- **Comprobar con el diccionario si un guion de final de línea es de la palabra:** la decisión tiene que ser inmediata al pegar. La regla de la minúscula acierta casi siempre, y el corrector subraya lo que no.
- **Unir siempre las líneas del texto sin formato:** rompería las listas y el texto con saltos de línea a propósito.

## Consecuencias
- **Probado en la vista del navegador**, escribiendo a trozos como un teclado: ±, ≤, el signo menos, ×, «brote» y los espacios duros antes de «mg» y de «%»; Ctrl+Z devuelve el espacio normal. Pegar texto de PDF da los párrafos, «funcional» y «anti-TNF», y muestra el aviso. Sin errores en la consola.
- **Nota para probar:** la herramienta que escribe en la vista del navegador inserta de una vez todo un texto, y entonces no se aplica ninguna regla. Con un teclado real (o escribiendo a trozos) sí se aplican.
- **Pruebas nuevas:**
  - 4 de las reglas, en `apps/desktop/src/autocorrect.test.ts`: símbolos, unidades y lo que no es una unidad, signo menos y rangos por idioma, identificadores que no cambian, comillas por idioma y el apóstrofo de «L'hôpital»;
  - 2 del pegado desde PDF, en `pdf-paste.test.ts`.
- **Sin probar:**
  - el portapapeles real de Acrobat, de Edge o del visor de PDF de Chrome. Se asume que entregan solo texto; si alguno entrega HTML con un `<br>` por línea, hará falta tratarlo;
  - las fechas ISO en un texto en inglés («2020-05-01» quedaría «2020–05-01»).
- **Aplazado por el usuario:** el texto automático por proyecto.
