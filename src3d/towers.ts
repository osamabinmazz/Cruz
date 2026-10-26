import * as THREE from "three";
import { MUZZLE_HEIGHT, WEAPON_SCALE, type Battle, type Tower } from "../src/core/battle/Battle";
import { ALL_DEFENSES, defenseById } from "../src/core/defenses";
import { block, shadowify } from "./blocks";
import { buildProjectile, buildWeaponModel } from "./weaponModels";
import { toWorld } from "./coords";

/** Torres de la 2.0 (y sus disparos) dibujadas con bloques sobre sus pedestales. */

/** Lo mínimo que necesita el dibujo de una torre (sirve para las del simulador y para las del día, quietas). */
export interface TowerLike {
  id: Tower["id"];
  behavior: Tower["behavior"];
  x: number;
  y: number;
  aim: number;
  flash: number;
}

interface TowerEntry {
  group: THREE.Group;
  barrel: THREE.Group;
  tower: TowerLike;
  glow: THREE.Mesh;
}

export class TowerView {
  readonly group = new THREE.Group();
  private readonly entries: TowerEntry[] = [];
  private readonly shots = new Map<number, THREE.Object3D>();
  /** Para dejar estela detrás de los disparos. */
  onTrail: ((at: THREE.Vector3, color: string) => void) | null = null;

  /** Con `battle`, las torres disparan de verdad (noche); sin él, solo se ven colocadas (día). */
  constructor(towers: TowerLike[], private battle: Battle | null = null) {
    this.rebuild(towers);
  }

  /** Vuelve a poner las torres (al colocar o quitar una durante el día). */
  rebuild(towers: TowerLike[]): void {
    for (const e of this.entries) this.group.remove(e.group);
    this.entries.length = 0;
    for (const t of towers) this.entries.push(this.build(t));
  }

  bind(battle: Battle | null, towers: TowerLike[]): void {
    this.battle = battle;
    this.rebuild(towers);
  }

  private build(t: TowerLike): TowerEntry {
    const color = defenseById(t.id).color;
    const g = new THREE.Group();
    g.position.copy(toWorld({ x: t.x, y: t.y }));
    g.position.y = 0.7;
    const barrel = new THREE.Group();
    barrel.position.y = 1.9;
    g.add(block(1.8, 1.2, 1.8, 0x34477d, 0, 0.6, 0));
    g.add(block(2.0, 0.2, 2.0, color, 0, 1.25, 0));
    // Soporte giratorio y el arma con su propia forma.
    g.add(block(0.9, 0.5, 0.9, 0x5a6690, 0, 1.55, 0), block(0.5, 0.6, 0.5, 0x8c93ad, 0, 1.3, 0));
    if (t.behavior === "reveal") {
      // La brújula austral se alza sobre una columna para ver más lejos.
      g.add(block(1.1, 2.4, 1.1, 0xf4f6ff, 0, 2.4, 0), block(1.2, 0.5, 1.2, 0x2f6fe4, 0, 2.2, 0));
      barrel.position.y = 3.9;
    }
    const model = buildWeaponModel(t.id);
    model.scale.setScalar(1.7);
    barrel.add(model);
    g.add(barrel);
    shadowify(g);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0 }));
    glow.position.y = 1.6;
    g.add(glow);
    this.group.add(g);
    return { group: g, barrel, tower: t, glow };
  }

  update(): void {
    for (const e of this.entries) {
      const t = e.tower;
      // El simulador mide el ángulo en el campo: x a la derecha, y hacia abajo (= +z del mundo).
      e.barrel.rotation.y = Math.atan2(Math.cos(t.aim), Math.sin(t.aim));
      (e.glow.material as THREE.MeshBasicMaterial).opacity = Math.min(0.9, t.flash * 6);
      const s = 1 + Math.min(0.5, t.flash * 3);
      e.glow.scale.setScalar(s);
    }
    // Disparos de las torres.
    const live = new Set<number>();
    const projectiles = this.battle?.projectiles ?? [];
    for (const p of projectiles) {
      live.add(p.id);
      let m = this.shots.get(p.id);
      if (!m) {
        const def = ALL_DEFENSES.find((d) => d.color === p.color);
        m = def && p.kind !== "rock" ? buildProjectile(def.id, 0.4) : new THREE.Mesh(new THREE.SphereGeometry(p.kind === "rock" ? 0.55 : 0.28, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color) }));
        this.shots.set(p.id, m);
        this.group.add(m);
      }
      const w = toWorld({ x: p.x, y: p.y + MUZZLE_HEIGHT * WEAPON_SCALE });
      m.position.set(w.x, 2.1, w.z);
      m.rotation.y = Math.atan2(Math.cos(p.angle), Math.sin(p.angle));
      if (this.onTrail && Math.random() < 0.5) this.onTrail(m.position.clone(), p.color);
    }
    for (const [id, m] of this.shots) {
      if (live.has(id)) continue;
      this.group.remove(m);
      m.traverse((o) => {
        const mm = o as THREE.Mesh;
        mm.geometry?.dispose();
        (mm.material as THREE.Material | undefined)?.dispose();
      });
      this.shots.delete(id);
    }
  }
}
