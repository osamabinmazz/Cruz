import type { EnemyKind } from "./difficulty";
import { createRng } from "./rng";

/**
 * «Noches sin fin»: el modo que se desbloquea al terminar la historia. Cada noche es más difícil que la anterior;
 * se juega hasta que la escuela se quede sin energía y se guarda la mejor racha.
 */

/** Qué zombis pueden salir según la noche sin fin (1, 2, 3…). */
const POOL: { from: number; kind: EnemyKind }[] = [
  { from: 1, kind: "comun" },
  { from: 1, kind: "veloz" },
  { from: 2, kind: "resistente" },
  { from: 3, kind: "niebla" },
  { from: 3, kind: "saltador" },
  { from: 4, kind: "doble" },
  { from: 4, kind: "mochila" },
  { from: 5, kind: "mini" }
];

/** Noche de la historia (1 a 5) cuyo mapa y clima se usan en la noche sin fin número `e`. */
export function cycleNight(e: number): number {
  return ((Math.max(1, e) - 1) % 5) + 1;
}

/** Oleadas de la noche sin fin número `e` (siempre las mismas para la misma noche). */
export function endlessWaves(e: number): EnemyKind[][] {
  const n = Math.max(1, Math.floor(e));
  const rng = createRng(1000 + n * 7919);
  const kinds = POOL.filter((p) => p.from <= n).map((p) => p.kind);
  const waveCount = Math.min(5, 3 + Math.floor((n - 1) / 3));
  const waves: EnemyKind[][] = [];
  for (let w = 0; w < waveCount; w++) {
    const size = Math.min(26, 6 + n * 2 + w * 2);
    const wave: EnemyKind[] = [];
    for (let i = 0; i < size; i++) wave.push(kinds[Math.floor(rng() * kinds.length)]);
    waves.push(wave);
  }
  // Cada cinco noches llega un gigante al final.
  if (n % 5 === 0) waves[waves.length - 1].push("gigante");
  return waves;
}

/** Cuánto se refuerzan los zombis en la noche sin fin `e` (vida y velocidad). */
export function endlessScale(e: number): { health: number; speed: number } {
  const n = Math.max(1, e);
  return { health: 1 + 0.1 * (n - 1), speed: Math.min(1.35, 1 + 0.015 * (n - 1)) };
}

/** Cuánta energía de la escuela se recupera entre una noche y otra (fracción de la máxima). */
export const ENDLESS_REPAIR = 0.4;
