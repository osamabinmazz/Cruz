import * as THREE from "three";
import type { BattleMap } from "../src/core/battle/maps";
import { CROSS, EXTRA_STARS, type Point } from "../src/core/geometry";
import { inWater } from "../src/core/battle/maps";
import { block, mergeStatic, shadowify, textSprite } from "./blocks";
import { FIELD_SCALE, WORLD_D, WORLD_W, toWorld } from "./coords";

/**
 * El mundo de bloques: la isla con la escuela al Este, el camino de los zombis,
 * agua según el mapa de la noche, árboles, rocas y pedestales para las torres.
 */

export interface TimeOfDay {
  /** 0 = noche, 1 = pleno día. */
  light: number;
}

interface Palette {
  grass: number;
  grass2: number;
  tree: number;
  tree2: number;
  rock: number;
  ground: number;
}

const THEME: Record<string, Palette> = {
  bosque: { grass: 0x4fa85a, grass2: 0x469c52, tree: 0x2f8a46, tree2: 0x257a3a, rock: 0x8d97a6, ground: 0x2e6b3a },
  rio: { grass: 0x58b06a, grass2: 0x4ea560, tree: 0x38a05a, tree2: 0x2f9050, rock: 0x93a0b0, ground: 0x2e6b3a },
  colina: { grass: 0x6ca85a, grass2: 0x629c52, tree: 0x4a9a3e, tree2: 0x428a38, rock: 0xa29a8a, ground: 0x3a6b2e },
  lago: { grass: 0x4da878, grass2: 0x449d6f, tree: 0x2f9a6a, tree2: 0x278a5e, rock: 0x8aa0aa, ground: 0x2e6b4a },
  campamento: { grass: 0x5aa85a, grass2: 0x50a050, tree: 0x3a9a40, tree2: 0x308a38, rock: 0x959ba6, ground: 0x2e6b3a }
};

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
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

export class World {
  readonly group = new THREE.Group();
  readonly sky: SkyState;
  /** Obstáculos redondos (centro y radio, en el mundo) que el estudiante no atraviesa. */
  readonly obstacles: { x: number; z: number; r: number }[] = [];
  /** Lugares de las torres (centro, en el mundo). */
  readonly slots: THREE.Vector3[] = [];
  readonly school = new THREE.Group();
  private readonly windows: THREE.Mesh[] = [];
  private readonly flag: THREE.Mesh;
  private readonly water: THREE.Mesh[] = [];

