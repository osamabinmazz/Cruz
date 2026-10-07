import type { EnemyKind } from "../difficulty";
import type { Point } from "../geometry";

/** Tamaño lógico del campo de batalla. La franja superior (hasta SKY_HORIZON) es el cielo. */
export const FIELD = { width: 960, height: 690 };

/** Altura del horizonte: por encima está el cielo con la Cruz del Sur que gira. */
export const SKY_HORIZON = 240;

/** Camino de los zombis. El último punto es la entrada del campamento. */
export const PATH: Point[] = [
  { x: -20, y: 260 },
  { x: 250, y: 260 },
  { x: 250, y: 570 },
  { x: 520, y: 570 },
  { x: 520, y: 300 },
  { x: 790, y: 300 },
  { x: 790, y: 510 },
  { x: 905, y: 510 }
];

export const CAMP = { x: 915, y: 530 };

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
  mochila: { name: "Zombi con mochila", health: 484, speed: 36, damage: 30, fog: false },
  saltador: { name: "Zombi saltador", health: 120, speed: 50, damage: 12, fog: false },
  doble: { name: "Zombi doble", health: 180, speed: 46, damage: 14, fog: false },
  mini: { name: "Zombi chiquito", health: 45, speed: 78, damage: 5, fog: false },
  gigante: { name: "Zombi gigante", health: 1500, speed: 28, damage: 60, fog: false }
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

/** Punto del camino más cercano a un punto dado: su distancia recorrida y qué tan lejos está. */
export function closestOnPath(point: Point, path: Point[] = PATH, step = 4): { distance: number; gap: number } {
  const total = pathLength(path);
  let best = { distance: 0, gap: Infinity };
  for (let d = 0; d <= total; d += step) {
    const q = pointAt(d, path);
    const gap = Math.hypot(q.x - point.x, q.y - point.y);
    if (gap < best.gap) best = { distance: d, gap };
  }
  return best;
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
