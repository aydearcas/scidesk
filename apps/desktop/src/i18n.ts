// Interface in Spanish and English from the first day (P7), with i18next.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const es = {
  open: "Abrir proyecto…", demo: "Proyecto de demostración", fromWord: "Nuevo desde Word…", cannotShow: "El editor no puede mostrar este documento todavía", fromWordDone: "Proyecto creado desde el Word: {{headings}} encabezados, {{tables}} tablas, {{figures}} figuras", save: "Guardar", saved: "Guardado", unsaved: "Sin guardar",
  exportDocx: "Exportar DOCX para coautores", exportJournal: "DOCX para la revista", exportTitlePage: "Portada", importRefs: "Importar referencias…", refsImported: "{{format}}: {{added}} referencias añadidas, {{duplicates}} duplicadas sin añadir", keptAside: "{{n}} con campos guardados aparte", exportedPlain: "Exportado: {{path}}",
  importCopy: "Importar copia devuelta…", returnedBy: "¿Quién la devuelve?", needReturnedBy: "Escribe primero quién devuelve la copia.", proposals: "Propuestas de la copia",
  noProposals: "Sin cambios respecto a la versión enviada.", tracked: "marcada", untracked: "sin marcar",
  integrityOk: "Integridad: la copia se reconstruye con estas propuestas.", integrityBad: "Integridad: las propuestas no reconstruyen la copia; revísala.",
  exported: "Exportado: {{path}} (instantánea {{snapshot}})", noProject: "Abre un proyecto o el de demostración.",
  previewNote: "Vista en el navegador: el proyecto vive en memoria y la exportación se ofrece como enlace.",
  kinds: { insert: "inserta", delete: "borra", replace: "cambia", "insert-paragraph": "párrafo nuevo", "delete-paragraph": "borra el párrafo" },
  attribution: "citeproc-js implements the Citation Style Language. (c) Frank Bennett. citationstyles.org",
  language: "English",
  library: "Biblioteca", searchLibrary: "Buscar por autor, año, título…", newReference: "Nueva referencia", editReference: "Editar referencia",
  refCount: "{{shown}} de {{total}} referencias", citedTimes_one: "citada 1 vez", citedTimes_other: "citada {{count}} veces", notCited: "sin citar", noDate: "s. f.",
  saveRef: "Guardar", cancel: "Cancelar", deleteRef: "Borrar", confirmDelete: "¿Borrar? Pulsa otra vez", cantDeleteCited: "Está citada: quita antes sus citas para poder borrarla.",
  refAdded: "Referencia añadida a la biblioteca", refSaved: "Referencia guardada", refDeleted: "Referencia borrada",
  refDuplicate: "Ya está en la biblioteca: {{detail}}", refCited_one: "Está citada 1 vez: quita antes la cita.", refCited_other: "Está citada {{count}} veces: quita antes las citas.",
  refSource: "Origen: {{kind}} {{file}}", keptAsideFields: "campos guardados aparte: {{fields}}", zoteroLibrary: "Biblioteca vinculada a Zotero: las referencias se editan en Zotero.",
  sources: { ris: "RIS", nbib: "PubMed (NBIB)", bibtex: "BibTeX", "csl-json": "CSL-JSON", manual: "escrita a mano", "endnote-field": "cita de EndNote de un Word", "zotero-field": "cita de Zotero de un Word", zotero: "Zotero", pubmed: "PubMed", crossref: "Crossref" },
  fields: {
    type: "Tipo", authors: "Autores (uno por línea: «Apellidos, Nombre»; sin coma, autor colectivo)", editors: "Editores (uno por línea)", title: "Título",
    container: "Revista, libro o sitio", containerShort: "Abreviatura de la revista", issued: "Fecha (2025, 2025-03 o 2025-03-12)", volume: "Volumen", issue: "Número",
    page: "Páginas", publisher: "Editorial", publisherPlace: "Lugar de edición", edition: "Edición", DOI: "DOI", PMID: "PMID", URL: "URL", ISBN: "ISBN", accessed: "Consultada el (2026-11-21)",
  },
  fieldErrors: {
    type: "Tipo desconocido.", DOI: "Un DOI empieza por 10. y lleva una barra (10.1136/ard-2023-000001).", PMID: "El PMID es un número.",
    issued: "Usa año, año-mes o año-mes-día (2025, 2025-03, 2025-03-12) o «en prensa».", accessed: "Usa año-mes-día (2026-11-21).", title: "Hace falta al menos un título o un autor.",
  },
  types: { "article-journal": "Artículo de revista", book: "Libro", chapter: "Capítulo de libro", report: "Informe", "paper-conference": "Comunicación a congreso", thesis: "Tesis", webpage: "Página web", dataset: "Conjunto de datos", article: "Prepublicación u otro" },
  cite: "Citar…", quickCite: "Cita rápida", quickCiteShortcut: "Cita rápida (Ctrl+Mayús+Y). Con una cita seleccionada, la cambia.", quickCitePlaceholder: "Autor, año o palabras del título", quickCiteMore: "Añadir otra referencia…",
  quickCiteHelp: "Intro añade · Intro con la búsqueda vacía inserta · Esc cierra", insertCitation: "Insertar cita", updateCitation: "Cambiar cita", citeDetails: "Prefijo, página y sufijo", removeFromCitation: "Quitar de la cita",
  prefix: "Prefijo", locator: "Página", suffix: "Sufijo", emptyLibrary: "La biblioteca está vacía: importa referencias o añade una.", noMatches: "Ninguna referencia coincide.", citationStyle: "Estilo de cita",
};
const en: typeof es = {
  open: "Open project…", demo: "Demo project", fromWord: "New from Word…", cannotShow: "The editor cannot show this document yet", fromWordDone: "Project created from the Word document: {{headings}} headings, {{tables}} tables, {{figures}} figures", save: "Save", saved: "Saved", unsaved: "Unsaved",
  exportDocx: "Export DOCX for co-authors", exportJournal: "DOCX for the journal", exportTitlePage: "Title page", importRefs: "Import references…", refsImported: "{{format}}: {{added}} references added, {{duplicates}} duplicates not added", keptAside: "{{n}} with fields kept aside", exportedPlain: "Exported: {{path}}",
  importCopy: "Import returned copy…", returnedBy: "Who returns it?", needReturnedBy: "First write who returns the copy.", proposals: "Proposals of the copy",
  noProposals: "No changes from the version sent.", tracked: "tracked", untracked: "untracked",
  integrityOk: "Integrity: the copy is rebuilt from these proposals.", integrityBad: "Integrity: the proposals do not rebuild the copy; check it.",
  exported: "Exported: {{path}} (snapshot {{snapshot}})", noProject: "Open a project or the demo one.",
  previewNote: "Browser preview: the project lives in memory and the export is offered as a link.",
  kinds: { insert: "inserts", delete: "deletes", replace: "changes", "insert-paragraph": "new paragraph", "delete-paragraph": "deletes the paragraph" },
  attribution: "citeproc-js implements the Citation Style Language. (c) Frank Bennett. citationstyles.org",
  language: "Español",
  library: "Library", searchLibrary: "Search by author, year, title…", newReference: "New reference", editReference: "Edit reference",
  refCount: "{{shown}} of {{total}} references", citedTimes_one: "cited once", citedTimes_other: "cited {{count}} times", notCited: "not cited", noDate: "n.d.",
  saveRef: "Save", cancel: "Cancel", deleteRef: "Delete", confirmDelete: "Delete? Click again", cantDeleteCited: "It is cited: remove its citations first to delete it.",
  refAdded: "Reference added to the library", refSaved: "Reference saved", refDeleted: "Reference deleted",
  refDuplicate: "Already in the library: {{detail}}", refCited_one: "It is cited once: remove the citation first.", refCited_other: "It is cited {{count}} times: remove the citations first.",
  refSource: "Source: {{kind}} {{file}}", keptAsideFields: "fields kept aside: {{fields}}", zoteroLibrary: "Library linked to Zotero: references are edited in Zotero.",
  sources: { ris: "RIS", nbib: "PubMed (NBIB)", bibtex: "BibTeX", "csl-json": "CSL-JSON", manual: "written by hand", "endnote-field": "EndNote citation in a Word document", "zotero-field": "Zotero citation in a Word document", zotero: "Zotero", pubmed: "PubMed", crossref: "Crossref" },
  fields: {
    type: "Type", authors: "Authors (one per line: \"Family, Given\"; without a comma, a group author)", editors: "Editors (one per line)", title: "Title",
    container: "Journal, book or site", containerShort: "Journal abbreviation", issued: "Date (2025, 2025-03 or 2025-03-12)", volume: "Volume", issue: "Issue",
    page: "Pages", publisher: "Publisher", publisherPlace: "Place of publication", edition: "Edition", DOI: "DOI", PMID: "PMID", URL: "URL", ISBN: "ISBN", accessed: "Accessed (2026-11-21)",
  },
  fieldErrors: {
    type: "Unknown type.", DOI: "A DOI starts with 10. and has a slash (10.1136/ard-2023-000001).", PMID: "A PMID is a number.",
    issued: "Use year, year-month or year-month-day (2025, 2025-03, 2025-03-12) or \"in press\".", accessed: "Use year-month-day (2026-11-21).", title: "A reference needs at least a title or an author.",
  },
  types: { "article-journal": "Journal article", book: "Book", chapter: "Book chapter", report: "Report", "paper-conference": "Conference paper", thesis: "Thesis", webpage: "Web page", dataset: "Dataset", article: "Preprint or other" },
  cite: "Cite…", quickCite: "Quick citation", quickCiteShortcut: "Quick citation (Ctrl+Shift+Y). On a selected citation, it changes it.", quickCitePlaceholder: "Author, year or words of the title", quickCiteMore: "Add another reference…",
  quickCiteHelp: "Enter adds · Enter on an empty search inserts · Esc closes", insertCitation: "Insert citation", updateCitation: "Change citation", citeDetails: "Prefix, page and suffix", removeFromCitation: "Remove from the citation",
  prefix: "Prefix", locator: "Page", suffix: "Suffix", emptyLibrary: "The library is empty: import references or add one.", noMatches: "No reference matches.", citationStyle: "Citation style",
};

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});
export default i18n;
