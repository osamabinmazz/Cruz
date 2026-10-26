import { describe, expect, it } from "vitest";
import { createRng } from "../src/core/rng";
import { CARDINAL_QUESTIONS, CHEST_QUESTIONS, ChestQuestionBank, FACE_TOLERANCE, SOL_QUESTIONS, chestCorrectText, isChestCorrect } from "../src/core/chests/questions";

describe("preguntas de los cofres", () => {
  it("hay preguntas de los tres temas y ids únicos", () => {
    expect(SOL_QUESTIONS.length).toBeGreaterThanOrEqual(12);
    expect(CARDINAL_QUESTIONS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(CHEST_QUESTIONS.map((q) => q.id)).size).toBe(CHEST_QUESTIONS.length);
    expect(new Set(CHEST_QUESTIONS.map((q) => q.topic))).toEqual(new Set(["cruz", "sol", "cardinales"]));
  });
  it("las de elegir tienen 3 opciones y una sola correcta", () => {
    for (const q of [...SOL_QUESTIONS, ...CARDINAL_QUESTIONS].filter((x) => x.format !== "face")) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
      expect(q.options.filter((o) => o.id === q.correctId), q.id).toHaveLength(1);
      expect(new Set(q.options.map((o) => o.text)).size, q.id).toBe(q.options.length);
      expect(q.explanation.length, q.id).toBeGreaterThan(15);
    }
  });
  it("acertar y fallar", () => {
    const q = SOL_QUESTIONS[0];
    expect(isChestCorrect(q, q.correctId)).toBe(true);
    expect(isChestCorrect(q, "b")).toBe(false);
    expect(chestCorrectText(q)).toBe("Por el Este.");
  });
  it("«mira hacia…» acepta un margen y entiende que 350° y 10° están cerca del Norte", () => {
    const norte = CARDINAL_QUESTIONS.find((q) => q.id === "mira-norte")!;
    const sur = CARDINAL_QUESTIONS.find((q) => q.id === "mira-sur")!;
    expect(isChestCorrect(norte, "face:355")).toBe(true);
    expect(isChestCorrect(norte, "face:10")).toBe(true);
    expect(isChestCorrect(norte, `face:${FACE_TOLERANCE + 5}`)).toBe(false);
    expect(isChestCorrect(sur, "face:178")).toBe(true);
    expect(isChestCorrect(sur, "face:0")).toBe(false);
    expect(isChestCorrect(sur, "mal")).toBe(false);
    expect(chestCorrectText(sur)).toContain("Sur");
  });
  it("las de la Cruz del Sur reutilizan las de la 2.0 (ordenar, estrella y horizonte)", () => {
    const orden = CHEST_QUESTIONS.find((q) => q.id === "cruz-dificil-ordenar-tres")!;
    expect(isChestCorrect(orden, "a,b,c")).toBe(true);
    expect(isChestCorrect(orden, "b,a,c")).toBe(false);
    const estrella = CHEST_QUESTIONS.find((q) => q.id === "cruz-facil-toca-acrux")!;
    expect(isChestCorrect(estrella, "acrux")).toBe(true);
  });
  it("el banco no repite hasta agotar el tema", () => {
    const bank = new ChestQuestionBank(createRng(3));
    const ids = new Set<string>();
    for (let i = 0; i < SOL_QUESTIONS.length; i++) ids.add(bank.draw("sol").id);
    expect(ids.size).toBe(SOL_QUESTIONS.length);
    expect(bank.draw("sol")).toBeTruthy();
  });
});
