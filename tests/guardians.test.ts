import { describe, expect, it } from "vitest";
import { Battle } from "../src/core/battle/Battle";
import { ENEMY_STATS, pointAt } from "../src/core/battle/data";
import { GUARDIANS_PER_POST, RALLY_RADIUS, guardianStats } from "../src/core/battle/guardians";
import { MAPS } from "../src/core/battle/maps";
import { difficultyConfigs, type EnemyKind } from "../src/core/difficulty";
import { defaultPlacement, isValidPlacement } from "../src/core/placement";
import { runUntil } from "./helpers";

const map = MAPS.bosque;

/** Batalla de una sola oleada con un único zombi, sin armas y con un puesto de guardianes. */
function arena(kind: EnemyKind, opts: { level?: number; rng?: () => number; posts?: number } = {}) {
  const config = { ...difficultyConfigs.beginner, waves: [[kind]], totalEnemies: 1, enemyHealthMultiplier: 1, enemySpeedMultiplier: 1 };
  const ids = (["puesto-1", "puesto-2", "puesto-3"] as const).slice(0, opts.posts ?? 1);
  const posts = ids.map((id) => ({ id, level: opts.level ?? 1 }));
  const b = new Battle(config, { towers: [], posts, map, rng: opts.rng });
  runUntil(b, () => b.phase === "wave");
  b.update(0.05); // aparece el zombi
  return b;
}

const enemy = (b: Battle) => b.enemies[0];

describe("guardianes: puestos", () => {
  it("cada puesto tiene dos estrellitas paradas sobre el camino, cerca del puesto", () => {
    const b = arena("comun", { posts: 2 });
    expect(b.posts).toHaveLength(2);
    for (const post of b.posts) {
      expect(post.guardians).toHaveLength(GUARDIANS_PER_POST);
      for (const g of post.guardians) {
        const p = pointAt(g.distance, map.path);
        expect(Math.hypot(p.x - post.x, p.y - post.y)).toBeLessThanOrEqual(RALLY_RADIUS);
        expect(g.state).toBe("alive");
      }
    }
  });

  it("los puestos ocupan lugares del mapa, sin repetir los de las armas", () => {
    const towers = ["torre-brillo", "cuarteto-luz"] as const;
    const placement = defaultPlacement([...towers, "puesto-1", "puesto-2"]);
    expect(isValidPlacement(placement, [...towers, "puesto-1", "puesto-2"])).toBe(true);
    expect(new Set(Object.values(placement)).size).toBe(4);
    const b = new Battle(difficultyConfigs.beginner, { towers: [...towers], posts: [{ id: "puesto-1", level: 1 }], placement, map });
    expect(b.posts[0].x).toBe(map.slots[placement["puesto-1"]!].x);
  });

  it("subir de nivel da más vida y más daño", () => {
    const l1 = guardianStats(1);
    const l3 = guardianStats(3);
    expect(l3.health).toBeGreaterThan(l1.health);
    expect(l3.damage).toBeGreaterThan(l1.damage);
    expect(guardianStats(9)).toEqual(l3);
  });
});

