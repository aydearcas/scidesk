# Informe de la ronda sintética: artrosis de rodilla acelerada

Generado por `tools/report.py`. Material sintético de prueba: ni el artículo ni las revisiones son reales.

## Ediciones por tipo y coautor

| Tipo | Dra. Marta Ríos Navarro | Dr. Javier Soler Benítez |
|---|---|---|
| inserción | 3 | 9 |
| borrado | 1 | 2 |
| sustitución | 18 | 18 |
| comentario | 10 | 4 |
| formato | 3 | 3 |
| párrafo partido | 1 | 1 |
| párrafos unidos | 0 | 0 |
| frase movida | 1 | 1 |
| **Total** | 37 | 38 |
| con control de cambios | 37 | 30 |
| sin control de cambios | 0 | 8 |
| en celdas de tabla | 5 | 3 |
| de ruido (solo espacios, comillas o guiones) | 1 | 1 |
| aplicadas bien | 37 | 38 |

Los comentarios de Soler se marcan como `tracked: true`, pero un comentario no depende del control de cambios.

## Pasajes en conflicto

Zonas compartidas que se pidieron a los dos coautores (cada uno sin ver la revisión del otro):

| Zona | Ríos | Soler |
|---|---|---|
| S1: Epidemiología, frase del 4 % en la OAI | R18: «criterios en los primeros cuatro años» → «los criterios de AKOA en los primeros 48 meses» | S15: «algo mayor, cercana al 9 %,» → «más del doble, cercana al 10 %,» |
| S2: Criterios radiográficos, frase de Driban | R08: «en el plazo de 48 meses» → «en un plazo máximo de 48 meses» | S09: «colaboradores, que compararon varios algoritmos e…» → «colaboradores. Tras comparar varios algoritmos en la OAI, e…» |
| S3: Tabla 1, fila 7 (artroplastia a cinco años) | R10: «4 %» → «<5 %» | S12: «4 %» → «< 5 %» |
| S4: Conclusiones, primera frase | R36: «10 %» → «9 %» | S36: « y se asocia con» → «, según la definición que se use. Se asocia con» |

Solapamientos detectados al comparar las dos listas (mismos caracteres tocados, contando también comentarios y formato): **15**.

| Ríos | Soler | Párrafo enviado |
|---|---|---|
| R01 (sustitución) | S01 (sustitución) | Introducción: La artrosis de rodilla acelerada (AKOA, del inglés acce… |
| R06 (sustitución) | S07 (sustitución) | El interés por la AKOA ha crecido en la última década, pero la biblio… |
| R10 (sustitución) | S12 (sustitución) | 4 % |
| R17 (comentario) | S11 (sustitución) | Estas observaciones han alimentado propuestas que combinan criterios,… |
| R19 (comentario) | S15 (sustitución) | La artrosis de rodilla afecta a más del 10 % de los adultos mayores d… |
| R20 (borrado) | S16 (sustitución) | Los datos europeos son escasos. En las mujeres de la cohorte de Ching… |
| R23 (sustitución) | S14 (sustitución) | Obesidad (IMC mayor de 30) |
| R26 (comentario) | S20 (comentario) | La edad avanzada es un factor de riesgo clásico de artrosis, pero en … |
| R28 (sustitución) | S22 (sustitución) | La lesión de rodilla previa, sobre todo la rotura del ligamento cruza… |
| R29 (comentario) | S23 (sustitución) | La lesión de rodilla previa, sobre todo la rotura del ligamento cruza… |
| R30 (formato) | S25 (formato) | La fisiopatología de la AKOA se conoce de forma parcial. Desde una pe… |
| R31 (sustitución) | S30 (inserción) | El diagnóstico de la AKOA es, por definición, retrospectivo: solo se … |
| R32 (comentario) | S31 (comentario) | La RM aporta más información que la radiografía en esta fase. Los hal… |
| R33 (sustitución) | S33 (inserción) | No existe un tratamiento específico para la AKOA, y las recomendacion… |
| R37 (sustitución) | S38 (sustitución) | 33. Bruyere O, Honvo G, Veronese N, et al. An updated algorithm recom… |

Párrafos (o celdas) que tocan los dos coautores: **23**.

## Lo que reporta Word

Leído con `word.ps1 inspect` (colecciones `Revisions` y `Comments` de Word).

### returned-rios.docx (Dra. Marta Ríos Navarro)

- Revisiones: **47**. Marta Ríos Navarro, borrado: 21; Marta Ríos Navarro, formato: 3; Marta Ríos Navarro, inserción: 23
- Comentarios: **10**. Marta Ríos Navarro (MR): 10
- Revisiones o comentarios firmados con el nombre real de la cuenta de Office: **0**.
- Partes del paquete que contienen el nombre real: **0**.
- Texto tras «Aceptar todo» frente al esperado: **igual**.
- Texto tras «Rechazar todo» frente a la versión enviada con solo las ediciones sin control de cambios: **igual**.

### returned-soler.docx (Dr. Javier Soler Benítez)

- Revisiones: **41**. Javier Soler Benítez, borrado: 16; Javier Soler Benítez, formato: 3; Javier Soler Benítez, inserción: 22
- Comentarios: **4**. Javier Soler Benítez (JS): 4
- Revisiones o comentarios firmados con el nombre real de la cuenta de Office: **0**.
- Partes del paquete que contienen el nombre real: **0**.
- Texto tras «Aceptar todo» frente al esperado: **igual**.
- Texto tras «Rechazar todo» frente a la versión enviada con solo las ediciones sin control de cambios: **igual**.

`sent.docx`: 0 revisiones y 0 comentarios; partes con el nombre real: 0.

## Problemas y limitaciones

- Todas las ediciones se aplicaron y se comprobaron; ninguna se descartó ni se corrigió a mano.
- Las frases movidas se graban como borrado más inserción (`w:del` y `w:ins`), no como movimiento (`w:moveFrom` y `w:moveTo`): para no tocar el portapapeles del usuario no se usa cortar y pegar, y Word solo marca movimientos con cortar y pegar o arrastrar.
- Las ediciones las aplica el modelo de objetos de Word sobre rangos, no un usuario tecleando: no hay autocorrección, ni sustitución automática de comillas, ni `rsid` de varias sesiones.
- En las celdas de tabla, `Find` de Word no encontraba el texto dentro del rango de una celda; las anclas de celda se buscan en el texto de la celda.
- Párrafo partido: se sustituye el espacio anterior a la frase por un salto de párrafo (borrado del espacio e inserción de la marca de párrafo, ambos con control de cambios).
- No hay copia pasada por LibreOffice: LibreOffice no está instalado en este equipo y no se ha instalado.
