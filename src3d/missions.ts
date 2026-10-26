import * as THREE from "three";
import type { BattleMap } from "../src/core/battle/maps";
import { inWater } from "../src/core/battle/maps";
import type { Rng } from "../src/core/rng";
import { block, shadowify } from "./blocks";
import { WORLD_D, WORLD_W, cardinalOf, headingDegrees, type Cardinal } from "./coords";
import { CARDINAL_NAME } from "./hud";

/**
 * Misiones de orientación de día: «ve hacia el Norte desde la escuela y encuentra la bandera».
 * La bandera solo se ve de cerca, así que hay que orientarse con la brújula, el Sol o las estrellas para hallarla.
 */
export interface Mission {
  id: number;
  dir: Cardinal;
  text: string;
  hint: string;
  target: THREE.Vector3;
  reached: boolean;
}

const DIRS: { dir: Cardinal; heading: number }[] = [
  { dir: "N", heading: 0 },
  { dir: "E", heading: 90 },
  { dir: "S", heading: 180 },
  { dir: "O", heading: 270 },
  { dir: "NE", heading: 45 },
  { dir: "SE", heading: 135 },
  { dir: "SO", heading: 225 },
  { dir: "NO", heading: 315 }
];

/** Cómo se dice la dirección: a veces con el Sol, para aprender que sale por el Este y se pone por el Oeste. */
function phrase(dir: Cardinal, rng: Rng, sunHints: boolean): string {
  const name = CARDINAL_NAME[dir];
  if (sunHints && rng() < 0.5) {
    if (dir === "E") return "hacia donde sale el Sol (el Este)";
    if (dir === "O") return "hacia donde se pone el Sol (el Oeste)";
    if (dir === "N") return "hacia donde está el Sol al mediodía (el Norte)";
  }
  return `hacia el ${name}`;
}

export class MissionManager {
  readonly group = new THREE.Group();
  mission: Mission | null = null;
  completed = 0;
  private nextId = 1;
  private marker: THREE.Group | null = null;
  private lastDir: Cardinal | null = null;

  constructor(
    private readonly map: BattleMap,
    private readonly rng: Rng,
    private readonly obstacles: { x: number; z: number; r: number }[],
    private readonly origin: THREE.Vector3,
    /** Hasta qué distancia se ve la bandera. */
    private readonly sight: number,
    /** Si se permite hablar con el Sol y con direcciones intermedias (noreste, etc.). */
    private readonly advanced: boolean
  ) {}

  /** Crea una misión nueva en una dirección distinta a la anterior. */
  next(): Mission | null {
    this.clear();
    const pool = DIRS.filter((d) => (this.advanced || d.heading % 90 === 0) && d.dir !== this.lastDir);
    for (let tries = 0; tries < 60; tries++) {
      const d = pool[Math.floor(this.rng() * pool.length)];
      const dist = 34 + this.rng() * 22;
      const a = (d.heading * Math.PI) / 180;
      const t = new THREE.Vector3(this.origin.x + Math.sin(a) * dist, 0, this.origin.z - Math.cos(a) * dist);
      if (t.x < 10 || t.x > WORLD_W - 8 || t.z < 10 || t.z > WORLD_D - 8) continue;
      if (inWater({ x: t.x * 10, y: t.z * 10 }, this.map.water, 30)) continue;
      if (this.obstacles.some((o) => Math.hypot(o.x - t.x, o.z - t.z) < o.r + 2.5)) continue;
      if (Math.hypot(this.origin.x - t.x, this.origin.z - t.z) < 25) continue;
      this.lastDir = d.dir;
      const steps = Math.round(dist);
      this.mission = {
        id: this.nextId++,
        dir: d.dir,
        text: `Parte de la escuela y camina ${phrase(d.dir, this.rng, this.advanced)} hasta encontrar la bandera.`,
        hint: `Está a unos ${steps} pasos de la escuela.`,
        target: t,
        reached: false
      };
      this.build(t);
      return this.mission;
    }
    this.mission = null;
    return null;
  }

  private build(at: THREE.Vector3): void {
    const g = new THREE.Group();
    g.position.copy(at);
    g.add(block(0.3, 5, 0.3, 0xf4f6ff, 0, 2.5, 0), block(2.2, 1.3, 0.1, 0x2f6fe4, 1.2, 4.3, 0, { emissive: 0x143f94 }), block(0.9, 0.9, 0.1, 0xffd54a, 1.2, 4.3, 0.08, { emissive: 0x7a5a00 }), block(1.6, 0.3, 1.6, 0x8c93ad, 0, 0.15, 0));
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 70, 1.4), new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
    beam.position.y = 35;
    beam.name = "beam";
    g.add(beam);
    shadowify(g);
    this.marker = g;
    this.group.add(g);
  }

  clear(): void {
    if (this.marker) this.group.remove(this.marker);
    this.marker = null;
  }

  /** Devuelve true una sola vez, cuando el estudiante llega a la bandera. */
  update(player: THREE.Vector3, time: number): boolean {
    const m = this.mission;
    if (!m || m.reached || !this.marker) return false;
    const d = Math.hypot(player.x - m.target.x, player.z - m.target.z);
    this.marker.visible = d < this.sight;
    const flag = this.marker.children[1];
    flag.rotation.y = Math.sin(time * 3) * 0.12;
    this.marker.children[this.marker.children.length - 1].scale.x = 1 + Math.sin(time * 3) * 0.2;
    if (d < 3.4) {
      m.reached = true;
      this.completed++;
      this.marker.visible = true;
      return true;
    }
    return false;
  }

  /** Cuánto falta, dicho en pasos y con el punto cardinal en el que queda la bandera. */
  progressText(player: THREE.Vector3): string {
    const m = this.mission;
    if (!m) return "";
    const dx = m.target.x - player.x;
    const dz = m.target.z - player.z;
    const d = Math.round(Math.hypot(dx, dz));
    return `Estás a unos ${d} pasos`;
  }

  /** Para la pista de principiante: el punto cardinal en el que queda la bandera desde donde estás. */
  directionFrom(player: THREE.Vector3): string {
    const m = this.mission;
    if (!m) return "";
    return CARDINAL_NAME[cardinalOf(headingDegrees(m.target.x - player.x, m.target.z - player.z))];
  }
}
