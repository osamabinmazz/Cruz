import { Battle } from "./battle/Battle";
import { ChallengeManager, type ChallengeOutcome } from "./ChallengeManager";
import type { DefenseId } from "./defenses";
import { difficultyConfigs, levelName, type Difficulty, type DifficultyConfig } from "./difficulty";
import { RescueController, RescueQuestionBank, type RescueStats } from "./rescue/RescueController";
import { createRng, type Rng } from "./rng";
import { defaultPlacement, isValidPlacement, placeWeapon, type Placement } from "./placement";

export type Screen = "menu" | "level-select" | "mission" | "demo" | "challenge" | "synthesis" | "placement" | "battle" | "final";

/** Datos que se guardan para poder continuar una partida. */
export interface SaveData {
  version: 1;
  difficulty: Difficulty;
  outcomes: ChallengeOutcome[];
  totalAttempts: number;
  hintsUsed: number;
  usedQuestions: string[];
  placement: Placement | null;
  /** Dónde se retoma: los desafíos, la síntesis o la colocación de armas (la batalla vuelve a empezar). */
  stage: "challenge" | "synthesis" | "placement";
}

export interface FinalSummary {
  difficulty: Difficulty;
  levelMessage: string;
  victory: boolean;
  challengesCompleted: number;
  correctAnswers: number;
  attempts: number;
  hintsUsed: number;
  zombiesStopped: number;
  baseEnergy: number;
  maxBaseEnergy: number;
  defenses: DefenseId[];
  /** Defensas perdidas: sus lugares quedaron vacíos en el mapa. */
  lostDefenses: DefenseId[];
  rescue: RescueStats;
}

/**
 * Máquina de estados de la partida:
 * menú → ELIGE TU NIVEL → misión → (demostración) → 7 desafíos → síntesis → colocar armas → batalla → pantalla final.
 *
 * El nivel se elige una sola vez por partida. Solo puede cambiarse reiniciando
 * la partida o volviendo al menú principal.
 */
export class Game {
  screen: Screen = "menu";
  difficulty: Difficulty | null = null;
  challenges: ChallengeManager | null = null;
  battle: Battle | null = null;
  rescue: RescueController | null = null;
  bank: RescueQuestionBank | null = null;
  paused = false;
  /** Lugar elegido para cada arma ganada (pantalla de colocación). */
  placement: Placement | null = null;
  private rng: Rng;

  constructor(private readonly seed?: number) {
    this.rng = createRng(seed);
  }

  get config(): DifficultyConfig {
    if (!this.difficulty) throw new Error("Todavía no se eligió un nivel.");
    return difficultyConfigs[this.difficulty];
  }

  /** Botón COMENZAR: siempre conduce a la elección de nivel. */
  start(): void {
    this.reset();
    this.screen = "level-select";
  }

  selectDifficulty(difficulty: Difficulty): void {
    if (this.screen !== "level-select" || this.difficulty !== null) {
      throw new Error("El nivel solo puede elegirse al comenzar o al reiniciar la partida.");
    }
    this.difficulty = difficulty;
    this.challenges = new ChallengeManager(this.config);
    this.bank = new RescueQuestionBank(this.rng);
    this.screen = "mission";
  }

  /** Pantalla de misión: anticipa el juego y sus reglas antes del primer desafío. */
  acceptMission(): void {
    if (this.screen !== "mission") throw new Error("No se está mostrando la misión.");
    this.screen = this.config.introductoryDemonstration ? "demo" : "challenge";
  }

  finishDemo(): void {
    if (this.screen !== "demo") throw new Error("No se está mostrando la demostración.");
    this.screen = "challenge";
  }

  /** Avanza al siguiente desafío o, si se resolvieron los siete, a la síntesis. */
  nextChallenge(): void {
    const cm = this.requireChallenges();
    if (cm.isComplete) {
      this.screen = "synthesis";
      return;
    }
    cm.next();
  }

  /** Desde la síntesis, pasa a colocar las armas ganadas en el mapa. */
  goToPlacement(): void {
    const cm = this.requireChallenges();
    if (!cm.isComplete || this.screen !== "synthesis") {
      throw new Error("Primero hay que responder los siete desafíos.");
    }
    if (!this.placement || !isValidPlacement(this.placement, cm.unlockedDefenses)) {
      this.placement = defaultPlacement(cm.unlockedDefenses);
    }
    this.screen = "placement";
  }

  /** Coloca un arma en un lugar del mapa (si estaba ocupado, intercambian lugares). */
  placeWeapon(id: DefenseId, slot: number): void {
    if (this.screen !== "placement" || !this.placement) throw new Error("No se están colocando las armas.");
    this.placement = placeWeapon(this.placement, id, slot);
  }

