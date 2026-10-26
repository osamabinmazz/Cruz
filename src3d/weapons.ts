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

export function handWeapon(id: DefenseId): HandWeapon {
  return { id, ...BASE[id] };
}

/** Daño por bala, alcance (unidades del mundo) y segundos entre disparos para un nivel de mejora (1 a 3). */
export function weaponStats(id: DefenseId, level: number): { damage: number; range: number; reload: number; name: string; color: string } {
  const d = defenseById(id);
  const w = BASE[id];
  const lv = Math.max(1, Math.min(3, level));
  const bullets = Math.max(1, w.bullets);
  return {
    damage: (d.damage * w.power * (1 + 0.4 * (lv - 1))) / (bullets > 1 ? Math.sqrt(bullets) : 1),
    range: d.range * 0.1 * 1.6 * (1 + 0.15 * (lv - 1)),
    reload: Math.max(0.25, d.reload * 0.75 * (1 - 0.1 * (lv - 1))),
    name: d.name,
    color: d.color
  };
}
