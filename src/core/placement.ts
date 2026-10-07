import type { PostId } from "./battle/guardians";
import { DEFENSES, type DefenseId } from "./defenses";
import type { Point } from "./geometry";

/**
 * Colocación de las armas antes de la batalla. El mapa tiene siete lugares
 * fijos; cada arma ganada se ubica en uno de ellos (como máximo una por lugar).
 */

/** Los siete lugares del mapa, en el orden de los desafíos. */
export const SLOTS: readonly Point[] = DEFENSES.map((d) => ({ ...d.slot }));

/** Lo que se puede poner en un lugar del mapa: un arma o un puesto de guardianes. */
export type SlotItem = DefenseId | PostId;

/** Lugar (índice en SLOTS) de cada arma o puesto colocado. */
export type Placement = Partial<Record<SlotItem, number>>;

/**
 * Colocación recomendada: cada arma en el lugar de su desafío y los puestos de
 * guardianes en los lugares que queden libres, empezando por el último.
 */
export function defaultPlacement(ids: readonly SlotItem[]): Placement {
  const p: Placement = {};
  const used = new Set<number>();
  for (const id of ids) {
    const i = DEFENSES.findIndex((d) => d.id === id);
    if (i >= 0) {
      p[id] = i;
      used.add(i);
    }
  }
  let next = SLOTS.length - 1;
  for (const id of ids) {
    if (p[id] !== undefined) continue;
    while (used.has(next) && next > 0) next--;
    p[id] = next;
    used.add(next);
  }
  return p;
}

/** Arma o puesto que ocupa un lugar, si hay alguno. */
export function weaponAt(placement: Placement, slot: number): SlotItem | null {
  const entry = (Object.entries(placement) as [SlotItem, number][]).find(([, s]) => s === slot);
  return entry ? entry[0] : null;
}

/**
 * Coloca un arma en un lugar. Si el lugar ya estaba ocupado, las dos armas
 * intercambian sus lugares. Devuelve una colocación nueva.
 */
export function placeWeapon(placement: Placement, id: SlotItem, slot: number): Placement {
  if (slot < 0 || slot >= SLOTS.length) throw new Error("Ese lugar no existe en el mapa.");
  if (placement[id] === undefined) throw new Error("Esa arma no está disponible.");
  const next: Placement = { ...placement };
  const other = weaponAt(placement, slot);
  if (other && other !== id) next[other] = placement[id];
  next[id] = slot;
  return next;
}

/** Comprueba que estén todas las armas, en lugares válidos y sin repetir lugar. */
export function isValidPlacement(placement: Placement, ids: readonly SlotItem[]): boolean {
  const used = new Set<number>();
  for (const id of ids) {
    const s = placement[id];
    if (s === undefined || s < 0 || s >= SLOTS.length || used.has(s)) return false;
    used.add(s);
  }
  return Object.keys(placement).length === ids.length;
}

// ---------- Campaña: se eligen las armas y puestos que se llevan ----------

/** Cuántas cosas caben en el mapa: un lugar por cada una. */
export const MAX_CARRIED = SLOTS.length;

/**
 * Colocación recomendada para la campaña: se llevan primero las armas y, si
 * sobran lugares, los puestos de guardianes. Lo que no cabe queda en reserva.
 */
export function carryDefault(available: readonly SlotItem[]): Placement {
  const weapons = available.filter((id) => !isPostItem(id));
  const posts = available.filter(isPostItem);
  return defaultPlacement([...weapons, ...posts].slice(0, MAX_CARRIED));
}

function isPostItem(id: SlotItem): boolean {
  return id.startsWith("puesto-");
}

/**
 * Pone un arma o un puesto en un lugar. Si ya estaba colocado, intercambia con
 * quien ocupe el lugar; si estaba en reserva, entra y quien ocupaba el lugar
 * pasa a la reserva.
 */
export function putItem(placement: Placement, id: SlotItem, slot: number): Placement {
  if (slot < 0 || slot >= SLOTS.length) throw new Error("Ese lugar no existe en el mapa.");
  if (placement[id] !== undefined) return placeWeapon(placement, id, slot);
  const next: Placement = { ...placement };
  const other = weaponAt(placement, slot);
  if (other) delete next[other];
  next[id] = slot;
  return next;
}

/** Saca un arma o puesto del mapa y lo deja en reserva. */
export function removeItem(placement: Placement, id: SlotItem): Placement {
  const next: Placement = { ...placement };
  delete next[id];
  return next;
}

/** Todo lo colocado está disponible, en lugares válidos y sin repetir lugar. */
export function isValidCarry(placement: Placement, available: readonly SlotItem[]): boolean {
  const used = new Set<number>();
  for (const [id, slot] of Object.entries(placement) as [SlotItem, number][]) {
    if (!available.includes(id)) return false;
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS.length || used.has(slot)) return false;
    used.add(slot);
  }
  return true;
}
