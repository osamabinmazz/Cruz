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

import { ALL_CHALLENGES, EXTRA_CHALLENGES } from "../src/core/challenges";
import { ALL_DEFENSES, EXTRA_DEFENSES } from "../src/core/defenses";
import { Battle } from "../src/core/battle/Battle";
import { MAPS } from "../src/core/battle/maps";
import { runUntil } from "./helpers";

describe("desafíos y armas nuevas de la campaña", () => {
  it("hay 10 desafíos y 10 armas; cada desafío nuevo gana su arma", () => {
    expect(ALL_CHALLENGES).toHaveLength(10);
    expect(ALL_DEFENSES).toHaveLength(10);
    expect(EXTRA_CHALLENGES.map((c) => c.defense)).toEqual(EXTRA_DEFENSES.map((d) => d.id));
    expect(new Set(ALL_CHALLENGES.map((c) => c.defense)).size).toBe(10);
    for (const c of EXTRA_CHALLENGES) {
      expect(c.options.some((o) => o.id === c.correct[0])).toBe(true);
      expect(c.feedback.wrongExplanatory.default).toBeTruthy();
    }
  });

  function battleWith(id: "regla-luz" | "faro-lactea" | "bumeran-plata") {
    const b = new Battle(difficultyConfigs.advanced, { towers: [id], placement: { [id]: 0 }, map: MAPS.bosque });
    runUntil(b, () => b.phase === "wave" && b.activeEnemies().length >= 3, 120);
    return b;
  }

  it("la Regla de Luz golpea a varios zombis en línea con un solo disparo", () => {
    const b = battleWith("regla-luz");
    const t = b.towers[0];
    // Tres zombis en el tramo recto del camino, alineados con el arma.
    const trio = b.activeEnemies().slice(0, 3);
    trio.forEach((e, i) => {
      e.route = 0;
      e.distance = 320 + i * 30;
      e.speed = 0;
      e.health = e.maxHealth = 1000;
    });
    const p0 = b.enemyPosition(trio[0]);
    t.x = p0.x - 120;
    t.y = p0.y + 22;
    const [a, c, d] = trio;
    const before = trio.map((e) => e.health);
    t.cooldown = 0;
    b.update(0.05);
    const hurt = [a, c, d].filter((e, i) => e.health < before[i] || e.state === "gone").length;
    expect(hurt).toBeGreaterThanOrEqual(2);
  });

  it("el Faro de la Vía Láctea frena a todos los zombis de la zona", () => {
    const b = battleWith("faro-lactea");
    const t = b.towers[0];
    for (const e of b.activeEnemies()) {
      const p = b.enemyPosition(e);
      if (Math.hypot(p.x - t.x, p.y - t.y) > t.range) continue;
      e.slowTimer = 0;
    }
    t.cooldown = 0;
    b.update(0.05);
    const inRange = b.activeEnemies().filter((e) => Math.hypot(b.enemyPosition(e).x - t.x, b.enemyPosition(e).y - t.y) <= t.range);
    if (inRange.length) expect(inRange.every((e) => e.slowTimer > 0)).toBe(true);
  });

  it("el Bumerán de Plata golpea dos veces: ida y regreso", () => {
    const b = battleWith("bumeran-plata");
    const t = b.towers[0];
    const target = b.activeEnemies()[0];
    target.health = 1000;
    target.maxHealth = 1000;
    target.speed = 0;
    const p = b.enemyPosition(target);
    t.x = p.x - 60;
    t.y = p.y + 10;
    t.cooldown = 0;
    const start = target.health;
    runUntil(b, () => target.health < start, 5);
    const first = start - target.health;
    t.cooldown = 99;
    runUntil(b, () => target.health < start - first, 3);
    expect(start - target.health).toBeGreaterThan(first);
  });
});
