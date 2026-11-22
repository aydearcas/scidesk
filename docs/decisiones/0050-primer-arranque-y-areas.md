# 0050. Primer arranque: idioma, esquema de atajos y áreas principales

- **Fecha:** 22/11/2026
- **Estado:** propuesta (hecha al retomar la fase 1, en el orden de lo pendiente; falta que el usuario la revise).
- **Pregunta del plan:** P3, P7 y R19; PLAN.md 5.1 («en el primer arranque eliges el idioma de la interfaz, tus áreas principales y el esquema de atajos») y propuesta de interfaz 5.7.

## Qué se decide
- **Una sola pantalla de primer arranque**, en el sitio de la pantalla de inicio, con tres apartados numerados:
  1. **Idioma de la interfaz** (Español o English). La pantalla cambia de idioma en cuanto se elige. Si el equipo no tiene ajustes, se propone el idioma del sistema.
  2. **Esquema de atajos** («Word en español» o «Internacional»), con cuatro ejemplos de cada uno (negrita, cursiva, guardar, buscar). Mientras no se elija uno, sigue al idioma, como hasta ahora.
  3. **Áreas principales**, opcional: botones agrupados en medicina clínica, otras ciencias de la salud y ciencias básicas, ordenados por nombre en el idioma de la interfaz y con un buscador sin tildes.
- **«Empezar»** guarda `setupDone` en los ajustes del equipo (`settings/interface.json` de la carpeta local, junto a `areas`) y lleva al inicio. Todo se cambia después en Ajustes, que tiene un apartado nuevo «Tus áreas principales» con el mismo selector.
- **Un equipo con ajustes de antes** ve el primer arranque una vez, con lo que ya tenía elegido.
- **Las áreas son subcampos y campos de OpenAlex**, cuyos números son los códigos ASJC de Scopus (2745 Reumatología, 2900 Enfermería…). Se guardan con un nombre estable (`rheumatology`) y su número, para que las áreas de cada revista puedan venir de OpenAlex (PLAN 5.9) sin traducirlas. Hay 47 áreas elegibles: 39 clínicas, 5 de otras ciencias de la salud y 3 básicas. Otras disciplinas llegarán como más áreas, no como código.
- **Dos áreas son solo de revistas:** «medicina general» (2700) y «multidisciplinar» (1000). No se eligen.
- **Qué filtran hoy las áreas: las revistas del asistente.** En el paso «Revista», las de tus áreas salen primero bajo «Para tus áreas» y el resto bajo «Otras revistas»; nada se oculta y el buscador busca en todas. Orden dentro de las sugeridas: primero las de tus áreas y después las generales para ti, marcadas como «general»:
  - una revista de medicina general es general para cualquier área clínica o de otras ciencias de la salud;
  - una multidisciplinar, para cualquier área.
  Sin áreas elegidas, la lista es la de siempre, con una línea que dice que se pueden elegir en Ajustes.
- **Cada revista del catálogo lleva sus áreas:** Reumatología Clínica, reumatología; Medicina Clínica, medicina general y medicina interna; The Lancet, NEJM, BMJ y JAMA, medicina general; Nature y Science, multidisciplinar; Cell, bioquímica, genética y biología molecular.
- **Las plantillas (tipos de artículo) no se filtran todavía:** los seis tipos del asistente sirven para todas las áreas de biomedicina. Se filtrarán cuando haya tipos propios de otras disciplinas.
- **En el núcleo:** `areas.ts` (`AREAS`, `areaFit`, `splitByAreas`, `normalizeAreas`, `areaName`), `areas` en `CatalogJournal`, `scidesk areas` y `scidesk journals --area rheumatology,cardiology` (las sugeridas primero).

## Por qué
- **El plan pide las tres cosas en el primer arranque** y la propuesta de interfaz las reúne. En una sola pantalla se ven de un vistazo y no hay pasos que recorrer; los tres apartados tienen valores por defecto, así que se puede pulsar «Empezar» sin más.
- **Ordenar en vez de ocultar:** con nueve revistas en el catálogo, ocultar las que no son de tus áreas dejaría casi nada, y alguien puede enviar a una revista de otra área. Cuando el catálogo crezca, las sugeridas seguirán arriba.
- **Usar las áreas de OpenAlex** evita inventar una clasificación propia y deja preparada la sugerencia de revistas por área desde fuentes abiertas (PLAN 5.9).

## Qué se descartó
- **Un asistente de tres pasos** para el primer arranque: más clics para tres elecciones sencillas.
- **Las especialidades médicas oficiales de España** como lista: no sirven en inglés ni para las revistas, que se clasifican por áreas de este tipo.
- **Ocultar las revistas de otras áreas** (véase arriba).

## Consecuencias
- **Probado en la vista del navegador:** cambio de idioma en el momento, esquema que sigue al idioma, buscador de áreas sin tildes, «Empezar» que guarda y no vuelve a salir tras recargar, revistas sugeridas para reumatología en el asistente y el selector en Ajustes. Sin probar en la ventana de Tauri ni en WebKit.
- **6 pruebas nuevas** en `packages/core/test/areas.test.ts`.
- **Pendiente:**
  - que el usuario revise la lista de áreas y sus nombres;
  - las áreas de cada revista desde OpenAlex cuando el catálogo crezca;
  - el diccionario de la especialidad para el corrector a partir de las áreas (PLAN 7, nivel 0 de los paquetes para LLM).