  constructor(readonly map: BattleMap, seed = 7) {
    const pal = THEME[map.theme] ?? THEME.bosque;
    const statics = new THREE.Group();
    const rnd = seeded(seed + map.id.length * 31);

    // Suelo: tablero de cuadros de pasto, más grande que el campo para que no se vea el borde.
    const margin = 26;
    const tiles = new THREE.Group();
    const tile = 4;
    for (let x = -margin; x < WORLD_W + margin; x += tile) {
      for (let z = -margin; z < WORLD_D + margin; z += tile) {
        const t = block(tile, 0.4, tile, ((x / tile + z / tile) & 1) === 0 ? pal.grass : pal.grass2, x + tile / 2, -0.2, z + tile / 2);
        tiles.add(t);
      }
    }
    statics.add(tiles);

    // Agua (río o lago).
    for (const w of map.water) {
      const m = new THREE.Mesh(
        w.kind === "rect" ? new THREE.BoxGeometry(w.w * FIELD_SCALE, 0.3, w.h * FIELD_SCALE) : new THREE.CylinderGeometry(1, 1, 0.3, 28),
        new THREE.MeshLambertMaterial({ color: 0x3aa0e6, transparent: true, opacity: 0.88, emissive: new THREE.Color(0x0a3a66) })
      );
      if (w.kind === "rect") m.position.set((w.x + w.w / 2) * FIELD_SCALE, -0.08, (w.y + w.h / 2) * FIELD_SCALE);
      else {
        m.scale.set(w.w * FIELD_SCALE, 1, w.h * FIELD_SCALE);
        m.position.set(w.x * FIELD_SCALE, -0.08, w.y * FIELD_SCALE);
      }
      this.group.add(m);
      this.water.push(m);
    }

    // Camino: losetas de tierra a lo largo de cada ruta, con borde de piedras.
    const path = new THREE.Group();
    const placed = new Set<string>();
    for (const r of map.routes) {
      for (let i = 1; i < r.length; i++) {
        const a = r[i - 1];
        const b = r[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.ceil(len / 22);
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          const gx = Math.round((p.x * FIELD_SCALE) / 1.4);
          const gz = Math.round((p.y * FIELD_SCALE) / 1.4);
          for (let ox = -2; ox <= 2; ox++) {
            for (let oz = -2; oz <= 2; oz++) {
              const key = `${gx + ox},${gz + oz}`;
              if (placed.has(key)) continue;
              const wx = (gx + ox) * 1.4;
              const wz = (gz + oz) * 1.4;
              const d = distToRoutes({ x: wx / FIELD_SCALE, y: wz / FIELD_SCALE }, map.routes) * FIELD_SCALE;
              if (d > 3.0) continue;
              placed.add(key);
              const edge = d > 2.4;
              path.add(block(1.4, edge ? 0.34 : 0.3, 1.4, edge ? 0x9a7a52 : ((gx + gz) & 1 ? 0xc79a62 : 0xbf9159), wx, 0.0, wz));
            }
          }
        }
      }
    }
    statics.add(path);

    // Portal de entrada de los zombis.
    const start = map.routes[0][0];
    const entry = toWorld({ x: Math.max(start.x, 6), y: start.y });
    const portal = new THREE.Group();
    portal.position.copy(entry);
    portal.add(block(1, 5, 1, 0x6b6f82, -3, 2.5, 0), block(1, 5, 1, 0x6b6f82, 3, 2.5, 0), block(7, 1, 1, 0x6b6f82, 0, 5.4, 0));
    portal.add(block(5, 4.4, 0.4, 0x2a0f4a, 0, 2.2, 0, { emissive: 0x4a1a8a, opacity: 0.7 }));
    statics.add(portal);

    // Árboles y rocas lejos del camino, del agua y de la escuela.
    const decor = new THREE.Group();
    const treeCount = map.theme === "bosque" ? 150 : 90;
    let tries = 0;
    let placedTrees = 0;
    while (placedTrees < treeCount && tries++ < 2000) {
      const p = { x: -80 + rnd() * (FIELD_SCALE ** -1 * WORLD_W + 160), y: -60 + rnd() * (690 + 120) };
      const inside = p.x > 0 && p.x < 960 && p.y > 0 && p.y < 690;
      if (inside && (distToRoutes(p, map.routes) < 70 || inWater(p, map.water, 30) || Math.hypot(p.x - map.camp.x, p.y - map.camp.y) < 190)) continue;
      if (!inside && rnd() < 0.2) continue;
      if (map.slots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 55)) continue;
      const w = toWorld(p);
      const tall = 2.4 + rnd() * 2.2;
      const tree = new THREE.Group();
      tree.position.copy(w);
      tree.add(block(0.8, tall, 0.8, 0x7a4f2a, 0, tall / 2, 0));
      tree.add(block(3.2, 1.6, 3.2, pal.tree, 0, tall + 0.6, 0));
      tree.add(block(2.2, 1.4, 2.2, pal.tree2, 0, tall + 1.9, 0));
      tree.add(block(1.2, 1.0, 1.2, pal.tree, 0, tall + 3.0, 0));
      decor.add(tree);
      if (inside) this.obstacles.push({ x: w.x, z: w.z, r: 0.9 });
      placedTrees++;
    }
    for (let i = 0; i < 40; i++) {
      const p = { x: rnd() * 960, y: rnd() * 690 };
      if (distToRoutes(p, map.routes) < 45 || inWater(p, map.water, 25) || Math.hypot(p.x - map.camp.x, p.y - map.camp.y) < 150) continue;
      const w = toWorld(p);
      const s = 0.8 + rnd() * 1.1;
      decor.add(block(s * 1.6, s, s * 1.3, pal.rock, w.x, s / 2, w.z));
      this.obstacles.push({ x: w.x, z: w.z, r: s * 0.9 });
    }
    // Florcitas de colores.
    for (let i = 0; i < 160; i++) {
      const p = { x: rnd() * 960, y: rnd() * 690 };
      if (distToRoutes(p, map.routes) < 40 || inWater(p, map.water, 10)) continue;
      const w = toWorld(p);
      decor.add(block(0.14, 0.4, 0.14, 0x3a8a3a, w.x, 0.2, w.z));
      decor.add(block(0.34, 0.2, 0.34, [0xff8fab, 0xffe66d, 0xffffff, 0x9bd1ff][i % 4], w.x, 0.5, w.z));
    }
    statics.add(decor);

