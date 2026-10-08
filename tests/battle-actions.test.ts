import { describe, expect, it } from "vitest";
import { Battle, PICKUP_TTL, PICKUP_VALUE } from "../src/core/battle/Battle";
import { CONGELAR_SECONDS, LLUVIA_RADIUS, POWERS, powerById } from "../src/core/battle/powers";
import { MAPS } from "../src/core/battle/maps";
import { Campaign, DUST_NIGHT_WON, SCHOOL_HEALTH_PER_LEVEL } from "../src/core/campaign/Campaign";
import { difficultyConfigs, type EnemyKind } from "../src/core/difficulty";
import { Game } from "../src/core/Game";
import { runUntil } from "./helpers";

const map = MAPS.bosque;

function arena(kinds: EnemyKind[], opts: { power?: "rayo" | "escudo" | "lluvia" | "congelar"; towers?: boolean; posts?: number } = {}) {
  const config = { ...difficultyConfigs.beginner, waves: [kinds], totalEnemies: kinds.length, spawnIntervalSeconds: 0.2, enemyHealthMultiplier: 1, enemySpeedMultiplier: 1 };
  const b = new Battle(config, {
    towers: opts.towers ? ["torre-brillo", "cuarteto-luz", "lanza-eje", "gemelas", "guia-punteada", "plomada", "brujula-austral"] : [],
    posts: (["puesto-1", "puesto-2", "puesto-3"] as const).slice(0, opts.posts ?? 0).map((id) => ({ id, level: 1 })),
    map,
    power: opts.power ?? null
  });
  runUntil(b, () => b.phase === "wave");
  runUntil(b, () => b.enemies.length >= kinds.length, 30);
  return b;
}

describe("polvo estelar en el suelo", () => {
  it("un zombi derrotado por una arma suelta polvo que se recoge tocándolo", () => {
    const b = arena(["resistente"], { towers: true });
    runUntil(b, () => b.enemies[0].state === "gone", 200);
    expect(b.enemies[0].removedBy).toBe("tower");
    expect(b.pickups).toHaveLength(1);
    expect(b.pickups[0].value).toBe(PICKUP_VALUE.resistente);
    const id = b.pickups[0].id;
    expect(b.collectPickup(id)).toBe(PICKUP_VALUE.resistente);
    expect(b.pickups).toHaveLength(0);
    expect(b.collectPickup(id)).toBe(0);
  });

  it("si nadie lo toca, el polvo se apaga a los pocos segundos", () => {
    const b = arena(["resistente"]);
    b.pickups.push({ id: 7000, x: 100, y: 300, value: 1, age: 0 });
    b.update(PICKUP_TTL - 1);
    expect(b.pickups).toHaveLength(1);
    b.update(1.5);
    expect(b.pickups).toHaveLength(0);
  });

  it("con la Bomba Estelar o el Héroe no se suelta polvo, y los zombis chiquitos no sueltan", () => {
    const b = arena(["comun", "comun"]);
    runUntil(b, () => b.rescue.rescueTriggered, 300);
    b.applyBomb();
    expect(b.pickups).toHaveLength(0);
    expect(PICKUP_VALUE.mini).toBe(0);
    expect(PICKUP_VALUE.gigante).toBeGreaterThan(PICKUP_VALUE.mochila);
  });

  it("en la campaña, el polvo recogido se suma a la campaña y al resumen de la noche", () => {
    const g = new Game(4);
    g.openStudents();
    g.openNewStudent();
    const c = g.createStudent("Ana", "beginner");
    g.startNight();
    g.beginNightChallenges();
    for (let i = 0; i < 2; i++) {
      g.submitAnswer([...g.challenges!.current.correct]);
      g.nextChallenge();
    }
    g.startBattle();
    const before = c.dust;
    g.battle!.pickups.push({ id: 9001, x: 10, y: 10, value: 3, age: 0 });
    expect(g.collectPickup(9001)).toBe(3);
    expect(c.dust).toBe(before + 3);
    expect(g.collectPickup(9001)).toBe(0);
    g.battle!.phase = "victory";
    g.goToFinal();
    expect(g.nightResult!.dustCollected).toBe(3);
    // El premio de la noche se suma una sola vez; lo recogido ya estaba sumado.
    expect(c.dust).toBe(before + 3 + DUST_NIGHT_WON);
    expect(g.nightResult!.dustEarned).toBe(DUST_NIGHT_WON + 3);
  });
});

