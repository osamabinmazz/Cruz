import { describe, expect, it } from "vitest";
import { pendingReview, pickReview, pickTopic, topicWeights } from "../src/core/adaptive";
import { createRng } from "../src/core/rng";
import type { Answer3 } from "../src/core/students3d";

const a = (topic: Answer3["topic"], correct: boolean, qid?: string): Answer3 => ({ topic, correct, usedHint: false, qid });

describe("preguntas adaptativas", () => {
  it("con pocas respuestas todos los temas pesan igual", () => {
    const w = topicWeights([a("sol", false)], ["sol", "cruz"]);
    expect(w).toEqual({ sol: 1, cruz: 1 });
  });
  it("el tema donde falla pesa más", () => {
    const answers = [a("sol", false), a("sol", false), a("sol", true), a("cruz", true), a("cruz", true), a("cruz", true)];
    const w = topicWeights(answers, ["sol", "cruz"]);
    expect(w.sol).toBeGreaterThan(w.cruz);
    expect(w.cruz).toBe(1);
  });
  it("sale más seguido el tema flojo, sin dejar de salir los otros", () => {
    const answers = [a("sol", false), a("sol", false), a("sol", false), a("cruz", true), a("cruz", true), a("cruz", true)];
    const rng = createRng(11);
    const count = { sol: 0, cruz: 0 };
    for (let i = 0; i < 600; i++) count[pickTopic(answers, ["sol", "cruz"], rng) as "sol" | "cruz"]++;
    expect(count.sol).toBeGreaterThan(count.cruz * 2);
    expect(count.cruz).toBeGreaterThan(50);
  });
  it("las falladas vuelven hasta que las acierta", () => {
    const answers = [a("sol", false, "x"), a("sol", false, "y"), a("sol", true, "x")];
    expect(pendingReview(answers)).toEqual(["y"]);
    expect(pickReview(answers, () => 0.1)).toBe("y");
    expect(pickReview(answers, () => 0.9)).toBeNull();
    expect(pickReview([a("sol", true, "x")], () => 0)).toBeNull();
  });
});
