import { difficultyConfigs, type DifficultyConfig, type EnemyKind } from "./difficulty";

/**
 * Modo extremo (partida rápida, 10 estrellas): los mismos siete desafíos, sin
 * ayudas y con una batalla durísima. Es difícil pero posible: acertando los
 * desafíos y las preguntas de emergencia se puede ganar. Cada derrota suaviza
 * un poco la siguiente partida (hasta MAX_EASE veces); ganar vuelve a la
 * dificultad completa.
 */
export const MAX_EASE = 5;
export const EXTREME_STARS = 10;

const c: EnemyKind = "comun";
const v: EnemyKind = "veloz";
const r: EnemyKind = "resistente";
const n: EnemyKind = "niebla";
const m: EnemyKind = "mochila";

const WAVES: EnemyKind[][] = [
  [c, v, c, v, r, c, v, c],
  [c, v, r, c, n, v, r, c, n, v],
  [c, v, r, n, c, v, r, n, v, m]
];

/** Configuración del modo extremo; `ease` (0 a MAX_EASE) es cuántas derrotas seguidas lleva. */
export function extremeConfig(ease = 0): DifficultyConfig {
  const e = Math.max(0, Math.min(MAX_EASE, Math.round(ease)));
  const base = difficultyConfigs.advanced;
  // Cada derrota quita zombis de cada oleada, desde los últimos.
  const waves = WAVES.map((w, i) => {
    const cut = Math.min(e + 1, Math.floor(w.length / 3));
    const keepBackpack = i === 2;
    const body = w.slice(0, w.length - (keepBackpack ? 1 : 0));
    const trimmed = body.slice(0, body.length - cut);
    return keepBackpack ? [...trimmed, m] : trimmed;
  });
  return {
    ...base,
    hintsAfterWrongAttempts: 99,
    enemySpeedMultiplier: 1.1 - 0.03 * e,
    enemyHealthMultiplier: 1.15 - 0.05 * e,
    towerReloadMultiplier: 1.05 - 0.03 * e,
    baseHealth: 90 + 10 * e,
    wavePauseSeconds: 3 + 0.5 * e,
    spawnIntervalSeconds: 0.7 + 0.05 * e,
    backpackHealthBonus: 2.2 - 0.12 * e,
    label: "EXTREMO",
    waves,
    totalEnemies: waves.reduce((k, w) => k + w.length, 0)
  };
}

/** Nueva suavidad después de una partida: ganar la reinicia; perder suma una. */
export function nextEase(ease: number, won: boolean): number {
  return won ? 0 : Math.min(MAX_EASE, ease + 1);
}
