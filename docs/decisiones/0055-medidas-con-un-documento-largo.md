# 0055. Medidas con un documento largo: páginas, escritura y pausas

- **Fecha:** 22/11/2026
- **Estado:** hecha (medición y un arreglo); lo pendiente queda anotado.
- **Pregunta del plan:** lo pendiente de la ficha 0049 (rendimiento de las páginas con documentos muy largos).

## Con qué se midió
- **El documento:** el informe real del usuario con más tablas, convertido con «Nuevo desde Word». Es privado: se leyó desde su carpeta, se convirtió en una carpeta temporal y se borró al terminar. Nada suyo entra en el repositorio.
- **Su tamaño:** 936 bloques en el texto, 135 tablas, 41 553 nodos y 3 MB de JSON.
- **Dónde:** la vista del navegador (Chromium) con la versión de producción de la ventana, la misma que usa la aplicación instalada. En la de desarrollo, React tarda varias veces más.
- **El núcleo**, con `packages/core/tools/measure.ts <proyecto>`, que repite el trabajo que hace la ventana tras cada pausa.
- **Con un cuidado:** si el panel del navegador está oculto, Chromium da un solo fotograma por segundo. Una primera medida dio «1 segundo por letra» solo por eso. Las medidas válidas son de tiempo de script y de maquetación forzada, que no dependen de pintar.

## Resultados
| Qué | Tiempo |
|---|---|
| Abrir el Word y mostrarlo | 2,6 s (una tarea de 1,7 s) |
| Páginas en el editor | 369 (Word dice 268 del original y 405 del DOCX para coautores de SciDesk) |
| Cada letra escrita, con la maquetación de las 369 páginas | 29 ms: ~10 ms de script y ~19 de maquetación; sin páginas, unos 8 ms menos |
| Tras una pausa (comprobaciones, navegador, citas, registro de recuperación y guardado) | ninguna tarea de más de 50 ms en la versión de producción |
| Cambiar el zoom (relayout de todo) | 450–580 ms por paso |
| Un paso de desplazamiento (2000 px) | ~25 ms |

**El núcleo, por pausa:**
| Paso | Tiempo |
|---|---|
| comprobaciones | 24 ms |
| esquema del navegador | 5 ms |
| citas | 7 ms |
| reparto en archivos | 3 ms |
| comparar con el disco | 128 ms antes, 8,5 ms después del arreglo |

## Qué se decide
- **Arreglado: comparar los archivos con el disco.** `changedDocuments` (registro de recuperación y guardado) volvía a serializar cada archivo para compararlo. Ahora usa `sameJson`, una comparación estructural que sigue las mismas reglas que la escritura (orden de las claves indiferente, claves sin valor inexistentes) y se para en la primera diferencia: de 128 a 8,5 ms con este documento. Tiene una prueba que la compara con `stableStringify`.
- **Las páginas con columnas CSS sirven** también para un documento de 369 páginas. Cuestan unos 8 ms por letra, y escribir se queda por debajo de los 33 ms de un fotograma a 30 por segundo en este equipo.
- **Queda medido, sin cambiar:**
  - cada transacción recorre dos veces el documento entero en las reglas de las partes (`partIdentity` de `parts.ts`: llamadas a notas sin nota e ids únicos), unos 5 ms de los 29. Se podría limitar a las zonas cambiadas;
  - el cambio de zoom (medio segundo) y la apertura (una tarea de 1,7 s, que congela la ventana sin aviso);
  - el pintado: no se midió, porque el panel estaba oculto.

## Por qué
- **Los saltos de página los calcula el navegador** con todo el documento. Hacía falta saber si eso aguanta un documento real largo antes de seguir. Aguanta.
- **Arreglar solo lo que pesaba y era fácil:** lo demás exige cambios de diseño (reglas por zonas, apertura en trozos) que conviene decidir con el usuario.

## Consecuencias
- **Pendiente:**
  - repetir la medida en el MacBook (WebKit, sin páginas) y en un equipo más lento;
  - medir el pintado con el panel a la vista o en la ventana de Tauri;
  - limitar las reglas de las partes a las zonas cambiadas;
  - un aviso de «Abriendo…» o una apertura por trozos para documentos muy largos.
- **Herramienta nueva:** `packages/core/tools/measure.ts`, para repetir las medidas del núcleo con cualquier proyecto.
