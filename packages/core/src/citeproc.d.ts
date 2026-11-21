// citeproc-js has no type declarations; SciDesk uses a few of its methods (citations.ts).
declare module "citeproc" {
  const CSL: { Engine: new (sys: { retrieveLocale(lang: string): string; retrieveItem(id: string): unknown }, style: string, lang?: string, forceLang?: boolean) => any };
  export default CSL;
}