    // Puentes de madera donde el camino cruza el río.
    for (const w of map.water) {
      if (w.kind !== "rect") continue;
      for (const r of map.routes) {
        for (let i = 1; i < r.length; i++) {
          const a = r[i - 1];
          const b = r[i];
          if (Math.abs(a.y - b.y) < 1 && Math.min(a.x, b.x) < w.x && Math.max(a.x, b.x) > w.x + w.w && a.y > w.y && a.y < w.y + w.h) {
            const bridge = new THREE.Group();
            bridge.position.set((w.x + w.w / 2) * FIELD_SCALE, 0, a.y * FIELD_SCALE);
            bridge.add(block(w.w * FIELD_SCALE + 3, 0.4, 5.6, 0x9a6a3a, 0, 0.05, 0));
            for (const s of [-1, 1]) bridge.add(block(w.w * FIELD_SCALE + 3, 0.5, 0.3, 0x6b4426, 0, 0.55, s * 2.7));
            statics.add(bridge);
          }
        }
      }
    }

    // Pedestales para las torres.
    for (const s of map.slots) {
      const w = toWorld(s);
      this.slots.push(w);
      const ped = new THREE.Group();
      ped.position.copy(w);
      ped.add(block(3.2, 0.5, 3.2, 0x6b7390, 0, 0.25, 0), block(2.6, 0.2, 2.6, 0x8c93ad, 0, 0.6, 0));
      for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]] as const) ped.add(block(0.3, 0.4, 0.3, 0xb7bdd6, x, 0.7, z));
      statics.add(ped);
    }

    const merged = mergeStatic(statics);
    shadowify(merged, true);
    this.group.add(merged);

    // La escuela.
    this.flag = this.buildSchool(map.camp);
    shadowify(this.school);
    this.group.add(this.school);
    this.buildAmbience();
    this.sky = new SkyState(this);
  }

  private buildSchool(camp: Point): THREE.Mesh {
    const c = toWorld(camp);
    // La puerta mira al camino (oeste); la escuela queda al este del punto de entrada.
    this.school.position.set(c.x + 4.5, 0, c.z);
    const s = this.school;
    s.add(block(11, 6.5, 9, 0xf1e2c0, 0, 3.25, 0));
    s.add(block(11.4, 0.5, 9.4, 0xb35a45, 0, 6.7, 0));
    s.add(block(10, 1.6, 8, 0xc4543a, 0, 7.6, 0), block(8, 1.4, 6.6, 0xc4543a, 0, 8.9, 0), block(5, 1.2, 4.6, 0xc4543a, 0, 10, 0));
    s.add(block(11.2, 1.2, 9.2, 0xa4573f, 0, 0.6, 0));
    s.add(block(2.2, 3.6, 0.3, 0x6b4426, -5.6, 1.9, 0));
    // Ventanas encendidas.
    for (const z of [-2.8, 2.8]) {
      for (const y of [2.4, 5.0]) {
        const w = block(1.7, 1.7, 0.2, 0xffe08a, -5.55, y, z, { emissive: 0xc79a2a });
        this.windows.push(w);
        s.add(w, block(2.0, 2.0, 0.12, 0x6b4426, -5.5, y, z));
      }
    }
    s.add(block(1, 1, 0.2, 0xffffff, -5.55, 7.4, 0));
    // Cartel y bandera.
    const sign = textSprite("ESCUELA", { color: "#ffffff", bg: "#2a56b0", size: 5 });
    sign.position.set(-6.5, 8.6, 0);
    s.add(sign);
    s.add(block(0.2, 4.5, 0.2, 0xcfd3e0, 3.5, 12.5, 0));
    const flag = block(0.1, 1.6, 2.6, 0x3a5db8, 3.5, 14.2, -1.4);
    s.add(flag);
    s.add(block(0.12, 0.3, 0.3, 0xffffff, 3.5, 14.4, -1.8), block(0.12, 0.3, 0.3, 0xffffff, 3.5, 14.0, -1.2), block(0.12, 0.3, 0.3, 0xffffff, 3.5, 14.2, -0.8));
    // Escalones y farol.
    s.add(block(3.4, 0.3, 2.4, 0xcfd3e0, -6.4, 0.15, 0));
    s.add(block(0.3, 3, 0.3, 0x4a3120, -8, 1.5, 3.4), block(0.8, 0.8, 0.8, 0xffe9a6, -8, 3.3, 3.4, { emissive: 0xc79a2a }));
    this.obstacles.push({ x: s.position.x, z: s.position.z, r: 6.6 });
    return flag;
  }

  /** Efectos animados de la escuela (ventanas con luz, bandera) y del agua. */
  private smoke: { m: THREE.Mesh; age: number }[] = [];
  private birds: { g: THREE.Group; wingL: THREE.Object3D; wingR: THREE.Object3D; r: number; speed: number; phase: number; h: number }[] = [];
  private glints: THREE.Points[] = [];
  private clouds: THREE.Group | null = null;
  private fireflies: THREE.Points | null = null;
  private fireflyBase: Float32Array | null = null;

  /** Nubes de bloques que pasan de día y luciérnagas que flotan de noche. */
  private buildAmbience(): void {
    const rnd = seeded(41);
    const clouds = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const w = 10 + rnd() * 10;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3 + rnd() * 2, 7 + rnd() * 4), cloudMat);
        m.position.set(k * 9 - n * 4, rnd() * 2, rnd() * 5);
        c.add(m);
      }
      c.position.set(rnd() * (WORLD_W + 160) - 80, 62 + rnd() * 18, rnd() * (WORLD_D + 100) - 50);
      clouds.add(c);
    }
    this.clouds = clouds;
    this.group.add(clouds);
    // Chimenea con humo en la escuela.
    const sp = this.school.position;
    this.school.add(block(1.1, 2.4, 1.1, 0x8a4a3a, 2.2, 11.1, 1.4), block(1.4, 0.3, 1.4, 0x6b3a2e, 2.2, 12.4, 1.4));
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xe8ecf6, transparent: true, opacity: 0, depthWrite: false }));
      this.group.add(m);
      this.smoke.push({ m, age: i * 0.9 });
    }
    void sp;
    // Aves de bloques que dan vueltas de día.
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const wingL = new THREE.Group();
      const wingR = new THREE.Group();
      wingL.add(block(1.4, 0.1, 0.6, 0xf4f6ff, -0.7, 0, 0));
      wingR.add(block(1.4, 0.1, 0.6, 0xf4f6ff, 0.7, 0, 0));
      g.add(block(0.5, 0.4, 1.0, 0xe8ecf6), block(0.3, 0.3, 0.3, 0xffb84a, 0, 0, 0.6), wingL, wingR);
      this.group.add(g);
      this.birds.push({ g, wingL, wingR, r: 25 + rnd() * 45, speed: 0.12 + rnd() * 0.12, phase: rnd() * 6.28, h: 16 + rnd() * 12 });
    }
    // Destellos que parpadean sobre el agua.
    for (const w of this.map.water) {
      const pts: number[] = [];
      for (let k = 0; k < 40; k++) {
        const fx = w.kind === "rect" ? w.x + rnd() * w.w : w.x + (rnd() * 2 - 1) * w.w * 0.9;
        const fy = w.kind === "rect" ? w.y + rnd() * w.h : w.y + (rnd() * 2 - 1) * w.h * 0.9;
        if (w.kind === "ellipse" && ((fx - w.x) / w.w) ** 2 + ((fy - w.y) / w.h) ** 2 > 0.85) continue;
        pts.push(fx * FIELD_SCALE, 0.05, fy * FIELD_SCALE);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, transparent: true, opacity: 0.6, depthWrite: false }));
      this.group.add(p);
      this.glints.push(p);
    }
    const count = 70;
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      base[i * 3] = rnd() * WORLD_W;
      base[i * 3 + 1] = 0.7 + rnd() * 2.6;
      base[i * 3 + 2] = rnd() * WORLD_D;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(base.slice(), 3));
    this.fireflyBase = base;
    this.fireflies = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8ff7a, size: 0.45, transparent: true, opacity: 0, depthWrite: false }));
    this.group.add(this.fireflies);
  }

  private lowDetail = false;

  /** En equipos modestos se apagan los adornos (nubes, aves, luciérnagas, destellos y humo). */
  setLowDetail(low: boolean): void {
    this.lowDetail = low;
    if (this.clouds) this.clouds.visible = !low;
    for (const b of this.birds) b.g.visible = !low;
    for (const g of this.glints) g.visible = !low;
    for (const s of this.smoke) s.m.visible = !low;
    if (this.fireflies) this.fireflies.visible = !low;
  }

  private updateAmbience(now: number): void {
    if (this.lowDetail) return;
    const day = this.sky.light;
    if (this.clouds) {
      this.clouds.visible = day > 0.15;
      for (const c of this.clouds.children) {
        c.position.x += 0.012;
        if (c.position.x > WORLD_W + 90) c.position.x = -90;
      }
    }
    // Humo de la chimenea: cubitos que suben, crecen y se desvanecen.
    const sp = this.school.position;
    for (const s of this.smoke) {
      s.age += 0.016;
      if (s.age > 6.3) s.age = 0;
      const k = s.age / 6.3;
      s.m.position.set(sp.x + 2.2 + k * 3.5 + Math.sin(now + s.age) * 0.4, 12.8 + k * 9, sp.z + 1.4);
      s.m.scale.setScalar(0.6 + k * 2.2);
      (s.m.material as THREE.MeshBasicMaterial).opacity = Math.sin(k * Math.PI) * 0.35;
    }
    // Aves: vuelan en círculo por el día y se esconden de noche.
    for (const b of this.birds) {
      b.g.visible = day > 0.35;
      const a = now * b.speed + b.phase;
      b.g.position.set(WORLD_W / 2 + Math.cos(a) * (b.r + 20), b.h + Math.sin(now * 0.7 + b.phase) * 1.5, WORLD_D / 2 + Math.sin(a) * b.r);
      b.g.rotation.y = -a;
      const flap = Math.sin(now * 8 + b.phase) * 0.7;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    }
    this.glints.forEach((g, i) => ((g.material as THREE.PointsMaterial).opacity = Math.max(0, Math.sin(now * 2.4 + i * 1.7)) * 0.7 * (0.35 + day * 0.65)));
    if (this.fireflies && this.fireflyBase) {
      const mat = this.fireflies.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 0.95 - day * 1.6);
      this.fireflies.visible = mat.opacity > 0.02;
      if (this.fireflies.visible) {
        const p = this.fireflies.geometry.getAttribute("position") as THREE.BufferAttribute;
        const b = this.fireflyBase;
        for (let i = 0; i < p.count; i++) {
          p.setXYZ(i, b[i * 3] + Math.sin(now * 0.6 + i) * 1.6, b[i * 3 + 1] + Math.sin(now * 1.3 + i * 2) * 0.5, b[i * 3 + 2] + Math.cos(now * 0.5 + i * 1.7) * 1.6);
        }
        p.needsUpdate = true;
      }
    }
  }

  update(now: number): void {
    this.flag.position.z = -1.4 + Math.sin(now * 3) * 0.15;
    this.flag.rotation.y = Math.sin(now * 3) * 0.08;
    for (const w of this.water) w.position.y = -0.08 + Math.sin(now * 1.5) * 0.03;
    this.updateAmbience(now);
    this.sky.pulse(now);
    const lit = 1 - this.sky.light * 0.55;
    for (const w of this.windows) (w.material as THREE.MeshLambertMaterial).emissiveIntensity = lit;
  }
}

