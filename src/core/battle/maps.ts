import { DEFENSES } from "../defenses";
import type { Point } from "../geometry";
import { CAMP, PATH } from "./data";

/**
 * Los mapas de la campaña. Cada mapa tiene su camino, la entrada del campamento
 * y siete lugares para armas (el lugar `i` es el recomendado para el arma del
 * desafío `i`). Todos caben en el campo de 960 × 690 y dejan libre el cielo.
 */

export type MapTheme = "bosque" | "rio" | "colina" | "lago" | "campamento";
export type MapId = "campamento" | "bosque" | "rio" | "colina" | "lago";

export interface BattleMap {
  id: MapId;
  name: string;
  theme: MapTheme;
  path: Point[];
  camp: Point;
  slots: Point[];
}

const pts = (list: [number, number][]): Point[] => list.map(([x, y]) => ({ x, y }));

/** El mapa original de la versión 1.0: el campamento grande. */
export const MAP_CAMPAMENTO: BattleMap = {
  id: "campamento",
  name: "El campamento",
  theme: "campamento",
  path: PATH,
  camp: CAMP,
  slots: DEFENSES.map((d) => ({ ...d.slot }))
};

export const MAP_BOSQUE: BattleMap = {
  id: "bosque",
  name: "El bosque",
  theme: "bosque",
  path: pts([[-20, 270], [240, 270], [240, 540], [500, 540], [500, 330], [780, 330], [780, 500], [905, 500]]),
  camp: { x: 915, y: 520 },
  slots: pts([[120, 355], [170, 465], [340, 355], [850, 365], [330, 605], [380, 465], [640, 425]])
};

export const MAP_RIO: BattleMap = {
  id: "rio",
  name: "El río",
  theme: "rio",
  path: pts([[-20, 560], [230, 560], [230, 300], [480, 300], [480, 540], [720, 540], [720, 330], [905, 330]]),
  camp: { x: 915, y: 350 },
  slots: pts([[790, 425], [120, 625], [330, 495], [120, 465], [600, 605], [370, 385], [620, 415]])
};

export const MAP_COLINA: BattleMap = {
  id: "colina",
  name: "La colina",
  theme: "colina",
  path: pts([[-20, 300], [180, 300], [180, 560], [380, 560], [380, 300], [580, 300], [580, 560], [780, 560], [780, 380], [905, 380]]),
  camp: { x: 915, y: 400 },
  slots: pts([[270, 465], [470, 545], [260, 345], [100, 405], [850, 515], [480, 425], [680, 425]])
};

export const MAP_LAGO: BattleMap = {
  id: "lago",
  name: "El lago",
  theme: "lago",
  path: pts([[-20, 520], [300, 520], [300, 300], [620, 300], [620, 540], [905, 540]]),
  camp: { x: 915, y: 560 },
  slots: pts([[520, 395], [250, 585], [400, 425], [130, 585], [710, 605], [160, 445], [760, 445]])
};

export const MAPS: Record<MapId, BattleMap> = {
  campamento: MAP_CAMPAMENTO,
  bosque: MAP_BOSQUE,
  rio: MAP_RIO,
  colina: MAP_COLINA,
  lago: MAP_LAGO
};
