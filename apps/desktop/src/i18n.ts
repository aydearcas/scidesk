// Interface in Spanish and English from the first day (P7), with i18next.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const es = {
  open: "Abrir proyecto…", demo: "Proyecto de demostración", save: "Guardar", saved: "Guardado", unsaved: "Sin guardar",
  insertCitation: "Insertar cita", chooseReference: "Elige una referencia", exportDocx: "Exportar DOCX para coautores", exportJournal: "DOCX para la revista", exportTitlePage: "Portada", importRefs: "Importar referencias…", refsImported: "{{format}}: {{added}} referencias añadidas, {{duplicates}} duplicadas sin añadir", keptAside: "{{n}} con campos guardados aparte", exportedPlain: "Exportado: {{path}}",
  importCopy: "Importar copia devuelta…", returnedBy: "¿Quién la devuelve?", needReturnedBy: "Escribe primero quién devuelve la copia.", proposals: "Propuestas de la copia",
  noProposals: "Sin cambios respecto a la versión enviada.", tracked: "marcada", untracked: "sin marcar",
  integrityOk: "Integridad: la copia se reconstruye con estas propuestas.", integrityBad: "Integridad: las propuestas no reconstruyen la copia; revísala.",
  exported: "Exportado: {{path}} (instantánea {{snapshot}})", noProject: "Abre un proyecto o el de demostración.",
  previewNote: "Vista en el navegador: el proyecto vive en memoria y la exportación se ofrece como enlace.",
  kinds: { insert: "inserta", delete: "borra", replace: "cambia", "insert-paragraph": "párrafo nuevo", "delete-paragraph": "borra el párrafo" },
  attribution: "citeproc-js implements the Citation Style Language. (c) Frank Bennett. citationstyles.org",
  language: "English",
};
const en: typeof es = {
  open: "Open project…", demo: "Demo project", save: "Save", saved: "Saved", unsaved: "Unsaved",
  insertCitation: "Insert citation", chooseReference: "Choose a reference", exportDocx: "Export DOCX for co-authors", exportJournal: "DOCX for the journal", exportTitlePage: "Title page", importRefs: "Import references…", refsImported: "{{format}}: {{added}} references added, {{duplicates}} duplicates not added", keptAside: "{{n}} with fields kept aside", exportedPlain: "Exported: {{path}}",
  importCopy: "Import returned copy…", returnedBy: "Who returns it?", needReturnedBy: "First write who returns the copy.", proposals: "Proposals of the copy",
  noProposals: "No changes from the version sent.", tracked: "tracked", untracked: "untracked",
  integrityOk: "Integrity: the copy is rebuilt from these proposals.", integrityBad: "Integrity: the proposals do not rebuild the copy; check it.",
  exported: "Exported: {{path}} (snapshot {{snapshot}})", noProject: "Open a project or the demo one.",
  previewNote: "Browser preview: the project lives in memory and the export is offered as a link.",
  kinds: { insert: "inserts", delete: "deletes", replace: "changes", "insert-paragraph": "new paragraph", "delete-paragraph": "deletes the paragraph" },
  attribution: "citeproc-js implements the Citation Style Language. (c) Frank Bennett. citationstyles.org",
  language: "Español",
};

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});
export default i18n;
