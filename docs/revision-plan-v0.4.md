# Revisión del plan de SciDesk (v0.4)

**20 de noviembre de 2026.** Revisión de `PLAN.md` v0.4. Este documento no cambia el plan ni ninguna decisión. Son propuestas numeradas (R1, R2…) para que aceptes, rechaces o comentes cada una. La propuesta de interfaz va aparte, en [`interfaz/diseno-interfaz.md`](interfaz/diseno-interfaz.md).

Cada propuesta indica la fase en la que la pondría y un coste aproximado (S, M, L), con la misma escala del plan. Al final hay una tabla resumen (sección 12) y las fuentes que he consultado para la parte técnica (sección 13).

## 0. Resultado de la revisión (21 de noviembre de 2026)

Revisada con comentarios el 20 de noviembre e integrada en [`PLAN.md`](../PLAN.md) v0.5 el 21. Las decisiones están en sus fichas ([`decisiones/`](decisiones/README.md)). R5 (el tablero), R41 a R44 y los puntos 2 y 3 de R45 no tenían comentario en la primera revisión; se integraron por coherencia con las aceptadas y quedaron confirmados el 21 de noviembre.

| # | Resultado | Tu comentario, en resumen | Dónde está en el plan |
|---|---|---|---|
| R1 | Aceptada | ok | 5.1, 5.6, fases 1 y 2a |
| R2 | Aceptada | ok | 5.11, ficha 0003 |
| R3 | Aceptada | ok | 5.10, 5.11, ficha 0003 |
| R4 | Aceptada | Bastante relevante | 5.11 |
| R5 | En parte | La aprobación de la versión final se sigue haciendo por correo. El tablero de la ronda, sí (confirmado el 21/11) | 5.11, fase 2b |
| R6 | Descartada | No suele ser necesario, tampoco el resumen por coautor | — |
| R7 | Aceptada | Buena idea lo del LLM como un coautor más | 6.5, ficha 0019 |
| R8 | Aceptada | ok | 5.8 |
| R9 | Aceptada | Importante | 5.8, 5.10 |
| R10 | Aceptada | ok | 5.6 |
| R11 | Aceptada | ok | 3.2, 5.4, 5.8 |
| R12 | Aceptada | ok | 5.8 |
| R13 | Para más adelante | Nada prioritario: desarrollo futuro | 5.2 [Después], fase 4 |
| R14 | Aceptada, prioridad baja | Menos prioritario | 5.10, al final de la fase 3 |
| R15 | Para más adelante | No relevante por ahora: posible función futura | 5.10 [Después], fase 4 |
| R16 | No por ahora | No del todo relevante por ahora | No se añade |
| R17 | Descartada | No relevante | — |
| R18 | Aceptada | Bastante relevante | 5.2 |
| R19 | Aceptada | Y que se pueda cambiar en los ajustes del programa | 5.1, ficha 0005 |
| R20 | Aceptada como accesoria | Relevante pero accesorio: el atributo, en el formato desde el principio; la función, en V1 | 3.2, 5.2, fase 3 |
| R21 | Descartada | No relevante | — |
| R22 | Aceptada | ok | 5.1, fase 3 |
| R23 | Aceptada | Lo más relevante: pegar sin formato o conservando el formato, como en Word; también lo de los campos de Zotero | 5.2 |
| R24 | En parte | Buscar en PubMed y resolver citas escritas a mano, sí; la nota de apoyo por cita, no | 5.6 |
| R25 | Aceptada | ok | 5.1 |
| R26 | Aceptada | ok | 4, 6.4, ficha 0013 |
| R27 | Aceptada | ok | 5.1 |
| R28 | Aceptada | Perfecto y relevante (nombres fijos) | 4, 5.1, ficha 0005. Los nombres van en inglés (P24, contestada el 21/11) |
| R29 | Aceptada | ok | 5.2, 6.1, ficha 0010 |
| R30 | Aceptada | ok | 5.2, 5.10, 6.1, ficha 0004 |
| R31 | Aceptada | ok | 6.1, ficha 0010 |
| R32 | Aceptada | ok | 3.3, ficha 0006 |
| R33 | Aceptada | ok | 6.1, 6.2 |
| R34 | Aceptada | ok | 3.2, 6.1 |
| R35 | Aceptada | ok | 5.10, 6.1 |
| R36 | En parte | Los trabajos previos no son relevantes. Se mantiene la regla de no usar código GPL ni AGPL de terceros, que sale de la licencia ya decidida | 6.3, ficha 0012 |
| R37 | Aceptada | ok | 6.1, fichas 0002 y 0010 |
| R38 | Aceptada | ok | 6.6 |
| R39 | Descartada por ahora | No trabajas en un hospital | Ficha 0002 |
| R40 | Aceptada con matiz | Por ahora, como el software libre habitual | 8, riesgo 7.20, ficha 0002 |
| R41 | Aceptada | ok (21/11), con la fase 0 de tamaño M. Sin el PC del hospital (R39) | Fase 0 |
| R42 | Aceptada | ok (21/11) | 5.1, 6.4, fase 1 |
| R43 | Aceptada | ok (21/11). Ajustada: el idioma por fragmento no entra en el MVP (R20) | Fase 1 |
| R44 | Aceptada | ok (21/11) | Fase 2 |
| R45 | Aceptada | De acuerdo con retrasar EndNote y Mendeley; los otros dos puntos, ok (21/11) | 5.9, fase 4, ficha 0007 |

También se han añadido a la sección 7 del plan los riesgos de la sección 11, salvo el de la instalación en equipos gestionados.

## 1. Valoración general

El plan acierta en lo que más cuesta acertar. Mantendría sin cambios:

- Los seis principios de la sección 1. En especial "estructura antes que formato" y "una sola fuente de verdad", que son los que hacen posibles casi todas las funciones útiles.
- El formato propio en JSON con conceptos de JATS, sin números calculados y con identificadores estables.
- Un proyecto con varios artículos, con biblioteca y personas comunes, y tablas y figuras copiadas en lugar de enlazadas.
- El historial con instantáneas que solo se añaden.
- Los perfiles de revista bajo demanda y los paquetes para LLM con niveles de confidencialidad.
- Reumatología Clínica como caso de prueba de principio a fin.
- La fase 0 con prototipos que responden a una pregunta concreta.

No propongo reabrir ninguna decisión de P1 a P23. Los cambios afectan a dos supuestos (los nombres de carpeta y el explorador de archivos), a tres piezas técnicas que el plan deja "por decidir" (PDF, ortografía y pruebas) y, sobre todo, a funciones que faltan o que están definidas a medias.

### Los cinco cambios que haría primero

