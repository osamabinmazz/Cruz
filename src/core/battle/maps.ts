import { DEFENSES } from "../defenses";
import type { Point } from "../geometry";
import { CAMP, PATH } from "./data";

/**
 * Los mapas de la campaña. Cada mapa tiene una o más rutas (a partir de la
 * noche 2 el camino se bifurca y vuelve a unirse), la entrada del campamento,
 * el agua si la hay y siete lugares para armas. Todos caben en el campo de
 * 960 × 690 y dejan libre el cielo. Los lugares se calcularon para que, con la
 * colocación recomendada, las armas cubran todas las rutas (cada arma según su
 * alcance).
 */

export type MapTheme = "bosque" | "rio" | "colina" | "lago" | "campamento";
export type MapId = "clasico" | "bosque" | "rio" | "colina" | "lago" | "campamento";

/** Agua del mapa: un río (rectángulo) o un lago (elipse). Las armas no se colocan sobre el agua. */
export interface Water {
  kind: "rect" | "ellipse";
  /** Rectángulo: esquina superior izquierda. Elipse: centro. */
  x: number;
  y: number;
  /** Rectángulo: ancho y alto. Elipse: radios. */
  w: number;
  h: number;
}

export interface BattleMap {
  id: MapId;
  name: string;
  theme: MapTheme;
  /** Rutas de los zombis: cada una va desde el borde del campo hasta el campamento. */
  routes: Point[][];
  /** Ruta principal (la primera). */
  path: Point[];
  camp: Point;
  slots: Point[];
  water: Water[];
}

const pts = (list: [number, number][]): Point[] => list.map(([x, y]) => ({ x, y }));

/**
 * Redondea las esquinas de una ruta con curvas suaves, para que los zombis
 * giren poco a poco y no de golpe.
 */
export function smooth(points: Point[], radius = 48, samples = 8): Point[] {
  if (points.length < 3) return points.map((p) => ({ ...p }));
  const out: Point[] = [{ ...points[0] }];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    const a = { x: p1.x + ((p0.x - p1.x) / d1) * r, y: p1.y + ((p0.y - p1.y) / d1) * r };
    const b = { x: p1.x + ((p2.x - p1.x) / d2) * r, y: p1.y + ((p2.y - p1.y) / d2) * r };
    out.push(a);
    for (let k = 1; k < samples; k++) {
      const t = k / samples;
      const u = 1 - t;
      out.push({ x: u * u * a.x + 2 * u * t * p1.x + t * t * b.x, y: u * u * a.y + 2 * u * t * p1.y + t * t * b.y });
    }
    out.push(b);
  }
  out.push({ ...points[points.length - 1] });
  // Si dos esquinas seguidas usan la mitad del tramo, sus puntos coinciden: se quita el repetido.
  return out.filter((p, i) => i === 0 || Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y) > 1e-6);
}

/** Puntos de control (con esquinas) de las rutas de cada mapa nuevo. */
export const CONTROL: Record<Exclude<MapId, "clasico">, Point[][]> = {
  // Noche 1: un solo camino horizontal con vueltas amplias.
  bosque: [pts([[-20, 290], [720, 290], [720, 420], [200, 420], [200, 560], [905, 560]])],
  // Noche 2: el río se divide en dos brazos alrededor de una isla.
  rio: [
    pts([[-20, 330], [800, 330], [800, 480], [905, 480]]),
    pts([[-20, 330], [300, 330], [300, 520], [640, 520], [640, 330], [800, 330], [800, 480], [905, 480]])
  ],
  // Noche 3: el camino rodea la colina por arriba o por abajo.
  colina: [
    pts([[-20, 310], [700, 310], [700, 430], [905, 430]]),
    pts([[-20, 310], [240, 310], [240, 560], [700, 560], [700, 430], [905, 430]])
  ],
  // Noche 4: se puede rodear el lago por el norte o por el sur.
  lago: [
    pts([[-20, 540], [800, 540], [800, 420], [905, 420]]),
    pts([[-20, 540], [160, 540], [160, 300], [800, 300], [800, 420], [905, 420]])
  ],
  // Noche 5: un atajo evita la vuelta larga.
  campamento: [
    pts([[-20, 300], [260, 300], [260, 540], [520, 540], [520, 380], [780, 380], [780, 520], [905, 520]]),
    pts([[-20, 300], [620, 300], [620, 380], [780, 380], [780, 520], [905, 520]])
  ]
};

function build(
  id: Exclude<MapId, "clasico">,
  name: string,
  theme: MapTheme,
  camp: Point,
  slots: [number, number][],
  water: Water[] = []
): BattleMap {
  const routes = CONTROL[id].map((r) => smooth(r));
  return { id, name, theme, routes, path: routes[0], camp, slots: pts(slots), water };
}

/** El mapa original de la versión 1.0 (partida rápida): un solo camino con esquinas rectas. */
export const MAP_CLASICO: BattleMap = {
  id: "clasico",
  name: "La escuela",
  theme: "campamento",
  routes: [PATH],
  path: PATH,
  camp: CAMP,
  slots: DEFENSES.map((d) => ({ ...d.slot })),
  water: []
};

/** Zona de agua de cada mapa (se usa para colocar armas y dibujar). */
export const WATER: Record<Exclude<MapId, "clasico">, Water[]> = {
  bosque: [],
  rio: [{ kind: "rect", x: 402, y: 250, w: 56, h: 440 }],
  colina: [],
  lago: [{ kind: "ellipse", x: 480, y: 420, w: 190, h: 52 }],
  campamento: []
};

export const MAP_BOSQUE = build("bosque", "El bosque", "bosque", { x: 915, y: 580 }, [[690, 495], [560, 485], [440, 485], [320, 495], [340, 355], [180, 355], [560, 355]], WATER.bosque);
export const MAP_RIO = build("rio", "El río", "rio", { x: 915, y: 500 }, [[860, 345], [500, 585], [560, 435], [800, 565], [360, 585], [740, 465], [160, 395]], WATER.rio);
export const MAP_COLINA = build("colina", "La colina", "colina", { x: 915, y: 450 }, [[610, 425], [400, 625], [480, 465], [770, 495], [310, 425], [770, 365], [130, 385]], WATER.colina);
export const MAP_LAGO = build("lago", "El lago", "lago", { x: 915, y: 440 }, [[490, 605], [850, 555], [230, 465], [860, 315], [290, 365], [120, 605], [730, 405]], WATER.lago);
export const MAP_CAMPAMENTO = build("campamento", "La escuela", "campamento", { x: 915, y: 540 }, [[840, 385], [340, 465], [400, 365], [690, 315], [760, 565], [120, 375], [680, 465]], WATER.campamento);

export const MAPS: Record<MapId, BattleMap> = {
  clasico: MAP_CLASICO,
  bosque: MAP_BOSQUE,
  rio: MAP_RIO,
  colina: MAP_COLINA,
  lago: MAP_LAGO,
  campamento: MAP_CAMPAMENTO
};

/** ¿El punto está sobre el agua (con un margen)? */
export function inWater(p: Point, water: Water[], margin = 0): boolean {
  return water.some((w) =>
    w.kind === "rect"
      ? p.x >= w.x - margin && p.x <= w.x + w.w + margin && p.y >= w.y - margin && p.y <= w.y + w.h + margin
      : ((p.x - w.x) / (w.w + margin)) ** 2 + ((p.y - w.y) / (w.h + margin)) ** 2 <= 1
  );
}
