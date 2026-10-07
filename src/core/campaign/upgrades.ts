import type { DefenseId } from "../defenses";

/**
 * Mejoras de las armas en el taller estelar. Cada arma empieza en el nivel 1 y
 * sube hasta el 3 gastando polvo estelar. Cada nivel mejora a la vez el daño,
 * el alcance y la rapidez de disparo.
 */

export const MAX_UPGRADE_LEVEL = 3;

/** Polvo estelar necesario para pasar del nivel 1 al 2 y del 2 al 3. */
export const UPGRADE_COSTS: readonly number[] = [30, 60];

const DAMAGE_PER_LEVEL = 1.3;
const RANGE_PER_LEVEL = 1.1;
const RELOAD_PER_LEVEL = 0.88;

export type Upgrades = Partial<Record<DefenseId, number>>;

export function levelOf(upgrades: Upgrades, id: DefenseId): number {
  return upgrades[id] ?? 1;
}

/** Costo de subir el arma al siguiente nivel, o null si ya está al máximo. */
export function nextUpgradeCost(level: number): number | null {
  if (level >= MAX_UPGRADE_LEVEL) return null;
  return UPGRADE_COSTS[level - 1];
}

export interface WeaponStats {
  damage: number;
  range: number;
  reload: number;
}

export function upgradedStats(base: WeaponStats, level: number): WeaponStats {
  const steps = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, level) - 1);
  return {
    damage: base.damage * DAMAGE_PER_LEVEL ** steps,
    range: base.range * RANGE_PER_LEVEL ** steps,
    reload: base.reload * RELOAD_PER_LEVEL ** steps
  };
}