1. **Poder traer un manuscrito de Word que ya existe** (R1). Ahora mismo el programa solo sirve para artículos que empiezan de cero, y casi ninguno empieza de cero.
2. **Definir la fusión de revisiones como una fusión a tres bandas**, que aguante copias que llegan tarde y coautores que no usan Word de escritorio (R2 a R4). Es el núcleo del programa y el plan todavía lo describe para el caso fácil.
3. **Añadir comprobaciones de cifras que no necesitan IA** (R8): porcentajes que no cuadran con su n/N, cifras del resumen que no aparecen en el texto, resumen en español e inglés con números distintos. Son los errores que más daño hacen y los más baratos de detectar.
4. **Adelantar a la fase 0 tres prototipos que condicionan el formato del archivo** (R31, R32 y R29): control de cambios, documento compuesto y corrector ortográfico. Y probar ya en la fase 0 en el Mac y en un PC del hospital (R37 y R39).
5. **Recortar el MVP por un lado y darle una ida y vuelta mínima con Word por otro** (R42 a R44), para poder usarlo con un artículo real mucho antes de terminar la fase 2.

## 2. El problema de fondo: cuándo empieza a ser útil

Con la hoja de ruta actual, el programa no mejora a Word con Zotero hasta el final de la fase 2. El MVP permite escribir y exportar, pero en cuanto mandas el artículo a los coautores no hay forma de volver a meter lo que te devuelven. En la práctica, el MVP solo sirve para un artículo sin coautores.

La fase 2, que es la que da el valor, es la más grande (XL) y la más arriesgada, y llega después de una fase L. Con una sola persona desarrollando, eso son muchos meses sin poder usar el programa de verdad. Casi todas las propuestas de la sección 10 van a reducir ese tiempo.

## 3. El circuito con Word

### R1. Importar un manuscrito de Word que ya existe
**Fase 1 (básico) y fase 2 (citas). Coste M. Utilidad muy alta.**

Falta en el plan. "Nuevo artículo a partir de un Word" convertiría un .docx en un proyecto:

- Secciones a partir de los estilos de título, con el papel de cada una (introducción, métodos…) deducido del texto del título.
- Tablas convertidas en archivos `.scitable` e imágenes extraídas a `figuras/`, con sus pies reconocidos por el patrón "Tabla 1." o "Figure 2.".
- **Citas de Zotero, Mendeley y EndNote convertidas en citas vivas.** Los tres guardan los datos de cada referencia dentro del propio documento: Zotero en campos `ADDIN ZOTERO_ITEM CSL_CITATION` con CSL-JSON, Mendeley Cite en controles de contenido con JSON y EndNote en campos `EN.CITE` con XML. Se puede poblar la biblioteca del proyecto y dejar las citas enlazadas sin que tengas el gestor instalado.
- Citas escritas a mano señaladas para vincularlas (R24).

Motivos: es la puerta de entrada para todos los artículos que ya tienes empezados, para los que te manda un coautor que escribió el primer borrador y para reutilizar métodos de artículos anteriores. Además usa el mismo lector de OOXML que necesita la fase 2, así que adelanta trabajo y lo prueba antes con documentos reales.

### R2. Fusión a tres bandas
**Fase 2. Sin coste extra si se diseña así desde el principio. Utilidad muy alta.**

El plan dice que cada copia devuelta "se compara con la versión de partida". Eso solo funciona si no tocas tu copia hasta que vuelven todas. En la práctica:

- Las copias llegan en días distintos, y cuando llega la última ya has integrado las anteriores.
- Mientras esperas, sigues escribiendo.
- Un coautor trabaja a veces sobre la copia de otro, así que un mismo archivo trae cambios de dos personas.

Propuesta: definir la fusión con tres versiones. La **base** es lo que enviaste, **la tuya** es tu copia actual y **la suya** es cada copia devuelta. Las propuestas se calculan de la base a la suya y se aplican sobre la tuya. Si tú has cambiado el mismo pasaje desde el envío, se muestra como conflicto con las tres versiones. Consecuencias:

- "Importar revisiones" se puede usar tantas veces como haga falta dentro de la misma ronda.
- El autor de cada cambio se toma de la marca de Word (`w:author`), no del nombre del archivo. Los cambios hechos sin control de cambios se atribuyen a quien devolvió el archivo.
- Los identificadores estables de bloque, que el plan ya tiene, son los que hacen posible alinear las tres versiones.

### R3. Especificar las "marcas invisibles" y tener un plan B
**Fase 0 (prototipo) y fase 1. Coste M. Utilidad muy alta.**

El plan menciona las marcas, pero no dice cuáles. Propuesta:

- **Cada bloque** lleva un marcador de Word (*bookmark*) oculto con su identificador.
- **Cada cita** es un campo con sus datos dentro. Si se usa el formato de campo de Zotero, de paso se consigue lo que el plan deja para [Después]: los coautores que usan Zotero pueden trabajar con esas citas.
- **Cada referencia cruzada** es un campo `REF` de Word que apunta al marcador de la tabla o figura, y la numeración de los pies usa campos `SEQ`. Así, si un coautor añade una tabla en Word, los números se actualizan allí también.

Dos perfiles de exportación a DOCX:

| | Para coautores | Para la revista |
|---|---|---|
| Marcas y campos | Sí | No: todo convertido a texto normal |
| Metadatos del archivo (autor, empresa, tiempo de edición) | Se conservan | Se eliminan |
| Formato | El del documento | El del perfil de la revista |

**Plan B.** Las marcas se pierden si un coautor abre el archivo en Google Docs, Pages, LibreOffice o Word en línea, o si copia el texto a un documento nuevo. Cuando falten, la alineación se hace por contenido (el párrafo de la base que más se parece), y las citas se reconocen por su texto ("[3]", "(Smith, 2020)") comparándolo con las citas que tenía ese párrafo en la base. El prototipo 6 de la fase 0 debería incluir copias pasadas por Google Docs, LibreOffice y Word para Mac.

### R4. Filtro de ruido en la fusión
**Fase 2. Coste S. Utilidad alta.**

Word registra como cambio casi cualquier cosa: una fuente distinta, el idioma de corrección, un espacio doble, unas comillas rectas convertidas en curvas. Sin filtro, la vista de fusión se llena de propuestas que no son tales. Por defecto se ocultarían los cambios que solo afectan al formato, a los espacios y a la tipografía de comillas y guiones, con un contador ("23 cambios de formato ocultos") y la opción de verlos.

La referencia a batir es la función "Combinar" de Word (Revisar › Comparar › Combinar), que ya fusiona copias de varios revisores. Solo admite dos documentos cada vez, no filtra el ruido y trata las citas como texto. Conviene pasar el corpus de prueba por ella en la fase 0 para tener claro qué hay que mejorar.

### R5. Tablero de la ronda y aprobación de la versión final
**Fase 2. Coste S. Utilidad media.**

La ronda ya guarda la versión de partida. Con poco más se puede mostrar:

