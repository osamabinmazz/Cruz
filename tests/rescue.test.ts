import { describe, expect, it } from "vitest";
import { Battle } from "../src/core/battle/Battle";
import { difficultyConfigs } from "../src/core/difficulty";
import { RescueController, RescueQuestionBank } from "../src/core/rescue/RescueController";
import { RESCUE_QUESTIONS } from "../src/core/rescue/questions";
import { createRng } from "../src/core/rng";
import { gameInBattle, pushFirstEnemyToCamp, runUntil, waitForEnemies } from "./helpers";

function setup(difficulty: "beginner" | "advanced" = "advanced", seed = 11) {
  const game = gameInBattle(difficulty, seed);
  return { game, battle: game.battle!, rescue: game.rescue! };
}

/** Abre el rescate si la batalla lo solicitó. */
function openIfTriggered(battle: Battle, rescue: RescueController): boolean {
  const triggered = battle.drainEvents().some((e) => e.type === "rescue-triggered");
  if (triggered) rescue.open();
  return triggered;
}

function wrongOption(rescue: RescueController): string {
  return rescue.question!.options.find((o) => o.id !== rescue.question!.correctId)!.id;
}

describe("activación y pausa", () => {
  it("1 y 2. se activa cuando el primer zombi llega al final y la batalla queda completamente pausada", () => {
    const { battle, rescue } = setup();
    waitForEnemies(battle, 1, 3);
    battle.drainEvents();
    const id = pushFirstEnemyToCamp(battle);
    expect(openIfTriggered(battle, rescue)).toBe(true);
    expect(battle.isPaused).toBe(true);
    expect(battle.heldEnemyId).toBe(id);
    expect(battle.rescue.rescueTriggered).toBe(true);
    expect(battle.baseHealth).toBe(battle.maxBaseHealth); // se detiene antes de causar daño

    const snapshot = JSON.stringify({
      enemies: battle.enemies,
      projectiles: battle.projectiles,
      towers: battle.towers.map((t) => t.cooldown),
      pending: battle.pendingSpawns(),
      elapsed: battle.elapsed
    });
    battle.update(10);
    expect(
      JSON.stringify({
        enemies: battle.enemies,
        projectiles: battle.projectiles,
        towers: battle.towers.map((t) => t.cooldown),
        pending: battle.pendingSpawns(),
        elapsed: battle.elapsed
      })
    ).toBe(snapshot);
  });

  it("3. el jugador elige el premio antes de ver la pregunta y no puede cambiarlo", () => {
    const { battle, rescue } = setup();
    waitForEnemies(battle, 1, 2);
    pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    expect(rescue.stage).toBe("choosing");
    expect(rescue.question).toBeNull();
    expect(() => rescue.answer("a")).toThrow();
    rescue.chooseReward("bomb");
    expect(rescue.question).not.toBeNull();
    expect(() => rescue.chooseReward("hero")).toThrow();
    expect(battle.rescue.selectedReward).toBe("bomb");
    expect(battle.rescue.questionId).toBe(rescue.question!.id);
  });

  it("4 y 5. la bomba presenta una pregunta difícil y el héroe una fácil", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const bomb = setup("beginner", seed);
      waitForEnemies(bomb.battle, 1, 1);
      pushFirstEnemyToCamp(bomb.battle);
      openIfTriggered(bomb.battle, bomb.rescue);
      expect(bomb.rescue.chooseReward("bomb").category).toBe("hard");

      const hero = setup("beginner", seed);
      waitForEnemies(hero.battle, 1, 1);
      pushFirstEnemyToCamp(hero.battle);
      openIfTriggered(hero.battle, hero.rescue);
      const q = hero.rescue.chooseReward("hero");
      expect(q.category).toBe("easy");
      expect(q.options).toHaveLength(3);
    }
  });
});

