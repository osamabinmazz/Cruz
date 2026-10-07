import { describe, expect, it } from "vitest";
import { Battle } from "../src/core/battle/Battle";
import { FIELD, SKY_HORIZON, pathLength, pointAt } from "../src/core/battle/data";
import { MAPS, inWater } from "../src/core/battle/maps";
import { Campaign, POST_COSTS, DUST_CORRECT, DUST_NIGHT_LOST, DUST_NIGHT_WON, DUST_REVIEW } from "../src/core/campaign/Campaign";
import { NIGHTS, TOTAL_NIGHTS, newChallengesOf, nightConfig } from "../src/core/campaign/nights";
import { MAX_UPGRADE_LEVEL, nextUpgradeCost, upgradedStats } from "../src/core/campaign/upgrades";
import { CHALLENGES } from "../src/core/challenges";
import { difficultyConfigs, type EnemyKind } from "../src/core/difficulty";
import { DEFENSES } from "../src/core/defenses";
import { defaultPlacement } from "../src/core/placement";
import { runUntil } from "./helpers";

function distToPath(p: { x: number; y: number }, path: { x: number; y: number }[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
  }
  return best;
}

describe("campaña: noches", () => {
  it("son cinco, y entre las cuatro primeras reparten los siete desafíos sin repetirlos", () => {
    expect(NIGHTS).toHaveLength(TOTAL_NIGHTS);
    const ids = NIGHTS.flatMap((n) => n.challengeIndexes);
    expect([...ids].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(NIGHTS[4].challengeIndexes).toEqual([]);
  });

  it("cada noche usa un mapa distinto", () => {
    expect(new Set(NIGHTS.map((n) => n.map)).size).toBe(TOTAL_NIGHTS);
  });

  it("las noches crecen: más oleadas y más zombis hacia el final", () => {
    const cfg = difficultyConfigs.advanced;
    const sizes = NIGHTS.map((n) => nightConfig(n.number, cfg).totalEnemies);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
    expect(nightConfig(1, cfg).waves).toHaveLength(2);
    expect(nightConfig(5, cfg).waves).toHaveLength(4);
  });
});

describe("campaña: mapas", () => {
  const forkMaps = [MAPS.rio, MAPS.colina, MAPS.lago, MAPS.campamento];

  for (const map of Object.values(MAPS)) {
    it(`${map.name} (${map.id}): siete lugares válidos, lejos de las rutas, sin agua y sin superponerse`, () => {
      expect(map.slots).toHaveLength(7);
      for (const s of map.slots) {
        expect(s.x).toBeGreaterThan(20);
        expect(s.x).toBeLessThan(FIELD.width - 20);
        expect(s.y).toBeGreaterThan(SKY_HORIZON + 30);
        expect(s.y).toBeLessThan(FIELD.height - 10);
        for (const route of map.routes) expect(distToPath(s, route)).toBeGreaterThanOrEqual(55);
        expect(inWater(s, map.water, 20)).toBe(false);
      }
      for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) {
        expect(Math.hypot(map.slots[i].x - map.slots[j].x, map.slots[i].y - map.slots[j].y)).toBeGreaterThanOrEqual(60);
      }
    });

    it(`${map.name} (${map.id}): cada ruta entra por la izquierda y termina junto al campamento`, () => {
      for (const route of map.routes) {
        expect(route[0].x).toBeLessThan(0);
        const end = route[route.length - 1];
        expect(Math.hypot(end.x - map.camp.x, end.y - map.camp.y)).toBeLessThan(40);
        for (const p of route) expect(p.y).toBeGreaterThanOrEqual(SKY_HORIZON + 20);
      }
      expect(map.path).toBe(map.routes[0]);
    });

    it(`${map.name} (${map.id}): las armas cubren casi todo el camino`, () => {
      const ranges = DEFENSES.map((d) => d.range);
      let total = 0;
      let covered = 0;
      for (const route of map.routes) {
        for (let d = 0; d < pathLength(route); d += 8) {
          const p = pointAt(d, route);
          total++;
          if (map.slots.some((s, i) => Math.hypot(s.x - p.x, s.y - p.y) <= ranges[i])) covered++;
        }
      }
      expect(covered / total).toBeGreaterThan(0.85);
    });
  }

  it("la noche 1 tiene una sola ruta y desde la noche 2 el camino se bifurca", () => {
    expect(MAPS.bosque.routes).toHaveLength(1);
    expect(MAPS.clasico.routes).toHaveLength(1);
    for (const m of forkMaps) expect(m.routes).toHaveLength(2);
  });

  for (const map of forkMaps) {
    it(`${map.name}: las dos rutas salen juntas, vuelven a unirse y tienen largos distintos`, () => {
      const [a, b] = map.routes;
      expect(a[0]).toEqual(b[0]);
      expect(a[a.length - 1]).toEqual(b[b.length - 1]);
      expect(Math.abs(pathLength(a) - pathLength(b))).toBeGreaterThan(40);
      // Se separan de verdad en algún punto.
      let apart = 0;
      for (let d = 0; d < pathLength(a); d += 10) {
        const p = pointAt(d, a);
        if (distToPath(p, b) > 60) apart++;
      }
      expect(apart).toBeGreaterThan(10);
    });
  }

  it("las esquinas son curvas suaves: ningún giro brusco entre tramos consecutivos", () => {
    for (const map of Object.values(MAPS)) {
      if (map.id === "clasico") continue;
      for (const route of map.routes) {
        for (let i = 2; i < route.length; i++) {
          const a1 = Math.atan2(route[i - 1].y - route[i - 2].y, route[i - 1].x - route[i - 2].x);
          const a2 = Math.atan2(route[i].y - route[i - 1].y, route[i].x - route[i - 1].x);
          let turn = Math.abs(a2 - a1);
          if (turn > Math.PI) turn = 2 * Math.PI - turn;
          expect(turn).toBeLessThan(0.45);
        }
      }
    }
  });

  it("la batalla usa las rutas y los lugares del mapa elegido, y los zombis se reparten entre las rutas", () => {
    const map = MAPS.rio;
    const towers = DEFENSES.slice(0, 2).map((d) => d.id);
    const config = { ...difficultyConfigs.beginner, waves: [["comun", "comun", "comun", "comun"] as EnemyKind[]], totalEnemies: 4 };
    const b = new Battle(config, { towers, placement: defaultPlacement(towers), map });
    expect(b.towers[0].x).toBe(map.slots[0].x);
    expect(b.towers[1].y).toBe(map.slots[1].y);
    expect(b.routeLengths).toHaveLength(2);
    expect(b.routeLengths[1]).toBeGreaterThan(b.routeLengths[0]);
    runUntil(b, () => b.enemies.length >= 4, 60);
    expect(b.enemies.map((e) => e.route)).toEqual([0, 1, 0, 1]);
  });

  it("cada zombi llega al campamento al final de su propia ruta", () => {
    const map = MAPS.rio;
    const config = { ...difficultyConfigs.beginner, waves: [["comun", "comun"] as EnemyKind[]], totalEnemies: 2, spawnIntervalSeconds: 0.5 };
    const b = new Battle(config, { towers: [], map });
    runUntil(b, () => b.enemies.length >= 2, 30);
    const [e0, e1] = b.enemies;
    expect(e0.route).toBe(0);
    expect(e1.route).toBe(1);
    e1.distance = b.routeLengths[0] + 5; // pasó el largo de la ruta corta, pero la suya es más larga
    b.update(0.1);
    expect(b.rescue.rescueTriggered).toBe(false);
    e1.distance = b.routeLengths[1] - 0.01;
    b.update(0.1);
    expect(b.rescue.rescueTriggered).toBe(true);
  });
});

