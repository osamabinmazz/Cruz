import { describe, expect, it } from "vitest";
import { SKY_HORIZON } from "../src/core/battle/data";
import { STAR_HEROES, heroForRescue } from "../src/core/rescue/heroes";
import { NightSky, SKY_POLE, SKY_TURN_SECONDS } from "../src/ui/nightSky";
import { gameInBattle, pushFirstEnemyToCamp, runUntil } from "./helpers";

describe("héroes estrella", () => {
  it("son las cuatro estrellas principales de la Cruz del Sur, cada una con su color", () => {
    expect(STAR_HEROES.map((h) => h.id)).toEqual(["acrux", "mimosa", "gacrux", "delta"]);
    expect(new Set(STAR_HEROES.map((h) => h.color)).size).toBe(4);
    expect(heroForRescue(4).id).toBe("acrux");
  });

  it("cada rescate con héroe llama a una estrella distinta; la bomba no cambia el turno", () => {
    const game = gameInBattle("advanced", 7);
    const { battle, rescue } = { battle: game.battle!, rescue: game.rescue! };
    const rewards = ["hero", "bomb", "hero"] as const;
    const heroes: string[] = [];
    let wave = 0;
    runUntil(battle, () => {
      if (battle.phase === "wave" && !battle.rescue.rescueTriggered && battle.activeEnemies().length > 0) {
        pushFirstEnemyToCamp(battle);
      }
      for (const e of battle.drainEvents()) {
        if (e.type !== "rescue-triggered") continue;
        rescue.open();
        rescue.chooseReward(rewards[wave]);
        const res = rescue.answer(rescue.question!.correctId);
        if (res.hero) heroes.push(res.hero.name);
        if (rewards[wave] === "bomb") expect(res.hero).toBeUndefined();
        rescue.finish();
        wave++;
      }
      return battle.isOver;
    }, 1500);
    expect(heroes).toEqual(["Acrux", "Mimosa"]);
    expect(rescue.stats.heroesCalled).toEqual(["Acrux", "Mimosa"]);
  });
});

describe("cielo que gira", () => {
  const sky = new NightSky();
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  it("la prolongación del eje mayor desde Acrux siempre apunta al polo sur celeste", () => {
    for (let t = 0; t < SKY_TURN_SECONDS; t += 7) {
      const c = sky.cross(t);
      const axis = { x: c.acrux.x - c.gacrux.x, y: c.acrux.y - c.gacrux.y };
      const toPole = { x: SKY_POLE.x - c.acrux.x, y: SKY_POLE.y - c.acrux.y };
      const cross = axis.x * toPole.y - axis.y * toPole.x;
      const dot = axis.x * toPole.x + axis.y * toPole.y;
      expect(Math.abs(cross) / (Math.hypot(axis.x, axis.y) * Math.hypot(toPole.x, toPole.y))).toBeLessThan(1e-9);
      expect(dot).toBeGreaterThan(0);
    }
  });

  it("gira alrededor del polo sin deformar la cruz y vuelve a su lugar tras una vuelta", () => {
    const a = sky.cross(0);
    const b = sky.cross(40);
    expect(dist(a.acrux, SKY_POLE)).toBeCloseTo(dist(b.acrux, SKY_POLE));
    expect(dist(a.gacrux, a.acrux)).toBeCloseTo(dist(b.gacrux, b.acrux));
    expect(dist(a.acrux, b.acrux)).toBeGreaterThan(10);
    const c = sky.cross(SKY_TURN_SECONDS);
    expect(c.acrux.x).toBeCloseTo(a.acrux.x);
    expect(c.acrux.y).toBeCloseTo(a.acrux.y);
  });

  it("el polo y la marca del Sur quedan por encima del horizonte del mapa", () => {
    expect(SKY_POLE.y).toBeLessThan(SKY_HORIZON);
  });
});
