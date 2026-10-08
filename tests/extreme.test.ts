import { describe, expect, it } from "vitest";
import { Battle } from "../src/core/battle/Battle";
import { DEFENSES } from "../src/core/defenses";
import { defaultPlacement } from "../src/core/placement";
import { extremeConfig, MAX_EASE, nextEase } from "../src/core/extreme";
import { Game } from "../src/core/Game";
import { runUntil, solveAllChallenges } from "./helpers";

function fight(ease: number, rescue: "wrong" | "right") {
  const towers = DEFENSES.map((d) => d.id);
  const b = new Battle(extremeConfig(ease), { towers, placement: defaultPlacement(towers) });
  runUntil(b, () => {
    for (const e of b.drainEvents()) if (e.type === "rescue-triggered") { rescue === "wrong" ? b.applyFailedRescue() : b.applyHero(); b.finishRescue(); }
    return b.isOver;
  }, 1500);
  return b;
}

describe("modo extremo", () => {
  it("es más difícil que Avanzado", () => {
    const x = extremeConfig(0);
    expect(x.totalEnemies).toBeGreaterThan(20);
    expect(x.enemySpeedMultiplier).toBeGreaterThan(1);
    expect(x.baseHealth).toBeLessThan(100 + 1);
  });
  it("es difícil: con todas las preguntas de emergencia falladas se pierde", () => {
    expect(fight(0, "wrong").phase).toBe("defeat");
  });
  it("pero no imposible: acertando las emergencias se gana", () => {
    expect(fight(0, "right").phase).toBe("victory");
  });
  it("cada derrota lo suaviza y ganar lo reinicia", () => {
    expect(nextEase(0, false)).toBe(1);
    expect(nextEase(MAX_EASE, false)).toBe(MAX_EASE);
    expect(nextEase(3, true)).toBe(0);
    expect(extremeConfig(2).baseHealth).toBeGreaterThan(extremeConfig(0).baseHealth);
    expect(extremeConfig(2).enemySpeedMultiplier).toBeLessThan(extremeConfig(0).enemySpeedMultiplier);
    expect(extremeConfig(2).totalEnemies).toBeLessThan(extremeConfig(0).totalEnemies);
  });
  it("con la suavidad máxima se gana incluso fallando las emergencias", () => {
    expect(fight(MAX_EASE, "wrong").phase).toBe("victory");
  });
  it("el juego guarda la suavidad al perder y la reinicia al ganar", () => {
    const g = new Game(1);
    const seen: number[] = [];
    g.onExtremeEase = (e) => seen.push(e);
    g.start();
    g.selectDifficulty("extreme");
    solveAllChallenges(g);
    g.startBattle();
    const b = g.battle!;
    runUntil(b, () => { for (const e of b.drainEvents()) if (e.type === "rescue-triggered") { b.applyFailedRescue(); b.finishRescue(); } return b.isOver; }, 1500);
    g.goToFinal();
    expect(b.phase).toBe("defeat");
    expect(seen).toEqual([1]);
    expect(g.extremeEase).toBe(1);
    expect(g.summary().levelMessage).toContain("Extremo");
  });
});

import { nightConfig, NIGHTS } from "../src/core/campaign/nights";
import { MAPS } from "../src/core/battle/maps";
import { Campaign } from "../src/core/campaign/Campaign";

describe("modo extremo en la campaña", () => {
  const wn = [2, 4, 5, 7, 7];
  function night(n: number, ease: number) {
    const towers = DEFENSES.slice(0, wn[n - 1]).map((d) => d.id);
    const upgrades = Object.fromEntries(towers.map((t) => [t, 2]));
    const b = new Battle(nightConfig(n, extremeConfig(ease)), { towers, placement: defaultPlacement(towers), map: MAPS[NIGHTS[n - 1].map], upgrades });
    runUntil(b, () => { for (const e of b.drainEvents()) if (e.type === "rescue-triggered") { b.applyHero(); b.finishRescue(); } return b.isOver; }, 1500);
    return b;
  }
  it("cada noche se puede ganar acertando las emergencias, a lo sumo tras dos derrotas", () => {
    for (let n = 1; n <= 5; n++) expect(night(n, 2).phase, `noche ${n}`).toBe("victory");
  });
  it("cada derrota de una noche suaviza la siguiente y ganar la reinicia", () => {
    const c = Campaign.create("Ana", "extreme");
    const report = (victory: boolean) => ({ victory, stopped: 0, rescuesCorrect: 0, rescuesTotal: 0, baseHealth: 0, maxBaseHealth: 100, collected: 0 }) as any;
    c.finishBattle(report(false));
    expect(c.data.ease).toBe(1);
    c.finishBattle(report(false));
    expect(c.data.ease).toBe(2);
    c.finishBattle(report(true));
    expect(c.data.ease).toBe(0);
  });
});