describe("campaña: mejoras", () => {
  it("cada nivel mejora daño, alcance y rapidez; el máximo es 3", () => {
    const base = { damage: 10, range: 100, reload: 1 };
    const l2 = upgradedStats(base, 2);
    const l3 = upgradedStats(base, 3);
    expect(l2.damage).toBeGreaterThan(base.damage);
    expect(l2.range).toBeGreaterThan(base.range);
    expect(l2.reload).toBeLessThan(base.reload);
    expect(l3.damage).toBeGreaterThan(l2.damage);
    expect(upgradedStats(base, 9)).toEqual(l3);
    expect(nextUpgradeCost(MAX_UPGRADE_LEVEL)).toBeNull();
    expect(nextUpgradeCost(1)).toBeLessThan(nextUpgradeCost(2)!);
  });

  it("las armas mejoradas llegan más lejos en la batalla", () => {
    const towers = ["torre-brillo" as const];
    const a = new Battle(difficultyConfigs.beginner, { towers, placement: defaultPlacement(towers) });
    const b = new Battle(difficultyConfigs.beginner, { towers, placement: defaultPlacement(towers), upgrades: { "torre-brillo": 3 } });
    expect(b.towers[0].range).toBeGreaterThan(a.towers[0].range);
    expect(b.towers[0].damage).toBeGreaterThan(a.towers[0].damage);
    expect(b.towers[0].reload).toBeLessThan(a.towers[0].reload);
  });
});

