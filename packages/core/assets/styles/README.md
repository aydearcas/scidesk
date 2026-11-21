# Estilos de cita incluidos

Los 18 estilos CSL que trae SciDesk (ficha [0037](../../../../docs/decisiones/0037-biblioteca-cita-rapida-y-estilos.md)). El catálogo, con el nombre que se ve en el menú, está en `src/resources.ts` (`BUNDLED_STYLES`).

## Licencia y atribución

Todos tienen licencia [Creative Commons Attribution-ShareAlike 3.0](http://creativecommons.org/licenses/by-sa/3.0/), según su elemento `<rights>`. Cada archivo conserva en `<info>` sus autores, sus colaboradores y su fecha. Los de terceros no se han modificado. Si se cambia uno, el resultado sigue con esa licencia y debe llevar otro `<id>` y otro título.

## Procedencia

| Archivo | Procedencia |
|---|---|
| `reumatologia-clinica-2026.csl` | Propio de SciDesk, derivado de «Elsevier - Vancouver» (ficha 0026) |
| `science.csl`, `cell.csl`, `the-lancet.csl`, `the-new-england-journal-of-medicine.csl`, `bmj.csl`, `american-medical-association.csl` y `jama.csl` (en el repositorio, `dependent/jama.csl`) | [Repositorio oficial de estilos CSL](https://github.com/citation-style-language/styles), commit [`15ea5749688396c9352b01b7641bcc5fe1b77da5`](https://github.com/citation-style-language/styles/tree/15ea5749688396c9352b01b7641bcc5fe1b77da5) (20/11/2026), descargados el 21/11/2026 con permiso del usuario |
| `apa.csl`, `chicago-author-date.csl`, `elsevier-harvard.csl`, `harvard-cite-them-right.csl`, `ieee.csl`, `nature.csl` y `nlm-citation-sequence.csl` | Repositorio oficial de estilos CSL; copiados el 21/11/2026 de los estilos que instala Zotero 10. La versión de cada uno es la de su `<updated>` |
| `elsevier-vancouver.csl`, `medicina-clinica.csl` y `nlm-citation-sequence-superscript.csl` | Repositorio oficial de estilos CSL; copiados de los del prototipo 2 (`prototypes/02-citeproc/csl/`). La versión de cada uno es la de su `<updated>` |

`jama.csl` es un estilo **dependiente**: solo lleva su nombre e identificadores, y se formatea con su estilo padre, `american-medical-association.csl` (campo `parent` del catálogo). El AMA del commit indicado es el mismo que el de Zotero salvo la fecha de `<updated>`.