let haloTex: THREE.CanvasTexture | null = null;
function haloTexture(): THREE.CanvasTexture {
  if (haloTex) return haloTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}

/** Cielo: color de fondo, niebla, luces, estrellas, luna y sol según la hora. */
export class SkyState {
  light = 0;
  readonly hemi = new THREE.HemisphereLight(0xb4c6ff, 0x4a6a4a, 1.2);
  readonly moonLight = new THREE.DirectionalLight(0xcfdcff, 0.9);
  readonly ambient = new THREE.AmbientLight(0xa0acd8, 0.8);
  readonly sun = new THREE.DirectionalLight(0xfff2d0, 0);
  readonly stars: THREE.Points;
  readonly moon: THREE.Mesh;
  readonly sunMesh: THREE.Mesh;
  readonly sky = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly topColor = new THREE.Color(0x03061a);
  private readonly horizonColor = new THREE.Color(0x0e1840);
  private readonly halos: THREE.Sprite[] = [];
  /** Las cuatro estrellas de la cruz, en el orden Acrux, Mimosa, Gacrux, Delta. */
  private readonly crossStars: { mesh: THREE.Mesh; halo: THREE.Sprite; color: THREE.Color }[] = [];
  private litCount = 4;
  /** 0 a 1: cuánto brilla la Cruz del Sur (sube mientras hay una pregunta sobre ella). */
  glow = 0;
  private glowNow = 0;

