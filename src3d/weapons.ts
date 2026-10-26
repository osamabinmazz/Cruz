import type { DefenseId } from "../src/core/defenses";
import { defenseById } from "../src/core/defenses";

/**
 * Armas que el estudiante lleva en la mano. Son las mismas diez de la 2.0 (con sus nombres y colores),
 * pero se disparan hacia donde apunta el personaje. Sus estadísticas salen de la defensa de la 2.0
 * y suben con las mejoras que se ganan en los cofres.
 */
export interface HandWeapon {
  id: DefenseId;
  /** Proyectiles por disparo y su apertura total (radianes). */
  bullets: number;
  spread: number;
  /** Velocidad de la bala (unidades por segundo). */
  speed: number;
  /** El rayo atraviesa a todos los zombis (Regla de Luz). */
  pierce: boolean;
  /** Radio de la explosión (0 = sin explosión). */
  splash: number;
  /** Frena a los zombis que toca. */
  slow: boolean;
  /** Vuelve y golpea otra vez (Bumerán). */
  boomerang: boolean;
  /** Tamaño visual de la bala. */
  size: number;
  /** Multiplicador sobre el daño de la torre (el estudiante pega más fuerte que una torre). */
  power: number;
}

const BASE: Record<DefenseId, Omit<HandWeapon, "id">> = {
  "torre-brillo": { bullets: 1, spread: 0, speed: 34, pierce: false, splash: 0, slow: false, boomerang: false, size: 0.35, power: 3 },
  "cuarteto-luz": { bullets: 4, spread: 0.5, speed: 30, pierce: false, splash: 0, slow: false, boomerang: false, size: 0.25, power: 2.2 },
  "lanza-eje": { bullets: 1, spread: 0, speed: 60, pierce: false, splash: 0, slow: false, boomerang: false, size: 0.3, power: 3.4 },
  gemelas: { bullets: 2, spread: 0.18, speed: 34, pierce: false, splash: 0, slow: false, boomerang: false, size: 0.3, power: 2.6 },
  "guia-punteada": { bullets: 1, spread: 0, speed: 40, pierce: false, splash: 0, slow: true, boomerang: false, size: 0.3, power: 2 },
  plomada: { bullets: 1, spread: 0, speed: 22, pierce: false, splash: 5, slow: false, boomerang: false, size: 0.6, power: 2.8 },
  "brujula-austral": { bullets: 1, spread: 0, speed: 36, pierce: false, splash: 0, slow: false, boomerang: false, size: 0.4, power: 2.6 },
  "regla-luz": { bullets: 1, spread: 0, speed: 90, pierce: true, splash: 0, slow: false, boomerang: false, size: 0.3, power: 2.4 },
  "faro-lactea": { bullets: 1, spread: 0, speed: 26, pierce: false, splash: 7, slow: true, boomerang: false, size: 0.7, power: 1.6 },
  "bumeran-plata": { bullets: 1, spread: 0, speed: 28, pierce: false, splash: 0, slow: false, boomerang: true, size: 0.5, power: 2.8 }
};

/** Las armas llegan al nivel 3 con las mejoras; en la mano pueden pasar al nivel 4, «Maestría». */
export const MAX_LEVEL = 4;
export const MAX_TOWER_LEVEL = 3;

/** Combos: si llevas dos armas juntas en la mano ganan una ventaja. */
export interface Synergy {
  name: string;
  ids: [DefenseId, DefenseId];
  text: string;
  /** Multiplicadores sobre el daño, el tiempo entre disparos (menos = más rápido) y el alcance. */
  damage?: number;
  reload?: number;
  range?: number;
}

export const SYNERGIES: Synergy[] = [
  { name: "Francotirador", ids: ["torre-brillo", "lanza-eje"], text: "+20% de daño", damage: 1.2 },
  { name: "Lluvia doble", ids: ["cuarteto-luz", "gemelas"], text: "dispara 25% más rápido", reload: 0.75 },
  { name: "Zona gélida", ids: ["plomada", "faro-lactea"], text: "+25% de alcance", range: 1.25 },
  { name: "Cielo claro", ids: ["brujula-austral", "guia-punteada"], text: "+20% de daño y +15% de alcance", damage: 1.2, range: 1.15 },
  { name: "Trayectoria", ids: ["regla-luz", "bumeran-plata"], text: "+20% de daño", damage: 1.2 },
  { name: "Guardianes del eje", ids: ["lanza-eje", "regla-luz"], text: "+15% de daño y de alcance", damage: 1.15, range: 1.15 }
];

/** Combos que están activos con las armas que lleva en la mano. */
export function activeSynergies(hand: readonly DefenseId[]): Synergy[] {
  return SYNERGIES.filter((s) => s.ids.every((id) => hand.includes(id)));
}

/** Estadísticas de un arma de la mano con los combos activos aplicados. */
export function handStats(id: DefenseId, level: number, hand: readonly DefenseId[]): ReturnType<typeof weaponStats> {
  const st = weaponStats(id, level);
  let damage = 1;
  let reload = 1;
  let range = 1;
  for (const s of activeSynergies(hand)) {
    if (!s.ids.includes(id)) continue;
    damage *= s.damage ?? 1;
    reload *= s.reload ?? 1;
    range *= s.range ?? 1;
  }
  const bullets = Math.max(1, handWeapon(id).bullets);
  const r = Math.max(0.2, st.reload * reload);
  return { ...st, damage: st.damage * damage, reload: r, range: st.range * range, dps: (st.damage * damage * bullets) / r };
}

export function handWeapon(id: DefenseId): HandWeapon {
  return { id, ...BASE[id] };
}

/** Daño por bala, alcance (unidades del mundo) y segundos entre disparos para un nivel de mejora (1 a 3). */
export function weaponStats(id: DefenseId, level: number): { damage: number; range: number; reload: number; name: string; color: string; dps: number } {
  const d = defenseById(id);
  const w = BASE[id];
  const lv = Math.max(1, Math.min(MAX_LEVEL, level));
  const bullets = Math.max(1, w.bullets);
  const damage = (d.damage * w.power * (1 + 0.4 * (lv - 1))) / (bullets > 1 ? Math.sqrt(bullets) : 1);
  const reload = Math.max(0.25, d.reload * 0.75 * (1 - 0.1 * (lv - 1)));
  return { damage, range: d.range * 0.1 * 1.6 * (1 + 0.15 * (lv - 1)), reload, name: d.name, color: d.color, dps: (damage * bullets) / reload };
}
