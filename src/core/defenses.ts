/** Las siete defensas. Cada desafío desbloquea una, siempre en el mismo orden. */
export type DefenseId =
  | "torre-brillo"
  | "cuarteto-luz"
  | "lanza-eje"
  | "gemelas"
  | "guia-punteada"
  | "plomada"
  | "brujula-austral"
  // Armas nuevas de la campaña 2.0 (no existen en la partida rápida).
  | "regla-luz"
  | "faro-lactea"
  | "bumeran-plata";

export type DefenseBehavior = "single" | "multi" | "long" | "twin" | "slow" | "splash" | "reveal" | "pierce" | "pulse" | "boomerang";

export interface DefenseInfo {
  id: DefenseId;
  name: string;
  description: string;
  behavior: DefenseBehavior;
  color: string;
  /** Posición fija en el mapa de la batalla (960 × 690). */
  slot: { x: number; y: number };
  range: number;
  damage: number;
  /** Segundos entre disparos antes de aplicar el multiplicador de dificultad. */
  reload: number;
}

export const DEFENSES: DefenseInfo[] = [
  {
    id: "torre-brillo",
    name: "Torre Brillo",
    description: "Cañón de estrellas: dispara balas de luz a un zombi por vez.",
    behavior: "single",
    color: "#ffe66d",
    slot: { x: 165, y: 340 },
    range: 150,
    damage: 6,
    reload: 0.7
  },
  {
    id: "cuarteto-luz",
    name: "Cuarteto de Luz",
    description: "Torreta de cuatro cañones: alcanza hasta cuatro zombis a la vez.",
    behavior: "multi",
    color: "#9be7ff",
    slot: { x: 335, y: 480 },
    range: 140,
    damage: 3.5,
    reload: 1.1
  },
  {
    id: "lanza-eje",
    name: "Lanza del Eje",
    description: "Ballesta de largo alcance: lanza flechas de luz muy lejos, como el eje mayor.",
    behavior: "long",
    color: "#c3a6ff",
    slot: { x: 400, y: 400 },
    range: 250,
    damage: 13,
    reload: 1.5
  },
  {
    id: "gemelas",
    name: "Gemelas Gacrux y Acrux",
    description: "Cañón doble: dos bocas que disparan juntas.",
    behavior: "twin",
    color: "#ffb870",
    slot: { x: 610, y: 480 },
    range: 150,
    damage: 4.5,
    reload: 0.9
  },
  {
    id: "guia-punteada",
    name: "Guía Punteada",
    description: "Rayo punteado que frena a todos los zombis que alcanza.",
    behavior: "slow",
    color: "#7cf5c4",
    slot: { x: 440, y: 640 },
    range: 150,
    damage: 1.5,
    reload: 0.5
  },
  {
    id: "plomada",
    name: "Plomada del Horizonte",
    description: "Catapulta: lanza piedras estelares que alcanzan a un grupo de zombis.",
    behavior: "splash",
    color: "#ff8fab",
    slot: { x: 690, y: 395 },
    range: 160,
    damage: 7,
    reload: 1.6
  },
  {
    id: "brujula-austral",
    name: "Brújula Austral",
    description: "Faro con rayo de luz: revela a los zombis de niebla y protege la entrada.",
    behavior: "reveal",
    color: "#5ad1ff",
    slot: { x: 880, y: 350 },
    range: 170,
    damage: 8,
    reload: 0.9
  }
];

/**
 * Armas que solo existen en la campaña. No tienen lugar propio en el mapa
 * (`slot` no se usa): la campaña elige 7 de las 10 armas ganadas.
 */
export const EXTRA_DEFENSES: DefenseInfo[] = [
  {
    id: "regla-luz",
    name: "Regla de Luz",
    description: "Rayo recto: atraviesa a todos los zombis que están en línea, como el eje mayor atraviesa la cruz.",
    behavior: "pierce",
    color: "#f6f09a",
    slot: { x: 0, y: 0 },
    range: 230,
    damage: 6,
    reload: 1.3
  },
  {
    id: "faro-lactea",
    name: "Faro de la Vía Láctea",
    description: "Pulso de luz que frena a todos los zombis en una zona grande.",
    behavior: "pulse",
    color: "#b9a8ff",
    slot: { x: 0, y: 0 },
    range: 190,
    damage: 2,
    reload: 2.2
  },
  {
    id: "bumeran-plata",
    name: "Bumerán de Plata",
    description: "Va y vuelve: golpea al zombi dos veces, en la ida y en el regreso.",
    behavior: "boomerang",
    color: "#d8e2ee",
    slot: { x: 0, y: 0 },
    range: 170,
    damage: 7,
    reload: 1.4
  }
];

/** Todas las armas: las siete de siempre y las tres de la campaña. */
export const ALL_DEFENSES: DefenseInfo[] = [...DEFENSES, ...EXTRA_DEFENSES];

export function defenseById(id: DefenseId): DefenseInfo {
  const d = ALL_DEFENSES.find((x) => x.id === id);
  if (!d) throw new Error(`Defensa desconocida: ${id}`);
  return d;
}
