import { CAMP, FIELD, PATH, SKY_HORIZON } from "../core/battle/data";
import { DEFENSES, type DefenseId } from "../core/defenses";
import { weaponIcon } from "./weaponIcons";

/** Estado de cada lugar del mapa. */
export type SlotState = "won" | "lost" | "pending" | "current";

/**
 * Mapa en miniatura del campo de batalla con los siete lugares de las armas.
 * Sirve para anticipar el juego (misión) y para mostrar qué lugares quedaron
 * con arma y cuáles vacíos (síntesis).
 */
/** Estrellas sueltas del cielo del mapa (siempre las mismas). */
function skyStars(): string {
  let seed = 11;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  let out = "";
  for (let i = 0; i < 60; i++) {
    const x = 12 + rand() * (FIELD.width - 24);
    const y = 12 + rand() * (SKY_HORIZON - 70);
    // Deja libre la zona de la Cruz del Sur para que se reconozca.
    if (x > 470 && x < 570 && y < 140) continue;
    out += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.2 + rand() * 2.2).toFixed(1)}" opacity="${(0.4 + rand() * 0.5).toFixed(2)}"/>`;
  }
  return out;
}

export function mapPreview(states: Partial<Record<DefenseId, SlotState>>): string {
  const pathD = PATH.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const slots = DEFENSES.map((d, i) => {
    const st = states[d.id] ?? "pending";
    const { x, y } = d.slot;
    const n = i + 1;
    if (st === "won") {
      const icon = weaponIcon(d.id, "map-weapon").replace("<svg ", `<svg x="${x - 42}" y="${y - 52}" width="84" height="84" `);
      return `<g class="map-slot won" style="--c:${d.color}">
        <ellipse cx="${x}" cy="${y + 26}" rx="38" ry="12" class="slot-base"/>${icon}
        <circle cx="${x + 34}" cy="${y - 40}" r="14" class="slot-badge ok"/><text x="${x + 34}" y="${y - 34}" class="slot-mark">✓</text></g>`;
    }
    if (st === "lost") {
      return `<g class="map-slot lost">
        <ellipse cx="${x}" cy="${y + 10}" rx="38" ry="14" class="slot-empty"/>
        <text x="${x}" y="${y + 18}" class="slot-x">✕</text>
        <text x="${x}" y="${y + 50}" class="slot-caption">VACÍO</text></g>`;
    }
    return `<g class="map-slot ${st}">
      <ellipse cx="${x}" cy="${y + 10}" rx="38" ry="14" class="slot-empty"/>
      <text x="${x}" y="${y + 20}" class="slot-num">${n}</text>
      ${st === "current" ? `<ellipse cx="${x}" cy="${y + 10}" rx="46" ry="19" class="slot-pulse"/>` : ""}</g>`;
  }).join("");
  return `<svg class="map-preview" viewBox="0 0 ${FIELD.width} ${FIELD.height}" role="img" aria-label="Mapa del campamento con los siete lugares para armas">
    <rect width="${FIELD.width}" height="${FIELD.height}" rx="24" class="map-ground"/>
    <rect width="${FIELD.width}" height="${SKY_HORIZON}" rx="24" class="map-sky"/>
    <g class="map-stars">${skyStars()}</g>
    <g class="map-cross"><circle cx="505" cy="40" r="6" class="gacrux"/><circle cx="530" cy="120" r="7.5"/><circle cx="490" cy="84" r="6"/><circle cx="545" cy="70" r="5"/></g>
    <path d="${pathD}" class="map-path-edge"/><path d="${pathD}" class="map-path"/>
    <text x="24" y="${SKY_HORIZON - 16}" class="map-label">🧟 LLEGAN LOS ZOMBIS</text>
    <g class="map-camp"><path d="M${CAMP.x - 8} ${CAMP.y - 20} l26 -44 l26 44 z"/><path d="M${CAMP.x - 4} ${CAMP.y + 70} l22 -38 l22 38 z"/></g>
    <text x="${FIELD.width - 16}" y="${CAMP.y + 110}" class="map-label" text-anchor="end">CAMPAMENTO</text>
    ${slots}
  </svg>`;
}