describe("Bomba Estelar", () => {
  it("6, 7 y 18. elimina todos los zombis presentes, no los que no ingresaron, y la partida continúa", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 4);
    const pendingBefore = [...battle.pendingSpawns()];
    expect(pendingBefore.length).toBeGreaterThan(0);
    pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    const onField = battle.activeEnemies().map((e) => e.id);
    rescue.chooseReward("bomb");
    const res = rescue.answer(rescue.question!.correctId);
    expect(res.correct).toBe(true);
    expect(res.defeated.map((e) => e.id).sort()).toEqual(onField.sort());
    expect(battle.activeEnemies()).toHaveLength(0);
    expect(battle.stats.defeatedByBomb).toBe(onField.length);
    expect(battle.pendingSpawns()).toEqual(pendingBefore);
    expect(battle.baseHealth).toBe(battle.maxBaseHealth);
    expect(battle.towers).toHaveLength(7);

    rescue.finish();
    expect(battle.isPaused).toBe(false);
    expect(battle.phase).toBe("wave");
    runUntil(battle, () => battle.activeEnemies().length > 0);
    expect(battle.activeEnemies().length).toBeGreaterThan(0);
    expect(rescue.stats.defeatedByBomb).toBe(onField.length);
  });

  it("elimina a los cinco tipos de zombi que estén en el campo", () => {
    const { battle, rescue } = setup("advanced");
    // Se lleva la partida a la tercera oleada, que combina todos los tipos.
    runUntil(battle, () => {
      for (const e of battle.drainEvents()) if (e.type === "rescue-triggered") (rescue.open(), rescue.chooseReward("hero"), rescue.answer(wrongOption(rescue)), rescue.finish());
      return battle.waveNumber === 3 && battle.phase === "wave" && battle.pendingSpawns().length === 0;
    }, 1200);
    const kinds = new Set(battle.activeEnemies().map((e) => e.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    if (!battle.rescue.rescueTriggered) {
      pushFirstEnemyToCamp(battle);
      openIfTriggered(battle, rescue);
      rescue.chooseReward("bomb");
      rescue.answer(rescue.question!.correctId);
      expect(battle.activeEnemies()).toHaveLength(0);
      rescue.finish();
    }
  });
});

describe("Héroe Austral", () => {
  it("8, 9 y 19. derrota al zombi que llegó y al siguiente más cercano al final; la partida continúa", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 4);
    const heldId = pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    const walking = battle.activeEnemies().filter((e) => e.state === "walking");
    const nearest = walking.reduce((a, b) => (b.distance > a.distance ? b : a));
    const othersBefore = walking.filter((e) => e.id !== nearest.id).map((e) => e.id);
    rescue.chooseReward("hero");
    const res = rescue.answer(rescue.question!.correctId);
    expect(res.defeated.map((e) => e.id)).toEqual([heldId, nearest.id]);
    expect(battle.stats.defeatedByHero).toBe(2);
    expect(battle.activeEnemies().map((e) => e.id).sort()).toEqual(othersBefore.sort());
    expect(battle.baseHealth).toBe(battle.maxBaseHealth);
    rescue.finish();
    expect(battle.isPaused).toBe(false);
    const d0 = battle.activeEnemies()[0].distance;
    battle.update(0.5);
    expect(battle.activeEnemies().find((e) => e.state === "walking")!.distance).not.toBe(d0);
  });

  it("10. si no hay un segundo zombi, derrota solo al primero y se retira", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 1);
    for (const e of battle.activeEnemies().slice(1)) e.state = "gone";
    const heldId = pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    expect(battle.activeEnemies().filter((e) => e.state === "walking")).toHaveLength(0);
    rescue.chooseReward("hero");
    const res = rescue.answer(rescue.question!.correctId);
    expect(res.defeated.map((e) => e.id)).toEqual([heldId]);
    rescue.finish();
    expect(battle.stats.defeatedByHero).toBe(1);
    expect(rescue.stage).toBe("idle");
    expect(battle.rescue.rescueTriggered).toBe(true);
  });

  it("22. el héroe no queda como una octava defensa permanente", () => {
    const { battle, rescue } = setup("beginner");
    waitForEnemies(battle, 1, 2);
    pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    rescue.chooseReward("hero");
    rescue.answer(rescue.question!.correctId);
    rescue.finish();
    expect(battle.towers).toHaveLength(7);
    expect(new Set(battle.towers.map((t) => t.id)).size).toBe(7);
  });
});

