import { ALL_CHALLENGES, type Challenge } from "../challenges";
import type { DifficultyConfig, EnemyKind } from "../difficulty";
import type { MapId } from "../battle/maps";

/**
 * Las cinco noches de la campaña. Cada noche trabaja un paso del procedimiento,
 * trae sus desafíos nuevos (más los de repaso de armas perdidas) y termina con
 * una batalla en un mapa distinto. La última noche no trae desafíos nuevos: es
 * el repaso final y la batalla más grande.
 */

export const TOTAL_NIGHTS = 5;

export interface NightPlan {
  number: number;
  name: string;
  /** Paso del procedimiento que se practica. */
  focus: string;
  story: string;
  map: MapId;
  /** Índices (en ALL_CHALLENGES) de los desafíos nuevos de esta noche. */
  challengeIndexes: number[];
}

export const NIGHTS: readonly NightPlan[] = [
  {
    number: 1,
    name: "El bosque",
    focus: "ENCONTRAR",
    story: "Cae la primera noche. Aprende a reconocer la Cruz del Sur entre todas las estrellas.",
    map: "bosque",
    challengeIndexes: [0, 1]
  },
  {
    number: 2,
    name: "El río",
    focus: "ENCONTRAR",
    story: "Junto al río, las estrellas se reflejan. Busca el eje mayor, ubica a Gacrux y a Acrux y reconoce la cruz aunque esté inclinada.",
    map: "rio",
    challengeIndexes: [2, 3, 7]
  },
  {
    number: 3,
    name: "La colina",
    focus: "SEGUIR",
    story: "Desde la colina se ve todo el cielo. Sigue la prolongación del eje mayor y calcula hasta dónde llega.",
    map: "colina",
    challengeIndexes: [4, 8]
  },
  {
    number: 4,
    name: "El lago",
    focus: "BAJAR",
    story: "El lago está quieto. Baja hasta el horizonte, marca el Sur aproximado y encuentra qué hay allí en el paisaje.",
    map: "lago",
    challengeIndexes: [5, 6, 9]
  },
  {
    number: 5,
    name: "La escuela",
    focus: "REPASO FINAL",
    story: "La noche más larga. Repasa lo aprendido y defiende la escuela con todas tus armas.",
    map: "campamento",
    challengeIndexes: []
  }
];

export function nightPlan(number: number): NightPlan {
  const plan = NIGHTS[number - 1];
  if (!plan) throw new Error("Esa noche no existe.");
  return plan;
}

/** Desafíos nuevos de una noche. */
export function newChallengesOf(number: number): Challenge[] {
  return nightPlan(number).challengeIndexes.map((i) => ALL_CHALLENGES[i]);
}

/** Cambia el zombi de una posición de la oleada. */
function swap(wave: EnemyKind[], index: number, kind: EnemyKind): EnemyKind[] {
  const copy = [...wave];
  copy[Math.min(index, copy.length - 1)] = kind;
  return copy;
}

/** Oleadas de una noche, a partir de las tres oleadas del nivel elegido (con los zombis nuevos). */
export function nightWaves(number: number, config: DifficultyConfig): EnemyKind[][] {
  const [w1, w2, w3] = config.waves;
  switch (number) {
    case 1:
      return [w1.slice(0, 4), w2.slice(0, 4)];
    case 2:
      return [w1, w2];
    case 3:
      // Aparece el zombi saltador.
      return [w1, swap(w2, 2, "saltador"), [...w3.slice(0, 4), "saltador", "saltador"]];
    case 4:
      // Aparece el zombi doble.
      return [swap(w1, 3, "doble"), swap(w2, 3, "doble"), swap(w3, 4, "doble")];
    default:
      // Noche final: todos los zombis y, al final, el gigante.
      return [
        swap(w1, 2, "saltador"),
        swap(w2, 3, "doble"),
        w3,
        ["resistente", "veloz", "niebla", "saltador", "resistente", "doble", "niebla", "mochila", "gigante"]
      ];
  }
}

/** Las primeras noches son más suaves: los zombis son menos resistentes y más lentos. */
const NIGHT_EASE: Record<number, number> = { 1: 0.7, 2: 0.82, 3: 0.92 };

/** Configuración de la batalla de una noche: la del nivel, con las oleadas y la suavidad de esa noche. */
export function nightConfig(number: number, config: DifficultyConfig): DifficultyConfig {
  const waves = nightWaves(number, config);
  const ease = NIGHT_EASE[number] ?? 1;
  return {
    ...config,
    waves,
    totalEnemies: waves.reduce((n, w) => n + w.length, 0),
    enemyHealthMultiplier: config.enemyHealthMultiplier * ease,
    enemySpeedMultiplier: config.enemySpeedMultiplier * (1 - (1 - ease) / 2)
  };
}
