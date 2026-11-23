# 0086. El perfil completo de Reumatología Clínica, cómo se harán los perfiles y las funciones de IA por paquetes

- **Fecha:** 23/11/2026
- **Estado:** hecha (el perfil) y decidida (lo demás), por el usuario el 23/11.
- **Pregunta del plan:** cierre de la fase 1 (el Word cumple la guía de Reumatología Clínica) y PLAN 5.9 y 5.12.

## 1. El perfil de Reumatología Clínica, completo
Rellenado a mano desde la guía para autores, leída entera el 23/11 (`packages/core/assets/journals/reumatologia-clinica.json`, válido contra su esquema).

- **Declaraciones**, con lo que el comprobador hace con ellas. Solo se exige una sección propia en el manuscrito cuando la guía la pide sin condiciones:
  - **Financiación:** obligatoria, en el manuscrito. La guía no dice dónde; va donde la pone Elsevier, antes de la bibliografía. Un artículo nuevo la trae, y sin ella hay un aviso que impide el envío.
  - **Conflictos de intereses:** obligatorios, en la página inicial (doble ciego) y en el formulario del envío. La portada ya avisa si nadie los ha declarado.
  - **Disponibilidad de los datos:** obligatoria, en el formulario del envío.
  - **Uso de IA generativa:** **corregido**: solo si se ha usado, en una sección propia antes de las referencias. La guía dice que sin nada que declarar no hace falta. Antes el perfil la tenía como obligatoria, y un artículo nuevo la traía siempre.
  - **Ética y consentimiento informado:** solo en estudios con personas, y deben constar en el artículo (suelen ir en los métodos): no se exige una sección.
  - **Registro:** solo en ensayos clínicos (número al final del resumen) y revisiones sistemáticas.
  - **Agradecimientos:** en la página inicial.
- **Tipos de artículo nuevos:**
  - «Revisión sistemática y metaanálisis», que se publica como original, con sus mismos límites.
  - «Revisión», 6.000 palabras.
- **Límites corregidos o añadidos:**
  - 6 palabras clave en todos los tipos con resumen;
  - 6 autores aconsejados en el caso clínico.
- **Datos añadidos:**
  - la página de la revista;
  - la dirección de envío (Editorial Manager);
  - los formatos de figura.
- **Notas** con lo que el perfil no puede guardar como dato:
  - que la guía no da el límite del resumen ni dice si las tablas cuentan;
  - los tipos sin equivalente en SciDesk (protocolo, estudio cualitativo, conferencia clinicopatológica, «en imágenes»);
  - el formato de la carta;
  - CONSORT y el registro de ensayos;
  - el doble ciego;
  - abreviaturas, tablas y figuras;
  - inglés británico o estadounidense sin mezclar.
- **Sin citas literales de la guía.** El campo `quote` del formato es opcional y no se rellena. La guía tiene derechos de autor y el repositorio es público: cada dato lleva su fuente y la fecha de consulta.
- **Los proyectos ya creados** conservan su copia del perfil (`resources/journals/`, que nunca se sobrescribe). Solo los artículos nuevos toman el perfil completo.

Pruebas:
- un original nuevo para la revista trae «Financiación» antes de la bibliografía;
- sin ella, el aviso impide el envío;
- el uso de IA ya no se exige.

## 2. Cómo conseguirá un usuario el perfil de su revista (PLAN 5.9)
Decisiones del usuario:
- **Uno a uno, cuando se necesita.** Durante el desarrollo no se preparan perfiles de serie (salvo Reumatología Clínica): el programa lo usarán muchas personas con revistas distintas.
- **El formulario del perfil es el camino sin IA.** Con la guía al lado, se rellenan los datos, con la frase de la guía si se quiere. Es también la pantalla en la que se revisa, dato a dato, lo que devuelve el paquete para LLM: no es trabajo doble.
- **El paquete para LLM es opcional.** El LLM lo usa el usuario fuera del programa, que no lleva IA.
- **Sin extracción con patrones** del texto de la guía: descartada.
- **Guardados en el programa, reutilizables y editables.** Los perfiles que crea, revisa o importa el usuario se guardan en la carpeta de datos de su equipo:
  - salen entre las revistas conocidas en cualquier proyecto;
  - se pueden editar cuando la guía cambia.
  - Cada proyecto conserva su copia en `resources/journals/`, para que viaje con él.
  - Al editar el del programa, los proyectos que lo usan ofrecen actualizar su copia; nunca se cambia sola.
- **Más adelante**, en la vista «Revistas», generar con LLM un lote de perfiles de una selección de revistas. Primero, uno a uno.

## 3. Funciones de redacción con paquetes y prompts establecidos (PLAN 5.12)
Ideas del usuario, apuntadas para la versión con paquetes. Cada una devuelve propuestas que se aceptan o rechazan, como las de un coautor:
- **Traducir** al inglés o al español, evitando los artefactos de IA: rayas para incisos, «;» en exceso y «:» explicativos.
- **Corregir artefactos de IA** en un texto ya escrito.
- **Proponer conclusiones.**
- **Elaborar la discusión.**
- **Pendiente:** evaluar qué otras funciones aprovecharían este método.

## Qué se descartó
- Un catálogo de perfiles preparado durante el desarrollo para las revistas más comunes.
- Buscar los datos en la guía con patrones de texto.
