import type { ChestTopic } from "./chests/questions";
import type { Rng } from "./rng";
import type { Answer3 } from "./students3d";

/**
 * Preguntas que se adaptan: salen más seguido los temas donde el estudiante falla más
 * y, de vez en cuando, vuelve una pregunta que había fallado.
 */

/** Cuánto más probable es cada tema: 1 con buen acierto (o pocas respuestas) y hasta 3 si falla mucho. */
export function topicWeights(answers: readonly Answer3[], topics: readonly ChestTopic[]): Record<string, number> {
  const w: Record<string, number> = {};
  for (const t of topics) {
    const list = answers.filter((a) => a.topic === t);
    if (list.length < 3) {
      w[t] = 1;
      continue;
    }
    const acc = list.filter((a) => a.correct).length / list.length;
    w[t] = 1 + (1 - acc) * 2;
  }
  return w;
}

/** Elige un tema al azar, con más probabilidad para los más flojos. */
export function pickTopic(answers: readonly Answer3[], allowed: readonly ChestTopic[], rng: Rng): ChestTopic {
  const unique = [...new Set(allowed)];
  const w = topicWeights(answers, unique);
  const total = unique.reduce((n, t) => n + w[t], 0);
  let r = rng() * total;
  for (const t of unique) {
    r -= w[t];
    if (r <= 0) return t;
  }
  return unique[unique.length - 1];
}

/** Preguntas que falló y todavía no acertó después (de la más reciente a la más antigua). */
export function pendingReview(answers: readonly Answer3[]): string[] {
  const fixed = new Set<string>();
  const out: string[] = [];
  for (let i = answers.length - 1; i >= 0; i--) {
    const a = answers[i];
    if (!a.qid) continue;
    if (a.correct) fixed.add(a.qid);
    else if (!fixed.has(a.qid) && !out.includes(a.qid)) out.push(a.qid);
  }
  return out;
}

/** Con cierta probabilidad devuelve una pregunta fallada para repasarla (null = elegir una normal). */
export function pickReview(answers: readonly Answer3[], rng: Rng, chance = 0.3): string | null {
  const pending = pendingReview(answers);
  if (pending.length === 0 || rng() >= chance) return null;
  return pending[Math.floor(rng() * Math.min(pending.length, 4))];
}
