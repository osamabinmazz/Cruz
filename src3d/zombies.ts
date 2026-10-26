import * as THREE from "three";
import type { Battle, Enemy } from "../src/core/battle/Battle";
import type { EnemyKind } from "../src/core/difficulty";
import { block, mat } from "./blocks";
import { animateWalk, buildRig, type Rig } from "./character";
import { toWorld } from "./coords";

/** Zombis de la 2.0 hechos de bloques. Cada tipo conserva su rasgo: resortes, dos cabezas, cuernos… */

interface Outfit {
  coat: string;
  pants: string;
  shoes: string;
}

const SKIN = "#9fb58a";
const OUTFITS: Record<EnemyKind, Outfit> = {
  comun: { coat: "#7a5638", pants: "#4f3d33", shoes: "#2b2323" },
  veloz: { coat: "#e8c547", pants: "#3558a8", shoes: "#f4f6ff" },
  resistente: { coat: "#6f5a8a", pants: "#3f3a4f", shoes: "#2b2323" },
  niebla: { coat: "#8e9ab3", pants: "#5b6378", shoes: "#3d4254" },
  mochila: { coat: "#b59a62", pants: "#6b5a3f", shoes: "#3b2d22" },
  saltador: { coat: "#4fa66b", pants: "#2f4f7a", shoes: "#ff9f43" },
  doble: { coat: "#8f5fb0", pants: "#3f6f78", shoes: "#2b2323" },
  mini: { coat: "#b9c97a", pants: "#5a6a3f", shoes: "#2b2323" },
  gigante: { coat: "#8a2f3a", pants: "#3a2a2f", shoes: "#1f1a1a" }
};

const SCALE: Record<EnemyKind, number> = { comun: 1, veloz: 0.95, resistente: 1.08, niebla: 1, mochila: 1.12, saltador: 1, doble: 1.12, mini: 0.6, gigante: 1.9 };

function buildZombie(kind: EnemyKind): Rig {
  const o = OUTFITS[kind];
  const rig = buildRig({ skin: SKIN, shirt: o.coat, sleeves: o.coat, pants: o.pants, shoes: o.shoes, face: "zombie" });
  const { body, head } = rig;
  const topY = rig.height;
  // Brazos estirados hacia adelante, como un zombi.
  rig.armL.rotation.x = -Math.PI / 2.1;
  rig.armR.rotation.x = -Math.PI / 2.1;
  // Pelo despeinado.
  if (kind !== "resistente" && kind !== "mochila" && kind !== "niebla") {
    for (const [x, z] of [[-0.25, 0], [0.05, -0.1], [0.3, 0.05]] as const) body.add(block(0.14, 0.3, 0.14, "#3b3326", x, topY + 0.12, z));
  }
  switch (kind) {
    case "resistente": {
      // Cono de tránsito.
      body.add(block(0.8, 0.14, 0.8, "#c96c12", 0, topY + 0.07, 0));
      body.add(block(0.58, 0.3, 0.58, "#f08a24", 0, topY + 0.29, 0));
      body.add(block(0.4, 0.26, 0.4, "#fff3e0", 0, topY + 0.55, 0));
      body.add(block(0.22, 0.3, 0.22, "#f08a24", 0, topY + 0.8, 0));
      break;
    }
    case "mochila": {
      // Olla de casco y mochila grande.
      body.add(block(0.95, 0.4, 0.95, "#aab4c3", 0, topY + 0.12, 0));
      body.add(block(1.05, 0.1, 1.05, "#8793a5", 0, topY - 0.06, 0));
      body.add(block(0.12, 0.2, 0.3, "#6c7789", 0.55, topY + 0.1, 0));
      body.add(block(0.95, 1.2, 0.5, "#8a5a33", 0, 1.9, -0.55));
      body.add(block(0.7, 0.4, 0.3, "#6b4426", 0, 1.6, -0.9));
      break;
    }
    case "niebla": {
      // Capucha de niebla, translúcido.
      body.add(block(1.0, 0.5, 1.0, "#6f7b94", 0, topY - 0.05, -0.02));
      body.add(block(1.25, 1.0, 0.15, "#6f7b94", 0, 1.9, -0.38));
      rig.group.traverse((c) => {
        if (c instanceof THREE.Mesh && !Array.isArray(c.material)) c.material = mat((c.material as THREE.MeshLambertMaterial).color.getStyle(), { opacity: 0.62 });
      });
      break;
    }
    case "saltador": {
      // Resortes en lugar de zapatos y vincha azul.
      for (const leg of [rig.legL, rig.legR]) {
        leg.add(block(0.5, 0.3, 0.5, "#cfd8e8", 0, -1.0, 0));
        leg.add(block(0.62, 0.12, 0.62, "#ff9f43", 0, -1.1, 0.04));
      }
      body.add(block(1.0, 0.16, 1.0, "#2f6fe4", 0, topY - 0.3, 0));
      body.add(block(0.22, 0.22, 0.06, "#ffe66d", 0, topY - 0.3, 0.52, { emissive: "#7a5a00" }));
      break;
    }
    case "doble": {
      // Segunda cabeza al lado de la principal.
      const h2 = head.clone();
      h2.position.set(0.62, topY - HEAD_HALF + 0.05, -0.1);
      h2.scale.setScalar(0.85);
      h2.rotation.z = -0.25;
      body.add(h2);
      break;
    }
    case "mini": {
      body.add(block(0.2, 0.4, 0.5, "#ff8fab", -0.2, topY + 0.1, 0));
      body.add(block(0.2, 0.4, 0.5, "#ff8fab", 0.2, topY + 0.1, 0));
      break;
    }
    case "gigante": {
      // Cuernos y hombreras con púas.
      for (const s of [-1, 1]) {
        body.add(block(0.18, 0.5, 0.18, "#efe6c8", s * 0.4, topY + 0.3, 0));
        body.add(block(0.14, 0.3, 0.14, "#efe6c8", s * 0.55, topY + 0.65, 0));
        body.add(block(0.65, 0.3, 0.65, "#4a4a58", s * 0.75, rig.height - 0.9, 0));
        body.add(block(0.14, 0.3, 0.14, "#cfd3e0", s * 0.75, rig.height - 0.62, 0));
      }
      break;
    }
    default:
      break;
  }
  rig.group.scale.setScalar(SCALE[kind]);
  return rig;
}

