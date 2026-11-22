# 0064. El PDF y la vista previa con el documento largo, y los números de línea

- **Fecha:** 22/11/2026
- **Estado:** aceptada (corrige un fallo y mide lo pendiente de la ficha 0058).
- **Pregunta del plan:** R30; pendientes de las fichas 0040 y 0058.

## Qué se decide
- **Arreglo: cada orden de Typst termina en «;».** El texto con formato se escribía como `#strong[azatioprina](MD −0,06…)`, y Typst toma el paréntesis que sigue como más argumentos de la orden. Con el informe de 135 tablas del usuario, el PDF no se generaba («unclosed delimiter», «expected comma»), y la vista previa tampoco habría funcionado.
  - Afectaba a todo texto en negrita, cursiva, superíndice, subrayado, color o idioma seguido de «(» o «[», que en la escritura clínica es constante («**azatioprina** (MD…)»), y también a los saltos de línea y las llamadas a notas.
  - Ahora se escribe `#strong[azatioprina];(MD…)`: Typst consume el «;» y no lo imprime (comprobado en el PDF).
- **Los errores de Typst dicen dónde están** (`main.typ línea:columna`), en el PDF (`scidesk-pdf`, `compile_pdf`) y en la vista previa. Sin eso, un error en una fuente de 1,5 MB era imposible de encontrar.
- **Números de línea:** cuando el perfil de la revista los pide, Typst numeraba también las filas de las tablas. Ahora no las numera (`#show table: set par.line(numbering: none)`), como hace Word en el DOCX que se envía.

## Por qué
- El fallo salió al hacer lo pendiente de la ficha 0058, medir con el documento de 369 páginas. El ejemplo sintético de 17 páginas no tenía texto con formato seguido de un paréntesis.

## Medidas (informe del usuario, 306 páginas en el PDF para la revista, fuente de 1,5 MB)
| Qué | Tiempo |
|---|---|
| Generar la fuente de Typst en TypeScript (cada pausa con la vista previa abierta) | ~45 ms |
| Primera composición en Rust (compilación optimizada) | 1,7 s |
| Componer tras una edición | ~170 ms (17 páginas: ~5 ms) |
| Dibujar una página a 2 px/pt | 18 ms |
| `scidesk export --profile pdf`, compilación de Rust sin optimizar | 38 s |

Los comandos de la vista previa son asíncronos y no ocupan el hilo de la ventana. Con un documento así, la vista previa llega unos 0,2 s después de cada pausa y escribir no se ralentiza; lo único que ocupa el hilo de la ventana son los ~45 ms de generar la fuente.

## Qué se descartó
- **Escapar el carácter que sigue (`\(`) en lugar de terminar con «;»:** habría que hacerlo en cada sitio donde se junta texto. El «;» va en el mismo sitio que crea la orden.
- **Dejar los números de línea en las tablas:** el PDF no coincidiría con el Word que se envía, y las revistas numeran el texto.

## Consecuencias
- **Pruebas nuevas:** la fuente con negrita, cursiva y salto de línea seguidos de «(» y «[», y que Typst la compila (con el binario `scidesk-pdf`). Ajustadas dos pruebas antiguas al «;».
- **Comprobado a mano:** PDF de prueba con «;» (no se imprime) y páginas con números de línea dibujadas con el mismo motor que la vista previa (texto, bibliografía y tabla).
- **Pendiente de la ficha 0058:**
  - las pestañas lado a lado;
  - la vista previa en WebKit.