- A quién se envió, quién ha devuelto su copia y quién falta, con la fecha límite que hayas puesto.
- Cuántas propuestas de cada coautor quedan por resolver.
- Un texto de recordatorio listo para copiar en el correo. El programa no envía correos.
- Al final del proceso, la **aprobación de la versión final** por cada autor, con su fecha. El ICMJE la exige y hoy se lleva en correos sueltos.

### R6. Devolver a los coautores lo que se hizo con sus propuestas
**Fase 2. Coste S. Utilidad media.**

Al cerrar una ronda, exportar el DOCX de la nueva versión con los cambios marcados respecto a la versión enviada. Es la misma función que el plan ya prevé para la revisión de la revista, aplicada a los coautores. Opcionalmente, un resumen por coautor de lo aceptado y lo rechazado.

### R7. Un único mecanismo de "propuestas" para todo lo que entra de fuera
**Decisión de diseño para la fase 0. Utilidad alta a largo plazo.**

Varias funciones del plan son, por debajo, lo mismo: alguien propone cambios sobre tu texto y tú decides. Propongo tratarlas con un solo modelo (un cambio, su autor y su origen) y una sola vista de revisión:

- Las copias de Word de los coautores.
- La respuesta de un paquete para LLM que proponga otra redacción (5.12).
- Una copia en conflicto creada por OneDrive o Dropbox (R27).
- Recuperar un párrafo o una sección de una versión antigua.
- En el futuro, un coautor que también use SciDesk y devuelva sus propuestas sin pasar por Word, y el asistente con IA.

Ventajas: se programa y se aprende una sola vez, y la futura versión con IA se reduce a decidir por dónde llegan las propuestas. Un LLM pasa a ser "un coautor más" cuyas propuestas aceptas o rechazas.

## 4. Comprobaciones y ayudas que no necesitan IA

### R8. Coherencia de cifras
**Fase 3 (V1). Coste M. Utilidad muy alta.**

El plan deja "comprobar que las cifras del resumen coinciden con las de los resultados" para la versión con IA. La mayor parte se puede hacer con reglas:

- **Aritmética de porcentajes.** En "45/120 (38,5 %)" el programa calcula 37,5 % y avisa. También en las celdas de tabla con formato "n (%)" cuando la columna tiene un total.
- **Cifras del resumen que no aparecen en el texto ni en las tablas.**
- **Resumen en español y en inglés con cifras distintas**, igualando antes la coma y el punto decimal.
- **Intervalos de confianza** que no contienen su estimación o con los límites invertidos.
- **Valores de p** imposibles o mal escritos ("p = 0,000", p mayor que 1).
- **Tamaño de muestra** distinto entre el resumen, los métodos y la primera tabla.

Cada aviso lleva a su sitio y se puede marcar como "es correcto" (R12). Son errores frecuentes, los revisores los encuentran y a veces acaban en una fe de erratas.

### R9. Comprobaciones del manuscrito cegado
**Fase 3, junto al paquete de envío. Coste S. Utilidad alta.**

Quitar la portada no basta para anonimizar. El programa conoce los nombres de los autores, sus centros y sus ciudades, así que puede buscar en el texto lo que os identifica:

- El nombre del hospital o de la ciudad en Métodos.
- El comité de ética con su nombre y el código de aprobación.
- Autocitas con "nuestro trabajo previo" o "como describimos".
- Agradecimientos, financiación con código de proyecto y registro del estudio.
- Metadatos del archivo y nombres de autor en comentarios y cambios.

Para cada hallazgo ofrece sustituirlo solo en la versión cegada (por ejemplo, "[centro eliminado para la revisión]"), sin tocar el manuscrito. Reumatología Clínica es de doble ciego, así que entra en el caso de prueba.

### R10. Verificación de referencias
**Fase 3. Coste M. Utilidad alta.**

Amplía la comprobación de retractados del plan. Con la conexión activada:

- Cada referencia se contrasta con PubMed o Crossref y queda como "verificada" con su fecha. Si el título, el año, el volumen o las páginas no coinciden, se muestran las diferencias y se corrigen con un clic.
- Aviso de retractaciones, fes de erratas y notas de preocupación.
- Aviso de prepublicaciones que ya se han publicado en una revista.
- Referencias que no se encuentran en ningún registro, señaladas para revisarlas a mano.

Las revistas han empezado a comprobar que las referencias existen, por las que inventan los LLM. Llegar al envío con todas verificadas es un argumento a favor del programa.

### R11. Abreviaturas por tabla y figura, y notas de tabla como objetos
**Formato en la fase 0; funciones en las fases 1 y 3. Coste S. Utilidad alta.**

- **Leyenda de abreviaturas automática.** Las revistas piden que cada tabla y cada figura se entiendan solas, con sus abreviaturas definidas al pie. El programa ya tendrá el registro de abreviaturas del artículo (5.8), así que puede generar la línea de cada tabla ("DAS28: Disease Activity Score 28; PCR: proteína C reactiva") y mantenerla al día.
- **Notas de tabla como objetos.** Igual que las citas no guardan su número, las llamadas de nota (ᵃ, ᵇ, ᶜ) no deberían guardar su letra. Si la nota es un objeto con identificador, las letras se reordenan solas al mover filas y la misma nota se puede usar en varias celdas. Hay que decidirlo al especificar `.scitable` para no migrar después.

### R12. Marcadores pendientes e "ignorar este aviso"
**Fase 1 (lo mínimo) y fase 3. Coste S. Utilidad alta.**

- **Pendientes.** Mientras se escribe se dejan marcas como "XX", "??", "[REF]" o "comprobar". El programa las reconoce, permite crear una con un atajo y las lista. Avisa si queda alguna al exportar para la revista.
- **Ignorar un aviso.** Un panel de comprobaciones que no se puede silenciar se deja de mirar. Cada aviso necesita un identificador estable para poder marcarlo como "es correcto" o "no aplica", con una nota opcional, y que no vuelva a salir. Lo ignorado se guarda en el proyecto y se puede revisar.
- **Tres niveles.** "Impide el envío" (falta una declaración obligatoria), "conviene revisar" (abreviatura usada antes de definirla) e "información".

### R13. Título, resumen y palabras clave en dos idiomas, lado a lado
**Fase 1 (vista) y fase 3 (descriptores). Coste S a M. Utilidad alta para revistas bilingües.**

- Vista en dos columnas del resumen en español y en inglés, alineada por apartados, con el recuento de cada lado.
- Palabras clave con autocompletado de MeSH, que es de dominio público y se puede incluir en el programa.
- Para la equivalencia en español están los DeCS de BIREME. Se ofrecen gratis, pero con un acuerdo de licencia que pide proteger los datos frente a terceros. Hay que comprobar si eso permite incluirlos en un programa de código abierto. Si no, la alternativa es consultarlos por su API cuando lo pidas, con tu propia licencia.

## 5. Envío y después del envío

### R14. Hoja de envío
**Fase 3. Coste S. Utilidad alta.**

