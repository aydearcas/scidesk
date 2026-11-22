// The user's main areas (P3, P7, PLAN 5.1): chosen on the first start of each computer and
// changed in Settings, they put the journals of those areas first in the new-article wizard.
// Each area is an OpenAlex subfield or field, whose numbers are the ASJC codes of Scopus, so a
// journal's areas can later come from OpenAlex (PLAN 5.9) without translating them. Biomedicine
// and clinical work first; other disciplines come later as more areas, not as code.

export type AreaGroup = "clinical" | "health" | "basic";

export interface Area {
  /** Stable id, kept in the settings and in the journal catalog. */
  id: string;
  /** OpenAlex subfield or field (ASJC code). */
  openalex: number;
  group: AreaGroup;
  name: { es: string; en: string };
}

/** The areas the user can choose, by group. */
export const AREAS: Area[] = [
  // clinical medicine (OpenAlex field 27, Medicine)
  { id: "anesthesiology", openalex: 2703, group: "clinical", name: { es: "Anestesiología y dolor", en: "Anesthesiology and pain medicine" } },
  { id: "cardiology", openalex: 2705, group: "clinical", name: { es: "Cardiología", en: "Cardiology" } },
  { id: "critical-care", openalex: 2706, group: "clinical", name: { es: "Medicina intensiva", en: "Critical care" } },
  { id: "dermatology", openalex: 2708, group: "clinical", name: { es: "Dermatología", en: "Dermatology" } },
  { id: "emergency-medicine", openalex: 2711, group: "clinical", name: { es: "Urgencias", en: "Emergency medicine" } },
  { id: "endocrinology", openalex: 2712, group: "clinical", name: { es: "Endocrinología y diabetes", en: "Endocrinology and diabetes" } },
  { id: "epidemiology", openalex: 2713, group: "clinical", name: { es: "Epidemiología", en: "Epidemiology" } },
  { id: "family-medicine", openalex: 2714, group: "clinical", name: { es: "Medicina de familia", en: "Family medicine" } },
  { id: "gastroenterology", openalex: 2715, group: "clinical", name: { es: "Aparato digestivo", en: "Gastroenterology" } },
  { id: "clinical-genetics", openalex: 2716, group: "clinical", name: { es: "Genética clínica", en: "Clinical genetics" } },
  { id: "geriatrics", openalex: 2717, group: "clinical", name: { es: "Geriatría", en: "Geriatrics" } },
  { id: "health-informatics", openalex: 2718, group: "clinical", name: { es: "Informática médica", en: "Health informatics" } },
  { id: "health-policy", openalex: 2719, group: "clinical", name: { es: "Gestión y política sanitaria", en: "Health policy" } },
  { id: "hematology", openalex: 2720, group: "clinical", name: { es: "Hematología", en: "Hematology" } },
  { id: "hepatology", openalex: 2721, group: "clinical", name: { es: "Hepatología", en: "Hepatology" } },
  { id: "immunology-allergy", openalex: 2723, group: "clinical", name: { es: "Inmunología clínica y alergia", en: "Immunology and allergy" } },
  { id: "internal-medicine", openalex: 2724, group: "clinical", name: { es: "Medicina interna", en: "Internal medicine" } },
  { id: "infectious-diseases", openalex: 2725, group: "clinical", name: { es: "Enfermedades infecciosas", en: "Infectious diseases" } },
  { id: "microbiology", openalex: 2726, group: "clinical", name: { es: "Microbiología clínica", en: "Medical microbiology" } },
  { id: "nephrology", openalex: 2727, group: "clinical", name: { es: "Nefrología", en: "Nephrology" } },
  { id: "neurology", openalex: 2728, group: "clinical", name: { es: "Neurología", en: "Neurology" } },
  { id: "obstetrics-gynecology", openalex: 2729, group: "clinical", name: { es: "Obstetricia y ginecología", en: "Obstetrics and gynecology" } },
  { id: "oncology", openalex: 2730, group: "clinical", name: { es: "Oncología", en: "Oncology" } },
  { id: "ophthalmology", openalex: 2731, group: "clinical", name: { es: "Oftalmología", en: "Ophthalmology" } },
  { id: "orthopedics", openalex: 2732, group: "clinical", name: { es: "Traumatología y medicina deportiva", en: "Orthopedics and sports medicine" } },
  { id: "otorhinolaryngology", openalex: 2733, group: "clinical", name: { es: "Otorrinolaringología", en: "Otorhinolaryngology" } },
  { id: "pathology", openalex: 2734, group: "clinical", name: { es: "Anatomía patológica y medicina legal", en: "Pathology and forensic medicine" } },
  { id: "pediatrics", openalex: 2735, group: "clinical", name: { es: "Pediatría", en: "Pediatrics" } },
  { id: "clinical-pharmacology", openalex: 2736, group: "clinical", name: { es: "Farmacología clínica", en: "Clinical pharmacology" } },
  { id: "psychiatry", openalex: 2738, group: "clinical", name: { es: "Psiquiatría y salud mental", en: "Psychiatry and mental health" } },
  { id: "public-health", openalex: 2739, group: "clinical", name: { es: "Salud pública", en: "Public health" } },
  { id: "pulmonology", openalex: 2740, group: "clinical", name: { es: "Neumología", en: "Pulmonology" } },
  { id: "radiology", openalex: 2741, group: "clinical", name: { es: "Radiología y medicina nuclear", en: "Radiology and nuclear medicine" } },
  { id: "rehabilitation", openalex: 2742, group: "clinical", name: { es: "Rehabilitación", en: "Rehabilitation" } },
  { id: "reproductive-medicine", openalex: 2743, group: "clinical", name: { es: "Medicina reproductiva", en: "Reproductive medicine" } },
  { id: "rheumatology", openalex: 2745, group: "clinical", name: { es: "Reumatología", en: "Rheumatology" } },
  { id: "surgery", openalex: 2746, group: "clinical", name: { es: "Cirugía", en: "Surgery" } },
  { id: "transplantation", openalex: 2747, group: "clinical", name: { es: "Trasplantes", en: "Transplantation" } },
  { id: "urology", openalex: 2748, group: "clinical", name: { es: "Urología", en: "Urology" } },
  // other health sciences (OpenAlex fields)
  { id: "nursing", openalex: 2900, group: "health", name: { es: "Enfermería", en: "Nursing" } },
  { id: "dentistry", openalex: 3500, group: "health", name: { es: "Odontología", en: "Dentistry" } },
  { id: "physiotherapy", openalex: 3612, group: "health", name: { es: "Fisioterapia", en: "Physical therapy" } },
  { id: "psychology", openalex: 3200, group: "health", name: { es: "Psicología", en: "Psychology" } },
  { id: "pharmacy", openalex: 3000, group: "health", name: { es: "Farmacia y farmacología", en: "Pharmacy and pharmacology" } },
  // basic sciences close to the clinic
  { id: "neuroscience", openalex: 2800, group: "basic", name: { es: "Neurociencia", en: "Neuroscience" } },
  { id: "biochemistry-genetics", openalex: 1300, group: "basic", name: { es: "Bioquímica, genética y biología molecular", en: "Biochemistry, genetics and molecular biology" } },
  { id: "immunology-microbiology", openalex: 2400, group: "basic", name: { es: "Inmunología y microbiología básicas", en: "Immunology and microbiology" } },
];

