import { STAR_HEROES } from "../core/rescue/heroes";
import { starHeroIcon } from "./icons";

/**
 * Acrux, la estrella más brillante de la Cruz del Sur, acompaña al jugador con
 * globos de diálogo. Sus frases animan y acompañan, pero nunca dan pistas:
 * así las ayudas siguen siendo las mismas que define cada nivel.
 */

const ACRUX = STAR_HEROES.find((h) => h.id === "acrux")!;

export type GuideMood = "neutral" | "happy" | "comfort";

const INTROS: Record<number, string> = {
  1: "¡Hola! Soy Acrux. Vamos a buscar la Cruz del Sur. Observa con calma antes de elegir.",
  2: "¡Bien! Ahora miremos de cerca sus estrellas. Recuerda: un solo intento.",
  3: "La cruz tiene dos palos. Tómate tu tiempo para mirarlos.",
  4: "¡Este desafío es sobre Gacrux y sobre mí! A ver si nos ubicas.",
  5: "Desde la cruz empieza el camino hacia el Sur. Mira bien cada línea.",
  6: "¡Ya casi llegamos al horizonte!",
  7: "¡Último desafío! Estás muy cerca del Sur."
};

const CHEERS = ["¡Excelente!", "¡Así se hace!", "¡Brillante como una estrella!", "¡Muy bien pensado!"];
const COMFORTS = [
  "No pasa nada: así también se aprende.",
  "Mira la respuesta correcta; te servirá para lo que sigue.",
  "¡Ánimo! El campamento todavía tiene otras armas."
];

export function introFor(challengeNumber: number): string {
  return INTROS[challengeNumber] ?? "¡Vamos!";
}

export function cheerFor(challengeNumber: number, weaponName: string): string {
  return `${CHEERS[challengeNumber % CHEERS.length]} Ganaste ${weaponName}.`;
}

export function comfortFor(challengeNumber: number): string {
  return COMFORTS[challengeNumber % COMFORTS.length];
}

export const GUIDE_LINES = {
  mission: "¡Hola! Soy Acrux, la estrella más brillante de la Cruz del Sur. ¡Te acompaño en esta misión!",
  synthesis: "¡Lo lograste! Repasemos el procedimiento y después ubica tus armas.",
  placement: "Toca un arma y después un lugar del mapa. Piensa dónde conviene cada una."
};

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
