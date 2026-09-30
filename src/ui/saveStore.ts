import type { SaveData } from "../core/Game";
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