const HEAD_HALF = 0.45;

interface Entry {
  rig: Rig;
  group: THREE.Group;
  last: THREE.Vector3;
  phase: number;
  bar: THREE.Mesh;
  barBack: THREE.Mesh;
  fall: number;
  fading: boolean;
}

/** Muestra en 3D los zombis del simulador: crea, mueve, orienta y retira modelos. */
export class ZombieView {
  readonly group = new THREE.Group();
  private readonly entries = new Map<number, Entry>();
  private readonly dying: Entry[] = [];

  constructor(private battle: Battle) {}

  /** Cambia la batalla que se dibuja y retira los modelos de la anterior. */
  setBattle(battle: Battle): void {
    this.battle = battle;
    for (const e of this.entries.values()) this.group.remove(e.group);
    for (const e of this.dying) this.group.remove(e.group);
    this.entries.clear();
    this.dying.length = 0;
  }

  /** Posición del mundo de un zombi (en el suelo). */
  position(e: Enemy): THREE.Vector3 {
    return toWorld(this.battle.enemyPosition(e));
  }

  update(dt: number, now: number): void {
    const alive = new Set<number>();
    for (const e of this.battle.enemies) {
      if (e.state === "gone" && !this.entries.has(e.id)) continue;
      let en = this.entries.get(e.id);
      if (!en) {
        en = this.create(e);
        this.entries.set(e.id, en);
        this.group.add(en.group);
      }
      if (e.state === "gone") {
        this.entries.delete(e.id);
        en.fading = true;
        this.dying.push(en);
        continue;
      }
      alive.add(e.id);
      const pos = this.position(e);
      let hop = 0;
      if (e.kind === "saltador") hop = Math.max(0, Math.sin(now * 5 + e.id)) * 1.1;
      const moved = pos.clone().sub(en.last);
      const speed = moved.length() / Math.max(dt, 1e-4);
      if (moved.lengthSq() > 1e-6) {
        const target = Math.atan2(moved.x, moved.z);
        let d = target - en.group.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        en.group.rotation.y += d * Math.min(1, dt * 10);
      }
      en.last.copy(pos);
      en.group.position.set(pos.x, hop, pos.z);
      en.phase += dt * Math.min(14, 3 + speed * 1.1) * (e.kind === "veloz" ? 1.5 : 1);
      animateWalk(en.rig, en.phase, 0.9);
      en.rig.armL.rotation.x = -Math.PI / 2.1 + Math.sin(en.phase * 0.5) * 0.12;
      en.rig.armR.rotation.x = -Math.PI / 2.1 - Math.sin(en.phase * 0.5) * 0.12;
      const k = Math.max(0.02, e.health / e.maxHealth);
      en.bar.scale.x = k;
      en.bar.position.x = -(1 - k) * 0.7;
      (en.bar.material as THREE.MeshBasicMaterial).color.setHex(k > 0.4 ? 0x7cf5c4 : 0xffd166);
      const showBar = e.health < e.maxHealth;
      en.bar.visible = en.barBack.visible = showBar;
    }
    // Zombis derrotados: caen y se desvanecen.
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const en = this.dying[i];
      en.fall += dt;
      en.rig.group.rotation.x = Math.min(Math.PI / 2, en.fall * 5);
      en.group.position.y = -Math.min(0.3, en.fall * 0.6);
      en.bar.visible = en.barBack.visible = false;
      if (en.fall > 0.9) {
        this.group.remove(en.group);
        this.dying.splice(i, 1);
      }
    }
  }

  private create(e: Enemy): Entry {
    const rig = buildZombie(e.kind);
    const group = new THREE.Group();
    group.add(rig.group);
    const barBack = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x7cf5c4, depthWrite: false }));
    const top = rig.height * SCALE[e.kind] + 0.9;
    barBack.position.y = bar.position.y = top;
    bar.position.z = 0.01;
    // Las barras miran a la cámara (se orientan en cada cuadro desde el exterior).
    barBack.userData.billboard = bar.userData.billboard = true;
    group.add(barBack, bar);
    const last = this.position(e);
    group.position.copy(last);
    return { rig, group, last, phase: Math.random() * 6, bar, barBack, fall: 0, fading: false };
  }

  /** Orienta las barras de vida hacia la cámara. */
  faceCamera(camera: THREE.Camera): void {
    this.group.traverse((o) => {
      if (o.userData.billboard) o.quaternion.copy(o.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.quaternion));
    });
  }
}