/**
 * Areas only journals have: a general medical journal publishes for every clinical area, and a
 * multidisciplinary one for every area. The user does not choose them.
 */
export const JOURNAL_ONLY_AREAS: Area[] = [
  { id: "general-medicine", openalex: 2700, group: "clinical", name: { es: "Medicina general", en: "General medicine" } },
  { id: "multidisciplinary", openalex: 1000, group: "basic", name: { es: "Multidisciplinar", en: "Multidisciplinary" } },
];

const BY_ID = new Map([...AREAS, ...JOURNAL_ONLY_AREAS].map((a) => [a.id, a]));
export const areaById = (id: string): Area | undefined => BY_ID.get(id);
export const areaName = (id: string, lang: string): string => {
  const a = BY_ID.get(id);
  return a ? (lang.startsWith("es") ? a.name.es : a.name.en) : id;
};

/** Only the ids the user can choose, without repeats, in the order of AREAS (for the settings). */
export function normalizeAreas(ids: readonly unknown[] | undefined): string[] {
  const chosen = new Set((ids ?? []).filter((x): x is string => typeof x === "string"));
  return AREAS.filter((a) => chosen.has(a.id)).map((a) => a.id);
}

/**
 * How well a journal fits the user's areas: 2 if it publishes in one of them, 1 if it is a
 * general journal for them (general medicine for a clinical area or any health one;
 * multidisciplinary for any), 0 otherwise.
 */
export function areaFit(journalAreas: readonly string[] | undefined, userAreas: readonly string[]): 0 | 1 | 2 {
  const mine = new Set(userAreas);
  const theirs = journalAreas ?? [];
  if (theirs.some((a) => mine.has(a))) return 2;
  if (mine.size === 0) return 0;
  if (theirs.includes("multidisciplinary")) return 1;
  const clinicalOrHealth = userAreas.some((a) => { const g = BY_ID.get(a)?.group; return g === "clinical" || g === "health"; });
  if (theirs.includes("general-medicine") && clinicalOrHealth) return 1;
  return 0;
}

/**
 * The journals suggested for the user's areas, the closest first (in the given order within
 * each fit), and the others. With no areas chosen, nothing is suggested.
 */
export function splitByAreas<J extends { areas?: readonly string[] }>(journals: readonly J[], userAreas: readonly string[]): { suggested: J[]; others: J[] } {
  if (userAreas.length === 0) return { suggested: [], others: [...journals] };
  const fit = journals.map((j) => ({ j, f: areaFit(j.areas, userAreas) }));
  return {
    suggested: [...fit.filter((x) => x.f === 2), ...fit.filter((x) => x.f === 1)].map((x) => x.j),
    others: fit.filter((x) => x.f === 0).map((x) => x.j),
  };
}
