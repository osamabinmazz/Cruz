/**
 * Poderes de las estrellas héroe. El estudiante elige uno antes de cada noche y
 * puede usarlo en plena batalla; después tarda en recargarse.
 */

export type PowerId = "rayo" | "escudo" | "lluvia" | "congelar";

export interface PowerInfo {
  id: PowerId;
  name: string;
  /** Estrella que lo lanza. */
  hero: string;
  color: string;
  /** Segundos de recarga. */
  cooldown: number;
  /** Hay que tocar el campo para lanzarlo. */
  targeted: boolean;
  description: string;
}

export const POWERS: readonly PowerInfo[] = [
  {
    id: "rayo",
    name: "Rayo de Acrux",
    hero: "Acrux",
    color: "#ffe66d",
    cooldown: 25,
    targeted: true,
    description: "Toca un zombi: un rayo lo golpea fuerte y salta a otros tres cercanos."
  },
  {
    id: "escudo",
    name: "Escudo de Mimosa",
    hero: "Mimosa",
    color: "#7cc4ff",
    cooldown: 40,
    targeted: false,
    description: "Cura un poco la escuela y bloquea el próximo golpe de un zombi."
  },
  {
    id: "lluvia",
    name: "Lluvia de Gacrux",
    hero: "Gacrux",
    color: "#ffb870",
    cooldown: 30,
    targeted: true,
    description: "Toca un lugar del campo: caen estrellas que dañan y frenan a los zombis de la zona."
  },
  {
    id: "congelar",
    name: "Congelar de Delta",
    hero: "Delta",
    color: "#aef0ff",
    cooldown: 35,
    targeted: false,
    description: "Congela a todos los zombis durante 4 segundos."
  }
];

export function powerById(id: PowerId): PowerInfo {
  return POWERS.find((p) => p.id === id)!;
}

export function isPowerId(id: unknown): id is PowerId {
  return POWERS.some((p) => p.id === id);
}

/** Daño del rayo al zombi tocado y a los que salta. */
export const RAYO_DAMAGE = 200;
export const RAYO_CHAIN_DAMAGE = 110;
export const RAYO_CHAIN_COUNT = 3;
export const RAYO_CHAIN_REACH = 150;
export const RAYO_TAP_REACH = 80;
/** Lluvia de estrellas: radio, daño y frenado. */
export const LLUVIA_RADIUS = 120;
export const LLUVIA_DAMAGE = 90;
export const LLUVIA_SLOW = 2;
/** Congelar: segundos. */
export const CONGELAR_SECONDS = 4;
/** Escudo: parte de la energía que cura. */
export const ESCUDO_HEAL = 0.15;