describe("mejorar en plena batalla", () => {
  function inBattle() {
    const g = new Game(4);
    g.openStudents();
    g.openNewStudent();
    const c = g.createStudent("Ana", "beginner");
    c.data.dust = 200;
    c.buyPost();
    g.startNight();
    g.beginNightChallenges();
    for (let i = 0; i < 2; i++) {
      g.submitAnswer([...g.challenges!.current.correct]);
      g.nextChallenge();
    }
    g.startBattle();
    return { g, c };
  }

  it("un arma sube de nivel al instante, gasta polvo y queda mejorada para siempre", () => {
    const { g, c } = inBattle();
    const t = g.battle!.towers[0];
    const before = { range: t.range, damage: t.damage, reload: t.reload };
    const dust = c.dust;
    expect(g.upgradeWeaponInBattle(t.id)).toBe(true);
    expect(t.level).toBe(2);
    expect(t.range).toBeGreaterThan(before.range);
    expect(t.damage).toBeGreaterThan(before.damage);
    expect(t.reload).toBeLessThan(before.reload);
    expect(c.dust).toBe(dust - 30);
    expect(c.level(t.id)).toBe(2);
  });

  it("sin polvo suficiente, o al llegar al máximo, no se puede", () => {
    const { g, c } = inBattle();
    const id = g.battle!.towers[0].id;
    c.data.dust = 29;
    expect(g.upgradeWeaponInBattle(id)).toBe(false);
    expect(g.battle!.towers[0].level).toBe(1);
    c.data.dust = 999;
    expect(g.upgradeWeaponInBattle(id)).toBe(true);
    expect(g.upgradeWeaponInBattle(id)).toBe(true);
    expect(g.upgradeWeaponInBattle(id)).toBe(false);
    expect(g.battle!.towers[0].level).toBe(3);
  });

  it("un puesto de guardianes sube de nivel y sus estrellitas ganan vida y daño", () => {
    const { g, c } = inBattle();
    const post = g.battle!.posts[0];
    const hp = post.guardians[0].maxHealth;
    const dmg = post.guardians[0].damage;
    expect(g.upgradePostInBattle(post.id)).toBe(true);
    expect(post.level).toBe(2);
    expect(post.guardians[0].maxHealth).toBeGreaterThan(hp);
    expect(post.guardians[0].damage).toBeGreaterThan(dmg);
    expect(c.postLevel(post.id)).toBe(2);
  });
});

describe("poderes de estrella", () => {
  it("hay cuatro poderes, uno por estrella, con recarga", () => {
    expect(POWERS.map((p) => p.hero)).toEqual(["Acrux", "Mimosa", "Gacrux", "Delta"]);
    for (const p of POWERS) expect(p.cooldown).toBeGreaterThan(0);
    expect(powerById("rayo").targeted).toBe(true);
    expect(powerById("escudo").targeted).toBe(false);
  });

  it("sin poder elegido no se puede usar nada", () => {
    const b = arena(["comun"]);
    expect(b.usePower({ x: 0, y: 0 })).toBe(false);
  });

  it("el rayo golpea al zombi tocado y salta a los cercanos; sin zombi cerca no gasta la recarga", () => {
    const b = arena(["comun", "comun", "comun", "comun"], { power: "rayo" });
    const lejos = { x: 900, y: 650 };
    expect(b.usePower(lejos)).toBe(false);
    expect(b.powerCooldown).toBe(0);
    b.enemies.forEach((e, i) => (e.distance = 100 + i * 20));
    const target = b.enemyPosition(b.enemies[0]);
    expect(b.usePower(target)).toBe(true);
    expect(b.powerCooldown).toBe(powerById("rayo").cooldown);
    expect(b.enemies.filter((e) => e.state === "gone").length).toBeGreaterThanOrEqual(2);
    expect(b.stats.defeatedByPower).toBeGreaterThanOrEqual(2);
    const ev = b.drainEvents().find((e) => e.type === "power-used");
    expect(ev && ev.type === "power-used" ? ev.points.length : 0).toBeGreaterThanOrEqual(2);
  });

  it("no se puede volver a usar hasta que se recargue", () => {
    const b = arena(["comun", "resistente"], { power: "rayo" });
    b.enemies[0].distance = 150;
    b.enemies[1].distance = 20;
    expect(b.usePower(b.enemyPosition(b.enemies[0]))).toBe(true);
    expect(b.usePower({ x: 1, y: 1 })).toBe(false);
    expect(b.enemies[1].state).toBe("walking");
    b.update(powerById("rayo").cooldown / 2);
    expect(b.powerCooldown).toBeGreaterThan(0);
    b.update(powerById("rayo").cooldown / 2 + 0.5);
    expect(b.powerCooldown).toBe(0);
  });

  it("la lluvia de estrellas daña y frena a los de la zona, no a los lejanos", () => {
    const b = arena(["resistente", "resistente"], { power: "lluvia" });
    b.enemies[0].distance = 150;
    b.enemies[1].distance = 150 + LLUVIA_RADIUS * 3;
    const hp = b.enemies.map((e) => e.health);
    expect(b.usePower(b.enemyPosition(b.enemies[0]))).toBe(true);
    expect(b.enemies[0].health).toBeLessThan(hp[0]);
    expect(b.enemies[0].slowTimer).toBeGreaterThan(0);
    expect(b.enemies[1].health).toBe(hp[1]);
  });

  it("congelar detiene a todos durante 4 segundos y después siguen", () => {
    const b = arena(["comun", "comun"], { power: "congelar" });
    expect(b.usePower()).toBe(true);
    const at = b.enemies.map((e) => e.distance);
    b.update(CONGELAR_SECONDS - 0.5);
    expect(b.enemies.map((e) => e.distance)).toEqual(at);
    b.update(1.5);
    expect(b.enemies[0].distance).toBeGreaterThan(at[0]);
  });

  it("el escudo cura un poco la escuela y bloquea el próximo golpe", () => {
    const b = arena(["comun", "comun"], { power: "escudo" });
    b.baseHealth = 50;
    expect(b.usePower()).toBe(true);
    expect(b.baseHealth).toBeGreaterThan(50);
    expect(b.shield).toBe(1);
    const hp = b.baseHealth;
    runUntil(b, () => b.rescue.rescueTriggered, 300);
    b.applyFailedRescue(); // el primero llega y el escudo lo bloquea
    expect(b.baseHealth).toBe(hp);
    expect(b.shield).toBe(0);
  });
});

