# 0043. Decisiones de interfaz D1–D8, y color y resaltado del texto

- **Fecha:** 22/11/2026 (decididas por el usuario el 21/11/2026, al revisar la propuesta de interfaz).
- **Estado:** aceptada.
- **Pregunta del plan:** las ocho decisiones de [`docs/interfaz/diseno-interfaz.md`](../interfaz/diseno-interfaz.md) (sección 12), y el comentario del usuario sobre la cinta de opciones.

## Qué se decide
| # | Decisión | Resultado |
|---|---|---|
| D1 | Navegador por conceptos o árbol de archivos | **Por conceptos, como en la maqueta**, con la vista de archivos como alternativa |
| D2 | Barra de vistas con nombres visibles | **Sí** (72 px en lugar de 48) |
| D3 | Color de acento | **Verde azulado `#0B6477`** |
| D4 | Menús clásicos en la barra de título en Windows | **Sí** (en macOS, en la barra del sistema) |
| D5 | Comentarios en el panel derecho, no en globos sobre el margen | **Sí** |
| D6 | Dos esquemas de atajos, «Word en español» por defecto con la interfaz en español | **Sí.** **Insertar cita: Ctrl+Mayús+C en los dos esquemas**, como proponía la maqueta; el usuario prefiere ese atajo porque «copiar formato» de Word, que usa la misma combinación, no es tan popular |
| D7 | «Es correcto» para descartar un aviso | **«Es correcto» y también «No aplica»**, como dicen PLAN.md 5.8 y el formato, y como ya hace el panel de comprobaciones (ficha 0041) |
| D8 | Qué láminas siguen | **Inicio con el asistente de nuevo artículo y tabla en su pestaña con el aviso de pegado**, que son de la fase 1. La respuesta a revisores, de la fase 3, espera. **De paso, la maqueta se ajusta a la v0.5:** fuera los recortes y «mover a recortes», la aprobación de la versión final por los coautores y los envíos anteriores, y la hoja de envío baja de prioridad |

- **Color del texto y resaltado en la cinta principal**, petición del usuario. La barra de herramientas de la maqueta (sección 4.3) lleva, junto a negrita, cursiva, subrayado, superíndice y subíndice:
  - **color del texto**: automático y los colores estándar de Word;
  - **resaltado**: los colores de resaltado de Word, y «sin resaltado».
- **El formato `.scidoc` los admite desde ya** como dos marcas nuevas (ficha 0031):
  - `textColor` con `{ color: "#RRGGBB" }`, en mayúsculas;
  - `highlight` con `{ color }`, que solo admite los 16 colores de resaltado de Word (`ST_HighlightColor`: `yellow`, `green`, `cyan`…), los únicos que un DOCX lleva como resaltado.

  El subrayado (`underline`), que ya estaba en el formato, entra también en el editor y en las exportaciones.
- **El circuito completo:**
  - **Editor:** marcas con los nombres del formato. Ctrl+U subraya (en el esquema «Word en español» será Ctrl+S, con la cinta definitiva).
  - **Pegar desde Word:** se lee `color:…` y `mso-highlight:…` del HTML, también en las celdas de las tablas pegadas. El navegador descarta las propiedades `mso-` del estilo analizado, así que el resaltado se lee del atributo tal como viene.
  - **«Nuevo desde Word»:** se lee `w:color`, `w:highlight` y `w:u`. El color automático o negro no es color, y «none» no es resaltado.
  - **DOCX:** `w:color`, `w:highlight` y `w:u`.
  - **PDF (Typst):** `#text(fill: …)`, `#highlight(fill: …)` con el color equivalente al de Word, y `#underline`.
- **En la ventana actual**, hasta el esqueleto de la interfaz, son dos desplegables en la barra («Color del texto» y «Resaltado») con 8 colores y 7 resaltados.

## Por qué
- **D1, D5 y D6** fijan la estructura del esqueleto de la ventana, que es lo grande que queda de la fase 1. Las demás son de aspecto o de orden de trabajo.
- **Ctrl+Mayús+C para citar:** decisión del usuario. El atajo provisional Ctrl+Mayús+Y (ficha 0037) se sustituye.
- **Color y resaltado:** quien escribe con coautores por Word resalta lo que falta o lo que hay que revisar, y las revistas piden a veces resaltar los cambios de una versión revisada. Sin ellos, un Word importado o pegado perdería información a la vista.
- **Solo los colores de resaltado de Word:** un DOCX no tiene resaltado de color libre (sería sombreado, `w:shd`, que Word trata de otra forma). Así lo que se resalta en SciDesk se ve igual en Word y vuelve igual.
- **Pruebas:**
  - 2 nuevas en el núcleo, 52 en total:
    - las marcas validan, y un color que no es `#RRGGBB` o un resaltado que Word no tiene no validan;
    - el DOCX y la fuente de Typst llevan los tres formatos;
    - el mismo DOCX abierto con «Nuevo desde Word» devuelve exactamente las mismas marcas.
  - **En la ventana (navegador):**
    - resaltar en amarillo, poner rojo oscuro y Ctrl+U sobre palabras seleccionadas;
    - pegar HTML de Word con `color` y `mso-highlight` da las mismas marcas;
    - lo guardado las lleva.

## Qué se descartó
- **Ctrl+Mayús+Y para citar** (propuesta mía, ficha 0037).
- **Resaltado con cualquier color:** no vuelve igual de Word.
- **Quitar el color y el resaltado del DOCX para la revista:** a veces la revista pide resaltar los cambios. Si hace falta, será un aviso del panel de comprobaciones antes de enviar.

## Consecuencias
- **En la vista del navegador**, Ctrl+Mayús+C abre el inspector de las herramientas de desarrollo de Chrome. En la aplicación instalada no pasa (no las lleva); en el navegador se usa el botón «Citar…».
- **La maqueta** (lienzo privado) se actualiza con las láminas de D8, el ajuste a la v0.5 y la cinta con color y resaltado. Las capturas de `docs/interfaz/capturas/` se rehacen después.
- **El esqueleto de la ventana** (navegador por conceptos, pestañas, panel derecho con Avisos, Revisión y Detalles, menús, barra de estado y los dos esquemas de atajos) ya no espera a ninguna decisión.
- **Falta:**
  - leer color y resaltado en las copias devueltas por los coautores (fase 2a, con los cambios de formato);
  - un aviso de texto resaltado antes de enviar a la revista, si hace falta.