Editorial Manager y ScholarOne obligan a copiar a mano en formularios lo que el proyecto ya sabe. Una vista "Hoja de envío" reuniría, con un botón de copiar en cada campo:

- Título, título corto, resumen como texto sin formato y palabras clave.
- Cada autor con su correo, ORCID, afiliación y país.
- Recuentos: palabras del texto y del resumen, tablas, figuras y referencias.
- Financiación, conflictos de interés, ética, registro y disponibilidad de datos.
- Revisores sugeridos y excluidos.

Hacen falta algunos datos nuevos en el formato: título corto, financiadores con código de proyecto y lista de revisores sugeridos, que saldría del directorio de personas.

### R15. Bitácora de envíos y estado del artículo
**Fase 3. Coste S. Utilidad media a alta.**

Para cada artículo, una línea de tiempo con: revista, fecha de envío, número de manuscrito, decisión, y enlace a la versión congelada que se envió y a la ronda de respuesta a revisores. Da contexto al módulo de adaptación tras un rechazo y hace visible el estado de cada artículo del proyecto (borrador, con coautores, enviado, en revisión, aceptado). Encaja con las versiones con nombre, que ya guardan lo necesario.

### R16. Perfiles de revista: comprobar las citas literales y admitir plantillas de Word
**Fase 3. Coste S. Utilidad media.**

- El plan pide al LLM una cita literal de la guía para cada dato del perfil. Si el paquete incluye el texto de la guía, y no solo el enlace, el programa puede comprobar al importar que cada cita aparece de verdad en ese texto. Un dato cuya cita no se encuentra se marca en rojo antes de que lo revises. Es una protección barata contra datos inventados.
- Algunas revistas dan una plantilla de Word. El perfil debería poder incluirla y la exportación usarla como base de estilos (R35).
- El catálogo público debería guardar solo citas cortas de cada guía, no la guía entera, que tiene derechos de autor.

### R17. Ayudas para recortar
**Fase 3. Coste S. Utilidad media.**

Cuando el módulo de adaptación dice "te sobran 12 referencias" o "te sobran 400 palabras", puede ayudar a decidir dónde cortar sin tocar el texto:

- Referencias citadas una sola vez y referencias que siempre aparecen junto a otras en la misma cita.
- Palabras por sección frente a un reparto orientativo, para ver cuál está más hinchada.
- Los recortes (R21) como destino de lo que quitas, para no perderlo.

## 6. Escritura diaria

### R18. Autocorrección científica y texto automático
**Fase 1. Coste S. Utilidad alta.**

Reglas de escritura que se aplican al teclear y se deshacen con Ctrl+Z:

- `+-` → ±, `<=` → ≤, `>=` → ≥, `->` → →, y la x entre números ("2 x 2") → ×.
- Espacio duro entre número y unidad, y antes de % si el estilo lo pide.
- Signo menos tipográfico en números negativos y guion corto en rangos.
- Comillas según el idioma del fragmento.
- Texto automático por proyecto: escribir "ar" y tabulador para "artritis reumatoide".

Sustituye buena parte del uso del menú de caracteres especiales.

### R19. Atajos "Word en español" y nada de Ctrl+Alt
**Fase 1. Coste S. Utilidad alta para ti y para quien venga de Word en español.**

Word en español usa atajos propios: Ctrl+N es negrita, Ctrl+K cursiva, Ctrl+S subrayado, Ctrl+G guardar y Ctrl+B buscar. Quien lleva años con ellos pulsará Ctrl+N para poner negrita y abrirá un proyecto nuevo. Propuesta: dos esquemas de atajos, "Word en español" e "Internacional", que se eligen en el primer arranque junto al idioma.

Además, en los teclados españoles de Windows la tecla AltGr equivale a Ctrl+Alt, así que conviene no asignar ningún atajo con Ctrl+Alt.

### R20. Idioma por fragmento
**Fase 1. Coste M (depende de R29). Utilidad alta.**

Un artículo en español lleva el título y el resumen en inglés, y a veces citas textuales en otro idioma. El idioma debería ser un atributo del bloque o del fragmento, de modo que:

- El corrector use el diccionario correcto en cada parte.
- Las comprobaciones de formato numérico sepan qué separador decimal esperar.
- El DOCX exportado marque el idioma de cada fragmento, para que el corrector de Word de los coautores no lo subraye todo.

### R21. Recortes y bloques que no se exportan
**Fase 1 o 3. Coste S. Utilidad media a alta.**

- **Recortes.** Al ajustar el texto a un límite se quitan párrafos que no se quieren perder. "Mover a recortes" los saca del manuscrito, de los recuentos y de la exportación, y los guarda en un documento del artículo con la sección de la que salieron.
- **No exportar.** Marcar un bloque como nota de trabajo: se ve en el editor con otro aspecto y no cuenta ni se exporta.

### R22. Búsqueda y reemplazo en todo el proyecto
**Fase 3. Coste S a M. Utilidad media.**

El plan prevé buscar dentro de un documento. Cambiar el nombre de un fármaco, una abreviatura o una cifra exige buscar a la vez en el texto, el resumen, las tablas, los pies de figura, el suplementario y la carta. El modelo estructurado lo permite sin mucho trabajo.

### R23. Pegado inteligente de texto
**Fase 1. Coste S. Utilidad media.**

El plan cuida el pegado de tablas. Para el texto normal:

- Desde Word o la web, conservar negrita, cursiva, superíndices y subíndices, y descartar fuentes, colores y tamaños.
- Desde un PDF, unir las líneas cortadas y los guiones de final de línea.
- Comprobar en el prototipo 1 si el portapapeles de Word incluye los campos de Zotero. Si los incluye, las citas pegadas pueden llegar vivas.

### R24. Buscar en PubMed desde el buscador de citas y resolver citas escritas a mano
**Fase 3. Coste M. Utilidad alta.**

- Si lo que buscas al citar no está en la biblioteca, el mismo buscador ofrece "Buscar en PubMed" o en Crossref, con la conexión activada, y la referencia se añade y se cita en un solo paso. El plan solo prevé añadir por DOI o PMID.
- Para las citas que un coautor escribe a mano y para los Word importados sin campos: reconocer el texto ("Smolen et al., 2016", o una lista de referencias pegada), buscar la coincidencia en la biblioteca y después en los registros, y proponer el vínculo.
- **[Después]** Nota de apoyo por cita: guardar la frase y la página de la fuente que respaldan lo que afirmas. Sirve para tu propia verificación, para responder a un revisor y como base de una futura comprobación con IA.

## 7. Proyecto y seguridad de los datos

### R25. Escritura atómica y recuperación tras un cierre inesperado
**Fase 1. Coste S. Imprescindible.**

El plan habla de guardado automático, pero no de cómo se escribe. Cada guardado debería hacerse en un archivo temporal que después sustituye al original, para que un corte de luz o un fallo no deje un `.scidoc` a medias. Y un registro de cambios sin guardar que permita recuperar el trabajo al volver a abrir. En un procesador de texto, perder una tarde de escritura una sola vez basta para dejar de confiar en él.