describe("campaña: progreso de un estudiante", () => {
  const newCampaign = () => Campaign.create("  Ana   María ", "beginner", 1000);

  it("pide un nombre y lo limpia", () => {
    expect(newCampaign().name).toBe("Ana María");
    expect(() => Campaign.create("   ", "beginner")).toThrow();
    expect(Campaign.create("x".repeat(60), "advanced").name).toHaveLength(24);
  });

  it("la noche 1 trae sus dos desafíos nuevos y ningún repaso", () => {
    const c = newCampaign();
    expect(c.reviewChallenges()).toEqual([]);
    expect(c.challengeList().map((x) => x.number)).toEqual([1, 2]);
  });

  it("acertar da el arma y polvo; errar deja el lugar vacío", () => {
    const c = newCampaign();
    const [c1, c2] = c.challengeList();
    c.recordAnswer(c1, true);
    c.recordAnswer(c2, false);
    expect(c.weapons).toEqual([c1.defense]);
    expect(c.data.lost).toEqual([c2.defense]);
    expect(c.dust).toBe(DUST_CORRECT);
    expect(c.challengesDone).toBe(true);
    expect(() => c.recordAnswer(c1, true)).toThrow();
  });

  it("el desafío fallado reaparece como repaso en la noche siguiente y recupera el arma", () => {
    const c = newCampaign();
    const [c1, c2] = c.challengeList();
    c.recordAnswer(c1, true);
    c.recordAnswer(c2, false);
    c.finishBattle({ victory: true, stopped: 0, baseEnergy: 100, rescuesCorrect: 0 });
    expect(c.night).toBe(2);
    const list = c.challengeList();
    expect(list.map((x) => x.number)).toEqual([2, 3, 4]);
    expect(c.isReview(list[0])).toBe(true);
    expect(c.isReview(list[1])).toBe(false);
    const before = c.dust;
    c.recordAnswer(list[0], true);
    expect(c.weapons).toContain(c2.defense);
    expect(c.data.lost).toEqual([]);
    expect(c.dust - before).toBe(DUST_REVIEW);
  });

  it("un repaso fallado no se pierde del todo: vuelve a aparecer la noche siguiente", () => {
    const c = newCampaign();
    const [c1] = c.challengeList();
    c.recordAnswer(c1, false);
    c.recordAnswer(c.challengeList()[1], true);
    c.finishBattle({ victory: true, stopped: 0, baseEnergy: 50, rescuesCorrect: 0 });
    c.recordAnswer(c.challengeList()[0], false);
    expect(c.data.lost).toContain(c1.defense);
    for (const x of c.challengeList().slice(1)) c.recordAnswer(x, true);
    c.finishBattle({ victory: true, stopped: 0, baseEnergy: 50, rescuesCorrect: 0 });
    expect(c.night).toBe(3);
    expect(c.challengeList()[0].defense).toBe(c1.defense);
  });

  it("al ganar una noche se avanza y se gana polvo; al perder se repite la misma noche", () => {
    const c = newCampaign();
    c.challengeList().forEach((x) => c.recordAnswer(x, true));
    const before = c.dust;
    const lost = c.finishBattle({ victory: false, stopped: 4, baseEnergy: 0, rescuesCorrect: 0 });
    expect(c.night).toBe(1);
    expect(lost.dustEarned).toBe(DUST_NIGHT_LOST + 4);
    expect(c.dust).toBe(before + lost.dustEarned);
    c.leaveWorkshop();
    expect(c.data.stage).toBe("placement");
    const won = c.finishBattle({ victory: true, stopped: 50, baseEnergy: 80, rescuesCorrect: 2 });
    expect(won.dustEarned).toBe(DUST_NIGHT_WON + 30 + 20);
    expect(c.night).toBe(2);
    c.leaveWorkshop();
    expect(c.data.stage).toBe("intro");
  });

  it("ganar la quinta noche termina la campaña", () => {
    const c = newCampaign();
    for (let n = 1; n <= TOTAL_NIGHTS; n++) {
      c.challengeList().forEach((x) => c.recordAnswer(x, true));
      c.finishBattle({ victory: true, stopped: 1, baseEnergy: 100, rescuesCorrect: 0 });
    }
    expect(c.isFinished).toBe(true);
    expect(c.weapons).toHaveLength(7);
    expect(newChallengesOf(5)).toEqual([]);
  });

  it("el taller gasta polvo estelar, exige tener el arma y respeta el máximo", () => {
    const c = newCampaign();
    const [c1] = c.challengeList();
    expect(() => c.upgrade(c1.defense)).toThrow();
    c.recordAnswer(c1, true);
    c.data.dust = 29;
    expect(c.canUpgrade(c1.defense)).toBe(false);
    c.data.dust = 100;
    c.upgrade(c1.defense);
    expect(c.level(c1.defense)).toBe(2);
    expect(c.dust).toBe(70);
    c.upgrade(c1.defense);
    expect(c.level(c1.defense)).toBe(3);
    expect(c.dust).toBe(10);
    c.data.dust = 999;
    expect(() => c.upgrade(c1.defense)).toThrow();
  });

  it("al volver a abrir una noche a medias, los desafíos ya respondidos se recuerdan", () => {
    const c = newCampaign();
    c.recordAnswer(c.challengeList()[0], true);
    const again = Campaign.fromSave(JSON.parse(JSON.stringify(c.data)));
    expect(again.nightOutcomes()).toEqual(["won"]);
    expect(again.challengesDone).toBe(false);
  });

  it("rechaza guardados inválidos", () => {
    expect(() => Campaign.fromSave({ ...newCampaign().data, version: 1 } as never)).toThrow();
    expect(() => Campaign.fromSave({ ...newCampaign().data, night: 9 })).toThrow();
  });
});