describe("oleadas", () => {
  it("se puede llamar la siguiente oleada durante la cuenta regresiva y nunca después", () => {
    const config = { ...difficultyConfigs.beginner };
    const b = new Battle(config, { towers: [], map });
    expect(b.phase).toBe("countdown");
    expect(b.callNextWave()).toBe(true);
    b.update(0.2);
    expect(b.phase).toBe("wave");
    expect(b.callNextWave()).toBe(false);
  });
});

describe("la escuela", () => {
  it("cada nivel suma energía, cuesta polvo y tiene máximo", () => {
    const c = Campaign.create("Ana", "beginner");
    expect(c.schoolLevel).toBe(1);
    expect(c.schoolHealthFactor).toBe(1);
    expect(() => c.upgradeSchool()).toThrow();
    c.data.dust = 500;
    c.upgradeSchool();
    expect(c.schoolLevel).toBe(2);
    expect(c.schoolHealthFactor).toBeCloseTo(1 + SCHOOL_HEALTH_PER_LEVEL);
    c.upgradeSchool();
    expect(c.schoolLevel).toBe(3);
    expect(c.nextSchoolCost()).toBeNull();
    expect(() => c.upgradeSchool()).toThrow();
    expect(c.dust).toBe(500 - 30 - 60);
  });

  it("la batalla empieza con la energía de la escuela mejorada y el poder elegido", () => {
    const g = new Game(4);
    g.openStudents();
    g.openNewStudent();
    const c = g.createStudent("Ana", "beginner");
    const base = difficultyConfigs.beginner.baseHealth;
    c.data.dust = 100;
    c.upgradeSchool();
    c.setPower("congelar");
    g.startNight();
    g.beginNightChallenges();
    for (let i = 0; i < 2; i++) {
      g.submitAnswer([...g.challenges!.current.correct]);
      g.nextChallenge();
    }
    g.startBattle();
    expect(g.battle!.maxBaseHealth).toBe(Math.round(base * (1 + SCHOOL_HEALTH_PER_LEVEL)));
    expect(g.battle!.power?.id).toBe("congelar");
  });

  it("un guardado de antes de la escuela se abre con nivel 1 y el rayo", () => {
    const save = JSON.parse(JSON.stringify(Campaign.create("Ana", "beginner").data));
    delete save.school;
    delete save.power;
    const c = Campaign.fromSave(save);
    expect(c.schoolLevel).toBe(1);
    expect(c.power).toBe("rayo");
    expect(() => Campaign.fromSave({ ...save, power: "inventado" })).not.toThrow();
  });
});
