// Pasting text copied from a PDF (record 0065).
import { describe, expect, it } from "vitest";
import { looksLikePdf, unwrapPdfText } from "./pdf-paste.ts";

const pdf = [
  "La artritis reumatoide es una enfermedad inflamatoria crónica que afecta",
  "principalmente a las articulaciones pequeñas de las manos y los pies, con",
  "una prevalencia del 0,5 % en la población adulta. Su curso es variable y el",
  "tratamiento precoz con fármacos modificadores mejora el pronóstico funcio-",
  "nal a largo plazo.",
  "En esta revisión se resumen las recomendaciones actuales sobre el uso de",
  "anti-",
  "TNF y de inhibidores de JAK en pacientes con respuesta insuficiente.",
  "",
  "1. Primera recomendación sobre el metotrexato como fármaco de primera línea",
  "en la mayoría de los pacientes con enfermedad activa.",
  "2. Segunda recomendación.",
].join("\r\n");

describe("pasting from a PDF", () => {
  it("rebuilds the paragraphs: joined lines, words cut by a hyphen, lists", () => {
    expect(unwrapPdfText(pdf)).toEqual([
      "La artritis reumatoide es una enfermedad inflamatoria crónica que afecta principalmente a las articulaciones pequeñas de las manos y los pies, con una prevalencia del 0,5 % en la población adulta. Su curso es variable y el tratamiento precoz con fármacos modificadores mejora el pronóstico funcional a largo plazo.",
      "En esta revisión se resumen las recomendaciones actuales sobre el uso de anti-TNF y de inhibidores de JAK en pacientes con respuesta insuficiente.",
      "1. Primera recomendación sobre el metotrexato como fármaco de primera línea en la mayoría de los pacientes con enfermedad activa.",
      "2. Segunda recomendación.",
    ]);
  });
  it("leaves other plain text alone", () => {
    expect(looksLikePdf("Una sola línea copiada de cualquier sitio.")).toBe(false);
    expect(unwrapPdfText("Introducción\nMétodos\nResultados\nDiscusión")).toBeNull();
    expect(unwrapPdfText("Primera frase completa de un párrafo de correo electrónico.\nSegunda frase completa, también terminada con su punto.\nTercera frase completa del mismo mensaje, con punto final.")).toBeNull();
  });
});
