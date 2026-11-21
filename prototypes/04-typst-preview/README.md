# Prototipo 4: vista previa y PDF con Typst

Prototipo desechable de la fase 0 (PLAN.md, sección 8; R30). Decisión resultante: [ficha 0024](../../docs/decisiones/0024-vista-previa-y-pdf-con-typst.md).

## Pregunta

¿Compila Typst de forma incremental lo bastante rápido para que la vista previa siga al texto, con números de línea y con las citas formateadas por citeproc-js?

## Respuesta

**Sí.** Con Typst 0.15.1 usado como biblioteca de Rust, como lo usaría el núcleo de SciDesk, un artículo de 3.229 palabras con dos tablas y 37 referencias ocupa 13 páginas en el formato de manuscrito de *Reumatología Clínica*.

**Tiempos:**
- La primera compilación tarda 51–66 ms.
- **Recompilar tras escribir un carácter tarda 7,6–9,6 ms de mediana** (13 ms como máximo), y lo mismo si el cambio está al principio, donde se mueve todo lo que viene detrás.
- Dibujar la página que se está editando tarda 8 ms y exportar el PDF, 6–7 ms.

Con un artículo tres veces más largo (9.687 palabras, 31 páginas), la recompilación sube a 24–28 ms y el PDF a 13–14 ms. Sigue sobrando para una vista previa que se actualice tras una pausa al escribir.

| | 3.229 palabras, 13 páginas | 9.687 palabras, 31 páginas |
|---|---|---|
| Cargar las fuentes del sistema (una vez, al arrancar) | 120–130 ms (1,1 s la primera vez en el equipo) | igual |
| Primera compilación | 51–66 ms | 124–149 ms |
| Recompilar tras escribir un carácter en medio (mediana / máximo) | 7,6–9,6 / 9–13 ms | 24–28 / 28–33 ms |
| Lo mismo al principio del documento | 7,4–9,6 / 8,5–12 ms | 24–28 / 29–35 ms |
| Recompilar entregando el texto entero regenerado (`Source::replace`) | 9,6–10,7 ms | 34 ms |
| Dibujar una página a 144 ppp | 7–11 ms | 8–9 ms |
| Exportar el PDF | 6–7 ms (150 KB) | 12–14 ms (292 KB) |
| Saber en qué página cae cada párrafo | 36 de 36, < 0,1 ms | 108 de 108, 0,1 ms |

**Lo que se ve en las páginas generadas** (`out/*.png`):
- Números de línea en el margen, que vuelven a empezar en cada página, y páginas numeradas.
- Calibri a 12 puntos con interlineado amplio.
- Citas en superíndice formateadas por citeproc-js con el estilo de *Reumatología Clínica*, sin espacio antes del número («métodos⁸»).
- La tabla 1 con su encabezado de dos niveles, las celdas combinadas, los superíndices a y b, la nota debajo y el pie «Tabla 1.».
- La bibliografía con los números y el formato que da citeproc-js, no los de Typst.

**PDF accesible y de archivo:** Typst genera, sin errores de sus propios validadores, PDF etiquetado (5–6 ms), PDF/UA-1, PDF/A-2a y PDF/A-4. Para PDF/A solo hace falta poner la fecha del documento.

### Cómo se conecta con el resto

- **Citas:** citeproc-js formatea las citas y la bibliografía (37 referencias, 20 citas, unos 50 ms) y el exportador las escribe ya hechas en la fuente de Typst. Typst no formatea ninguna cita. Así el PDF y el DOCX muestran lo mismo (PLAN.md, 6.1).
- **La vista previa sigue al texto:**
  - Cada párrafo lleva una marca invisible (`#metadata("p-N") <p-N>`), y el *introspector* de Typst dice en qué página y en qué posición quedó.
  - SciDesk podrá desplazar la vista previa a la página del párrafo en el que estás, y al revés.
  - También sirve para la lista EQUATOR («página y línea» de cada elemento).
- **Incremental sin esfuerzo:** se reutiliza el mismo `World` entre compilaciones y la memoización de Typst (comemo) rehace solo lo que el cambio toca. Si SciDesk regenera toda la fuente, `Source::replace` busca la diferencia y vuelve a analizar solo esa parte, con un coste casi igual (9,6–10,7 ms).

### Reglas que salen de aquí para el exportador a Typst

- **Escapar** todos los caracteres con significado en Typst (`# $ * _ \` < > @ [ ] ~ " / = + -`).
- **Con un estilo de cita en superíndice,** quitar el espacio que hay antes de la cita. El exportador a DOCX necesita la misma regla.
- **Separador del pie** «Tabla 1.» en lugar de «Tabla 1:».
- **La fecha del documento**, para poder generar PDF/A.
- **La bibliografía** va como la entrega citeproc-js (número y texto en dos columnas), no como lista numerada de Typst.

## Lo que este prototipo no cubre

- **El camino completo en la aplicación:** de una tecla en el editor a la página nueva en pantalla (exportar a Typst en la interfaz, pasar el texto a Rust, compilar, dibujar y mostrar la imagen). Las piezas suman unos 20 ms, más el exportador, que en la fase 1 tiene que ser incremental y reutilizar las citas ya formateadas. Se mide con el corte vertical de la fase 1.
- **Validación externa** de PDF/UA y PDF/A con veraPDF. Aquí solo se han usado los validadores de Typst.
- **Fuentes:**
  - Carlito no está instalada en este equipo, así que se usó Calibri. Falta comprobarlo en un equipo sin Calibri, con las fuentes libres incluidas en SciDesk (0011).
  - El binario de prueba ocupa 48 MB, 9,6 MB de ellos de las fuentes incrustadas de Typst, sin optimizar el tamaño.
- **Memoria de la caché de comemo** en una sesión larga: hay que vaciarla de vez en cuando (`comemo::evict`).
- **Figuras con imágenes,** notas al pie, ecuaciones y la portada aparte.
- **macOS:** Typst es Rust puro y no depende del motor web, pero no se ha ejecutado en el MacBook.
- **El estilo de *Reumatología Clínica*:** es una capa sobre «NLM con números en superíndice» y se actualizó en 2012. Comprobar que sigue valiendo es cosa del prototipo 2. Además, npm declara citeproc-js como «CPAL-1.0 OR AGPL-1.0», no AGPL-3.0 como suponía el plan; también se revisa en el prototipo 2.

## Cómo se ejecuta

Requisitos: Node 24 y Rust.

```powershell
npm install
node src/gen.mjs
node src/gen.mjs 3
cargo build --release --manifest-path rust/Cargo.toml
rust/target/release/typstbench.exe out/article.typ
rust/target/release/typstbench.exe out/article-x3.typ
```

- `node src/gen.mjs` crea `out/article.typ` a partir del artículo sintético de `prototypes/corpus/`, y `node src/gen.mjs 3`, la versión tres veces más larga.
- `typstbench.exe` escribe en `out/` el PDF en sus variantes (etiquetado, PDF/UA-1, PDF/A-2a, PDF/A-4) y tres páginas como imagen: la del párrafo editado, la de la tabla 1 y la última.

Los estilos CSL y la localización española están en `csl/` (CC BY-SA 3.0, del repositorio oficial de CSL).

## Archivos

- `src/gen.mjs`: el exportador de prueba (Markdown del artículo y tablas JSON → Typst, con citeproc-js).
- `rust/src/main.rs`: Typst como biblioteca. Contiene el `World`, la compilación incremental, la posición de cada párrafo, el PDF y las imágenes.
- `csl/`: estilo de *Reumatología Clínica*, su estilo padre y la localización es-ES.
