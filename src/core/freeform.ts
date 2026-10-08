import { CROSS, SOUTH_POINT, type Point } from "./geometry";

/**
 * Respuestas libres de los desafíos activos: trazar con el dedo el eje mayor
 * (desafío 3) y tocar el punto del horizonte que marca el Sur (desafío 7).
 * La respuesta viaja como texto: "trace:x1,y1,x2,y2" o "point:x".
 */
export const TRACE_TOLERANCE = 28;
export const POINT_TOLERANCE = 22;
/** Un trazo más corto que esto se toma como un toque, no como una línea. */
export const MIN_TRACE_LENGTH = 25;

export type Interaction = "trace" | "point";

export function traceAnswer(a: Point, b: Point): string {
  return `trace:${Math.round(a.x)},${Math.round(a.y)},${Math.round(b.x)},${Math.round(b.y)}`;
}

export function pointAnswer(x: number): string {
  return `point:${Math.round(x)}`;
}

export function parseTrace(answer: string): [Point, Point] | null {
  const m = /^trace:(-?\d+),(-?\d+),(-?\d+),(-?\d+)$/.exec(answer);
  if (!m) return null;
  return [
    { x: Number(m[1]), y: Number(m[2]) },
    { x: Number(m[3]), y: Number(m[4]) }
  ];
}

export function parsePoint(answer: string): number | null {
  const m = /^point:(-?\d+)$/.exec(answer);
  return m ? Number(m[1]) : null;
}

const d = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** El trazo une Gacrux con Acrux (en cualquier sentido), con margen para el dedo. */
export function isAxisTrace(a: Point, b: Point): boolean {
  const g = CROSS.gacrux;
  const c = CROSS.acrux;
  return (d(a, g) <= TRACE_TOLERANCE && d(b, c) <= TRACE_TOLERANCE) || (d(a, c) <= TRACE_TOLERANCE && d(b, g) <= TRACE_TOLERANCE);
}

export function isSouthPoint(x: number): boolean {
  return Math.abs(x - SOUTH_POINT.x) <= POINT_TOLERANCE;
}

export function isFreeformCorrect(kind: Interaction, answer: string): boolean {
  if (kind === "trace") {
    const t = parseTrace(answer);
    return !!t && isAxisTrace(t[0], t[1]);
  }
  const x = parsePoint(answer);
  return x !== null && isSouthPoint(x);
}

/** Texto de la respuesta correcta que se muestra después de un error. */
export function freeformCorrectText(kind: Interaction): string {
  return kind === "trace" ? "una línea que va de Gacrux (arriba) a Acrux (abajo)" : "el punto del horizonte justo debajo del extremo de la guía";
}
