import { describe, expect, it } from "vitest";
import { Battle, type ProjectileKind } from "../src/core/battle/Battle";
import { DEFENSES, type DefenseId } from "../src/core/defenses";
import { difficultyConfigs } from "../src/core/difficulty";
import { weaponIcon } from "../src/ui/weaponIcons";
import { runUntil } from "./helpers";

const EXPECTED: Partial<Record<DefenseId, ProjectileKind>> = {
  "torre-brillo": "cannonball",
  "cuarteto-luz": "multi",
  "lanza-eje": "bolt",
  gemelas: "twin",
  plomada: "rock",
  "brujula-austral": "ray"
};

describe("armas de las defensas", () => {
  it("cada arma lanza su propio tipo de disparo y se orienta hacia el objetivo", () => {
    for (const [id, kind] of Object.entries(EXPECTED) as [DefenseId, ProjectileKind][]) {
      const b = new Battle(difficultyConfigs.advanced, { towers: [id] });
      const fired = runUntil(b, () => {
        for (const e of b.drainEvents()) if (e.type === "rescue-triggered") (b.applyFailedRescue(), b.finishRescue());
        return b.projectiles.length > 0;
      }, 300);
      expect(fired, id).toBe(true);
      expect(b.projectiles[0].kind).toBe(kind);
      const t = b.towers[0];
      const target = b.enemies.find((e) => e.id === b.projectiles[0].targetId)!;
      const p = b.enemyPosition(target);
      expect(Math.abs(Math.cos(t.aim) - Math.sign(p.x - t.x) * Math.abs(Math.cos(t.aim)))).toBeLessThan(1e-9);
    }
  });

  it("el rayo que frena registra a los zombis alcanzados", () => {
    const b = new Battle(difficultyConfigs.advanced, { towers: ["guia-punteada"] });
    runUntil(b, () => {
      for (const e of b.drainEvents()) if (e.type === "rescue-triggered") (b.applyFailedRescue(), b.finishRescue());
      return b.towers[0].lastTargets.length > 0;
    }, 300);
    expect(b.towers[0].lastTargets.length).toBeGreaterThan(0);
    expect(b.projectiles).toHaveLength(0);
  });

  it("las siete defensas tienen un ícono de arma distinto", () => {
    const icons = DEFENSES.map((d) => weaponIcon(d.id).replace(/faro-\d+/g, "faro"));
    expect(new Set(icons).size).toBe(7);
    for (const svg of icons) expect(svg.startsWith("<svg")).toBe(true);
  });
});
