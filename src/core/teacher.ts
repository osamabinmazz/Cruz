import type { CampaignSave } from "./campaign/Campaign";
import { CHALLENGES } from "./challenges";
import { levelName } from "./difficulty";

/**
 * Cálculos del panel del docente: resumen por estudiante y por desafío,
 * ranking individual y por equipos, y exportación a CSV. Todo es puro (no usa
 * el navegador) para poder probarlo.
 */

export interface StudentRow {
  name: string;
  level: string;
  /** "Noche 3", "Terminada"… */
  progress: string;
  nightsWon: number;
  correct: number;
  incorrect: number;
  /** Porcentaje de respuestas correctas (0 si todavía no respondió). */
  accuracy: number;
  stopped: number;
  dust: number;
  score: number;
  lastPlayed: number;
  /** Desafíos (1 a 7) que falló al menos una vez. */
  struggled: number[];
}

export function studentRow(s: CampaignSave): StudentRow {
  const correct = s.log.filter((e) => e.correct).length;
  const incorrect = s.log.length - correct;
  const nightsWon = s.nightResults.filter((r) => r.victory).length;
  const stopped = s.nightResults.reduce((n, r) => n + r.stopped, 0);
  const struggled = new Set<number>();
  for (const e of s.log) if (!e.correct) struggled.add(CHALLENGES.find((c) => c.id === e.challengeId)?.number ?? 0);
  struggled.delete(0);
  return {
    name: s.name,
    level: levelName(s.difficulty),
    progress: s.stage === "finished" ? "Terminada" : `Noche ${s.night}`,
    nightsWon,
    correct,
    incorrect,
    accuracy: s.log.length ? Math.round((correct / s.log.length) * 100) : 0,
    stopped,
    dust: s.dust,
    score: correct * 10 + nightsWon * 50 + stopped * 2,
    lastPlayed: s.updatedAt,
    struggled: [...struggled].sort((a, b) => a - b)
  };
}

export interface ChallengeStat {
  number: number;
  title: string;
  answers: number;
  correct: number;
  /** Porcentaje de acierto (null si nadie lo respondió). */
  accuracy: number | null;
}

/** Cómo le fue al grupo en cada desafío (todas las respuestas, incluidos los repasos). */
export function challengeStats(saves: readonly CampaignSave[]): ChallengeStat[] {
  return CHALLENGES.map((c) => {
    const events = saves.flatMap((s) => s.log).filter((e) => e.challengeId === c.id);
    const correct = events.filter((e) => e.correct).length;
    return { number: c.number, title: c.title, answers: events.length, correct, accuracy: events.length ? Math.round((correct / events.length) * 100) : null };
  });
}

export type Teams = Record<string, string[]>;

export interface TeamRow {
  team: string;
  members: StudentRow[];
  score: number;
}

/** Ranking de equipos: suma de los puntajes de sus integrantes (los que no están en un equipo no cuentan). */
export function rankTeams(saves: readonly CampaignSave[], teams: Teams, keyOf: (name: string) => string): TeamRow[] {
  const rows = new Map(saves.map((s) => [keyOf(s.name), studentRow(s)]));
  return Object.entries(teams)
    .map(([team, keys]) => {
      const members = keys.map((k) => rows.get(k)).filter((r): r is StudentRow => !!r);
      return { team, members, score: members.reduce((n, m) => n + m.score, 0) };
    })
    .sort((a, b) => b.score - a.score || a.team.localeCompare(b.team));
}

export function rankStudents(saves: readonly CampaignSave[]): StudentRow[] {
  return saves.map(studentRow).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function cell(v: string | number): string {
  const t = String(v);
  // Evita que una hoja de cálculo ejecute un nombre que empiece con = + - @.
  const safe = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV con todos los estudiantes (con marca BOM para que Excel respete las tildes). */
export function toCsv(saves: readonly CampaignSave[], teamOf: (name: string) => string): string {
  const head = ["Nombre", "Equipo", "Nivel", "Avance", "Noches ganadas", "Respuestas correctas", "Respuestas incorrectas", "% acierto", "Zombis detenidos", "Polvo estelar", "Puntaje", "Última vez", ...CHALLENGES.map((c) => `Desafío ${c.number} (${c.title})`)];
  const lines = [head.map(cell).join(",")];
  for (const s of saves) {
    const r = studentRow(s);
    const per = CHALLENGES.map((c) => {
      const ev = s.log.filter((e) => e.challengeId === c.id);
      if (!ev.length) return "";
      return `${ev.filter((e) => e.correct).length}/${ev.length}`;
    });
    lines.push(
      [r.name, teamOf(s.name), r.level, r.progress, r.nightsWon, r.correct, r.incorrect, r.accuracy, r.stopped, r.dust, r.score, new Date(r.lastPlayed).toISOString().slice(0, 16).replace("T", " "), ...per].map(cell).join(",")
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