describe("guardianes: combate", () => {
  it("un zombi que llega a un guardián se detiene y no pasa mientras pelean", () => {
    const b = arena("comun");
    expect(runUntil(b, () => enemy(b).blockedBy !== null, 120)).toBe(true);
    const e = enemy(b);
    const g = b.guardians.find((x) => x.id === e.blockedBy)!;
    expect(g.blocking).toBe(e.id);
    const stopped = e.distance;
    b.update(0.3);
    expect(e.distance).toBe(stopped);
    expect(e.distance).toBeLessThan(g.distance);
  });

  it("un guardián de nivel 1 derrota a un zombi común y cuenta como derrotado por guardianes", () => {
    const b = arena("comun");
    expect(runUntil(b, () => enemy(b).state === "gone", 120)).toBe(true);
    expect(enemy(b).removedBy).toBe("guardian");
    expect(b.stats.defeatedByGuardians).toBe(1);
    expect(b.totalDefeated).toBe(1);
    expect(b.guardians.every((g) => g.blocking === null)).toBe(true);
  });

  it("un zombi muy fuerte derriba al guardián y sigue su camino", () => {
    const b = arena("gigante");
    expect(runUntil(b, () => b.drainEvents().some((e) => e.type === "guardian-down"), 120)).toBe(true);
    const down = b.guardians.filter((g) => g.state === "down");
    expect(down.length).toBeGreaterThanOrEqual(1);
    expect(down.every((g) => g.blocking === null)).toBe(true);
  });

  it("el gigante, con los dos guardianes caídos, llega hasta el campamento", () => {
    const b = arena("gigante");
    runUntil(b, () => b.guardians.every((g) => g.state === "down"), 200);
    expect(b.guardians.every((g) => g.state === "down")).toBe(true);
    runUntil(b, () => b.isOver || b.rescue.rescueTriggered, 300);
    expect(b.rescue.rescueTriggered).toBe(true);
  });

  it("solo se puede volver a convocar a una estrellita caída", () => {
    const b = arena("gigante");
    expect(b.summonGuardian("puesto-1", 0)).toBe(false);
    runUntil(b, () => b.guardians.some((g) => g.state === "down"), 200);
    const index = b.posts[0].guardians.findIndex((g) => g.state === "down");
    expect(b.summonGuardian("puesto-1", index)).toBe(true);
    const g = b.posts[0].guardians[index];
    expect(g.state).toBe("alive");
    expect(g.health).toBe(g.maxHealth);
    expect(b.summonGuardian("puesto-1", index)).toBe(false);
    expect(b.summonGuardian("puesto-3", 0)).toBe(false);
  });

  it("el zombi veloz se escabulle cuando el azar lo permite y pelea cuando no", () => {
    const dodges = arena("veloz", { rng: () => 0 });
    runUntil(dodges, () => dodges.rescue.rescueTriggered || dodges.isOver, 200);
    expect(dodges.rescue.rescueTriggered).toBe(true);
    expect(dodges.stats.defeatedByGuardians).toBe(0);

    const fights = arena("veloz", { rng: () => 0.99 });
    expect(runUntil(fights, () => enemy(fights).blockedBy !== null, 200)).toBe(true);
  });

  it("un zombi derrotado deja libre al guardián, que puede pelear con el siguiente", () => {
    const config = { ...difficultyConfigs.beginner, waves: [["comun", "comun"] as EnemyKind[]], totalEnemies: 2, spawnIntervalSeconds: 2 };
    const b = new Battle(config, { towers: [], posts: [{ id: "puesto-1", level: 3 }], map });
    runUntil(b, () => b.isOver || b.rescue.rescueTriggered, 400);
    expect(b.stats.defeatedByGuardians).toBe(2);
  });
});

describe("guardianes: punto de reunión", () => {
  it("un toque en el camino cercano mueve el punto de reunión y las estrellitas van hacia allá", () => {
    const b = arena("comun");
    const post = b.posts[0];
    const before = post.rally;
    const target = pointAt(before + 60, map.path);
    expect(b.setRally(post.id, target)).toBe(true);
    expect(post.rally).not.toBe(before);
    runUntil(b, () => b.guardians.every((g) => Math.abs(g.distance - g.target) < 1), 20);
    expect(b.guardians.every((g) => Math.abs(g.distance - g.target) < 1)).toBe(true);
  });

  it("un toque lejos del camino o fuera del alcance del puesto no cambia nada", () => {
    const b = arena("comun");
    const post = b.posts[0];
    const before = post.rally;
    expect(b.setRally(post.id, { x: post.x + 400, y: post.y + 400 })).toBe(false);
    expect(b.setRally(post.id, { x: 900, y: 500 })).toBe(false);
    expect(post.rally).toBe(before);
    expect(b.setRally("puesto-3", { x: 0, y: 0 })).toBe(false);
  });
});

