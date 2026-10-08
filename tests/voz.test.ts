import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_DEFENSES } from "../src/core/defenses";
import LINES from "../src/ui/acruxLines.json";
import { cheerFor, comfortFor, GUIDE_LINES, introFor } from "../src/ui/guide";
import { clipUrl, huella, plainText, splitPhrases } from "../src/ui/voz";

const clip = (phrase: string) => `public/${clipUrl(phrase)}`;

describe("voz de Acrux", () => {
  it("la huella coincide con la del script que generó los audios", () => {
    const manifiesto = JSON.parse(readFileSync("public/voz/manifiesto.json", "utf8")) as Record<string, string>;
    for (const [nombre, texto] of Object.entries(manifiesto)) expect(huella(texto), texto).toBe(nombre);
  });

  it("cada frase de Acrux tiene su audio", () => {
    const phrases = [
      ...Object.keys(LINES.intros).map((n) => introFor(Number(n))),
      ...Object.values(GUIDE_LINES),
      ...[0, 1, 2].map((i) => comfortFor(i))
    ];
    for (const p of phrases) expect(existsSync(clip(p)), p).toBe(true);
  });

  it("el festejo se arma con tres audios: frase, «Ganaste» y el nombre del arma", () => {
    for (const d of ALL_DEFENSES) {
      for (let n = 1; n <= 10; n++) {
        const parts = splitPhrases(plainText(cheerFor(n, d.name)));
        expect(parts).toHaveLength(3);
        for (const p of parts) expect(existsSync(clip(p)), p).toBe(true);
      }
    }
  });
});