### R26. Separar lo que se sincroniza de lo que es de cada equipo, y un historial con pocos archivos
**Fase 0 (formato). Coste S. Utilidad alta si sincronizas con OneDrive.**

- La carpeta `.scidesk/` mezcla en el plan tres cosas distintas: el historial, la caché y los ajustes locales. El historial debe viajar con el proyecto. La caché y el estado de la ventana son de cada equipo, y si se sincronizan generan conflictos entre el PC y el MacBook. Propuesta: en el proyecto queda solo el historial, y lo demás va a la carpeta de datos de la aplicación del sistema, asociado al identificador del proyecto.
- El historial guarda "cada archivo una sola vez por contenido". Eso produce miles de archivos pequeños, que es lo que peor llevan OneDrive y Dropbox. Mejor un archivo por instantánea, que contenga solo lo nuevo de esa versión. Sigue siendo de escritura única y la carpeta queda con decenas de archivos en lugar de miles.

### R27. Copias en conflicto en lugar del aviso de "abierto en otro equipo"
**Fase 3. Coste M. Utilidad alta si trabajas en dos equipos.**

Un aviso de "proyecto abierto en otro equipo" basado en un archivo de bloqueo falla justo cuando hace falta, porque la sincronización llega tarde. Es más fiable:

- Detectar que un archivo ha cambiado en el disco mientras estaba abierto, y recargarlo si no tenías cambios o fusionarlo si los tenías.
- Reconocer las copias en conflicto que crean OneDrive y Dropbox y ofrecer fusionarlas con la misma vista de propuestas (R7).

### R28. Nombres de carpeta fijos y un navegador por conceptos
**Fase 0. Simplifica. Afecta a dos supuestos del plan.**

- **Nombres de carpeta.** El plan propone crear las carpetas en el idioma de la interfaz y anotar la correspondencia en el manifiesto. Eso duplica las pruebas y la documentación, y complica los proyectos compartidos entre alguien con la interfaz en español y alguien en inglés. Propongo nombres fijos en el disco y etiquetas traducidas dentro del programa.
- **Explorador.** El boceto muestra el árbol de archivos tal cual (`autores.json`, `articulo.scribe`). Quien escribe un artículo no piensa en archivos. Propongo que el panel izquierdo muestre los objetos del artículo con su nombre y su número ("Tabla 2 · Características basales"), y que la vista de archivos sea secundaria. Detalle en el documento de interfaz, sección 3.1. La lógica de proyecto de VS Code se mantiene: carpeta abierta, pestañas, paleta de comandos y barra de estado.

## 8. Pila tecnológica y arquitectura

### R29. Corrector ortográfico propio, no el del motor web
**Prototipo en la fase 0. Coste M.**

El plan lo deja por decidir. Recomiendo descartar el corrector del motor web:

- No permite elegir el idioma por fragmento (R20) ni añadir palabras a un diccionario del proyecto desde el programa. Chromium tiene una propuesta de API para eso, pero no está disponible.
- Se comporta de forma distinta en Windows (WebView2) y en macOS (WKWebView).

Alternativa: diccionarios de Hunspell (los de LibreOffice) con un motor propio y subrayados dibujados por el editor. Candidatos: `spellbook` en Rust (MPL-2.0, reescritura de Nuspell, todavía joven) o Hunspell compilado a WebAssembly. `nspell` va justo de memoria y velocidad con el diccionario español. El prototipo debería medir el tiempo de carga del diccionario español y la corrección de un artículo de 5000 palabras.

### R30. PDF y vista previa con Typst
**Decisión de la fase 0. Recomiendo Typst.**

Entre paged.js y Typst, me inclino claramente por Typst (versión 0.15, de junio de 2026):

- Da el mismo resultado en Windows y en macOS. paged.js depende del motor web, que es distinto en cada sistema.
- Numera las líneas, que es lo que piden las revistas para la revisión.
- Genera PDF etiquetado por defecto y admite PDF/UA-1 y PDF/A.
- Compila de forma incremental en milisegundos, así que la vista previa puede seguir al texto.
- Sabe en qué página y en qué línea cae cada elemento. Eso permite rellenar la lista de verificación EQUATOR con números de página y citar página y línea en la respuesta a los revisores.
- Es una biblioteca de Rust, así que encaja en el núcleo de Tauri.

Condiciones:

- Las citas y la bibliografía deben llegar a Typst ya formateadas por citeproc-js, como texto. Si Typst las formateara con su propio motor, el PDF y el DOCX podrían no coincidir.
- Hace falta un segundo exportador, del documento a Typst. Las tablas con celdas combinadas están cubiertas.
- **La vista previa no es Word.** La paginación del PDF de SciDesk no coincidirá con la del DOCX abierto en Word, porque cada motor parte las líneas a su manera. Hay que decirlo en la interfaz. Para una revista que limite páginas, la referencia es Word.

### R31. Control de cambios y comentarios: implementación propia, con prototipo en la fase 0
**Fase 0 (prototipo). Riesgo alto que el plan no recoge.**

El plan dice que ProseMirror es "una base probada para comentarios y control de cambios" y que solo se usarán piezas libres. He comprobado el estado actual:

- En Tiptap, los comentarios y el control de cambios son extensiones de pago (`@tiptap-pro`), igual que la conversión a DOCX. En 2025 Tiptap liberó diez extensiones con licencia MIT, entre ellas UniqueID, que sirve para los identificadores de bloque.
- Piezas libres para el control de cambios: `@handlewithcare/prosemirror-suggest-changes` (MIT, reciente y pequeña, BlockNote mantiene una variante) y `@manuscripts/track-changes-plugin` (de Atypon, hecha para un editor de manuscritos científicos; hay que confirmar su licencia). Fidus Writer tiene otra implementación, con licencia AGPL.

El control de cambios es la función más difícil de un editor y determina cómo se guardan los cambios en `.scidoc`. El esquema de la versión 1 no debería cerrarse sin un prototipo que escriba y borre en modo de sugerencias, acepte y rechace, exporte a `w:ins` y `w:del` y vuelva a importar.

### R32. Documento compuesto
**Fase 0 (prototipo y formato). El plan no lo resuelve.**

P8 pide editar cada tabla "dentro de la vista del documento completo" aunque viva en su archivo, y lo mismo el resumen. En ProseMirror un editor trabaja sobre un único árbol. Hay dos formas de cumplir P8:

| | A. Componer al cargar y descomponer al guardar | B. Un editor anidado por tabla |
|---|---|---|
| Deshacer, buscar y seleccionar a través de texto y tablas | Funciona como un solo documento | Cada tabla es una isla |
| Control de cambios y fusión | Un solo mecanismo | Hay que duplicarlo |
| Numeración de citas dentro de las tablas | Directa | Hay que coordinar varios editores |
| Complejidad | En la capa de guardado | En el editor, que es donde más cuesta |

