import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHALLENGES } from "../src/core/challenges";
import { RESCUE_QUESTIONS } from "../src/core/rescue/questions";
import { SYNTHESIS } from "../src/core/synthesis";

const ROOT = join(import.meta.dirname, "..");

function filesIn(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesIn(p));
    else out.push(p);
  }
  return out;
}

/** Todo el contenido del juego y su documentación (se excluyen las pruebas). */
function projectText(): { file: string; text: string }[] {
  const files = [...filesIn(join(ROOT, "src")), ...filesIn(join(ROOT, "docs")), join(ROOT, "README.md"), join(ROOT, "index.html")];
  return files.map((file) => ({ file, text: readFileSync(file, "utf8") }));
}

function allGameText(): string {
  return JSON.stringify([CHALLENGES, RESCUE_QUESTIONS, SYNTHESIS]);
}

describe("prueba 12: sin referencias a adecuaciones individuales", () => {
  const forbidden: RegExp[] = [
    /\bDUA\b/,
    /dise[ñn]o universal/i,
    /adecuaci[oó]n/i,
    /\bIan\b/,
    /\bDylan\b/,
    /perfil(es)? (individual|particular)/i,
    /modo compa[ñn]ero/i,
    /macrotipo/i,
    /alto contraste/i,
    /reducci[oó]n de est[ií]mulos/i,
    /prefers-reduced-motion/i,
    /prefers-contrast/i
  ];

  it("ningún archivo del juego ni de la documentación las menciona", () => {
    for (const { file, text } of projectText()) {
      for (const re of forbidden) expect(re.test(text), `${re} en ${file}`).toBe(false);
    }
  });
});

describe("prueba 13: ningún nivel pide medir cuatro veces y media el eje", () => {
  it("las consignas, pistas, retroalimentaciones, preguntas y síntesis no incluyen mediciones", () => {
    const text = allGameText().toLowerCase();
    for (const re of [/veces y media/, /4[.,]5/, /cuatro veces/, /\bmedi[rd]/, /medici[oó]n/, /longitud/]) {
      expect(re.test(text), String(re)).toBe(false);
    }
  });

  it("el código fuente tampoco menciona esa medición", () => {
    for (const { file, text } of projectText().filter((f) => f.file.includes(`${join("src")}`))) {
      expect(/veces y media/i.test(text), file).toBe(false);
    }
  });
});
