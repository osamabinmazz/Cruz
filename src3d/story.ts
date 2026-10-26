import { ico } from "./icons";

/**
 * La historia de la isla, contada por Acrux entre día y día.
 * Las cuatro estrellas de la Cruz del Sur se apagaron; cada noche ganada reaviva una.
 */
export interface Beat {
  title: string;
  lines: string[];
}

/** Qué estrella se enciende con cada noche ganada (en este orden). */
export const LIT_ORDER = ["Acrux", "Mimosa", "Gacrux", "Delta"] as const;

export const DAY_STORY: Beat[] = [
  {
    title: "Acrux, la estrella guía",
    lines: [
      "¡Hola, {name}! Soy Acrux, la estrella más brillante de la Cruz del Sur.",
      "Los zombis llegaron a la isla y apagaron las estrellas de mi cruz. Sin ellas, nadie encuentra el Sur.",
      "Defiende la escuela de noche y, de día, aprende a orientarte: así volveremos a encenderlas.",
      "Hoy: pon torres en los pedestales, elige tus armas en la escuela, abre cofres y sigue la bandera de la misión."
    ]
  },
  {
    title: "Mimosa vuelve a brillar",
    lines: [
      "¡Lo lograste, {name}! Mi estrella hermana Mimosa volvió a encenderse.",
      "Esta noche habrá niebla y verás poco. Acuérdate: el Sol sale por el Este y se pone por el Oeste, y la brújula te dice dónde está el Norte.",
      "Hoy sigue la bandera de la misión usando los puntos cardinales."
    ]
  },
  {
    title: "La noche de la tormenta",
    lines: [
      "Ya brillan dos estrellas, {name}. ¡Falta menos!",
      "Se viene una tormenta con rayos. Si no ves el cielo, el Sol del día te dio una pista: al mediodía queda hacia el Norte, y tu sombra apunta al Sur.",
      "Hay un cofre estelar escondido: para abrirlo tendrás que mirar hacia un punto cardinal."
    ]
  },
  {
    title: "La luna roja",
    lines: [
      "Tres estrellas ya iluminan la isla. Solo falta Delta.",
      "Esta noche la luna sale roja y los zombis se sienten más fuertes. Usa tus torres y la esquiva (C).",
      "Recuerda el método: encuentra la Cruz del Sur, sigue su eje mayor y baja hasta el horizonte. Ahí está el Sur."
    ]
  },
  {
    title: "La gran noche",
    lines: [
      "Casi todo el cielo brilla otra vez, {name}. Esta es la última noche.",
      "Llega el gigante, con tormenta y luna roja. Prepárate bien: elige tus mejores armas y mejora tus torres.",
      "Confío en ti. ¡Vamos a encender la última estrella!"
    ]
  }
];

export const EPILOGUE: Beat = {
  title: "¡El cielo brilla otra vez!",
  lines: [
    "¡Lo lograste, {name}! Las cuatro estrellas de la Cruz del Sur volvieron a encenderse.",
    "Ahora sabes orientarte con la Cruz del Sur, con el Sol y con los puntos cardinales. Eso nunca se apaga.",
    "Gracias por defender la isla. ¡Aquí tienes tu diploma!"
  ]
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Ventana de diálogo de Acrux. Devuelve cuando el estudiante termina o salta la historia. */
export function showStory(root: HTMLElement, beat: Beat, name: string, speak: (text: string) => void): Promise<void> {
  return new Promise((resolve) => {
    const lines = beat.lines.map((l) => l.replace("{name}", name));
    let i = 0;
    const el = document.createElement("div");
    el.className = "overlay story";
    const paint = () => {
      const last = i === lines.length - 1;
      el.innerHTML = `<div class="card story-card">
        <div class="story-who"><span class="story-star">${ico("dust", 44, "gold")}</span><div><b>Acrux</b><small>${esc(beat.title)}</small></div></div>
        <p class="story-text">${esc(lines[i])}</p>
        <div class="row"><button class="btn small" data-skip>Saltar</button><button class="btn primary" data-next>${last ? "¡Vamos!" : "Siguiente"}</button></div>
        <div class="story-dots">${lines.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
      </div>`;
      speak(lines[i]);
    };
    paint();
    el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-next]")) {
        if (i < lines.length - 1) {
          i++;
          paint();
        } else {
          el.remove();
          resolve();
        }
      } else if (t.closest("[data-skip]")) {
        el.remove();
        resolve();
      }
    });
    root.appendChild(el);
  });
}
