import { DEFENSES, type DefenseId } from "./defenses";
import type { Point } from "./geometry";

/**
 * Colocación de las armas antes de la batalla. El mapa tiene siete lugares
 * fijos; cada arma ganada se ubica en uno de ellos (como máximo una por lugar).
 */

/** Los siete lugares del mapa, en el orden de los desafíos. */
export const SLOTS: readonly Point[] = DEFENSES.map((d) => ({ ...d.slot }));

/** Lugar (índice en SLOTS) de cada arma colocada. */
export type Placement = Partial<Record<DefenseId, number>>;

/** Colocación recomendada: cada arma en el lugar de su desafío. */
export function defaultPlacement(ids: readonly DefenseId[]): Placement {
  const p: Placement = {};
  for (const id of ids) p[id] = DEFENSES.findIndex((d) => d.id === id);
  return p;
}

/** Arma que ocupa un lugar, si hay alguna. */
export function weaponAt(placement: Placement, slot: number): DefenseId | null {
  const entry = (Object.entries(placement) as [DefenseId, number][]).find(([, s]) => s === slot);
  return entry ? entry[0] : null;
}

/**
 * Coloca un arma en un lugar. Si el lugar ya estaba ocupado, las dos armas
 * intercambian sus lugares. Devuelve una colocación nueva.
 */
export function placeWeapon(placement: Placement, id: DefenseId, slot: number): Placement {
  if (slot < 0 || slot >= SLOTS.length) throw new Error("Ese lugar no existe en el mapa.");
  if (placement[id] === undefined) throw new Error("Esa arma no está disponible.");
  const next: Placement = { ...placement };
  const other = weaponAt(placement, slot);
  if (other && other !== id) next[other] = placement[id];
  next[id] = slot;
  return next;
}

/** Comprueba que estén todas las armas, en lugares válidos y sin repetir lugar. */
export function isValidPlacement(placement: Placement, ids: readonly DefenseId[]): boolean {
  const used = new Set<number>();
  for (const id of ids) {
    const s = placement[id];
    if (s === undefined || s < 0 || s >= SLOTS.length || used.has(s)) return false;
    used.add(s);
  }
  return Object.keys(placement).length === ids.length;
}
