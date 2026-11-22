# Specialty dictionary (biomedicine)

Words of biomedicine and clinical research that the general dictionaries lack, so that the checker does not underline them (record [0059](../../../docs/decisiones/0059-diccionario-de-especialidad.md)). The first version covers rheumatology and the vocabulary every clinical article shares: drugs, diseases, tests, immunology, research methods and statistics, and names (eponyms, genera, databases).

The lists were written for SciDesk; they copy no other word list. They are licensed like the rest of SciDesk (AGPL-3.0-or-later).

## Files

| Folder | What | Flags |
|---|---|---|
| `es/` | Spanish: `farmacos.txt`, `enfermedades.txt`, `clinica-y-pruebas.txt`, `metodologia.txt` | those of `es_ES.aff` |
| `en/` | English: `drugs.txt`, `clinical.txt` | those of `en_US.aff` |
| `common/` | names that are the same in both languages: `nombres.txt` | none |

`npm run build:specialty --workspace @scidesk/spell` turns them into `assets/dicts/biomed_es.dic` and `biomed_en.dic`, which the editor loads after the general dictionary of each language. Commit both the lists and the built files.

## Adding a word

One entry per line; `#` starts a comment.

- `espondiloartritis`: the word as it is.
- `psoriásico/GS`: with Hunspell flags of that language. In Spanish, `S` is the plural and `G` the feminine and its plural (`psoriásico/GS` accepts psoriásica, psoriásicos and psoriásicas). In English, `S` is the plural, `D` the past, `G` the -ing form.
- `aleatorizar ~realizar`: the flags of a model word of the general dictionary, for verbs and anything with many forms.
- A capitalised entry (`Sjögren`) is accepted capitalised and in capitals only.

The build stops on an entry it cannot read or a model it does not know, and leaves out (listing them) the words the general dictionary already accepts.

Before adding a word, check its spelling in a reliable source (the DLE, the Diccionario de términos médicos of the RANM, the WHO lists of nonproprietary names, MeSH). A misspelt entry would hide that very typo in every article.

## Measuring

`node tools/measure-text.ts <text file> es --other en` counts the underlined words of a plain text with and without these lists, and which ones are left. `--other en` counts apart the words that are English, which the editor checks in English once they carry their language mark. Run it on private documents only on your own computer: what it prints is part of the document.
