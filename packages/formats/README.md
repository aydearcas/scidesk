# @scidesk/formats

Los formatos de archivo de SciDesk, cada uno definido una sola vez con [TypeBox](https://github.com/sinclairzx81/typebox) (R34): de la misma definición salen los tipos de TypeScript, el validador y el JSON Schema publicado. Es el primer paquete del núcleo sin interfaz.

La especificación, en español, está en [`docs/formatos/especificacion-formatos.md`](../../docs/formatos/especificacion-formatos.md), y la decisión en la ficha [0031](../../docs/decisiones/0031-formatos-v1-con-un-solo-esquema.md).

| Carpeta | Qué hay |
|---|---|
| `src/` | Las definiciones (`scidoc.ts`, `library.ts`, `journal-profile.ts`…), los ids y las marcas del DOCX, la normalización y las comprobaciones (`validate.ts`) |
| `schemas/` | El JSON Schema 2020-12 publicado de cada formato (generado, no se edita a mano) |
| `examples/` | Proyectos y archivos de ejemplo construidos con los datos sintéticos de los prototipos (generados) |
| `scripts/` | Generar los esquemas y los ejemplos, y listar lo que dicen las comprobaciones de los ejemplos |
| `test/` | Pruebas (Vitest) y comprobación de tipos |

```powershell
npm install
```

```powershell
npm test
```

```powershell
npm run typecheck
```

Después de cambiar una definición: `npm run build:schemas` (y `npm run make:examples` si cambian los ejemplos). Las pruebas fallan si `schemas/` no está al día.
