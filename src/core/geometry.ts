/**
 * Coordenadas de la escena del cielo usadas por los desafíos, la síntesis y
 * las preguntas con imagen. Todas las escenas comparten el mismo modelo de la
 * Cruz del Sur para que ambos niveles vean las mismas representaciones.
 */
export interface Point {
  x: number;
  y: number;
}

export const SKY = { width: 400, height: 300, horizonY: 262 };

const gacrux: Point = { x: 150, y: 26 };
const acrux: Point = { x: 198, y: 112 };
const axis = { x: acrux.x - gacrux.x, y: acrux.y - gacrux.y };
const center: Point = { x: gacrux.x + axis.x * 0.4, y: gacrux.y + axis.y * 0.4 };
const len = Math.hypot(axis.x, axis.y);
const perp = { x: axis.y / len, y: -axis.x / len };

export const CROSS = {
  gacrux,
  acrux,
  mimosa: { x: center.x - perp.x * 40, y: center.y - perp.y * 40 },
  delta: { x: center.x + perp.x * 32, y: center.y + perp.y * 32 }
};

/** Estrella más débil de la constelación y otras estrellas del fondo. */
export const EXTRA_STARS = {
  epsilon: { x: 213, y: 84 },
  lejana1: { x: 292, y: 40 },
  lejana2: { x: 88, y: 150 }
};

/** Punto del cielo donde termina la línea-guía (prolongación desde Acrux). */
export const GUIDE_END: Point = { x: acrux.x + axis.x * 1.2, y: acrux.y + axis.y * 1.2 };

/** Punto del horizonte directamente debajo del extremo de la guía: Sur aproximado. */
export const SOUTH_POINT: Point = { x: GUIDE_END.x, y: SKY.horizonY };

export function below(p: Point): Point {
  return { x: p.x, y: SKY.horizonY };
}

/** Rota un punto alrededor de un centro (grados). */
export function rotate(p: Point, c: Point, degrees: number): Point {
  const a = (degrees * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}
