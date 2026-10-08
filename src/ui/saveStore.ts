import type { SaveData } from "../core/Game";
import { MAX_EASE } from "../core/extreme";
import { levelName } from "../core/difficulty";

/** Guarda la partida en este navegador para poder continuarla más tarde. */
const KEY = "cruz-partida";

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data && data.version === 1 && Array.isArray(data.outcomes) ? data : null;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento disponible: el juego sigue funcionando */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento disponible */
  }
}

/** Frase corta que describe dónde se retoma la partida. */
export function describeSave(data: SaveData): string {
  const level = `Nivel ${levelName(data.difficulty)}`;
  if (data.outcomes.length < 7) return `${level} · desafío ${data.outcomes.length + 1} de 7`;
  return data.stage === "placement" ? `${level} · antes de la batalla` : `${level} · síntesis`;
}

/** Cuánto se suavizó el modo extremo por derrotas seguidas (0 = dificultad completa). */
const EASE_KEY = "cruz-extremo";

export function loadExtremeEase(): number {
  try {
    const n = Number(localStorage.getItem(EASE_KEY));
    return Number.isFinite(n) ? Math.max(0, Math.min(MAX_EASE, Math.floor(n))) : 0;
  } catch {
    return 0;
  }
}

export function saveExtremeEase(ease: number): void {
  try {
    localStorage.setItem(EASE_KEY, String(ease));
  } catch {
    /* sin almacenamiento disponible */
  }
}
