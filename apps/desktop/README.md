# SciDesk (aplicación de escritorio)

Tauri 2 + React + Tiptap. Estado: **corte vertical de la fase 1** (R42, ficha [0032](../../docs/decisiones/0032-corte-vertical.md)): abrir un proyecto, escribir, insertar citas, guardar, exportar el DOCX para coautores e importar la copia devuelta viendo sus propuestas. Sin tablas, sin estilos y sin interfaz cuidada.

- `src/editor.ts`: el esquema del editor, con los nombres y atributos del formato `.scidoc`; ids de bloque únicos en cada transacción.
- `src/QuickCite.tsx`: la cita rápida (Ctrl+Mayús+C o «Citar…»), con varias referencias por cita y prefijo, página y sufijo; sobre una cita seleccionada, la edita (ficha 0037).
- `src/LibraryPanel.tsx`: la pestaña «Biblioteca»: buscar, ver cuántas veces se cita cada referencia, añadir, editar y borrar.
- `src/AuthorsDialog.tsx`: el diálogo «Autores…»: quién firma y en qué orden, personas y grupos, afiliaciones y matriz CRediT; guarda `people.json` y `authors.json` a la vez (ficha 0038).
- `src/ChecksPanel.tsx`: la pestaña «Comprobaciones»: recuentos frente a los límites, palabras por sección, avisos con «Ir», «Es correcto» y «No aplica», e ignorados (ficha 0041).
- `src/paste.ts`: el limpiador del HTML de Office (prototipo 1) y la lectura de las tablas pegadas con su pie y sus notas, que el núcleo guarda como `.scitable` (ficha 0042).
- `src/platform.ts`: en la ventana de Tauri, los archivos van por comandos de Rust limitados a la carpeta abierta; en un navegador, el proyecto vive en memoria (vista para probar la interfaz).
- `src-tauri/`: los comandos `open_project`, `read_file`, `write_file` (escritura atómica) y `list_files`, sin acceso general al sistema de archivos, y `local_read`, `local_write`, `local_remove` y `local_list`, limitados a la carpeta local de datos de la aplicación (registro de recuperación, ficha 0039).
- `src-tauri/src/pdf.rs`: el PDF con Typst 0.15 como biblioteca (comando `compile_pdf`) y el binario `scidesk-pdf` para la línea de comandos (`cargo build --bin scidesk-pdf`), ficha 0040. En el navegador, el botón «PDF para la revista» ofrece la fuente de Typst.
- Guardado automático: registro a los 300 ms de cada cambio y guardado tras 2 s de pausa (como mucho, 20 s); al abrir, se ofrece recuperar lo que no llegó al disco. En el navegador, el proyecto de demostración vive en el almacenamiento del navegador: recargar la página es como reabrirlo tras un cierre inesperado.

Vista en el navegador (núcleo de Tauri simulado):

```powershell
npm run dev --workspace @scidesk/desktop
```

La aplicación de escritorio (compila la parte de Rust la primera vez):

```powershell
npm run tauri --workspace @scidesk/desktop -- dev
```