Recomiendo la A. En memoria hay un solo documento con el resumen, el cuerpo, las tablas y los pies de figura, y la capa de guardado lo reparte en sus archivos. La pestaña propia de una tabla es otra vista de la misma parte del documento. Esto afecta a la especificación de los formatos, así que merece un prototipo.

### R33. Núcleo sin interfaz y línea de comandos
**Fase 1. Coste S si se hace desde el principio.**

Separar en un paquete sin interfaz todo lo que no es pantalla: esquema, numeración, citas, comprobaciones, importación, exportación y fusión. Ventajas:

- Las pruebas con el corpus se ejecutan en segundos, sin abrir la aplicación.
- Una línea de comandos (`scidesk export`, `scidesk check`) sale casi gratis. Sirve para automatizar y para que herramientas externas, como una skill de Claude, trabajen con un proyecto sin meter IA en el programa.
- Es la base del servidor de sincronización de la fase 5.

### R34. Un solo esquema para validar todo, y una incoherencia en el ejemplo del formato
**Fase 0.**

- Definir cada formato (`.scidoc`, `.scitable`, perfil de revista, respuesta de un paquete) una sola vez, con una herramienta que genere a la vez los tipos de TypeScript, la validación y el JSON Schema publicado. Todo lo que entra de fuera se valida con el mismo código.
- La sección 3.2 dice que el archivo es "el documento del editor serializado tal cual", pero el ejemplo pone `refs`, `id` y `role` directamente en el nodo. ProseMirror los guarda dentro de `attrs`. Hay que elegir: o el JSON de ProseMirror tal cual, que es lo más simple y lo que recomiendo para la versión 1, o una capa de traducción, que da un formato más limpio a cambio de más código y más errores posibles.
- Los identificadores de bloque deben regenerarse al copiar y pegar un párrafo, o aparecerán duplicados y la fusión fallará.

### R35. DOCX: plantilla de referencia, validación y Word real en las pruebas
**Fases 0 y 1. Coste M.**

- **Plantilla de referencia.** Que la exportación tome los estilos de un `.docx` o `.dotx` base, que puede ser el del programa, el tuyo o el de la revista (R16), en lugar de definirlos todos en código.
- **Validación.** Comprobar cada DOCX generado contra el esquema de OOXML en la integración continua. El peor fallo posible es que Word diga que el archivo está dañado.
- **Word real.** En tu equipo, una prueba que abra cada DOCX del corpus con Word, lo convierta a PDF y compare la imagen con la de referencia. Los servidores de integración continua no tienen Word, así que esta prueba es local.
- **Ida y vuelta.** La prueba más valiosa del proyecto es que importar lo que se acaba de exportar devuelva el mismo documento. Detecta a la vez errores de exportación y de importación.
- Comprobar en el prototipo 3 que la biblioteca `docx` permite escribir marcadores y campos arbitrarios (R3). Admite cambios marcados y notas al pie. Si no admite campos a medida, esa parte del XML se generará a mano.

### R36. Trabajo previo que conviene estudiar, y cuidado con las licencias
**Fase 0. Sin coste.**

La tabla de la sección 2 del plan no recoge los proyectos más cercanos por dentro:

| Proyecto | Qué es | Qué aporta | Licencia |
|---|---|---|---|
| Fidus Writer | Editor académico web sobre ProseMirror, con citas, control de cambios y exportación a DOCX, ODT, LaTeX y JATS | Es lo más parecido que existe. Su código muestra cómo resolvieron los mismos problemas | AGPL-3.0 |
| Manuscripts (Atypon) | Editor de manuscritos sobre ProseMirror | Esquema orientado a JATS, conversión a JATS y control de cambios | A confirmar |
| Editor visual de Quarto | Editor visual sobre ProseMirror | Inserción de citas desde Zotero, DOI, Crossref y PubMed | — |
| SuperDoc | Editor de DOCX en el navegador, con cambios marcados | Lector y escritor de OOXML con ida y vuelta | AGPL-3.0 o comercial |
| Docxodus | Comparador de DOCX compilado a WebAssembly | Compara dos DOCX y devuelve los cambios. Sirve de referencia para medir nuestra comparación | MIT, según su ficha |

**Aviso sobre licencias.** SciDesk es AGPL, así que puede incorporar código AGPL de terceros. Pero la estrategia de AGPL con CLA busca poder ofrecer una versión de pago con otra licencia, y eso solo es posible si todo el código es tuyo o de licencia permisiva. citeproc-js lo permite porque también se ofrece bajo CPAL. Fidus Writer y SuperDoc no. Conclusión: estudiar su código sí, copiarlo o depender de él no. Conviene añadirlo a la ficha 0012.

### R37. Tauri: mantenerlo, con condiciones
**Decisión a confirmar al final de la fase 0.**

La elección de Tauri frente a Electron es la que más coste oculto puede tener, porque en macOS el editor corre sobre un motor distinto (WebKit) del que usarás a diario en Windows (Chromium). El tamaño del instalador, que es el argumento principal del plan, importa poco en un procesador de texto.

| | Tauri 2 | Electron |
|---|---|---|
| Motor del editor | Chromium en Windows, WebKit en macOS | Chromium en los dos |
| Corrector con idioma y diccionario propios | No lo da el motor: hay que hacerlo (R29) | Incluido |
| PDF | No lo da el motor: Typst (R30) | Incluido, además de Typst |
| Typst y código en Rust | Directo | Como proceso aparte o WebAssembly |
| Pruebas automáticas de la aplicación | Windows directo; macOS con WebdriverIO y su servicio para Tauri | Playwright en los dos |
| Instalador y memoria | Pequeño y ligero | Unos 100 MB y más memoria |
| Superficie de seguridad | Menor | Mayor, hay que configurarla bien |

Mi recomendación es mantener Tauri si se cumplen tres condiciones, y pasar a Electron si alguna falla:

1. Lo que más cambia entre motores no depende del motor: corrector propio (R29) y PDF con Typst (R30).
2. Los prototipos 1 (pegar tablas) y de edición básica se repiten en el MacBook **en la fase 0**, no al cerrar la fase 1. Cambiar de plataforma antes de empezar cuesta días; después, semanas.
3. Las pruebas del editor se ejecutan a diario también sobre WebKit. Playwright incluye un WebKit que funciona en Windows, y permite probar la capa web con el núcleo de Tauri simulado. No es idéntico a WKWebView, pero detecta la mayoría de las diferencias.

### R38. Rendimiento del editor y seguridad desde el primer día
**Fase 1. Coste S.**

