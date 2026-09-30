import { describe, expect, it } from "vitest";
import { Battle } from "../src/core/battle/Battle";
import { difficultyConfigs } from "../src/core/difficulty";
import { runUntil } from "./helpers";

const beginner = difficultyConfigs.beginner;
const advanced = difficultyConfigs.advanced;

describe("configuración centralizada de dificultad", () => {
  it("usa los valores iniciales recomendados", () => {
    expect(beginner).toMatchObject({
      hintsAvailableFromStart: true,
      hintsAfterWrongAttempts: 0,
      removeWrongOption: true,
      guidedHighlights: true,
      introductoryDemonstration: true,
      enemySpeedMultiplier: 0.8,
      enemyHealthMultiplier: 0.8,
      towerReloadMultiplier: 0.85,
      baseHealth: 150,
      totalEnemies: 18,
      wavePauseSeconds: 8
    });
    expect(advanced).toMatchObject({
      hintsAvailableFromStart: false,
      hintsAfterWrongAttempts: 2,
      removeWrongOption: false,
      guidedHighlights: false,
      introductoryDemonstration: false,
      enemySpeedMultiplier: 1,
      enemyHealthMultiplier: 1,
      towerReloadMultiplier: 1,
      baseHealth: 100,
      totalEnemies: 24,
      wavePauseSeconds: 4
    });
  });

  it("las oleadas suman la cantidad de zombis declarada y respetan los rangos", () => {
    for (const cfg of [beginner, advanced]) {
      expect(cfg.waves).toHaveLength(3);
      expect(cfg.waves.flat()).toHaveLength(cfg.totalEnemies);
    }
    expect(beginner.totalEnemies).toBeGreaterThanOrEqual(16);
    expect(beginner.totalEnemies).toBeLessThanOrEqual(20);
    expect(advanced.totalEnemies).toBeGreaterThanOrEqual(22);
    expect(advanced.totalEnemies).toBeLessThanOrEqual(26);
  });

  it("en Avanzado la tercera oleada combina todos los tipos y termina con el zombi con mochila", () => {
    const third = advanced.waves[2];
    expect(new Set(third)).toEqual(new Set(["comun", "veloz", "resistente", "niebla", "mochila"]));
    expect(third[third.length - 1]).toBe("mochila");
    expect(advanced.backpackHealthBonus).toBeGreaterThan(1);
  });

  it("Principiante da avisos antes de cada oleada y pausas más largas", () => {
    expect(beginner.waveWarnings).toBe(true);
    expect(beginner.wavePauseSeconds).toBeGreaterThan(advanced.wavePauseSeconds);
    const b = new Battle(beginner);
    const warnings: number[] = [];
    runUntil(b, () => {
      for (const e of b.drainEvents()) if (e.type === "wave-warning") warnings.push(e.wave);
      return b.isOver;
    });
    expect(warnings).toEqual([1, 2, 3]);
  });
});

describe("prueba 8: Principiante tiene zombis más lentos y débiles", () => {
  it("aplica los multiplicadores de velocidad, resistencia y recarga", () => {
    const b = new Battle(beginner);
    const a = new Battle(advanced);
    runUntil(b, () => b.activeEnemies().length > 0);
    runUntil(a, () => a.activeEnemies().length > 0);
    const eb = b.activeEnemies()[0];
    const ea = a.activeEnemies()[0];
    expect(eb.kind).toBe(ea.kind);
    expect(eb.speed).toBeCloseTo(ea.speed * 0.8);
    expect(eb.maxHealth).toBeCloseTo(ea.maxHealth * 0.8, 0);
    for (let i = 0; i < b.towers.length; i++) expect(b.towers[i].reload).toBeCloseTo(a.towers[i].reload * 0.85);
    expect(b.maxBaseHealth).toBeGreaterThan(a.maxBaseHealth);
  });
});

describe("pruebas 9: equilibrio de las batallas con las siete defensas", () => {
  function simulate(cfg: typeof beginner) {
    const b = new Battle(cfg);
    // Peor caso: se fallan todas las preguntas de rescate.
    runUntil(b, () => {
      for (const e of b.drainEvents()) {
        if (e.type === "rescue-triggered") {
          b.applyFailedRescue();
          b.finishRescue();
        }
      }
      return b.isOver;
    }, 1200);
    return b;
  }

  it("Principiante: la victoria es muy probable y el campamento conserva casi toda su energía", () => {
    const b = simulate(beginner);
    expect(b.phase).toBe("victory");
    expect(b.baseHealth / b.maxBaseHealth).toBeGreaterThanOrEqual(0.8);
  });

  it("Avanzado: es más intensa, pero sigue siendo ganable incluso sin rescates", () => {
    const b = simulate(advanced);
    const easy = simulate(beginner);
    expect(b.phase).toBe("victory");
    expect(b.baseHealth).toBeGreaterThan(0);
    expect(b.stats.reachedCamp).toBeGreaterThan(easy.stats.reachedCamp);
    expect(b.baseHealth / b.maxBaseHealth).toBeLessThan(easy.baseHealth / easy.maxBaseHealth);
  });

  it("Avanzado: el último zombi con mochila tiene resistencia adicional", () => {
    const b = new Battle(advanced);
    runUntil(b, () => {
      for (const e of b.drainEvents()) if (e.type === "rescue-triggered") (b.applyFailedRescue(), b.finishRescue());
      return b.enemies.some((e) => e.kind === "mochila");
    }, 1200);
    const m = b.enemies.find((e) => e.kind === "mochila")!;
    expect(m.maxHealth).toBeGreaterThan(484);
  });
});
