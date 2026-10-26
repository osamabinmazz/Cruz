import * as THREE from "three";
import type { Battle, Enemy } from "../src/core/battle/Battle";
import type { DefenseId } from "../src/core/defenses";
import { shadowify, textSprite } from "./blocks";
import { animateWalk, buildStudent, DEFAULT_LOOK, type LookOptions, type Rig } from "./character";
import { WORLD_D, WORLD_W } from "./coords";
import type { InputState } from "./controls";
import { buildProjectile, buildWeaponModel } from "./weaponModels";
import { handWeapon, weaponStats, type HandWeapon } from "./weapons";
import type { World } from "./world";
import type { ZombieView } from "./zombies";

const RUN_SPEED = 9.5;
const HEARTS = 3;
const RESPAWN_SECONDS = 4;
const ARM_HAND = 1.0;
const DASH_SECONDS = 0.22;
const DASH_SPEED = 28;
const DASH_COOLDOWN = 1.8;

interface Bullet {
  mesh: THREE.Object3D;
  trail: number;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  weapon: HandWeapon;
  hit: Set<number>;
  origin: THREE.Vector3;
  returning: boolean;
  range: number;
}

export interface PlayerEvents {
  onHurt: () => void;
  onDown: () => void;
  onRespawn: () => void;
  onShot: (id: DefenseId) => void;
  onKill: (at: THREE.Vector3, big: boolean) => void;
  onHit: (at: THREE.Vector3, damage: number, color: string) => void;
  onDash: () => void;
  onExplode: (at: THREE.Vector3, size: number, color: string) => void;
  onTrail: (at: THREE.Vector3, color: string) => void;
}

/** El estudiante: se mueve con la cámara, dispara con auto-apuntado y tiene 3 corazones. */
export class Player {
  readonly group = new THREE.Group();
  readonly rig: Rig;
  readonly position = new THREE.Vector3();
  heading = 0;
  hearts = HEARTS;
  /** Armas que lleva (máximo 3) y cuál tiene en la mano. */
  carried: DefenseId[] = [];
  levels: Partial<Record<DefenseId, number>> = {};
  current = 0;
  downTimer = 0;
  private phase = 0;
  private cooldown = 0;
  private invuln = 0;
  private knock = new THREE.Vector3();
  private aimK = 0;
  private bullets: Bullet[] = [];
  private readonly bulletsGroup = new THREE.Group();
  private readonly spawn: THREE.Vector3;
  private vy = 0;
  /** Ayuda de accesibilidad: dispara solo cuando hay un zombi a tiro. */
  autoFire = false;
  private handModel: THREE.Group | null = null;
  private handId: DefenseId | null = null;
  private dashTime = 0;
  private dashCool = 0;
  private dashDir = new THREE.Vector3();
  /** Fracción de la carrera lista (0 a 1), para el indicador. */
  get dashReady(): number {
    return 1 - Math.max(0, this.dashCool) / DASH_COOLDOWN;
  }
  get dashing(): boolean {
    return this.dashTime > 0;
  }

  constructor(
    private readonly world: World,
    private battle: Battle,
    private readonly zombies: ZombieView,
    name: string,
    look: LookOptions = DEFAULT_LOOK,
    private readonly events: PlayerEvents
  ) {
    this.rig = buildStudent(look);
    shadowify(this.rig.group);
    this.group.add(this.rig.group);
    const label = textSprite(name || "Estudiante", { color: "#ffffff", bg: "rgba(20,30,70,0.7)", size: 3.2 });
    label.position.y = this.rig.height + 1.0;
    this.group.add(label);
    // Sombra redonda bajo los pies.
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    this.group.add(shadow);
    this.spawn = new THREE.Vector3(world.school.position.x - 17, 0, world.school.position.z + 2);
    this.position.copy(this.spawn);
    this.group.position.copy(this.position);
    this.heading = -Math.PI / 2;
  }

  /** Cambia la batalla a la que apunta (del día a la noche). */
  setBattle(battle: Battle): void {
    this.battle = battle;
  }

  get object(): THREE.Object3D {
    return this.group;
  }

  get bulletLayer(): THREE.Object3D {
    return this.bulletsGroup;
  }