  constructor(world: World) {
    // Domo del cielo con degradado: del horizonte (claro, o naranja al amanecer y al atardecer) al cenit.
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(480, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: this.topColor }, bottom: { value: this.horizonColor } },
        vertexShader: "varying float h; void main() { h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 top; uniform vec3 bottom; varying float h; void main() { float k = pow(clamp(h, 0.0, 1.0), 0.55); gl_FragColor = vec4(mix(bottom, top, k), 1.0); }"
      })
    );
    this.dome.renderOrder = -10;
    this.sky.add(this.dome);
    world.group.add(this.hemi, this.sun, this.moonLight, this.ambient, this.sky, this.sun.target, this.moonLight.target);
    for (const l of [this.sun, this.moonLight]) {
      l.castShadow = true;
      l.shadow.mapSize.set(2048, 2048);
      const cam = l.shadow.camera;
      cam.left = cam.bottom = -42;
      cam.right = cam.top = 42;
      cam.near = 1;
      cam.far = 300;
      l.shadow.bias = -0.0005;
      l.shadow.normalBias = 0.05;
    }
    this.moonLight.position.set(-50, 90, -40);
    // Estrellas fijas a lo lejos (la Cruz del Sur se agrega aparte, hacia el Sur).
    const rnd = seeded(5);
    const pos: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = rnd() * Math.PI * 2;
      const e = Math.acos(rnd() * 0.95 + 0.05);
      const r = 300;
      pos.push(Math.cos(a) * Math.sin(e) * r, Math.cos(e) * r, Math.sin(a) * Math.sin(e) * r);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false }));
    this.sky.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 3), new THREE.MeshBasicMaterial({ color: 0xfff6d6, fog: false }));
    this.moon.position.set(-140, 150, -190);
    this.sky.add(this.moon);
    this.sunMesh = new THREE.Mesh(new THREE.BoxGeometry(24, 24, 4), new THREE.MeshBasicMaterial({ color: 0xffe27a, fog: false }));
    this.sky.add(this.sunMesh);
    this.sun.position.set(40, 80, 30);
    this.buildCross();
    this.setLight(0);
  }

  /** La Cruz del Sur, hacia el Sur (+z), con las dos estrellas guía a su izquierda (el Este). Mismas posiciones que en los desafíos. */
  readonly cross = new THREE.Group();

  private buildCross(): void {
    const place = (px: number, py: number, size: number, color: number): THREE.Mesh => {
      // Mirando al Sur, el Este queda a la izquierda: un punto más a la izquierda en el dibujo está más al Este (+x).
      const az = ((200 - px) * 0.22 * Math.PI) / 180;
      const el = ((62 - py * 0.9) * Math.PI) / 180;
      const r = 270;
      const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color, fog: false }));
      m.position.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
      m.lookAt(0, 0, 0);
      this.cross.add(m);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      halo.position.copy(m.position);
      halo.userData.base = size * 7;
      halo.scale.set(size * 7, size * 7, 1);
      this.halos.push(halo);
      this.cross.add(halo);
      return m;
    };
    const gac = place(CROSS.gacrux.x, CROSS.gacrux.y, 5, 0xffb870);
    const acr = place(CROSS.acrux.x, CROSS.acrux.y, 6, 0xdff0ff);
    const mim = place(CROSS.mimosa.x, CROSS.mimosa.y, 5, 0xbfdcff);
    const del = place(CROSS.delta.x, CROSS.delta.y, 4, 0xffffff);
    // Orden en que se encienden con las noches ganadas: Acrux, Mimosa, Gacrux, Delta.
    for (const [m, h] of [[acr, 0], [mim, 1], [gac, 2], [del, 3]] as const) {
      void h;
      const halo = this.halos[this.crossStarIndex(m)];
      this.crossStars.push({ mesh: m, halo, color: (m.material as THREE.MeshBasicMaterial).color.clone() });
    }
    place(EXTRA_STARS.epsilon.x, EXTRA_STARS.epsilon.y, 2.6, 0xdde8ff);
    // Las dos estrellas guía (Alfa y Beta del Centauro), más brillantes y a la izquierda de la cruz.
    place(95, 78, 7, 0xfff1d2);
    place(52, 66, 6, 0xdfe8ff);
    this.sky.add(this.cross);
  }

  /** 0 = noche cerrada, 1 = día. El Sol sube por el Este (+x) y se pone por el Oeste (−x). */
  setLight(light: number, sunAngle = 0.5): void {
    this.light = light;
    const night = new THREE.Color(0x0a1030);
    const day = new THREE.Color(0x8ecbff);
    const bg = night.clone().lerp(day, light);
    this.hemi.intensity = 1.2 + light * 0.5;
    this.hemi.color.setHex(light > 0.5 ? 0xdff0ff : 0xb4c6ff);
    this.moonLight.intensity = 0.9 * (1 - light);
    this.ambient.intensity = 0.8 + light * 0.2;
    this.sun.intensity = light * 1.1;
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - light * 1.4);
    this.stars.visible = light < 0.7;
    this.cross.visible = light < 0.6;
    this.moon.visible = light < 0.6;
    this.sunMesh.visible = light > 0.2;
    // Arco del Sol: de Este a Oeste pasando por arriba (ligeramente al Norte, como en el hemisferio sur).
    const a = Math.PI * sunAngle;
    this.sunMesh.position.set(Math.cos(a) * 240, Math.sin(a) * 200 + 10, -80);
    this.sunDir.set(Math.cos(a) * 80, Math.sin(a) * 80 + 14, -30);
    // Colores del domo: noche, día y un naranja suave cuando el Sol está cerca del horizonte.
    const gate = Math.min(1, Math.max(0, (light - 0.12) / 0.35)) * (1 - Math.min(1, Math.max(0, (light - 0.8) / 0.2)));
    const dawn = Math.max(0, 1 - Math.sin(Math.PI * Math.min(1, Math.max(0, sunAngle))) * 2.4) * (light > 0.12 ? 1 : 0) * gate;
    this.topColor.set(0x03061a).lerp(new THREE.Color(0x3f86e0), light).lerp(new THREE.Color(0x6c7ed2), dawn * 0.7);
    this.horizonColor.copy(bg).lerp(new THREE.Color(0xffa468), dawn * 0.85);
    this.bg = this.horizonColor.clone();
  }

  /** Tinte de la noche (luna roja) y relámpagos, aplicados al cielo y a la niebla. */
  finalize(tint: THREE.Color | null, amount: number, flash: number): void {
    if (tint) {
      this.topColor.lerp(tint, amount);
      this.horizonColor.lerp(tint, amount);
    }
    if (flash > 0) {
      const white = new THREE.Color(0xdfe9ff);
      this.topColor.lerp(white, flash * 0.6);
      this.horizonColor.lerp(white, flash * 0.7);
    }
    this.bg = this.horizonColor.clone();
  }

  private crossStarIndex(m: THREE.Mesh): number {
    // Cada estrella se crea junto con su halo (mismo orden en `halos`).
    return Math.max(0, this.cross.children.indexOf(m) / 2);
  }

  /** Cuántas estrellas de la cruz están encendidas (las demás se ven apagadas hasta que se ganan sus noches). */
  setLit(n: number): void {
    this.litCount = Math.max(0, Math.min(4, n));
    this.crossStars.forEach((s, i) => {
      const lit = i < this.litCount;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(s.color).multiplyScalar(lit ? 1 : 0.28);
      s.halo.visible = lit;
      s.mesh.scale.setScalar(lit ? 1 : 0.7);
    });
  }

  /** Las estrellas de la Cruz del Sur respiran con un halo suave; brillan más cuando preguntan por ella. */
  pulse(now: number): void {
    this.glowNow += (this.glow - this.glowNow) * 0.05;
    this.halos.forEach((h, i) => {
      if (!h.visible) return;
      (h.material as THREE.SpriteMaterial).opacity = Math.min(1, (0.28 + Math.sin(now * 1.6 + i * 1.3) * 0.1) * (1 + this.glowNow * 1.8));
      const k = h.userData.base * (1 + this.glowNow * 0.5 + Math.sin(now * 1.6 + i) * 0.06);
      h.scale.set(k, k, 1);
    });
  }

  bg = new THREE.Color(0x0a1030);
  private readonly sunDir = new THREE.Vector3(40, 80, 30);
  private readonly moonDir = new THREE.Vector3(-50, 90, -40);

  /** Las sombras se dibujan alrededor del estudiante: las luces lo siguen sin cambiar de dirección. */
  follow(center: THREE.Vector3): void {
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).add(this.sunDir);
    this.moonLight.target.position.copy(center);
    this.moonLight.position.copy(center).add(this.moonDir);
    this.sun.shadow.camera.updateProjectionMatrix();
  }
}
