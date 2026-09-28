import { CHALLENGES, type Challenge, type ChallengeOption, type Hint } from "./challenges";
import type { DefenseId } from "./defenses";
import type { DifficultyConfig } from "./difficulty";

export interface SubmitResult {
  correct: boolean;
  feedback: string;
  unlockedDefense?: DefenseId;
  /** Defensa que se pierde por responder mal: su lugar del mapa queda vacío. */
  lostDefense?: DefenseId;
  /** Respuesta correcta, para mostrarla después de un error. */
  correctAnswer?: string[];
}

export type ChallengeOutcome = "won" | "lost";

/**
 * Carga los mismos siete desafíos para cualquier nivel. Cada desafío tiene un
 * solo intento: si la respuesta es correcta se desbloquea su arma; si es
 * incorrecta se muestra la respuesta correcta y el lugar de esa arma queda
 * vacío en el mapa. La configuración de dificultad solo decide cuándo se
 * habilitan las pistas, qué se resalta y qué tan explicativa es la
 * retroalimentación.
 */
export class ChallengeManager {
  readonly challenges: readonly Challenge[] = CHALLENGES;
  index = 0;
  totalAttempts = 0;
  hintsUsed = 0;
  readonly unlockedDefenses: DefenseId[] = [];
  /** Defensas perdidas por respuestas incorrectas (lugares vacíos en el mapa). */
  readonly lostDefenses: DefenseId[] = [];
  /** Resultado de cada desafío ya respondido, en orden. */
  readonly outcomes: ChallengeOutcome[] = [];

  /** Estado del desafío actual. */
  wrongAttempts = 0;
  solved = false;
  private hintIndex = 0;

  constructor(readonly config: DifficultyConfig) {}

  get current(): Challenge {
    return this.challenges[this.index];
  }

  /** Los siete desafíos ya fueron respondidos (bien o mal). */
  get isComplete(): boolean {
    return this.outcomes.length === this.challenges.length;
  }

  get completedCount(): number {
    return this.outcomes.length;
  }

  get correctCount(): number {
    return this.outcomes.filter((o) => o === "won").length;
  }

  /** Resultado del desafío actual, si ya se respondió. */
  get currentOutcome(): ChallengeOutcome | null {
    return this.outcomes[this.index] ?? null;
  }

  availableOptions(): ChallengeOption[] {
    return [...this.current.options];
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

    // Un solo intento: el desafío termina con esta respuesta.
    this.solved = true;
    if (this.isAnswerCorrect(answer)) {
      this.unlockedDefenses.push(challenge.defense);
      this.outcomes.push("won");
      return {
        correct: true,
        feedback: explanatory ? challenge.feedback.correctExplanatory : challenge.feedback.correctBrief,
        unlockedDefense: challenge.defense
      };
    }

    this.wrongAttempts++;
    this.lostDefenses.push(challenge.defense);
    this.outcomes.push("lost");
    const wrongChosen = answer.find((a) => !challenge.correct.includes(a));
    const feedback = explanatory
      ? challenge.feedback.wrongExplanatory[wrongChosen ?? ""] ??
        challenge.feedback.wrongExplanatory.default ??
        challenge.feedback.wrongBrief
      : challenge.feedback.wrongBrief;
    return { correct: false, feedback, lostDefense: challenge.defense, correctAnswer: [...challenge.correct] };
  }

  next(): void {
    if (!this.solved) throw new Error("Primero hay que responder el desafío actual.");
    if (this.index < this.challenges.length - 1) {
      this.index++;
      this.wrongAttempts = 0;
      this.solved = false;
      this.hintIndex = 0;
    }
  }
}
