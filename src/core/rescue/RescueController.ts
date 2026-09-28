import type { Battle, Enemy, RescueReward } from "../battle/Battle";
import { shuffle, type Rng } from "../rng";
import { RESCUE_QUESTIONS, type RescueCategory, type RescueOption, type RescueQuestion } from "./questions";

export const REWARD_CATEGORY: Record<RescueReward, RescueCategory> = { bomb: "hard", hero: "easy" };

/** Selecciona preguntas al azar dentro de su categoría, sin repetir durante la partida. */
export class RescueQuestionBank {
  readonly used = new Set<string>();

  constructor(private readonly rng: Rng, readonly questions: readonly RescueQuestion[] = RESCUE_QUESTIONS) {}

  draw(category: RescueCategory): RescueQuestion {
    let candidates = this.questions.filter((q) => q.category === category && !this.used.has(q.id));
    if (candidates.length === 0) {
      // Solo ocurre tras varios reintentos de la batalla: se vuelve a habilitar la categoría.
      for (const q of this.questions) if (q.category === category) this.used.delete(q.id);
      candidates = this.questions.filter((q) => q.category === category);
    }
    const q = candidates[Math.floor(this.rng() * candidates.length)];
    this.used.add(q.id);
    return q;
  }
}

export interface RescueStats {
  triggered: number;
  bombsChosen: number;
  heroesChosen: number;
  correct: number;
  incorrect: number;
  defeatedByBomb: number;
  defeatedByHero: number;
  /** Energía que el zombi detenido habría quitado al campamento, sumada en cada rescate exitoso. */
  damagePrevented: number;
}

export type RescueStage = "idle" | "choosing" | "question" | "result";

export interface RescueResult {
  correct: boolean;
  reward: RescueReward;
  correctOption: RescueOption;
  explanation: string;
  /** Zombis retirados (bomba o héroe), en el orden en que se los derrota. */
  defeated: Enemy[];
  /** Zombi que causó daño al campamento (respuesta incorrecta). */
  damagedBy?: Enemy;
}

/**
 * Coordina la pregunta de emergencia de cada oleada:
 * elegir premio → ver pregunta → responder una sola vez → aplicar resultado → reanudar.
 */
export class RescueController {
  stage: RescueStage = "idle";
  question: RescueQuestion | null = null;
  /** Opciones en el orden en que se presentan. */
  presentedOptions: RescueOption[] = [];
  lastResult: RescueResult | null = null;
  readonly stats: RescueStats = {
    triggered: 0,
    bombsChosen: 0,
    heroesChosen: 0,
    correct: 0,
    incorrect: 0,
    defeatedByBomb: 0,
    defeatedByHero: 0,
    damagePrevented: 0
  };

  constructor(readonly battle: Battle, readonly bank: RescueQuestionBank, private readonly rng: Rng) {}

  /** Llamar cuando la batalla emite "rescue-triggered". */
  open(): void {
    if (this.stage !== "idle") throw new Error("Ya hay un rescate en curso.");
    if (this.battle.heldEnemyId === null) throw new Error("No hay un zombi en la entrada.");
    this.stage = "choosing";
    this.question = null;
    this.presentedOptions = [];
    this.lastResult = null;
    this.stats.triggered++;
  }

  chooseReward(reward: RescueReward): RescueQuestion {
    if (this.stage !== "choosing") throw new Error("El premio ya fue elegido.");
    const q = this.bank.draw(REWARD_CATEGORY[reward]);
    this.battle.rescue.selectedReward = reward;
    this.battle.rescue.questionId = q.id;
    if (reward === "bomb") this.stats.bombsChosen++;
    else this.stats.heroesChosen++;
    this.question = q;
    this.presentedOptions = shuffle(q.options, this.rng);
    this.stage = "question";
    return q;
  }

  /** Única respuesta permitida. Aplica el resultado sobre la batalla, que sigue pausada. */
  answer(optionId: string): RescueResult {
    if (this.stage !== "question" || !this.question) throw new Error("No hay una pregunta pendiente o ya fue respondida.");
    const q = this.question;
    const reward = this.battle.rescue.selectedReward!;
    const correct = optionId === q.correctId;
    this.battle.rescue.answeredCorrectly = correct;
    const heldDamage = this.battle.enemies.find((e) => e.id === this.battle.heldEnemyId)?.damage ?? 0;

    const result: RescueResult = {
      correct,
      reward,
      correctOption: q.options.find((o) => o.id === q.correctId)!,
      explanation: q.explanation,
      defeated: []
    };

    if (correct) {
      this.stats.correct++;
      this.stats.damagePrevented += heldDamage;
      if (reward === "bomb") {
        result.defeated = this.battle.applyBomb();
        this.stats.defeatedByBomb += result.defeated.length;
      } else {
        result.defeated = this.battle.applyHero();
        this.stats.defeatedByHero += result.defeated.length;
      }
    } else {
      this.stats.incorrect++;
      result.damagedBy = this.battle.applyFailedRescue();
    }

    this.stage = "result";
    this.lastResult = result;
    return result;
  }

  /** Cierra la ventana (después de la animación) y reanuda el combate. */
  finish(): void {
    if (this.stage !== "result") throw new Error("El rescate todavía no terminó.");
    this.stage = "idle";
    this.question = null;
    this.presentedOptions = [];
    this.battle.finishRescue();
  }
}