  /** Vuelve a la colocación recomendada: cada arma en el lugar de su desafío. */
  resetPlacement(): void {
    if (this.screen !== "placement") throw new Error("No se están colocando las armas.");
    this.placement = defaultPlacement(this.requireChallenges().unlockedDefenses);
  }

  startBattle(): void {
    const cm = this.requireChallenges();
    if (!cm.isComplete || (this.screen !== "synthesis" && this.screen !== "placement")) {
      throw new Error("La batalla comienza solo después de responder los siete desafíos.");
    }
    const towers = [...cm.unlockedDefenses];
    if (!this.placement || !isValidPlacement(this.placement, towers)) this.placement = defaultPlacement(towers);
    this.battle = new Battle(this.config, { towers, placement: this.placement });
    this.rescue = new RescueController(this.battle, this.bank!, this.rng);
    this.screen = "battle";
  }

  /** Intentar otra vez la batalla con el mismo nivel, sin repetir los desafíos. */
  retryBattle(): void {
    if (this.screen !== "final" || !this.battle || this.battle.phase !== "defeat") {
      throw new Error("Solo se puede reintentar la batalla después de una derrota.");
    }
    // Se puede repensar la colocación antes de volver a intentarlo.
    this.battle = null;
    this.rescue = null;
    this.screen = "placement";
  }

  goToFinal(): void {
    if (!this.battle?.isOver) throw new Error("La batalla todavía no terminó.");
    this.screen = "final";
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
    this.battle?.pause("menu");
  }

  resume(): void {
    this.paused = false;
    this.battle?.resume("menu");
  }

  /** REINICIAR PARTIDA: vuelve a pedir el nivel. */
  restart(): void {
    this.start();
  }

  /** VOLVER AL MENÚ. */
  backToMenu(): void {
    this.reset();
    this.screen = "menu";
  }

  summary(): FinalSummary {
    const cm = this.requireChallenges();
    const battle = this.battle;
    if (!battle || !this.rescue) throw new Error("No hay una batalla para resumir.");
    return {
      difficulty: this.difficulty!,
      levelMessage: `Completaste el recorrido en nivel ${levelName(this.difficulty!)}.`,
      victory: battle.phase === "victory",
      challengesCompleted: cm.completedCount,
      correctAnswers: cm.correctCount,
      attempts: cm.totalAttempts,
      hintsUsed: cm.hintsUsed,
      zombiesStopped: battle.totalDefeated,
      baseEnergy: battle.baseHealth,
      maxBaseEnergy: battle.maxBaseHealth,
      defenses: [...cm.unlockedDefenses],
      lostDefenses: [...cm.lostDefenses],
      rescue: { ...this.rescue.stats }
    };
  }

  /** Datos para continuar la partida más tarde, o null si no hay una partida en curso. */
  snapshot(): SaveData | null {
    if (!this.difficulty || !this.challenges || !this.bank) return null;
    const cm = this.challenges;
    let stage: SaveData["stage"];
    if (this.screen === "placement" || this.screen === "battle") stage = "placement";
    else if (this.screen === "synthesis") stage = "synthesis";
    else if (["mission", "demo", "challenge"].includes(this.screen)) stage = "challenge";
    else return null;
    return {
      version: 1,
      difficulty: this.difficulty,
      outcomes: [...cm.outcomes],
      totalAttempts: cm.totalAttempts,
      hintsUsed: cm.hintsUsed,
      usedQuestions: [...this.bank.used],
      placement: this.placement ? { ...this.placement } : null,
      stage
    };
  }

  /** Retoma una partida guardada con el mismo nivel. Una batalla en curso vuelve a empezar. */
  restore(data: SaveData): void {
    if (data.version !== 1 || data.outcomes.length > 7) throw new Error("Partida guardada no válida.");
    this.reset();
    this.difficulty = data.difficulty;
    this.challenges = new ChallengeManager(this.config);
    this.challenges.restore(data.outcomes, data.totalAttempts, data.hintsUsed);
    this.bank = new RescueQuestionBank(this.rng);
    for (const id of data.usedQuestions) this.bank.used.add(id);
    const complete = this.challenges.isComplete;
    if (!complete) {
      this.screen = "challenge";
      return;
    }
    const valid = data.placement && isValidPlacement(data.placement, this.challenges.unlockedDefenses);
    this.placement = valid ? { ...data.placement! } : defaultPlacement(this.challenges.unlockedDefenses);
    this.screen = data.stage === "placement" ? "placement" : "synthesis";
  }

  private requireChallenges(): ChallengeManager {
    if (!this.challenges) throw new Error("La partida no comenzó.");
    return this.challenges;
  }

  private reset(): void {
    this.difficulty = null;
    this.challenges = null;
    this.battle = null;
    this.rescue = null;
    this.bank = null;
    this.placement = null;
    this.paused = false;
    this.rng = createRng(this.seed === undefined ? Date.now() : this.seed);
  }
}