describe("campaña: guardianes", () => {
  it("los puestos se convocan en orden, cuestan polvo y se mejoran como las armas", () => {
    const c = Campaign.create("Ana", "beginner");
    expect(c.nextPostCost()).toBe(POST_COSTS[0]);
    expect(() => c.buyPost()).toThrow();
    c.data.dust = 500;
    expect(c.buyPost()).toBe("puesto-1");
    expect(c.buyPost()).toBe("puesto-2");
    expect(c.buyPost()).toBe("puesto-3");
    expect(c.ownedPosts).toEqual(["puesto-1", "puesto-2", "puesto-3"]);
    expect(c.nextPostCost()).toBeNull();
    expect(c.dust).toBe(500 - POST_COSTS.reduce((a, b) => a + b, 0));
    expect(() => c.buyPost()).toThrow();
    c.upgradePost("puesto-2");
    expect(c.postLevel("puesto-2")).toBe(2);
    c.upgradePost("puesto-2");
    expect(() => c.upgradePost("puesto-2")).toThrow();
    expect(c.postLevel("puesto-1")).toBe(1);
  });

  it("no se puede mejorar un puesto que no se convocó", () => {
    const c = Campaign.create("Ana", "beginner");
    c.data.dust = 500;
    expect(c.canUpgradePost("puesto-1")).toBe(false);
    expect(() => c.upgradePost("puesto-1")).toThrow();
  });

  it("volver a convocar a una estrellita en la batalla cuesta 3 de polvo, y sin polvo no se puede", () => {
    const c = Campaign.create("Ana", "beginner");
    c.data.dust = 4;
    expect(c.spendSummon()).toBe(true);
    expect(c.dust).toBe(1);
    expect(c.spendSummon()).toBe(false);
    expect(c.dust).toBe(1);
  });

  it("un guardado de antes de los guardianes se abre sin errores", () => {
    const save = JSON.parse(JSON.stringify(Campaign.create("Ana", "beginner").data));
    delete save.posts;
    expect(Campaign.fromSave(save).ownedPosts).toEqual([]);
  });

  it("los zombis nuevos aparecen en la noche que corresponde", () => {
    const kinds = (n: number) => new Set(nightConfig(n, difficultyConfigs.advanced).waves.flat());
    expect(kinds(2).has("saltador")).toBe(false);
    expect(kinds(3).has("saltador")).toBe(true);
    expect(kinds(3).has("doble")).toBe(false);
    expect(kinds(4).has("doble")).toBe(true);
    expect(kinds(4).has("gigante")).toBe(false);
    expect(kinds(5).has("gigante")).toBe(true);
    expect([...kinds(5)].filter((k) => k === "gigante")).toHaveLength(1);
  });
});

