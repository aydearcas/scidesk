# SciDesk (aplicación de escritorio)

Tauri 2 + React + Tiptap. Estado: **corte vertical de la fase 1** (R42, ficha [0032](../../docs/decisiones/0032-corte-vertical.md)): abrir un proyecto, escribir, insertar citas, guardar, exportar el DOCX para coautores e importar la copia devuelta viendo sus propuestas. Sin tablas, sin estilos y sin interfaz cuidada.

- `src/editor.ts`: el esquema del editor, con los nombres y atributos del formato `.scidoc`; ids de bloque únicos en cada transacción.
- `src/QuickCite.tsx`: la cita rápida (Ctrl+Mayús+Y o «Citar…»), con varias referencias por cita y prefijo, página y sufijo; sobre una cita seleccionada, la edita (ficha 0037).
- `src/LibraryPanel.tsx`: la pestaña «Biblioteca»: buscar, ver cuántas veces se cita cada referencia, añadir, editar y borrar.
- `src/platform.ts`: en la ventana de Tauri, los archivos van por comandos de Rust limitados a la carpeta abierta; en un navegador, el proyecto vive en memoria (vista para probar la interfaz).
- `src-tauri/`: los comandos `open_project`, `read_file`, `write_file` (escritura atómica) y `list_files`, sin acceso general al sistema de archivos.

Vista en el navegador (núcleo de Tauri simulado):

```powershell
npm run dev --workspace @scidesk/desktop
```

La aplicación de escritorio (compila la parte de Rust la primera vez):

```powershell
npm run tauri --workspace @scidesk/desktop -- dev
```
