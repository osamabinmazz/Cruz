import * as THREE from "three";
import type { Battle, Pickup } from "../src/core/battle/Battle";
import { toWorld } from "./coords";

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  max: number;
  gravity: number;
  grow: number;
}

interface Floater {
  sprite: THREE.Sprite;
  life: number;
  vy: number;
}

const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const ringGeo = new THREE.RingGeometry(0.85, 1, 32);
const textCache = new Map<string, THREE.CanvasTexture>();

function textTexture(text: string, color: string): THREE.CanvasTexture {
  const key = `${text}|${color}`;
  let t = textCache.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.font = "900 44px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 8;
    g.strokeStyle = "rgba(0,0,0,0.75)";
    g.strokeText(text, 64, 34);
    g.fillStyle = color;
    g.fillText(text, 64, 34);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textCache.set(key, t);
  }
  return t;
}

/** Chispas, anillos, números de daño y polvo estelar: todo lo que hace que cada golpe se sienta. */
export class Effects {
  readonly group = new THREE.Group();
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private rings: { mesh: THREE.Mesh; life: number; max: number; size: number }[] = [];
  private orbs = new Map<number, THREE.Mesh>();
  private readonly orbGroup = new THREE.Group();
  /** Tope de partículas (baja en equipos modestos). */
  maxParticles = 260;

  constructor() {
    this.group.add(this.orbGroup);
  }

  /** Estallido de cubitos de color. */
  burst(at: THREE.Vector3, color: number | string, count = 10, speed = 6, size = 0.22, gravity = 14): void {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true });
    for (let i = 0; i < count; i++) {
      if (this.particles.length > this.maxParticles) break;
      const m = new THREE.Mesh(cubeGeo, mat.clone());
      m.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      m.position.copy(at);
      const a = Math.random() * Math.PI * 2;
      const up = 0.3 + Math.random() * 0.9;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.group.add(m);
      this.particles.push({ mesh: m, vel: new THREE.Vector3(Math.cos(a) * s, up * s, Math.sin(a) * s), life: 0.5 + Math.random() * 0.35, max: 0.85, gravity, grow: 0 });
    }
    mat.dispose();
  }

  /** Anillo que se abre en el suelo (explosiones, mejoras, cofres). */
  ring(at: THREE.Vector3, color: number | string, size = 3, seconds = 0.45): void {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(at.x, 0.12, at.z);
    this.group.add(m);
    this.rings.push({ mesh: m, life: seconds, max: seconds, size });
  }

  /** Número que sube y se desvanece sobre un zombi o sobre la escuela. */
  float(at: THREE.Vector3, text: string, color = "#ffffff", scale = 1.6): void {
    if (this.floaters.length > 40) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, color), transparent: true, depthWrite: false, depthTest: false }));
    s.scale.set(scale * 2, scale, 1);
    s.position.copy(at);
    s.position.x += (Math.random() - 0.5) * 0.8;
    s.renderOrder = 10;
    this.group.add(s);
    this.floaters.push({ sprite: s, life: 0.9, vy: 3.4 });
  }

  /** Muerte de un zombi: nube verde y un destello. */
  zombieDown(at: THREE.Vector3, big = false): void {
    const p = at.clone();
    p.y = 1.4;
    this.burst(p, 0x8fd16b, big ? 40 : 14, big ? 10 : 6, big ? 0.4 : 0.26);
    this.burst(p, 0xfff2a8, big ? 14 : 5, 4, 0.16, 4);
    this.ring(at, 0xb6f58a, big ? 7 : 2.4, 0.4);
  }

  /** Polvo estelar que dejan los zombis que derrotas: orbes dorados que flotan hasta que los tocas. */
  syncPickups(pickups: Pickup[], now: number): void {
    const alive = new Set<number>();
    for (const p of pickups) {
      alive.add(p.id);
      let o = this.orbs.get(p.id);
      if (!o) {
        o = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true }));
        this.orbs.set(p.id, o);
        this.orbGroup.add(o);
      }
      const w = toWorld({ x: p.x, y: p.y });
      o.position.set(w.x, 1.1 + Math.sin(now * 4 + p.id) * 0.25, w.z);
      o.rotation.y = now * 3;
      // Parpadea cuando está por apagarse.
      const left = 7 - p.age;
      o.visible = left > 2 || Math.floor(now * 10) % 2 === 0;
    }
    for (const [id, o] of this.orbs) {
      if (alive.has(id)) continue;
      this.orbGroup.remove(o);
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
      this.orbs.delete(id);
    }
  }

  /** Recoge el polvo estelar cercano y devuelve cuánto valía lo recogido. */
  collect(battle: Battle, from: THREE.Vector3, reach = 2.4): number {
    let total = 0;
    for (const p of [...battle.pickups]) {
      const w = toWorld({ x: p.x, y: p.y });
      if (Math.hypot(w.x - from.x, w.z - from.z) > reach) continue;
      const v = battle.collectPickup(p.id);
      if (v > 0) {
        total += v;
        this.burst(new THREE.Vector3(w.x, 1.2, w.z), 0xffe066, 8, 5, 0.18, 6);
      }
    }
    return total;
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.1) {
        p.mesh.position.y = 0.1;
        p.vel.multiplyScalar(0.4);
      }
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.max);
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const k = 1 - Math.max(0, r.life) / r.max;
      r.mesh.scale.setScalar(0.3 + k * r.size);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85;
      if (r.life <= 0) {
        this.group.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.sprite.position.y += f.vy * dt;
      f.vy *= Math.max(0, 1 - dt * 3);
      f.sprite.material.opacity = Math.min(1, f.life * 2.5);
      if (f.life <= 0) {
        this.group.remove(f.sprite);
        f.sprite.material.dispose();
        this.floaters.splice(i, 1);
      }
    }
  }
}
