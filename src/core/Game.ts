import { Battle } from "./battle/Battle";
import { ChallengeManager } from "./ChallengeManager";
import type { DefenseId } from "./defenses";
import { difficultyConfigs, levelName, type Difficulty, type DifficultyConfig } from "./difficulty";
import { RescueController, RescueQuestionBank, type RescueStats } from "./rescue/RescueController";
import { createRng, type Rng } from "./rng";

export type Screen = "menu" | "level-select" | "demo" | "challenge" | "synthesis" | "battle" | "final";

export interface FinalSummary {
  difficulty: Difficulty;
  levelMessage: string;
  victory: boolean;
  challengesCompleted: number;
  attempts: number;
  hintsUsed: number;
  zombiesStopped: number;
  baseEnergy: number;
  maxBaseEnergy: number;
  defenses: DefenseId[];
  rescue: RescueStats;
}

/**
 * Máquina de estados de la partida:
 * menú → ELIGE TU NIVEL → (demostración) → 7 desafíos → síntesis → batalla → pantalla final.
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

  startBattle(): void {
    const cm = this.requireChallenges();
    if (!cm.isComplete || this.screen !== "synthesis") {
      throw new Error("La batalla comienza solo después de resolver los siete desafíos.");
    }
    this.battle = new Battle(this.config, { towers: [...cm.unlockedDefenses] });
    this.rescue = new RescueController(this.battle, this.bank!, this.rng);
    this.screen = "battle";
  }

  /** Intentar otra vez la batalla con el mismo nivel, sin repetir los desafíos. */
  retryBattle(): void {
    if (this.screen !== "final" || !this.battle || this.battle.phase !== "defeat") {
      throw new Error("Solo se puede reintentar la batalla después de una derrota.");
    }
    this.screen = "synthesis";
    this.startBattle();
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
      attempts: cm.totalAttempts,
      hintsUsed: cm.hintsUsed,
      zombiesStopped: battle.totalDefeated,
      baseEnergy: battle.baseHealth,
      maxBaseEnergy: battle.maxBaseHealth,
      defenses: [...cm.unlockedDefenses],
      rescue: { ...this.rescue.stats }
    };
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
    this.paused = false;
    this.rng = createRng(this.seed === undefined ? Date.now() : this.seed);
  }
}
