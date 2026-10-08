import { describe, expect, it } from "vitest";
import { CHALLENGES } from "../src/core/challenges";
import { ChallengeManager } from "../src/core/ChallengeManager";
import { difficultyConfigs } from "../src/core/difficulty";
import { CROSS, SOUTH_POINT } from "../src/core/geometry";
import { pointAnswer, traceAnswer } from "../src/core/freeform";

function managerAt(number: number) {
  const cm = new ChallengeManager(difficultyConfigs.advanced);
  while (cm.current.number < number) {
    cm.submit([...cm.current.correct]);
    cm.next();
  }
  return cm;
}

describe("desafíos activos", () => {
  it("el desafío 3 se resuelve trazando el eje mayor, en cualquier sentido y con margen", () => {
    const near = (p: { x: number; y: number }, dx: number, dy: number) => ({ x: p.x + dx, y: p.y + dy });
    expect(managerAt(3).submit([traceAnswer(near(CROSS.gacrux, 10, -8), near(CROSS.acrux, -12, 9))]).correct).toBe(true);
    expect(managerAt(3).submit([traceAnswer(CROSS.acrux, CROSS.gacrux)]).correct).toBe(true);
  });
  it("trazar el palo corto, una línea lejos de las estrellas o elegir una opción es incorrecto", () => {
    expect(managerAt(3).submit([traceAnswer(CROSS.mimosa, CROSS.delta)]).correct).toBe(false);
    expect(managerAt(3).submit([traceAnswer({ x: 20, y: 20 }, { x: 60, y: 200 })]).correct).toBe(false);
    expect(managerAt(3).submit(["linea-c"]).correct).toBe(false);
  });
  it("un error en el trazo explica y muestra la respuesta correcta", () => {
    const r = managerAt(3).submit([traceAnswer(CROSS.mimosa, CROSS.delta)]);
    expect(r.feedback.length).toBeGreaterThan(10);
    expect(r.correctText).toContain("Gacrux");
  });
  it("el desafío 7 se resuelve tocando bajo el extremo de la guía, con margen", () => {
    expect(managerAt(7).submit([pointAnswer(SOUTH_POINT.x + 15)]).correct).toBe(true);
    expect(managerAt(7).submit([pointAnswer(SOUTH_POINT.x - 15)]).correct).toBe(true);
  });
  it("tocar bajo Acrux, bajo Gacrux o lejos es incorrecto", () => {
    for (const x of [CROSS.acrux.x, CROSS.gacrux.x, 340, SOUTH_POINT.x + 40]) expect(managerAt(7).submit([pointAnswer(x)]).correct, String(x)).toBe(false);
  });
  it("solo los desafíos 3 y 7 son de respuesta libre", () => {
    expect(CHALLENGES.filter((c) => c.interaction).map((c) => c.number)).toEqual([3, 7]);
  });
});

import { isRescueCorrect, questionById, rescueCorrectText } from "../src/core/rescue/questions";

describe("preguntas de emergencia activas", () => {
  it("ordenar los pasos: solo vale el orden exacto", () => {
    const q = questionById("dificil-ordenar-tres");
    expect(isRescueCorrect(q, "a,b,c")).toBe(true);
    expect(isRescueCorrect(q, "b,a,c")).toBe(false);
    expect(rescueCorrectText(q)).toMatch(/^1\. .*2\. .*3\. /);
  });
  it("tocar la estrella correcta", () => {
    const q = questionById("facil-toca-acrux");
    expect(isRescueCorrect(q, "acrux")).toBe(true);
    expect(isRescueCorrect(q, "gacrux")).toBe(false);
  });
  it("marcar el horizonte acepta un margen y rechaza lo lejano", () => {
    const q = questionById("dificil-marcar-horizonte");
    expect(isRescueCorrect(q, pointAnswer(SOUTH_POINT.x + 12))).toBe(true);
    expect(isRescueCorrect(q, pointAnswer(SOUTH_POINT.x + 60))).toBe(false);
  });
});

import { Game } from "../src/core/Game";

describe("modo práctica", () => {
  it("se puede reintentar, equivocarse no cuesta el arma y al terminar vuelve al menú", () => {
    const g = new Game(1);
    g.startPractice();
    const cm = g.challenges!;
    expect(g.screen).toBe("challenge");
    const wrong = cm.current.options.find((o) => !cm.current.correct.includes(o.id))!.id;
    const r = g.submitAnswer([wrong]);
    expect(r.correct).toBe(false);
    expect(r.lostDefense).toBeUndefined();
    expect(cm.solved).toBe(false);
    expect(cm.lostDefenses).toHaveLength(0);
    expect(g.submitAnswer([...cm.current.correct]).correct).toBe(true);
    for (let i = 1; i < 7; i++) {
      g.nextChallenge();
      if (i === 3) cm.skip();
      else g.submitAnswer([...cm.current.correct]);
    }
    expect(cm.isComplete).toBe(true);
    g.nextChallenge();
    expect(g.screen).toBe("menu");
    expect(g.snapshot()).toBeNull();
  });
});
