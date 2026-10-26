import * as THREE from "three";
import type { Point } from "../src/core/geometry";
import { inWater, type BattleMap } from "../src/core/battle/maps";
import type { ChestQuestion } from "../src/core/chests/questions";
import { block, shadowify, textSprite } from "./blocks";
import { FIELD_SCALE, toWorld } from "./coords";

/** Cofres del mapa: se abren respondiendo una pregunta. Brillan con una columna de luz para verlos de lejos. */
export interface Chest {
  id: number;
  group: THREE.Group;
  pos: THREE.Vector3;
  /** Segundo del juego hasta el que sigue cerrado con candado (0 = disponible). */
  lockedUntil: number;
  question: ChestQuestion | null;
  lid: THREE.Group;
  beam: THREE.Mesh;
  lock: THREE.Mesh;
  label: THREE.Sprite | null;
  labelText: string;
  opening: number;
  gone: boolean;
}

function distToRoutes(p: Point, routes: Point[][]): number {
  let best = Infinity;
  for (const r of routes) {
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1];
      const b = r[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
      best = Math.min(best, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
    }
  }
  return best;
}

export class ChestManager {
  readonly group = new THREE.Group();
  readonly chests: Chest[] = [];
  private nextId = 1;

  constructor(private readonly map: BattleMap, private readonly rng: () => number, private readonly obstacles: { x: number; z: number; r: number }[]) {}

  get available(): number {
    return this.chests.filter((c) => !c.gone).length;
  }

  /** Pone un cofre en un lugar libre: lejos del camino, del agua, de la escuela y de otros cofres. */
  spawn(): Chest | null {
    for (let tries = 0; tries < 400; tries++) {
      const p = { x: 60 + this.rng() * 820, y: 60 + this.rng() * 570 };
      if (distToRoutes(p, this.map.routes) < 80) continue;
      if (inWater(p, this.map.water, 40)) continue;
      if (Math.hypot(p.x - this.map.camp.x, p.y - this.map.camp.y) < 230) continue;
      if (this.map.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 70)) continue;
      if (this.chests.some((c) => !c.gone && Math.hypot(c.pos.x / FIELD_SCALE - p.x, c.pos.z / FIELD_SCALE - p.y) < 170)) continue;
      const w = toWorld(p);
      if (this.obstacles.some((o) => Math.hypot(o.x - w.x, o.z - w.z) < o.r + 1.8)) continue;
      return this.create(w);
    }
    return null;
  }

  private create(pos: THREE.Vector3): Chest {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.add(block(2.2, 1.1, 1.5, 0x8a5a2a, 0, 0.55, 0), block(2.3, 0.18, 1.6, 0xd8a929, 0, 0.3, 0), block(2.3, 0.18, 1.6, 0xd8a929, 0, 0.9, 0));
    group.add(block(0.3, 1.1, 1.6, 0xd8a929, -0.8, 0.55, 0), block(0.3, 1.1, 1.6, 0xd8a929, 0.8, 0.55, 0));
    const lid = new THREE.Group();
    lid.position.set(0, 1.1, -0.75);
    lid.add(block(2.2, 0.5, 1.5, 0xa86f35, 0, 0.25, 0.75), block(2.3, 0.14, 1.6, 0xd8a929, 0, 0.55, 0.75));
    group.add(lid);
    const lock = block(0.4, 0.5, 0.2, 0xffe066, 0, 0.95, 0.82, { emissive: 0x7a5a00 });
    group.add(lock);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 60, 1.2), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
    beam.position.y = 31;
    group.add(beam);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.7, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    group.add(shadow);
    const chest: Chest = { id: this.nextId++, group, pos: pos.clone(), lockedUntil: 0, question: null, lid, beam, lock, label: null, labelText: "", opening: 0, gone: false };
    shadowify(group);
    this.group.add(group);
    this.chests.push(chest);
    return chest;
  }

  /** El cofre abierto más cercano que el estudiante puede abrir ahora (a menos de `reach`). */
  nearest(from: THREE.Vector3, reach = 3.6): Chest | null {
    let best: Chest | null = null;
    let bestD = reach;
    for (const c of this.chests) {
      if (c.gone || c.opening > 0) continue;
      const d = Math.hypot(c.pos.x - from.x, c.pos.z - from.z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  /** El cofre disponible (sin candado) más cercano en cualquier lugar, para decir hacia dónde queda. */
  closestAvailable(from: THREE.Vector3, now: number): Chest | null {
    let best: Chest | null = null;
    let bestD = Infinity;
    for (const c of this.chests) {
      if (c.gone || c.lockedUntil > now) continue;
      const d = Math.hypot(c.pos.x - from.x, c.pos.z - from.z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  open(c: Chest): void {
    c.opening = 0.001;
  }

  lockFor(c: Chest, until: number): void {
    c.lockedUntil = until;
  }

  update(dt: number, now: number): void {
    for (const c of this.chests) {
      if (c.gone) continue;
      const locked = c.lockedUntil > now;
      c.beam.visible = !locked;
      (c.lock.material as THREE.MeshLambertMaterial).color.setHex(locked ? 0xff5a5a : 0xffe066);
      c.beam.scale.x = c.beam.scale.z = 1 + Math.sin(now * 3 + c.id) * 0.2;
      c.group.rotation.y = Math.sin(now * 0.7 + c.id) * 0.06;
      if (c.opening > 0) {
        c.opening += dt;
        c.lid.rotation.x = -Math.min(1.9, c.opening * 4);
        c.group.position.y = Math.sin(Math.min(1, c.opening * 2) * Math.PI) * 0.5;
        c.beam.visible = true;
        c.beam.scale.x = c.beam.scale.z = 1 + c.opening * 3;
        (c.beam.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - c.opening * 0.25);
        if (c.opening > 1.6) this.remove(c);
        continue;
      }
      // Cuenta regresiva sobre el cofre con candado.
      const text = locked ? `Candado ${Math.ceil(c.lockedUntil - now)} s` : "";
      if (text !== c.labelText) {
        c.labelText = text;
        if (c.label) {
          c.group.remove(c.label);
          (c.label.material as THREE.SpriteMaterial).map?.dispose();
          c.label = null;
        }
        if (text) {
          c.label = textSprite(text, { color: "#ffd0d0", bg: "rgba(90,20,20,0.8)", size: 3 });
          c.label.position.y = 3.2;
          c.group.add(c.label);
        }
      }
    }
  }

  private remove(c: Chest): void {
    c.gone = true;
    this.group.remove(c.group);
  }
}
