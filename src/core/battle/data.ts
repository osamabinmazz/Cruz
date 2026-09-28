import type { EnemyKind } from "../difficulty";
import type { Point } from "../geometry";

export const FIELD = { width: 960, height: 540 };

/** Camino de los zombis. El último punto es la entrada del campamento. */
export const PATH: Point[] = [
  { x: -20, y: 110 },
  { x: 250, y: 110 },
  { x: 250, y: 420 },
  { x: 520, y: 420 },
  { x: 520, y: 150 },
  { x: 790, y: 150 },
  { x: 790, y: 360 },
  { x: 905, y: 360 }
];

export const CAMP = { x: 915, y: 380 };

export interface EnemyStats {
  name: string;
  health: number;
  /** Píxeles por segundo. */
  speed: number;
  /** Energía que resta al campamento si llega a la entrada. */
  damage: number;
  fog: boolean;
}

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  comun: { name: "Zombi común", health: 97, speed: 52, damage: 10, fog: false },
  veloz: { name: "Zombi veloz", health: 62, speed: 88, damage: 8, fog: false },
  resistente: { name: "Zombi resistente", health: 264, speed: 38, damage: 20, fog: false },
  niebla: { name: "Zombi de niebla", health: 110, speed: 56, damage: 12, fog: true },
  mochila: { name: "Zombi con mochila", health: 484, speed: 36, damage: 30, fog: false }
};

/** Fracción del alcance en que una defensa puede ver a un zombi de niebla no revelado. */
export const FOG_VISIBILITY = 0.5;
export const PROJECTILE_SPEED = 460;
export const SPLASH_RADIUS = 70;
export const SLOW_FACTOR = 0.55;
export const SLOW_DURATION = 0.8;
export const REVEAL_RADIUS = 230;

export function pathLength(path: Point[] = PATH): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return total;
}

export function pointAt(distance: number, path: Point[] = PATH): Point {
  let d = Math.max(0, distance);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    d -= seg;
  }
  return { ...path[path.length - 1] };
}

export type Facing = "right" | "left" | "down" | "up";

/** Hacia dónde mira un zombi según el tramo del camino en que se encuentra. */
export function facingAt(distance: number, path: Point[] = PATH): Facing {
  let d = Math.max(0, distance);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= seg || i === path.length - 1) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
      return dy >= 0 ? "down" : "up";
    }
    d -= seg;
  }
  return "right";
}
