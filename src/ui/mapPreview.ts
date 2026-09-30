import { CAMP, FIELD, PATH, SKY_HORIZON } from "../core/battle/data";
import { DEFENSES, type DefenseId } from "../core/defenses";
import { SLOTS, weaponAt, type Placement } from "../core/placement";
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
  return mapFrame(slots, "Mapa del campamento con los siete lugares para armas");
}

/** Fondo común de los mapas: cielo con estrellas, césped, camino y campamento. */
function mapFrame(content: string, label: string, extraClass = ""): string {
  const pathD = PATH.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  return `<svg class="map-preview ${extraClass}" viewBox="0 0 ${FIELD.width} ${FIELD.height}" role="img" aria-label="${label}">
    <rect width="${FIELD.width}" height="${FIELD.height}" rx="24" class="map-ground"/>
    <rect width="${FIELD.width}" height="${SKY_HORIZON}" rx="24" class="map-sky"/>
    <g class="map-stars">${skyStars()}</g>
    <g class="map-cross"><circle cx="505" cy="40" r="6" class="gacrux"/><circle cx="530" cy="120" r="7.5"/><circle cx="490" cy="84" r="6"/><circle cx="545" cy="70" r="5"/></g>
    <path d="${pathD}" class="map-path-edge"/><path d="${pathD}" class="map-path"/>
    <text x="24" y="${SKY_HORIZON - 16}" class="map-label">🧟 LLEGAN LOS ZOMBIS</text>
    <g class="map-camp"><path d="M${CAMP.x - 8} ${CAMP.y - 20} l26 -44 l26 44 z"/><path d="M${CAMP.x - 4} ${CAMP.y + 70} l22 -38 l22 38 z"/></g>
    <text x="${FIELD.width - 16}" y="${CAMP.y + 110}" class="map-label" text-anchor="end">CAMPAMENTO</text>
    ${content}
  </svg>`;
}

/**
 * Mapa interactivo para colocar las armas: cada lugar muestra su arma y su
 * alcance, o queda libre. Tocar un lugar coloca el arma elegida.
 */
export function placementMap(placement: Placement, selected: DefenseId | null): string {
  const ranges = SLOTS.map((p, i) => {
    const id = weaponAt(placement, i);
    if (!id) return "";
    const d = DEFENSES.find((x) => x.id === id)!;
    return `<circle cx="${p.x}" cy="${p.y}" r="${d.range}" class="range ${id === selected ? "selected" : ""}" style="--c:${d.color}"/>`;
  }).join("");
  const slots = SLOTS.map((p, i) => {
    const id = weaponAt(placement, i);
    const target = selected && id !== selected ? "target" : "";
    if (id) {
      const d = DEFENSES.find((x) => x.id === id)!;
      const icon = weaponIcon(id, "map-weapon").replace("<svg ", `<svg x="${p.x - 46}" y="${p.y - 58}" width="92" height="92" `);
      return `<g class="map-slot won place-slot ${id === selected ? "selected" : ""} ${target}" style="--c:${d.color}" data-action="place-slot" data-slot="${i}" role="button" aria-label="Lugar ${i + 1}: ${d.name}">
        <circle cx="${p.x}" cy="${p.y - 10}" r="54" class="hit"/>
        <ellipse cx="${p.x}" cy="${p.y + 26}" rx="40" ry="13" class="slot-base"/>${icon}
        <text x="${p.x - 44}" y="${p.y - 40}" class="slot-num small">${i + 1}</text></g>`;
    }
    return `<g class="map-slot pending place-slot ${target}" data-action="place-slot" data-slot="${i}" role="button" aria-label="Lugar ${i + 1} libre">
      <circle cx="${p.x}" cy="${p.y - 10}" r="54" class="hit"/>
      <ellipse cx="${p.x}" cy="${p.y + 10}" rx="40" ry="15" class="slot-empty"/>
      <text x="${p.x}" y="${p.y + 20}" class="slot-num">${i + 1}</text></g>`;
  }).join("");
  return mapFrame(`<g class="ranges">${ranges}</g>${slots}`, "Mapa para colocar las armas", "placement-map");
}
