import type { Point } from "../geometry";
import { closestOnPath, pathLength, pointAt } from "./data";

/**
 * Guardianes: pequeñas estrellas con escudo y espada de luz. Cada puesto envía
 * dos al camino; un zombi que llega hasta ellas se detiene y pelea cuerpo a
 * cuerpo. Los puestos ocupan los mismos lugares del mapa que las armas.
 */

export type PostId = "puesto-1" | "puesto-2" | "puesto-3";
export const POST_IDS: readonly PostId[] = ["puesto-1", "puesto-2", "puesto-3"];
export const MAX_POSTS = POST_IDS.length;

export const GUARDIANS_PER_POST = 2;
/** Polvo estelar que cuesta volver a convocar a una estrellita caída. */
export const SUMMON_COST = 3;
/** Qué tan lejos del puesto puede quedar su punto de reunión. */
export const RALLY_RADIUS = 170;
/** Separación (a lo largo del camino) entre las dos estrellitas de un puesto. */
export const GUARDIAN_SPACING = 26;
/** Distancia (en el campo) a la que un zombi alcanza a un guardián. */
export const BLOCK_REACH = 22;
/** Probabilidad de que un zombi veloz se escabulla de un guardián. */
export const DODGE_CHANCE = 0.3;
/** Segundos entre golpes de un zombi a un guardián. */
export const ENEMY_STRIKE_INTERVAL = 1;
/** Velocidad con la que un guardián libre va a su punto de reunión. */
export const GUARDIAN_SPEED = 120;

/** Daño por golpe de un zombi a un guardián. */
export function enemyStrike(enemyDamage: number): number {
  return Math.max(4, Math.round(enemyDamage * 0.7));
}

export function isPostId(id: string): id is PostId {
  return (POST_IDS as readonly string[]).includes(id);
}

export function postNumber(id: PostId): number {
  return POST_IDS.indexOf(id) + 1;
}

const BASE = { health: 110, damage: 13, interval: 0.9 };
const HEALTH_PER_LEVEL = 1.35;
const DAMAGE_PER_LEVEL = 1.3;

export interface GuardianStats {
  health: number;
  damage: number;
  interval: number;
}

export function guardianStats(level: number): GuardianStats {
  const steps = Math.max(0, Math.min(3, level) - 1);
  return {
    health: Math.round(BASE.health * HEALTH_PER_LEVEL ** steps),
    damage: BASE.damage * DAMAGE_PER_LEVEL ** steps,
    interval: BASE.interval
  };
}

export interface Guardian {
  id: number;
  post: PostId;
  index: number;
  health: number;
  maxHealth: number;
  damage: number;
  interval: number;
  cooldown: number;
  state: "alive" | "down";
  /** Ruta sobre la que está parado. */
  route: number;
  /** Distancia sobre su ruta en la que está ahora. */
  distance: number;
  /** Distancia sobre el camino en la que debe pararse (el punto de reunión). */
  target: number;
  /** Zombi con el que pelea ahora. */
  blocking: number | null;
  /** Tiempo restante de la animación de golpe (solo visual). */
  swing: number;
}

export interface Post {
  id: PostId;
  x: number;
  y: number;
  level: number;
  /** Ruta y distancia sobre ella del punto de reunión. */
  rallyRoute: number;
  rally: number;
  guardians: Guardian[];
}

/** Un punto de reunión: una ruta y la distancia recorrida sobre ella. */
export interface Rally {
  route: number;
  distance: number;
}

/** Punto de reunión por defecto: el punto de cualquier ruta más cercano al puesto. */
export function defaultRally(at: Point, routes: Point[][]): Rally {
  let best: Rally & { gap: number } = { route: 0, distance: 0, gap: Infinity };
  routes.forEach((path, route) => {
    const c = closestOnPath(at, path);
    if (c.gap < best.gap) best = { route, distance: c.distance, gap: c.gap };
  });
  return { route: best.route, distance: best.distance };
}

/**
 * Nuevo punto de reunión a partir de un toque en el mapa: el punto de ruta más
 * cercano al toque que esté dentro del radio del puesto. Devuelve null si el
 * toque queda lejos de las rutas o del puesto.
 */
export function rallyFromTap(post: { x: number; y: number }, tap: Point, routes: Point[][]): Rally | null {
  let best: (Rally & { gap: number }) | null = null;
  routes.forEach((path, route) => {
    const total = pathLength(path);
    for (let d = 0; d <= total; d += 4) {
      const p = pointAt(d, path);
      if (Math.hypot(p.x - post.x, p.y - post.y) > RALLY_RADIUS) continue;
      const gap = Math.hypot(p.x - tap.x, p.y - tap.y);
      if (!best || gap < best.gap) best = { route, distance: d, gap };
    }
  });
  const found = best as (Rally & { gap: number }) | null;
  return found && found.gap <= 70 ? { route: found.route, distance: found.distance } : null;
}