describe("guardianes en un mapa con bifurcación", () => {
  it("un guardián sobre el tramo compartido frena a los zombis de las dos rutas", () => {
    const config = { ...difficultyConfigs.beginner, waves: [["gigante", "gigante"] as EnemyKind[]], totalEnemies: 2, spawnIntervalSeconds: 1, enemyHealthMultiplier: 1 };
    const b = new Battle(config, { towers: [], posts: [{ id: "puesto-1", level: 1 }], map: MAPS.rio });
    for (const g of b.guardians) {
      g.route = 0;
      g.distance = 150;
      g.target = 150;
    }
    runUntil(b, () => b.enemies.length >= 2, 30);
    expect(b.enemies.map((e) => e.route)).toEqual([0, 1]);
    runUntil(b, () => b.enemies.every((e) => e.blockedBy !== null), 60);
    expect(b.enemies.every((e) => e.blockedBy !== null)).toBe(true);
    const ids = b.enemies.map((e) => e.blockedBy);
    expect(new Set(ids).size).toBe(2);
  });

  it("un guardián sobre una sola ruta no frena a los zombis de la otra", () => {
    const config = { ...difficultyConfigs.beginner, waves: [["comun", "comun"] as EnemyKind[]], totalEnemies: 2, spawnIntervalSeconds: 1, enemyHealthMultiplier: 1 };
    const b = new Battle(config, { towers: [], posts: [{ id: "puesto-1", level: 1 }], map: MAPS.rio });
    // Sobre la parte de la ruta 1 que se separa de la 0 (el canal de abajo).
    const rally = { route: 1, distance: 520 };
    for (const g of b.guardians) {
      g.route = rally.route;
      g.distance = rally.distance;
      g.target = rally.distance;
    }
    runUntil(b, () => b.enemies.length >= 2 && b.enemies[1].blockedBy !== null, 90);
    expect(b.enemies[1].blockedBy).not.toBeNull();
    expect(b.enemies[0].blockedBy).toBeNull();
  });

  it("al mover el punto de reunión se puede pasar de una ruta a la otra", () => {
    const b = new Battle(difficultyConfigs.beginner, { towers: [], posts: [{ id: "puesto-1", level: 1 }], map: MAPS.rio });
    const post = b.posts[0];
    const other = post.rallyRoute === 0 ? 1 : 0;
    let moved = false;
    for (let d = 0; d < b.routeLengths[other] && !moved; d += 8) {
      const p = pointAt(d, MAPS.rio.routes[other]);
      if (Math.hypot(p.x - post.x, p.y - post.y) < 150 && b.setRally(post.id, p) && post.rallyRoute === other) moved = true;
    }
    expect(moved).toBe(true);
  });
});

describe("zombis nuevos", () => {
  it("el saltador da saltos largos hacia adelante y avisa", () => {
    const config = { ...difficultyConfigs.beginner, waves: [["saltador"] as EnemyKind[]], totalEnemies: 1, enemyHealthMultiplier: 1, enemySpeedMultiplier: 1 };
    const b = new Battle(config, { towers: [], map });
    runUntil(b, () => b.phase === "wave");
    b.update(0.05);
    let jumps = 0;
    let longest = 0;
    let last = enemy(b).distance;
    runUntil(b, () => {
      for (const ev of b.drainEvents()) if (ev.type === "enemy-jump") jumps++;
      longest = Math.max(longest, enemy(b).distance - last);
      last = enemy(b).distance;
      return jumps >= 2;
    }, 30);
    expect(jumps).toBeGreaterThanOrEqual(2);
    expect(longest).toBeGreaterThan(60);
  });

  it("el doble se divide en dos zombis chiquitos al caer, pero no con la Bomba Estelar", () => {
    const config = { ...difficultyConfigs.beginner, waves: [["doble"] as EnemyKind[]], totalEnemies: 1 };
    const b = new Battle(config, { towers: [], posts: [{ id: "puesto-1", level: 3 }], map });
    runUntil(b, () => b.phase === "wave");
    b.update(0.05);
    runUntil(b, () => b.enemies.some((e) => e.kind === "mini"), 300);
    const minis = b.enemies.filter((e) => e.kind === "mini");
    expect(minis).toHaveLength(2);
    expect(minis.every((m) => m.state === "walking" && m.health > 0)).toBe(true);

    const bomb = new Battle({ ...config, waves: [["doble", "doble"] as EnemyKind[]], totalEnemies: 2, spawnIntervalSeconds: 0.5 }, { towers: [], map });
    runUntil(bomb, () => bomb.rescue.rescueTriggered, 400);
    bomb.applyBomb();
    bomb.finishRescue();
    expect(bomb.enemies.some((e) => e.kind === "mini")).toBe(false);
  });

  it("el gigante tiene mucha más vida que cualquier otro zombi", () => {
    for (const k of ["comun", "veloz", "resistente", "niebla", "mochila", "saltador", "doble"] as const) {
      expect(ENEMY_STATS.gigante.health).toBeGreaterThan(ENEMY_STATS[k].health);
    }
    expect(ENEMY_STATS.mini.health).toBeLessThan(ENEMY_STATS.comun.health);
  });
});
