import { Battle } from "../src/core/battle/Battle";
import { Game } from "../src/core/Game";
import type { Difficulty } from "../src/core/difficulty";

/** Resuelve los siete desafíos con la respuesta correcta y deja la partida en la síntesis. */
export function solveAllChallenges(game: Game): void {
  const cm = game.challenges!;
  if (game.screen === "demo") game.finishDemo();
  for (let i = 0; i < 7; i++) {
    const r = cm.submit([...cm.current.correct]);
    if (!r.correct) throw new Error("La respuesta correcta fue rechazada");
    game.nextChallenge();
  }
}

export function gameInBattle(difficulty: Difficulty, seed = 1): Game {
  const game = new Game(seed);
  game.start();
  game.selectDifficulty(difficulty);
  solveAllChallenges(game);
  game.startBattle();
  return game;
}

/** Avanza la simulación hasta que se cumpla la condición (o se agote el tiempo). */
export function runUntil(battle: Battle, cond: () => boolean, maxSeconds = 600, step = 0.05): boolean {
  let t = 0;
  while (t < maxSeconds) {
    if (cond()) return true;
    battle.update(step);
    t += step;
  }
  return cond();
}

/** Lleva al primer zombi activo hasta la entrada del campamento. */
export function pushFirstEnemyToCamp(battle: Battle): number {
  const e = battle.activeEnemies().find((x) => x.state === "walking");
  if (!e) throw new Error("No hay zombis en el campo");
  e.distance = battle.pathLength - 0.01;
  battle.update(0.05);
  return e.id;
}

/** Espera a que haya al menos `n` zombis caminando en la oleada indicada. */
export function waitForEnemies(battle: Battle, wave: number, n: number): void {
  const ok = runUntil(battle, () => battle.waveNumber === wave && battle.phase === "wave" && battle.activeEnemies().filter((e) => e.state === "walking").length >= n);
  if (!ok) throw new Error(`No aparecieron ${n} zombis en la oleada ${wave}`);
}
