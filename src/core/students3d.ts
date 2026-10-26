import type { ChestTopic } from "./chests/questions";
import { levelName, type Difficulty } from "./difficulty";
import { nextEase } from "./extreme";

/**
 * Estudiantes de Cruz del Sur 3.0: lo que se guarda de cada uno (personaje, nivel, avance, armas y respuestas)
 * y lo que el docente ve en su panel. Todo es puro (sin navegador) para poder probarlo.
 */

export interface Look3 {
  skin: number;
  hair: "corto" | "largo" | "rizos";
  hairColor: number;
  accessory: "diadema" | "capa" | "estrella";
}

export const DEFAULT_LOOK3: Look3 = { skin: 1, hair: "corto", hairColor: 0, accessory: "diadema" };

export interface NightResult3 {
  night: number;
  victory: boolean;
  /** Zombis que derrotó el propio estudiante. */
  kills: number;
  /** Zombis detenidos en total (torres y estudiante). */
  stopped: number;
  chestsOpened: number;
  chestsMissed: number;
  downs: number;
}

export interface Answer3 {
  topic: ChestTopic;
  /** Pregunta respondida (para repasar). */
  qid?: string;
  correct: boolean;
  usedHint: boolean;
}

export const TOTAL_NIGHTS_3 = 5;

export interface Student3 {
  version: 1;
  name: string;
  level: Difficulty;
  look: Look3;
  /** Día (y noche) que toca jugar a continuación, de 1 a 5. */
  night: number;
  finished: boolean;
  /** Derrotas seguidas en el modo Extremo (suaviza la siguiente noche). */
  ease: number;
  /** Mejoras ganadas en los cofres, armas en la mano y torres colocadas. */
  levels: Record<string, number>;
  hand: string[];
  placed: Record<string, number>;
  results: NightResult3[];
  answers: Answer3[];
  createdAt: number;
  updatedAt: number;
  /** Último día cuya historia ya vio (para no repetirla). */
  storySeen?: number;
  /** Mejor racha del modo «Noches sin fin» (noches seguidas). */
  endlessBest?: number;
}

export function newStudent(name: string, level: Difficulty, look: Look3, now = Date.now()): Student3 {
  return {
    version: 1,
    name: name.trim().replace(/\s+/g, " ") || "Estudiante",
    level,
    look,
    night: 1,
    finished: false,
    ease: 0,
    levels: {},
    hand: ["torre-brillo", "cuarteto-luz", "lanza-eje"],
    placed: {},
    results: [],
    answers: [],
    createdAt: now,
    updatedAt: now
  };
}

/** Clave de un estudiante: sin mayúsculas ni tildes, para no repetirlo por un detalle. */
export function studentKey3(name: string): string {
  return name.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function isStudent3(x: unknown): x is Student3 {
  const s = x as Student3;
  return !!s && s.version === 1 && typeof s.name === "string" && Array.isArray(s.results) && Array.isArray(s.answers) && typeof s.night === "number" && !!s.look;
}

export function recordAnswer(s: Student3, a: Answer3, now = Date.now()): void {
  s.answers.push(a);
  s.updatedAt = now;
}

/** Anota el resultado de una noche: pasa al día siguiente si ganó y, en Extremo, suaviza o reinicia la dificultad. */
export function recordNight(s: Student3, r: NightResult3, now = Date.now()): void {
  s.results.push(r);
  if (s.level === "extreme") s.ease = nextEase(s.ease, r.victory);
  if (r.victory) {
    if (r.night >= TOTAL_NIGHTS_3) s.finished = true;
    else s.night = Math.max(s.night, r.night + 1);
  }
  s.updatedAt = now;
}

export interface TopicStat {
  topic: ChestTopic;
  name: string;
  correct: number;
  total: number;
  accuracy: number;
}

export const TOPIC_NAMES: Record<ChestTopic, string> = { cruz: "Cruz del Sur", sol: "El Sol", cardinales: "Puntos cardinales" };

export interface StudentRow3 {
  name: string;
  level: string;
  progress: string;
  nightsWon: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  stopped: number;
  kills: number;
  chests: number;
  /** Mejor racha de «Noches sin fin». */
  endless: number;
  score: number;
  lastPlayed: number;
  topics: TopicStat[];
  /** Tema con peor acierto (si respondió al menos 3 preguntas de él). */
  weakest: string | null;
}

export function topicStats(s: Student3): TopicStat[] {
  return (["cruz", "sol", "cardinales"] as ChestTopic[]).map((topic) => {
    const list = s.answers.filter((a) => a.topic === topic);
    const correct = list.filter((a) => a.correct).length;
    return { topic, name: TOPIC_NAMES[topic], correct, total: list.length, accuracy: list.length ? Math.round((correct / list.length) * 100) : 0 };
  });
}

export function studentRow3(s: Student3): StudentRow3 {
  const correct = s.answers.filter((a) => a.correct).length;
  const nightsWon = new Set(s.results.filter((r) => r.victory).map((r) => r.night)).size;
  const stopped = s.results.filter((r) => r.victory).reduce((n, r) => n + r.stopped, 0);
  const kills = s.results.reduce((n, r) => n + r.kills, 0);
  const topics = topicStats(s);
  const weak = topics.filter((t) => t.total >= 3).sort((a, b) => a.accuracy - b.accuracy)[0];
  return {
    name: s.name,
    level: levelName(s.level),
    progress: s.finished ? "Terminada" : `Día ${s.night}`,
    nightsWon,
    correct,
    incorrect: s.answers.length - correct,
    accuracy: s.answers.length ? Math.round((correct / s.answers.length) * 100) : 0,
    stopped,
    kills,
    chests: s.results.reduce((n, r) => n + r.chestsOpened, 0),
    endless: s.endlessBest ?? 0,
    score: correct * 10 + nightsWon * 50 + stopped * 2 + (s.endlessBest ?? 0) * 20,
    lastPlayed: s.updatedAt,
    topics,
    weakest: weak && weak.accuracy < 80 ? weak.name : null
  };
}

const csvCell = (v: string | number) => {
  const t = String(v);
  return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Hoja de cálculo de la clase (se abre en Excel, Sheets o LibreOffice). */
export function toCsv3(students: readonly Student3[]): string {
  const head = ["Nombre", "Nivel", "Avance", "Noches ganadas", "Aciertos", "Errores", "% acierto", "Zombis detenidos", "Zombis derrotados por él/ella", "Cofres abiertos", "Mejor racha sin fin", "Puntos", "Tema a reforzar", "Última vez"];
  const rows = students.map((s) => {
    const r = studentRow3(s);
    return [r.name, r.level, r.progress, r.nightsWon, r.correct, r.incorrect, r.accuracy, r.stopped, r.kills, r.chests, r.endless, r.score, r.weakest ?? "", new Date(r.lastPlayed).toISOString().slice(0, 10)];
  });
  return "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

export function rank3(students: readonly Student3[]): StudentRow3[] {
  return students.map(studentRow3).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
