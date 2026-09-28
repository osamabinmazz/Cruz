import { CHALLENGES, type Challenge, type ChallengeOption, type Hint } from "./challenges";
import type { DefenseId } from "./defenses";
import type { DifficultyConfig } from "./difficulty";

export interface SubmitResult {
  correct: boolean;
  feedback: string;
  /** Opción equivocada retirada temporalmente (solo en Principiante). */
  removedOptionId?: string;
  unlockedDefense?: DefenseId;
}

/**
 * Carga los mismos siete desafíos para cualquier nivel. La configuración de
 * dificultad solo decide cuándo se habilitan las pistas, si se retiran
 * opciones equivocadas, qué se resalta y qué tan explicativa es la
 * retroalimentación.
 */
export class ChallengeManager {
  readonly challenges: readonly Challenge[] = CHALLENGES;
  index = 0;
  totalAttempts = 0;
  hintsUsed = 0;
  readonly unlockedDefenses: DefenseId[] = [];

  /** Estado del desafío actual. */
  wrongAttempts = 0;
  solved = false;
  private removed = new Set<string>();
  private hintIndex = 0;

  constructor(readonly config: DifficultyConfig) {}

  get current(): Challenge {
    return this.challenges[this.index];
  }

  get isComplete(): boolean {
    return this.unlockedDefenses.length === this.challenges.length;
  }

  get completedCount(): number {
    return this.unlockedDefenses.length;
  }

  availableOptions(): ChallengeOption[] {
    return this.current.options.filter((o) => !this.removed.has(o.id));
  }

  removedOptions(): string[] {
    return [...this.removed];
  }

  isHintAvailable(): boolean {
    if (this.solved) return false;
    if (this.config.hintsAvailableFromStart) return true;
    return this.wrongAttempts >= this.config.hintsAfterWrongAttempts;
  }

  /** Errores que faltan para habilitar la pista (0 si ya está disponible). */
  wrongAttemptsUntilHint(): number {
    if (this.isHintAvailable()) return 0;
    return Math.max(0, this.config.hintsAfterWrongAttempts - this.wrongAttempts);
  }

  /** Devuelve la siguiente pista. Las pistas son ilimitadas: al terminar la lista, se repite la última. */
  useHint(): Hint | null {
    if (!this.isHintAvailable()) return null;
    const hints = this.current.hints;
    const hint = hints[Math.min(this.hintIndex, hints.length - 1)];
    this.hintIndex++;
    this.hintsUsed++;
    return hint;
  }

  /** Elementos que se resaltan automáticamente (solo con resaltados guiados). */
  guidedHighlights(): string[] {
    if (!this.config.guidedHighlights || !this.current.guidedHighlight) return [];
    return [this.current.guidedHighlight];
  }

  isAnswerCorrect(answer: string[]): boolean {
    const { mode, correct } = this.current;
    if (mode === "assign") {
      return answer.length === correct.length && answer.every((a, i) => a === correct[i]);
    }
    if (mode === "multi") {
      const set = new Set(answer);
      return set.size === correct.length && correct.every((c) => set.has(c));
    }
    return answer.length === 1 && answer[0] === correct[0];
  }

  submit(answer: string[]): SubmitResult {
    if (this.solved) throw new Error("El desafío ya fue resuelto.");
    this.totalAttempts++;
    const challenge = this.current;
    const explanatory = this.config.feedbackStyle === "explanatory";

    if (this.isAnswerCorrect(answer)) {
      this.solved = true;
      this.unlockedDefenses.push(challenge.defense);
      return {
        correct: true,
        feedback: explanatory ? challenge.feedback.correctExplanatory : challenge.feedback.correctBrief,
        unlockedDefense: challenge.defense
      };
    }

    this.wrongAttempts++;
    const wrongChosen = answer.find((a) => !challenge.correct.includes(a));
    const feedback = explanatory
      ? challenge.feedback.wrongExplanatory[wrongChosen ?? ""] ??
        challenge.feedback.wrongExplanatory.default ??
        challenge.feedback.wrongBrief
      : challenge.feedback.wrongBrief;

    const result: SubmitResult = { correct: false, feedback };
    if (this.config.removeWrongOption) {
      const removedId = this.removeOneWrongOption(answer);
      if (removedId) result.removedOptionId = removedId;
    }
    return result;
  }

  /**
   * Retira temporalmente (hasta terminar el desafío) una opción equivocada.
   * Siempre quedan la o las opciones correctas y al menos una equivocada.
   */
  private removeOneWrongOption(answer: string[]): string | undefined {
    const wrongLeft = this.availableOptions().filter((o) => !this.current.correct.includes(o.id));
    if (wrongLeft.length <= 1) return undefined;
    const chosenWrong = wrongLeft.find((o) => answer.includes(o.id));
    const target = chosenWrong ?? wrongLeft[0];
    this.removed.add(target.id);
    return target.id;
  }

  next(): void {
    if (!this.solved) throw new Error("Primero hay que resolver el desafío actual.");
    if (this.index < this.challenges.length - 1) {
      this.index++;
      this.wrongAttempts = 0;
      this.solved = false;
      this.removed.clear();
      this.hintIndex = 0;
    }
  }
}
