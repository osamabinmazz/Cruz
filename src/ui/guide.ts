import { STAR_HEROES } from "../core/rescue/heroes";
import { starHeroIcon } from "./icons";
import LINES from "./acruxLines.json";

/**
 * Acrux, la estrella más brillante de la Cruz del Sur, acompaña al jugador con
 * globos de diálogo. Sus frases animan y acompañan, pero nunca dan pistas:
 * así las ayudas siguen siendo las mismas que define cada nivel.
 */

const ACRUX = STAR_HEROES.find((h) => h.id === "acrux")!;

export type GuideMood = "neutral" | "happy" | "comfort";

const INTROS: Record<number, string> = LINES.intros;
const CHEERS: string[] = LINES.cheers;
const COMFORTS: string[] = LINES.comforts;

export function introFor(challengeNumber: number): string {
  return INTROS[challengeNumber] ?? "¡Vamos!";
}

export function cheerFor(challengeNumber: number, weaponName: string): string {
  return `${CHEERS[challengeNumber % CHEERS.length]} ${LINES.ganaste} ${weaponName}.`;
}

export function comfortFor(challengeNumber: number): string {
  return COMFORTS[challengeNumber % COMFORTS.length];
}

export const GUIDE_LINES = LINES.guide;

let lastMessage = "";

/** Globo de diálogo con Acrux (se anima solo cuando cambia el mensaje). */
export function guideHtml(message: string, mood: GuideMood = "neutral"): string {
  const fresh = message !== lastMessage ? "fresh" : "";
  lastMessage = message;
  return `<div class="guide ${mood} ${fresh}" role="status">
    <div class="guide-avatar" aria-hidden="true">${starHeroIcon(ACRUX.color)}</div>
    <div class="guide-bubble"><b>Acrux</b><p>${message}</p></div>
  </div>`;
}
