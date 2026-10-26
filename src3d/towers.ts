import * as THREE from "three";
import { MUZZLE_HEIGHT, WEAPON_SCALE, type Battle, type Tower } from "../src/core/battle/Battle";
import { defenseById } from "../src/core/defenses";
import { block } from "./blocks";
import { toWorld } from "./coords";

/** Torres de la 2.0 (y sus disparos) dibujadas con bloques sobre sus pedestales. */

interface TowerEntry {
  group: THREE.Group;
  barrel: THREE.Group;
  tower: Tower;
  glow: THREE.Mesh;
}

export class TowerView {
  readonly group = new THREE.Group();
  private readonly entries: TowerEntry[] = [];
  private readonly shots = new Map<number, THREE.Mesh>();

  constructor(private readonly battle: Battle) {
    for (const t of battle.towers) this.entries.push(this.build(t));
  }

  private build(t: Tower): TowerEntry {
    const color = defenseById(t.id).color;
    const g = new THREE.Group();
    g.position.copy(toWorld({ x: t.x, y: t.y }));
    g.position.y = 0.7;
    const barrel = new THREE.Group();
    barrel.position.y = 1.6;
    g.add(block(1.8, 1.2, 1.8, 0x34477d, 0, 0.6, 0));
    g.add(block(2.0, 0.2, 2.0, color, 0, 1.25, 0));
    switch (t.behavior) {
      case "multi":
        for (const o of [-0.45, -0.15, 0.15, 0.45]) barrel.add(block(0.22, 0.22, 1.7, 0x1d2b55, o, 0, 0.9), block(0.26, 0.26, 0.2, color, o, 0, 1.75));
        break;
      case "long":
        barrel.add(block(0.5, 0.5, 2.8, 0x6b4a2b, 0, 0, 1.2), block(1.8, 0.12, 0.2, color, 0, 0, 0.4));
        break;
      case "twin":
        barrel.add(block(0.4, 0.4, 1.8, 0x2b3a6b, -0.3, 0, 0.9), block(0.4, 0.4, 1.8, 0x2b3a6b, 0.3, 0, 0.9));
        break;
      case "splash":
        barrel.add(block(0.25, 0.25, 2.2, 0xc9a36b, 0, 0.2, 0.7), block(0.9, 0.9, 0.9, color, 0, 0.5, 1.9));
        break;
      case "reveal":
        g.add(block(1.1, 2.4, 1.1, 0xf4f6ff, 0, 2.4, 0), block(1.2, 0.5, 1.2, 0x2f6fe4, 0, 2.2, 0), block(1.4, 0.8, 1.4, 0xfffbe0, 0, 3.9, 0, { emissive: 0xc79a2a }));
        barrel.position.y = 3.9;
        barrel.add(block(0.3, 0.3, 1.2, color, 0, 0, 0.8));
        break;
      case "slow":
      case "pulse":
        barrel.add(block(1.2, 1.2, 0.2, 0xdfe6ff, 0, 0.2, 0.5), block(0.15, 0.15, 1.0, color, 0, 0.2, 1.1));
        break;
      default:
        barrel.add(block(0.5, 0.5, 1.8, 0x2b3a6b, 0, 0, 0.9), block(0.6, 0.6, 0.2, color, 0, 0, 1.8));
    }
    g.add(barrel);
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
    for (const p of this.battle.projectiles) {
      live.add(p.id);
      let m = this.shots.get(p.id);
      if (!m) {
        m = new THREE.Mesh(new THREE.SphereGeometry(p.kind === "rock" ? 0.55 : 0.28, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color) }));
        this.shots.set(p.id, m);
        this.group.add(m);
      }
      const w = toWorld({ x: p.x, y: p.y + MUZZLE_HEIGHT * WEAPON_SCALE });
      m.position.set(w.x, 2.1, w.z);
    }
    for (const [id, m] of this.shots) {
      if (live.has(id)) continue;
      this.group.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      this.shots.delete(id);
    }
  }
}
