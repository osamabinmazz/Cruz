/** Las siete defensas. Cada desafío desbloquea una, siempre en el mismo orden. */
export type DefenseId =
  | "torre-brillo"
  | "cuarteto-luz"
  | "lanza-eje"
  | "gemelas"
  | "guia-punteada"
  | "plomada"
  | "brujula-austral";

export type DefenseBehavior = "single" | "multi" | "long" | "twin" | "slow" | "splash" | "reveal";

export interface DefenseInfo {
  id: DefenseId;
  name: string;
  description: string;
  behavior: DefenseBehavior;
  color: string;
  /** Posición fija en el mapa de la batalla (960 × 540). */
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
    description: "Lanza destellos a un zombi por vez.",
    behavior: "single",
    color: "#ffe66d",
    slot: { x: 165, y: 190 },
    range: 150,
    damage: 6,
    reload: 0.7
  },
  {
    id: "cuarteto-luz",
    name: "Cuarteto de Luz",
    description: "Cuatro luces que alcanzan hasta cuatro zombis a la vez.",
    behavior: "multi",
    color: "#9be7ff",
    slot: { x: 335, y: 330 },
    range: 140,
    damage: 3.5,
    reload: 1.1
  },
  {
    id: "lanza-eje",
    name: "Lanza del Eje",
    description: "Un rayo largo como el eje mayor: llega muy lejos.",
    behavior: "long",
    color: "#c3a6ff",
    slot: { x: 400, y: 250 },
    range: 250,
    damage: 13,
    reload: 1.5
  },
  {
    id: "gemelas",
    name: "Gemelas Gacrux y Acrux",
    description: "Dos estrellas que disparan juntas.",
    behavior: "twin",
    color: "#ffb870",
    slot: { x: 610, y: 330 },
    range: 150,
    damage: 4.5,
    reload: 0.9
  },
  {
    id: "guia-punteada",
    name: "Guía Punteada",
    description: "Un camino de puntos luminosos que frena a los zombis.",
    behavior: "slow",
    color: "#7cf5c4",
    slot: { x: 440, y: 490 },
    range: 150,
    damage: 1.5,
    reload: 0.5
  },
  {
    id: "plomada",
    name: "Plomada del Horizonte",
    description: "Deja caer una lluvia de luz sobre un grupo de zombis.",
    behavior: "splash",
    color: "#ff8fab",
    slot: { x: 690, y: 245 },
    range: 160,
    damage: 7,
    reload: 1.6
  },
  {
    id: "brujula-austral",
    name: "Brújula Austral",
    description: "Revela a los zombis de niebla y protege la entrada.",
    behavior: "reveal",
    color: "#5ad1ff",
    slot: { x: 880, y: 235 },
    range: 170,
    damage: 8,
    reload: 0.9
  }
];

export function defenseById(id: DefenseId): DefenseInfo {
  const d = DEFENSES.find((x) => x.id === id);
  if (!d) throw new Error(`Defensa desconocida: ${id}`);
  return d;
}