describe("respuesta incorrecta", () => {
  it("11, 12 y 20. el zombi daña la base, no hay segundo intento y el combate continúa", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 3);
    const heldId = pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    const held = battle.enemies.find((e) => e.id === heldId)!;
    const others = battle.activeEnemies().filter((e) => e.state === "walking").length;
    rescue.chooseReward("bomb");
    const res = rescue.answer(wrongOption(rescue));
    expect(res.correct).toBe(false);
    expect(res.correctOption.id).toBe(rescue.question!.correctId);
    expect(res.explanation.split(/[.!?]\s/).length).toBe(1);
    expect(res.defeated).toHaveLength(0);
    expect(battle.baseHealth).toBe(battle.maxBaseHealth - held.damage);
    expect(battle.activeEnemies().filter((e) => e.state === "walking")).toHaveLength(others);
    expect(() => rescue.answer(rescue.question!.correctId)).toThrow();
    expect(battle.rescue.answeredCorrectly).toBe(false);
    rescue.finish();
    expect(battle.isPaused).toBe(false);
    expect(rescue.stats.incorrect).toBe(1);
  });

  it("23. si la base llega a cero, se activa la derrota", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 2);
    battle.baseHealth = 5;
    pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    rescue.chooseReward("hero");
    rescue.answer(wrongOption(rescue));
    const events = battle.drainEvents().map((e) => e.type);
    expect(events).toContain("defeat");
    expect(battle.phase).toBe("defeat");
    expect(battle.baseHealth).toBe(0);
    rescue.finish();
    expect(battle.isOver).toBe(true);
  });

  it("23b. la derrota también se activa cuando entran zombis sin rescate disponible", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 3);
    pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    rescue.chooseReward("hero");
    rescue.answer(wrongOption(rescue));
    rescue.finish();
    battle.baseHealth = 1;
    pushFirstEnemyToCamp(battle);
    expect(battle.phase).toBe("defeat");
  });
});

describe("límite por oleada", () => {
  it("13 y 14. no se repite en la misma oleada; una nueva oleada restablece la oportunidad", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 3);
    pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    rescue.chooseReward("hero");
    rescue.answer(rescue.question!.correctId);
    rescue.finish();

    // Otro zombi de la misma oleada llega: daña la base directamente.
    const hp = battle.baseHealth;
    const second = battle.activeEnemies().find((e) => e.state === "walking")!;
    pushFirstEnemyToCamp(battle);
    expect(battle.drainEvents().some((e) => e.type === "rescue-triggered")).toBe(false);
    expect(battle.isPaused).toBe(false);
    expect(battle.baseHealth).toBe(hp - second.damage);

    // Siguiente oleada: estado limpio y nueva oportunidad.
    runUntil(battle, () => battle.waveNumber === 2 && battle.phase === "wave");
    expect(battle.rescue).toEqual({ waveNumber: 2, rescueTriggered: false, selectedReward: null, questionId: null, answeredCorrectly: null });
    waitForEnemies(battle, 2, 1);
    battle.drainEvents();
    pushFirstEnemyToCamp(battle);
    expect(openIfTriggered(battle, rescue)).toBe(true);
  });

  it("15, 16 y 21. como máximo tres rescates por partida, sin preguntas repetidas ni bloqueos", () => {
    const { battle, rescue } = setup("advanced", 99);
    const questionIds: string[] = [];
    let triggers = 0;
    let t = 0;
    while (!battle.isOver && t < 1500) {
      // Se fuerza la llegada de un zombi al campamento en cada oleada.
      const walking = battle.activeEnemies().filter((e) => e.state === "walking");
      if (battle.phase === "wave" && !battle.rescue.rescueTriggered && walking.length > 0) walking[0].distance = Math.max(walking[0].distance, battle.pathLength - 1);
      battle.update(0.1);
      t += 0.1;
      for (const e of battle.drainEvents()) {
        if (e.type !== "rescue-triggered") continue;
        triggers++;
        rescue.open();
        rescue.chooseReward(triggers % 2 === 0 ? "bomb" : "hero");
        questionIds.push(rescue.question!.id);
        rescue.answer(rescue.question!.correctId);
        rescue.finish();
        expect(battle.projectiles.every((p) => battle.enemies.find((x) => x.id === p.targetId)?.state === "walking")).toBe(true);
      }
    }
    expect(battle.isOver).toBe(true);
    expect(triggers).toBe(3);
    expect(rescue.stats.triggered).toBe(3);
    expect(new Set(questionIds).size).toBe(questionIds.length);
    expect(battle.enemies.every((e) => e.state === "gone")).toBe(true);
    expect(battle.projectiles).toHaveLength(0);
  });

  it("21. después de reanudar no quedan proyectiles congelados ni zombis inmóviles", () => {
    const { battle, rescue } = setup("advanced");
    waitForEnemies(battle, 1, 5);
    runUntil(battle, () => battle.projectiles.length > 0);
    pushFirstEnemyToCamp(battle);
    openIfTriggered(battle, rescue);
    rescue.chooseReward("hero");
    rescue.answer(rescue.question!.correctId);
    rescue.finish();
    const before = new Map(battle.activeEnemies().map((e) => [e.id, e.distance]));
    const projBefore = battle.projectiles.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    battle.update(0.2);
    for (const e of battle.activeEnemies()) if (before.has(e.id)) expect(e.distance).toBeGreaterThan(before.get(e.id)!);
    for (const p of projBefore) {
      const now = battle.projectiles.find((x) => x.id === p.id);
      if (now) expect(now.x !== p.x || now.y !== p.y).toBe(true);
    }
    expect(battle.heldEnemyId).toBeNull();
  });
});