- **Citas y referencias cruzadas sin componentes de React.** Un artículo tiene cientos. Si cada una es un componente, el editor se vuelve lento. Deben ser nodos sencillos cuyo texto ("[1–3]", "Tabla 2") pinta un complemento de numeración. React queda para lo pesado: marcos de tabla y de figura.
- **Comprobaciones como funciones puras.** Cada una recibe el estado del proyecto y el perfil, y devuelve avisos con identificador estable. Se ejecutan fuera del hilo de la interfaz, con retraso.
- **Seguridad que no puede esperar a la auditoría final:** política de contenido estricta, permisos de Tauri limitados a la carpeta del proyecto, imágenes SVG mostradas como imagen y nunca insertadas en la página, y lectura de ZIP y XML protegida contra rutas que salen de la carpeta, archivos que se expanden sin límite y entidades externas.

## 9. Distribución y adopción

### R39. Probar la instalación en un PC del hospital
**Fase 0. Coste S. Puede ser decisivo.**

Si vas a escribir también en el hospital, o quieres que lo usen compañeros, el primer obstáculo no es técnico: en los equipos gestionados no se puede instalar nada sin permiso del servicio de informática. Propongo comprobar en la fase 0, con el esqueleto vacío de la aplicación:

- Si se instala sin permisos de administrador. El instalador de Tauri lo permite por usuario.
- Si funciona como versión portable, descomprimiendo una carpeta.
- Si el equipo tiene WebView2. Viene con Windows 11 y con casi todos los Windows 10 actualizados.
- Si el antivirus o SmartScreen lo bloquean (R40).

### R40. Firma del instalador en Windows
**Antes de la primera versión pública.**

El plan trata la firma de macOS, pero no la de Windows. Un instalador sin firmar muestra el aviso de SmartScreen ("Windows protegió su PC"), que frena a muchos usuarios y que algunos equipos gestionados bloquean del todo. El servicio de firma de Microsoft, que era la opción barata, solo admite a particulares de Estados Unidos y Canadá. En la Unión Europea solo admite organizaciones. Las alternativas son un certificado de una autoridad comercial, cada vez más caro y de menor duración, o publicar a través de una entidad. Conviene decidirlo junto con el registro de la marca, porque depende de quién publique.

## 10. Hoja de ruta

### R41. Fase 0 ampliada
A los seis prototipos del plan añadiría:

| # | Prototipo | Pregunta que responde | Propuesta |
|---|---|---|---|
| 7 | Control de cambios | ¿Qué pieza libre sirve de base y cómo se guardan los cambios en `.scidoc`? | R31 |
| 8 | Documento compuesto | ¿Se edita bien una tabla que vive en su archivo dentro del documento completo, con deshacer y buscar comunes? | R32 |
| 9 | Corrector | ¿Qué motor carga rápido el diccionario español y admite idioma por fragmento? | R29 |
| 10 | Importar un Word tuyo con citas de Zotero o EndNote | ¿Se recuperan las citas y la biblioteca? | R1 |
| 11 | Instalación en el PC del hospital y arranque en el MacBook | ¿Se puede instalar y se comporta igual el editor? | R37, R39 |

Y ampliaría el prototipo 6 con tres copias en lugar de una, alguna pasada por Google Docs y LibreOffice, y con la comparación frente a "Combinar" de Word (R3 y R4).

### R42. Un corte vertical antes de ensanchar
**Primeras semanas de la fase 1.**

Antes de construir el MVP entero, la versión más delgada posible del circuito completo: abrir un proyecto, escribir dos párrafos con una cita, exportar a DOCX, modificar ese DOCX en Word y volver a importarlo viendo las diferencias. Sin tablas, sin estilos y sin interfaz cuidada. Recorre de punta a punta el camino más arriesgado y fija las interfaces entre módulos antes de que haya mucho código apoyado en ellas.

Además, desde la fase 1 **cada exportación a DOCX guarda una instantánea** de lo exportado, aunque el historial no tenga todavía interfaz. Sin ella, el primer artículo real que escribas no podrá aprovechar la fusión cuando llegue, porque no existirá la versión de partida.

### R43. MVP: qué sale y qué entra
**Fase 1.**

| Sale del MVP y pasa a V1 | Entra en el MVP |
|---|---|
| Búsqueda con expresiones regulares | Importar un Word existente, en versión básica (R1) |
| Versalitas | Escritura atómica y recuperación (R25) |
| Elegir fuente para cada estilo: basta con elegir la del documento | Atajos de Word en español (R19) |
| Bordes y sombreado de tabla a medida: basta el estilo científico | Autocorrección científica (R18) |
| | Idioma por fragmento, al menos por bloque (R20) |
| | Panel de comprobaciones mínimo: límites de palabras, pendientes y elementos sin citar (R12) |
| | Instantánea en cada exportación (R42) |

El panel de comprobaciones es la cara del programa y lo que lo distingue de Word a primera vista. Los recuentos ya están en el MVP, así que enseñarlos frente a los límites de Reumatología Clínica cuesta poco.

### R44. La fase 2 en dos partes
**Fase 2.**

- **2a.** Una sola copia devuelta, con control de cambios y comentarios: importarla, verla como propuestas, aceptar y rechazar. Ya resuelve las rondas con un solo coautor y las correcciones de un revisor lingüístico.
- **2b.** Varias copias, cambios sin marcar, conflictos entre coautores y copias que llegan tarde (R2 a R6).

Cada parte termina con algo usable y la 2a prueba el modelo de propuestas antes de complicarlo.

### R45. Qué retrasaría
- La biblioteca vinculada a EndNote y a Mendeley. El modo Zotero y la importación de archivos cubren casi todo.
- El catálogo público de perfiles como infraestructura. Al principio basta un repositorio con los perfiles que vayas creando.
- Las tablas generadas desde datos. El valor es alto, pero el alcance también, y antes están las comprobaciones de cifras (R8), que protegen del mismo problema por menos.

## 11. Riesgos que faltan en la sección 7 del plan

| Riesgo | Por qué importa | Propuesta |
|---|---|---|
| Coautores que no usan Word de escritorio | Google Docs, Pages, LibreOffice y Word en línea eliminan marcas y campos | R3 |
| El programa no sirve hasta el final de la fase 2 | Muchos meses sin uso real, con una sola persona desarrollando | R42 a R44 |
| Control de cambios sin pieza libre madura | Es lo más difícil del editor y condiciona el formato | R31 |
| Tabla en archivo propio editada dentro del documento | El editor trabaja sobre un único árbol | R32 |
| Instalación en equipos gestionados y aviso de SmartScreen | Puede impedir usarlo en el hospital | R39, R40 |
| OneDrive con miles de archivos pequeños y copias en conflicto | Sincronización lenta y pérdida de cambios | R26, R27 |
| Un cierre inesperado deja un archivo a medias | Pérdida de trabajo y de confianza | R25 |
| La vista previa paginada no coincide con Word | Expectativa falsa sobre el número de páginas | R30 |
| Dependencia de bibliotecas jóvenes (control de cambios, corrector) | Pueden quedar sin mantenimiento | Ponerlas detrás de una interfaz propia, como el motor de citas |
| Código AGPL de terceros | Cerraría la puerta a la licencia dual | R36 |
| Panel de avisos que no se puede silenciar | Se deja de mirar | R12 |

