/**
 * Configuración centralizada de los dos niveles de dificultad.
 *
 * Ambos niveles cargan exactamente los mismos siete desafíos y el mismo banco
 * de preguntas de rescate. Este objeto solo controla la presentación de
 * pistas, los resaltados, la retroalimentación y los parámetros de la batalla.
 */
export type Difficulty = "beginner" | "advanced";

export type EnemyKind = "comun" | "veloz" | "resistente" | "niebla" | "mochila";

export interface DifficultyConfig {
  hintsAvailableFromStart: boolean;
  hintsAfterWrongAttempts: number;
  removeWrongOption: boolean;
  guidedHighlights: boolean;
  introductoryDemonstration: boolean;
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;
  towerReloadMultiplier: number;
  baseHealth: number;
  totalEnemies: number;
  wavePauseSeconds: number;

  /** Nombre visible del nivel. */
  label: string;
  /** Mensajes explicativos (Principiante) o breves (Avanzado). */
  feedbackStyle: "explanatory" | "brief";
  /** Barra superior ENCONTRAR / SEGUIR / BAJAR. */
  showProcedureSteps: boolean;
  /** Línea-guía punteada con mayor intensidad. */
  intenseGuideLine: boolean;
  /** Animación que recuerda qué significa "eje mayor". */
  axisReminderAnimation: boolean;
  /** Avisos antes de cada oleada. */
  waveWarnings: boolean;
  /** Segundos entre la aparición de un zombi y el siguiente dentro de una oleada. */
  spawnIntervalSeconds: number;
  /** Resistencia adicional del último zombi con mochila. */
  backpackHealthBonus: number;
  /** Composición de las tres oleadas, en orden de aparición. */
  waves: EnemyKind[][];
}

const c: EnemyKind = "comun";
const v: EnemyKind = "veloz";
const r: EnemyKind = "resistente";
const n: EnemyKind = "niebla";
const m: EnemyKind = "mochila";

export const difficultyConfigs: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    hintsAvailableFromStart: true,
    hintsAfterWrongAttempts: 0,
    removeWrongOption: true,
    guidedHighlights: true,
    introductoryDemonstration: true,
    enemySpeedMultiplier: 0.8,
    enemyHealthMultiplier: 0.8,
    towerReloadMultiplier: 0.85,
    baseHealth: 150,
    totalEnemies: 18,
    wavePauseSeconds: 8,

    label: "PRINCIPIANTE",
    feedbackStyle: "explanatory",
    showProcedureSteps: true,
    intenseGuideLine: true,
    axisReminderAnimation: true,
    waveWarnings: true,
    spawnIntervalSeconds: 1.7,
    backpackHealthBonus: 1,
    waves: [
      [c, c, v, c, c],
      [c, v, c, r, c, v],
      [c, v, n, r, c, n, m]
    ]
  },
  advanced: {
    hintsAvailableFromStart: false,
    hintsAfterWrongAttempts: 2,
    removeWrongOption: false,
    guidedHighlights: false,
    introductoryDemonstration: false,
    enemySpeedMultiplier: 1,
    enemyHealthMultiplier: 1,
    towerReloadMultiplier: 1,
    baseHealth: 100,
    totalEnemies: 24,
    wavePauseSeconds: 4,

    label: "AVANZADO",
    feedbackStyle: "brief",
    showProcedureSteps: false,
    intenseGuideLine: false,
    axisReminderAnimation: false,
    waveWarnings: false,
    spawnIntervalSeconds: 1.0,
    backpackHealthBonus: 1.6,
    waves: [
      [c, c, v, c, v, c, c],
      [c, v, r, c, n, v, r, c],
      [c, v, r, n, c, v, n, r, m]
    ]
  }
};

export const DIFFICULTIES: Difficulty[] = ["beginner", "advanced"];

export function levelName(difficulty: Difficulty): string {
  return difficulty === "beginner" ? "Principiante" : "Avanzado";
}

export const LEVEL_INFO_TEXT =
  "Los dos niveles enseñan el mismo procedimiento y presentan los mismos siete problemas. " +
  "Solo cambia la cantidad de ayuda y la dificultad de la batalla.";

export const LEVEL_DESCRIPTIONS: Record<Difficulty, string> = {
  beginner: "Los mismos desafíos, con más pistas y una batalla más tranquila.",
  advanced: "Los mismos desafíos, con menos ayudas y una batalla más intensa."
};