describe("campaña: equilibrio de las noches", () => {
  /** Armas que tendría un estudiante que acierta todo hasta esa noche. */
  const weaponsByNight = [2, 4, 5, 7, 7];

  function simulate(night: number, diff: "beginner" | "advanced", level: number) {
    const cfg = nightConfig(night, difficultyConfigs[diff]);
    const towers = DEFENSES.slice(0, weaponsByNight[night - 1]).map((d) => d.id);
    const upgrades = Object.fromEntries(towers.map((t) => [t, level]));
    const b = new Battle(cfg, { towers, placement: defaultPlacement(towers), map: MAPS[NIGHTS[night - 1].map], upgrades });
    // Peor caso: se fallan todas las preguntas de rescate.
    runUntil(b, () => {
      for (const e of b.drainEvents()) if (e.type === "rescue-triggered") (b.applyFailedRescue(), b.finishRescue());
      return b.isOver;
    }, 1500);
    return b;
  }

  for (const diff of ["beginner", "advanced"] as const) {
    for (let night = 1; night <= TOTAL_NIGHTS; night++) {
      // Las últimas noches de Avanzado esperan armas mejoradas: para entonces el estudiante ya reunió polvo estelar.
      const level = diff === "advanced" && night >= 4 ? 2 : 1;
      it(`${diff}, noche ${night}: se puede ganar sin rescates si se acertó todo (armas nivel ${level})`, () => {
        expect(simulate(night, diff, level).phase).toBe("victory");
      });
    }
  }

  it("las mejoras importan: en Avanzado la noche final termina con más energía al nivel 2", () => {
    const l1 = simulate(5, "advanced", 1);
    const l2 = simulate(5, "advanced", 2);
    expect(l2.baseHealth).toBeGreaterThan(l1.baseHealth);
  });
});

describe("campaña: desafíos repetidos como repaso", () => {
  it("cada desafío tiene una sola arma, así que el repaso recupera la misma", () => {
    expect(new Set(CHALLENGES.map((c) => c.defense)).size).toBe(7);
  });
});