  setWeapons(ids: DefenseId[], levels: Partial<Record<DefenseId, number>>): void {
    this.carried = ids.slice(0, 3);
    this.levels = levels;
    this.current = Math.min(this.current, Math.max(0, this.carried.length - 1));
  }

  get weaponId(): DefenseId | null {
    return this.carried[this.current] ?? null;
  }

  get isDown(): boolean {
    return this.downTimer > 0;
  }

  update(dt: number, input: InputState, cameraYaw: number): void {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.dashCool > 0) this.dashCool -= dt;

    if (this.downTimer > 0) {
      this.downTimer -= dt;
      this.group.rotation.z = Math.min(Math.PI / 2, this.group.rotation.z + dt * 6);
      if (this.downTimer <= 0) this.respawn();
      this.updateBullets(dt);
      return;
    }

    // Cambiar de arma.
    if (input.swapPressed !== 0 && this.carried.length > 0) {
      if (input.swapPressed === -1) this.current = (this.current + 1) % this.carried.length;
      else if (input.swapPressed - 1 < this.carried.length) this.current = input.swapPressed - 1;
    }

    // Movimiento relativo a la cámara.
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const dir = forward.multiplyScalar(input.moveY).add(right.multiplyScalar(input.moveX));
    const amount = Math.min(1, dir.length());
    const wading = this.inWater();
    if (amount > 0.01) {
      dir.normalize();
      const speed = RUN_SPEED * amount * (wading ? 0.55 : 1);
      const next = this.position.clone().addScaledVector(dir, speed * dt);
      this.move(next);
      const target = Math.atan2(dir.x, dir.z);
      let d = target - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 14);
    }
    // Carrera: un impulso corto en la dirección que corres (o hacia donde miras) y un instante sin daño.
    if (input.dashPressed && this.dashCool <= 0 && this.dashTime <= 0) {
      this.dashTime = DASH_SECONDS;
      this.dashCool = DASH_COOLDOWN;
      this.invuln = Math.max(this.invuln, DASH_SECONDS + 0.12);
      if (amount > 0.01) this.dashDir.copy(dir);
      else this.dashDir.set(Math.sin(this.heading), 0, Math.cos(this.heading));
      this.events.onDash();
    }
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.move(this.position.clone().addScaledVector(this.dashDir, DASH_SPEED * dt));
    }
    // Retroceso por un golpe.
    if (this.knock.lengthSq() > 0.001) {
      this.move(this.position.clone().addScaledVector(this.knock, dt));
      this.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
    }
    // Saltito (Shift).
    if (input.jumpPressed && this.position.y <= 0.001) this.vy = 9;
    this.vy -= 26 * dt;
    this.position.y = Math.max(0, this.position.y + this.vy * dt);
    if (this.position.y === 0 && this.vy < 0) this.vy = 0;

    // Disparo con auto-apuntado hacia el zombi más cercano dentro del alcance.
    const id = this.weaponId;
    let aiming = false;
    if (id) {
      const st = weaponStats(id, this.levels[id] ?? 1);
      const target = this.nearestEnemy(st.range);
      const wantFire = input.fire || (this.autoFire && !!target);
      if (target) {
        aiming = wantFire;
        if (wantFire) {
          const tp = this.zombies.position(target);
          const aimDir = new THREE.Vector3(tp.x - this.position.x, 0, tp.z - this.position.z).normalize();
          const t = Math.atan2(aimDir.x, aimDir.z);
          let d = t - this.heading;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          this.heading += d * Math.min(1, dt * 20);
        }
      }
      if (wantFire && this.cooldown <= 0) this.shoot(id, st, target);
    }
    this.aimK += ((aiming || (input.fire && this.cooldown > 0.05) ? 1 : 0) - this.aimK) * Math.min(1, dt * 14);

    this.phase += dt * RUN_SPEED * amount * 1.15;
    animateWalk(this.rig, this.phase, amount);
    // Lleva el arma con el brazo a medio levantar.
    // Con el arma al frente: el brazo derecho casi horizontal y el izquierdo la acompaña.
    this.rig.armR.rotation.x = this.rig.armR.rotation.x * 0.15 - 1.25;
    this.rig.armL.rotation.x = this.rig.armL.rotation.x * 0.3 - 0.75;
    this.rig.armL.rotation.z = 0.28;
    this.rig.armR.rotation.x = this.rig.armR.rotation.x * (1 - this.aimK) + -Math.PI / 2 * this.aimK;
    this.syncHandModel();
    const star = this.rig.group.userData.star as THREE.Object3D | undefined;
    if (star) star.rotation.y += dt * 2;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
    this.contactDamage();
    this.updateBullets(dt);
  }

  /** El arma de la mano se ve en la mano del estudiante y cambia cuando cambia de arma. */
  private syncHandModel(): void {
    const id = this.weaponId;
    if (id === this.handId) return;
    this.handId = id;
    if (this.handModel) this.rig.armR.remove(this.handModel);
    this.handModel = null;
    if (!id) return;
    const m = buildWeaponModel(id, true);
    m.scale.setScalar(0.72);
    // El brazo apunta hacia adelante al levantarlo: el arma se coloca en la mano mirando en esa dirección.
    m.rotation.x = Math.PI / 2;
    m.position.set(0, -ARM_HAND, 0.05);
    this.rig.armR.add(m);
    this.handModel = m;
  }

  private inWater(): boolean {
    const x = this.position.x / 0.1;
    const y = this.position.z / 0.1;
    for (const w of this.world.map.water) {
      if (w.kind === "rect" ? x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h : ((x - w.x) / w.w) ** 2 + ((y - w.y) / w.h) ** 2 < 1) return true;
    }
    return false;
  }

  /** Mueve con choques: no atraviesa árboles, rocas ni la escuela, y no sale de la isla. */
  private move(next: THREE.Vector3): void {
    next.x = Math.max(-18, Math.min(WORLD_W + 18, next.x));
    next.z = Math.max(-18, Math.min(WORLD_D + 18, next.z));
    for (const o of this.world.obstacles) {
      const dx = next.x - o.x;
      const dz = next.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + 0.55;
      if (d < min && d > 1e-4) {
        next.x = o.x + (dx / d) * min;
        next.z = o.z + (dz / d) * min;
      }
    }
    this.position.x = next.x;
    this.position.z = next.z;
  }

  private nearestEnemy(range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of this.battle.activeEnemies()) {
      const p = this.zombies.position(e);
      const d = Math.hypot(p.x - this.position.x, p.z - this.position.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private shoot(id: DefenseId, st: ReturnType<typeof weaponStats>, target: Enemy | null): void {
    const w = handWeapon(id);
    this.cooldown = st.reload;
    let base = this.heading;
    if (target) {
      const tp = this.zombies.position(target);
      base = Math.atan2(tp.x - this.position.x, tp.z - this.position.z);
    }
    const origin = new THREE.Vector3(this.position.x + Math.sin(base) * 0.9, this.position.y + 2.0, this.position.z + Math.cos(base) * 0.9);
    for (let i = 0; i < w.bullets; i++) {
      const a = base + (w.bullets === 1 ? 0 : (i / (w.bullets - 1) - 0.5) * w.spread);
      const m = buildProjectile(id, w.size);
      m.position.copy(origin);
      m.rotation.y = a;
      this.bulletsGroup.add(m);
      this.bullets.push({
        mesh: m,
        trail: 0,
        vel: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(w.speed),
        life: w.boomerang ? (st.range / w.speed) * 3.2 : Math.max(0.3, st.range / w.speed + (w.pierce ? 0.2 : 0.1)),
        damage: st.damage,
        weapon: w,
        hit: new Set(),
        origin: origin.clone(),
        returning: false,
        range: st.range
      });
    }
    this.events.onShot(id);
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.trail -= dt;
      if (b.trail <= 0) {
        b.trail = 0.035;
        this.events.onTrail(b.mesh.position.clone(), weaponStats(b.weapon.id, 1).color);
      }
      if (b.weapon.boomerang) {
        b.mesh.rotation.y += dt * 18;
        // Va hasta la mitad del alcance y vuelve volando hacia el estudiante.
        if (!b.returning && b.mesh.position.distanceTo(b.origin) > b.range * 0.55) {
          b.returning = true;
          b.hit.clear();
        }
        if (b.returning) {
          const back = new THREE.Vector3(this.position.x - b.mesh.position.x, 2.0 - b.mesh.position.y, this.position.z - b.mesh.position.z);
          if (back.length() < 1.2) b.life = 0;
          else b.vel.copy(back.normalize().multiplyScalar(b.weapon.speed));
        }
      }
      let remove = b.life <= 0;
      for (const e of this.battle.activeEnemies()) {
        if (b.hit.has(e.id)) continue;
        const p = this.zombies.position(e);
        const r = (e.kind === "gigante" ? 1.8 : e.kind === "mini" ? 0.7 : 1.1) + b.weapon.size * 0.5;
        if (Math.hypot(p.x - b.mesh.position.x, p.z - b.mesh.position.z) > r + (b.weapon.pierce ? 0.4 : 0)) continue;
        if (b.mesh.position.y > 4.4 || b.mesh.position.y < 0) continue;
        this.hitEnemy(e, b);
        if (!b.weapon.pierce && !b.weapon.boomerang) {
          remove = true;
          break;
        }
      }
      if (remove) {
        if (b.weapon.splash > 0) this.explode(b);
        this.bulletsGroup.remove(b.mesh);
        b.mesh.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          (m.material as THREE.Material | undefined)?.dispose();
        });
        this.bullets.splice(i, 1);
      }
    }
  }

  private hitEnemy(e: Enemy, b: Bullet): void {
    b.hit.add(e.id);
    if (b.weapon.slow) e.slowTimer = 2.2;
    const died = this.battle.strike(e.id, b.damage);
    const p = this.zombies.position(e);
    p.y = 2.2;
    this.events.onHit(p, b.damage, weaponStats(b.weapon.id, 1).color);
    if (died) this.events.onKill(p, e.kind === "gigante");
  }

  private explode(b: Bullet): void {
    const c = b.mesh.position;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(b.weapon.splash * 0.6, 0.15, 6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(weaponStats(b.weapon.id, 1).color), transparent: true, opacity: 0.8 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(c.x, 0.4, c.z);
    this.bulletsGroup.add(ring);
    window.setTimeout(() => {
      this.bulletsGroup.remove(ring);
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }, 220);
    this.events.onExplode(c.clone(), b.weapon.splash, weaponStats(b.weapon.id, 1).color);
    for (const e of this.battle.activeEnemies()) {
      if (b.hit.has(e.id)) continue;
      const p = this.zombies.position(e);
      if (Math.hypot(p.x - c.x, p.z - c.z) <= b.weapon.splash) this.hitEnemy(e, { ...b, damage: b.damage * 0.8 });
    }
  }

  private contactDamage(): void {
    if (this.invuln > 0 || this.downTimer > 0) return;
    for (const e of this.battle.activeEnemies()) {
      const p = this.zombies.position(e);
      const r = e.kind === "gigante" ? 2.4 : e.kind === "mini" ? 1.2 : 1.6;
      const dx = this.position.x - p.x;
      const dz = this.position.z - p.z;
      if (Math.hypot(dx, dz) < r && this.position.y < 1.5) {
        this.hearts--;
        this.invuln = 1.4;
        const d = Math.hypot(dx, dz) || 1;
        this.knock.set((dx / d) * 14, 0, (dz / d) * 14);
        this.events.onHurt();
        if (this.hearts <= 0) {
          this.downTimer = RESPAWN_SECONDS;
          this.events.onDown();
        }
        return;
      }
    }
  }

  private respawn(): void {
    this.hearts = HEARTS;
    this.invuln = 2.5;
    this.position.copy(this.spawn);
    this.group.rotation.z = 0;
    this.events.onRespawn();
  }

  /** Parpadeo mientras es invulnerable. */
  get blinking(): boolean {
    return this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
  }

  /** Deja al estudiante listo para una noche nueva. */
  reset(): void {
    this.hearts = HEARTS;
    this.downTimer = 0;
    this.invuln = 0;
    this.group.rotation.z = 0;
    this.position.copy(this.spawn);
    for (const b of this.bullets) this.bulletsGroup.remove(b.mesh);
    this.bullets = [];
  }
}
