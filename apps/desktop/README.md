# SciDesk (aplicación de escritorio)

Tauri 2 + React + Tiptap. Estado: **fase 1, con el esqueleto de la ventana** (ficha [0044](../../docs/decisiones/0044-esqueleto-de-la-ventana.md)), sobre el corte vertical (ficha [0032](../../docs/decisiones/0032-corte-vertical.md)). Se puede abrir un proyecto, escribir, citar, gestionar la biblioteca y los autores, ver los avisos, exportar el DOCX, el PDF y la portada, importar la copia devuelta y pegar desde Word, con guardado automático y recuperación.

## La ventana
- `src/App.tsx`: la ventana y su estado (sección 3 de [la propuesta de interfaz](../../docs/interfaz/diseno-interfaz.md)):
  - barra de título con menús y Exportar;
  - barra de vistas (Artículo, Biblioteca, Ajustes);
  - panel izquierdo;
  - pestañas centrales: un manuscrito por artículo del proyecto (la demostración trae dos: el artículo y una carta en inglés), biblioteca, autores y ajustes;
  - panel derecho con Avisos, Revisión y Detalles;
  - barra de estado.

  También guarda automáticamente, ofrece la recuperación y gestiona los atajos fuera del texto.
- `src/Menus.tsx`: los menús clásicos (Ajustes es un menú propio antes de Ayuda), los botones que despliegan un menú (Exportar), las paletas y el menú contextual, todos manejables con el teclado.
- `src/Navigator.tsx`: el navegador por conceptos:
  - secciones con sus palabras;
  - resumen;
  - tablas y figuras numeradas y marcadas si no se citan;
  - autores y documentos de envío.

  Tiene un botón para cambiar a la vista de archivos.
- `src/Ribbon.tsx`: la cinta de una fila, a todo el ancho bajo la barra de título (los paneles laterales empiezan debajo). Lleva deshacer, estilo del párrafo, negrita, cursiva y subrayado (N/K/S o B/I/U según el esquema), índices, color y resaltado de Word, cita, referencia cruzada, tabla, figura y carácter especial.
- `src/EditorMenus.tsx`: la burbuja de selección y el buscador de referencia cruzada (Ctrl+Mayús+R).
- `src/DetailsPanel.tsx`: «Detalles», con la cita, tabla, figura o referencia elegida, el resumen o la portada.
- `src/ReviewPanel.tsx`: «Revisión», con la copia devuelta por un coautor y sus propuestas.
- `src/StatusBar.tsx`: la barra de estado. Muestra revista y tipo, el estilo de cita (que se cambia ahí mismo), idioma, palabras, avisos por nivel, guardado y la atribución de citeproc-js.
- `src/SettingsView.tsx` y `src/settings.ts`: idioma de la interfaz y esquema de atajos, guardados por equipo en `settings/interface.json` de la carpeta local de datos (en el navegador, en su almacenamiento), nunca en el proyecto.
- `src/shortcuts.ts`: los dos esquemas, «Word en español» (por defecto con la interfaz en español) e «Internacional». La cita va en Ctrl+Mayús+C en los dos y ningún atajo usa Ctrl+Alt. Sus pruebas están en `src/shortcuts.test.ts`.
- `src/icons.tsx`: iconos de línea propios y la forma de cada nivel de aviso (octógono, triángulo, círculo).
- `src/styles.css`: el estilo visual con variables con nombre: acento `#0B6477`, papel blanco y fuente del sistema.
- `src/i18n.ts`: todos los textos, en español y en inglés.

## El resto
- `src/editor.ts`: el esquema del editor, con los nombres y atributos del formato `.scidoc`; ids de bloque únicos en cada transacción; los atajos del esquema en uso; el sitio de cada tabla y figura con su número y su pie.
- `src/QuickCite.tsx`: la cita rápida (Ctrl+Mayús+C o «Cita»), con varias referencias por cita y prefijo, página y sufijo; sobre una cita seleccionada, la edita (ficha 0037).
- `src/LibraryPanel.tsx`: la biblioteca como vista grande (buscar, filtrar por citadas o sin citar, añadir, editar y borrar) y sus filtros e importaciones en el panel izquierdo.
- `src/AuthorsDialog.tsx`: autores y afiliaciones, ahora como vista en una pestaña. Tiene cuatro pestañas: quién firma y en qué orden, personas y grupos, afiliaciones y matriz CRediT. Guarda `people.json` y `authors.json` a la vez (ficha 0038).
- `src/ChecksPanel.tsx`: «Avisos», con los recuentos frente a los límites, las palabras por sección y los avisos agrupados por nivel. Cada aviso tiene «Ir», «Es correcto» y «No aplica», y los ignorados se pueden revisar (ficha 0041).
- `src/paste.ts`: el limpiador del HTML de Office (prototipo 1) y la lectura de las tablas pegadas con su pie y sus notas, que el núcleo guarda como `.scitable` (ficha 0042).
- `src/platform.ts`: en la ventana de Tauri, los archivos van por comandos de Rust limitados a la carpeta abierta; en un navegador, el proyecto vive en memoria (vista para probar la interfaz).
- `src-tauri/`: los comandos `open_project`, `read_file`, `write_file` (escritura atómica) y `list_files`, sin acceso general al sistema de archivos. Además, `local_read`, `local_write`, `local_remove` y `local_list`, limitados a la carpeta local de datos de la aplicación: registro de recuperación (ficha 0039) y ajustes.
- `src-tauri/src/pdf.rs`: el PDF con Typst 0.15 como biblioteca (comando `compile_pdf`) y el binario `scidesk-pdf` para la línea de comandos (`cargo build --bin scidesk-pdf`), ficha 0040. En el navegador, «Exportar › PDF para la revista» ofrece la fuente de Typst.
- **Guardado automático:** el registro se escribe a los 300 ms de cada cambio y el documento se guarda tras 2 s de pausa (como mucho, a los 20 s). Al abrir, se ofrece recuperar lo que no llegó al disco. En el navegador, el proyecto de demostración vive en el almacenamiento del navegador: recargar la página es como reabrirlo tras un cierre inesperado.

## Cómo se ejecuta
Vista en el navegador (núcleo de Tauri simulado). Chrome se queda algunos atajos (Ctrl+N, Ctrl+Mayús+C); en el navegador se usan los botones:

```powershell
npm run dev --workspace @scidesk/desktop
```

La aplicación de escritorio (compila la parte de Rust la primera vez):

```powershell
npm run tauri --workspace @scidesk/desktop -- dev
```

Pruebas de la ventana (también con `npm test` en la raíz):

```powershell
npm test --workspace @scidesk/desktop
```