## 12. Tabla resumen

Utilidad y coste son estimaciones mías. "Fase" es dónde lo pondría.

| # | Propuesta | Fase | Coste | Utilidad |
|---|---|---|---|---|
| R1 | Importar un Word existente, con citas de Zotero, Mendeley y EndNote | 1 y 2 | M | Muy alta |
| R2 | Fusión a tres bandas | 2 | — | Muy alta |
| R3 | Marcas del DOCX especificadas, dos perfiles de exportación y plan B | 0 y 1 | M | Muy alta |
| R4 | Filtro de ruido en la fusión | 2 | S | Alta |
| R5 | Tablero de la ronda y aprobación final | 2 | S | Media |
| R6 | Devolver el resultado a los coautores | 2 | S | Media |
| R7 | Un único mecanismo de propuestas | 0 | — | Alta |
| R8 | Coherencia de cifras | 3 | M | Muy alta |
| R9 | Comprobaciones del manuscrito cegado | 3 | S | Alta |
| R10 | Verificación de referencias | 3 | M | Alta |
| R11 | Abreviaturas por tabla y notas de tabla como objetos | 0, 1 y 3 | S | Alta |
| R12 | Pendientes, ignorar avisos y tres niveles | 1 y 3 | S | Alta |
| R13 | Resumen bilingüe lado a lado y descriptores | 1 y 3 | S a M | Alta |
| R14 | Hoja de envío | 3 | S | Alta |
| R15 | Bitácora de envíos | 3 | S | Media a alta |
| R16 | Citas literales comprobadas y plantillas de Word en los perfiles | 3 | S | Media |
| R17 | Ayudas para recortar | 3 | S | Media |
| R18 | Autocorrección científica y texto automático | 1 | S | Alta |
| R19 | Atajos de Word en español | 1 | S | Alta |
| R20 | Idioma por fragmento | 1 | M | Alta |
| R21 | Recortes y bloques que no se exportan | 1 o 3 | S | Media a alta |
| R22 | Búsqueda en todo el proyecto | 3 | S a M | Media |
| R23 | Pegado inteligente de texto | 1 | S | Media |
| R24 | PubMed desde el buscador de citas y citas escritas a mano | 3 | M | Alta |
| R25 | Escritura atómica y recuperación | 1 | S | Imprescindible |
| R26 | Separar lo sincronizado de lo local; historial con pocos archivos | 0 | S | Alta |
| R27 | Copias en conflicto | 3 | M | Alta |
| R28 | Nombres de carpeta fijos y navegador por conceptos | 0 | — | Alta |
| R29 | Corrector propio | 0 y 1 | M | Alta |
| R30 | PDF y vista previa con Typst | 0 y 1 | M | Alta |
| R31 | Control de cambios propio, con prototipo | 0 | — | Crítica |
| R32 | Documento compuesto | 0 | — | Crítica |
| R33 | Núcleo sin interfaz y línea de comandos | 1 | S | Alta |
| R34 | Un solo esquema; aclarar el ejemplo del formato | 0 | S | Media |
| R35 | DOCX: plantilla, validación y Word real | 0 y 1 | M | Alta |
| R36 | Estudiar el trabajo previo; licencias de terceros | 0 | — | Media |
| R37 | Tauri con condiciones | 0 | — | Alta |
| R38 | Rendimiento y seguridad desde el principio | 1 | S | Alta |
| R39 | Probar la instalación en el hospital | 0 | S | Puede ser decisiva |
| R40 | Firma en Windows | Antes de publicar | — | Alta |
| R41 | Fase 0 ampliada | 0 | M | — |
| R42 | Corte vertical e instantánea en cada exportación | 1 | S | Alta |
| R43 | MVP: qué sale y qué entra | 1 | — | Alta |
| R44 | Fase 2 en dos partes | 2 | — | Alta |
| R45 | Qué retrasaría | — | — | — |

## 13. Fuentes consultadas (20 de noviembre de 2026)

Lo que afirmo sobre el estado de las bibliotecas sale de estas páginas. Donde la fuente no era concluyente lo he indicado en el texto como "a confirmar".

- Pruebas de Tauri en macOS: [documentación de Tauri sobre WebDriver](https://v2.tauri.app/develop/tests/webdriver/) y [servicio de WebdriverIO para Tauri](https://webdriver.io/docs/desktop-testing/tauri).
- Tiptap: [página principal](https://tiptap.dev), [precios](https://tiptap.dev/pricing), [extensión de cambios marcados](https://tiptap.dev/docs/editor/extensions/functionality/tracked-changes) y [anuncio de las diez extensiones liberadas](https://hnews-reader.vercel.app/top/44202103).
- Control de cambios libre: [prosemirror-suggest-changes](https://cdn.jsdelivr.net/npm/@handlewithcare/prosemirror-suggest-changes@0.1.8/README.md) y [track-changes-plugin de Manuscripts](https://npmjs.com/package/%40manuscripts%2Ftrack-changes-plugin).
- SuperDoc: [repositorio](https://github.com/superdoc-dev/superdoc).
- Docxodus: [wiki del proyecto](https://github.com/JSv4/Docxodus/wiki).
- Typst: [novedades de la 0.15](https://typst.app/docs/changelog/0.15.0/), [de la 0.14](https://typst.app/docs/changelog/0.14.0/) y [de la 0.12](https://typst.app/blog/2024/typst-0.12).
- Corrector: [spellbook](https://docs.rs/crate/spellbook/latest) y [propuesta de API de diccionario local en Chromium](https://groups.google.com/a/chromium.org/g/blink-dev/c/LB5SvNilyhA/m/0vjCsIinAwAJ).
- Biblioteca `docx`: [versiones](https://github.com/dolanmiu/docx/releases).
- DeCS: [página para desarrolladores](https://decs.bvsalud.org/en/for-developers/) y [condiciones de descarga](https://decs.bvsalud.org/?p=2123).
- Zotero 10: [novedades para desarrolladores](https://www.zotero.org/support/dev/zotero_10_for_developers).
- Firma en Windows: [respuesta de Microsoft sobre quién puede obtener certificados](https://learn.microsoft.com/en-us/answers/questions/5915697/can-an-irish-sole-trader-(non-incorporated)-qualif) y [artículo de Devclass](https://www.devclass.com/security/2026/01/14/code-signing-windows-apps-may-be-easier-and-more-secure-with-new-azure-artifact-service/4079554).

No he comprobado con una fuente, y conviene verificarlo en los prototipos: el formato exacto de los campos de Mendeley y EndNote dentro del DOCX, si el portapapeles de Word incluye los campos de Zotero, y el comportamiento de los marcadores de Word al pasar por Google Docs.