describe("banco de preguntas", () => {
  it("17. Principiante y Avanzado usan el mismo banco", () => {
    const b = setup("beginner");
    const a = setup("advanced");
    expect(b.game.bank!.questions).toBe(RESCUE_QUESTIONS);
    expect(a.game.bank!.questions).toBe(RESCUE_QUESTIONS);
    expect(difficultyConfigs.beginner).not.toHaveProperty("rescueQuestions");
  });

  it("las fáciles tienen tres opciones y las difíciles entre tres y cuatro", () => {
    const easy = RESCUE_QUESTIONS.filter((q) => q.category === "easy");
    const hard = RESCUE_QUESTIONS.filter((q) => q.category === "hard");
    expect(easy).toHaveLength(7);
    expect(hard).toHaveLength(7);
    for (const q of easy) expect(q.options).toHaveLength(3);
    for (const q of hard) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
    }
    for (const q of RESCUE_QUESTIONS) expect(q.options.some((o) => o.id === q.correctId)).toBe(true);
  });

  it("16. selecciona al azar dentro de la categoría sin repetir en la partida", () => {
    const bank = new RescueQuestionBank(createRng(4));
    const easy = Array.from({ length: 7 }, () => bank.draw("easy").id);
    expect(new Set(easy).size).toBe(7);
    const hard = Array.from({ length: 7 }, () => bank.draw("hard"));
    expect(hard.every((q) => q.category === "hard")).toBe(true);
    expect(new Set(hard.map((q) => q.id)).size).toBe(7);
  });

  it("la batalla comparte el banco de la partida y no reinicia su registro", () => {
    const { game } = setup("advanced");
    expect(game.rescue!.bank).toBe(game.bank);
  });
});

describe("Principiante y Avanzado", () => {
  it("la mecánica está disponible en ambos niveles", () => {
    for (const d of ["beginner", "advanced"] as const) {
      const { battle, rescue } = setup(d);
      waitForEnemies(battle, 1, 1);
      pushFirstEnemyToCamp(battle);
      expect(openIfTriggered(battle, rescue)).toBe(true);
    }
  });

  it("un rescate no se activa sin un zombi en la entrada", () => {
    const battle = new Battle(difficultyConfigs.advanced);
    const rescue = new RescueController(battle, new RescueQuestionBank(createRng(1)), createRng(1));
    expect(() => rescue.open()).toThrow();
  });
});
