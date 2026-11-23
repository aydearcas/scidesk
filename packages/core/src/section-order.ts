// The usual order of a manuscript's sections (records 0071 and 0072): the body, then the
// closing ones (declarations, references, appendices). Without imports, so that the new
// article's plan and the sections' rules can both use it.
export const BODY_ORDER = ["background-objective", "background", "introduction", "objective", "methods", "patients-methods", "case-presentation", "results", "discussion", "discussion-conclusions", "conclusions"] as const;
export const CLOSING_ORDER = ["ethics", "consent", "registration", "contributions", "acknowledgements", "funding", "conflicts", "data-availability", "ai-use", "references", "appendix"] as const;
export const isClosingRole = (role: string | null | undefined) => !!role && (CLOSING_ORDER as readonly string[]).includes(role);
