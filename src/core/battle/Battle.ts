import { DEFENSES, type DefenseBehavior, type DefenseId } from "../defenses";
import type { DifficultyConfig, EnemyKind } from "../difficulty";
import type { Point } from "../geometry";
import { defaultPlacement, type Placement } from "../placement";
import { createRng, type Rng } from "../rng";
import {
  BLOCK_REACH,
  DODGE_CHANCE,
  ENEMY_STRIKE_INTERVAL,
  GUARDIANS_PER_POST,
  GUARDIAN_SPACING,
  GUARDIAN_SPEED,
  defaultRally,
  enemyStrike,
  guardianStats,
  rallyFromTap,
  type Guardian,
  type Post,
  type PostId
} from "./guardians";
import { levelOf, upgradedStats, type Upgrades } from "../campaign/upgrades";
import { MAP_CAMPAMENTO, type BattleMap } from "./maps";
import {
  ENEMY_STATS,
  FOG_VISIBILITY,
  PROJECTILE_SPEED,
  REVEAL_RADIUS,
  SLOW_DURATION,
  SLOW_FACTOR,
  SPLASH_RADIUS,
  pathLength,
  pointAt
} from "./data";

export type RescueReward = "bomb" | "hero";

export interface WaveRescueState {
  waveNumber: number;
  rescueTriggered: boolean;
  selectedReward: RescueReward | null;
  questionId: string | null;
  answeredCorrectly: boolean | null;
}

export type EnemyState = "walking" | "held" | "gone";
export type RemovalCause = "tower" | "guardian" | "bomb" | "hero" | "base";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  wave: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  fog: boolean;
  distance: number;
  slowTimer: number;
  state: EnemyState;
  removedBy?: RemovalCause;
  /** Guardián con el que pelea ahora (el zombi se queda quieto). */
  blockedBy: number | null;
  strikeCooldown: number;
  /** Segundos hasta el próximo salto (solo zombi saltador). */
  jumpTimer: number;
  /** Guardianes de los que ya se escabulló (solo zombi veloz). */
  dodged: number[];
}

export interface Tower {
  id: DefenseId;
  behavior: DefenseBehavior;
  x: number;
  y: number;
  range: number;
  damage: number;
  reload: number;
  cooldown: number;
  /** Tiempo restante de la animación de disparo (solo visual). */
  flash: number;
  /** Ángulo (radianes) hacia el último objetivo, para orientar el arma (solo visual). */
  aim: number;
  /** Zombis alcanzados en el último disparo (solo visual, para los rayos). */
  lastTargets: number[];
}

/** Aspecto del disparo según el arma. */
export type ProjectileKind = "cannonball" | "multi" | "bolt" | "twin" | "rock" | "ray";

const PROJECTILE_KIND: Record<DefenseBehavior, ProjectileKind> = {
  single: "cannonball",
  multi: "multi",
  long: "bolt",
  twin: "twin",
  slow: "ray",
  splash: "rock",
  reveal: "ray"
};

/** Altura del eje del arma respecto de la base, antes de escalar el dibujo. */
export const MUZZLE_HEIGHT = 16;
/** Escala con la que se dibujan las armas en el campo (solo visual). */
export const WEAPON_SCALE = 1.35;
const MUZZLE_OFFSET = MUZZLE_HEIGHT * WEAPON_SCALE;

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  splash: boolean;
  color: string;
  kind: ProjectileKind;
  /** Dirección de vuelo en radianes. */
  angle: number;
  /** Segundos desde el disparo (solo visual). */
  age: number;
}

export type BattlePhase = "countdown" | "wave" | "victory" | "defeat";
export type PauseReason = "menu" | "rescue";

export type BattleEvent =
  | { type: "wave-warning"; wave: number; seconds: number }
  | { type: "wave-start"; wave: number }
  | { type: "enemy-defeated"; enemyId: number; x: number; y: number }
  | { type: "base-hit"; damage: number }
  | { type: "rescue-triggered"; enemyId: number; wave: number }
  | { type: "tower-fired"; towerId: DefenseId }
  | { type: "projectile-hit"; x: number; y: number; kind: ProjectileKind; color: string }
  | { type: "enemy-jump"; enemyId: number }
  | { type: "guardian-down"; guardianId: number }
  | { type: "victory" }
  | { type: "defeat" };

export interface BattleStats {
  defeatedByTowers: number;
  defeatedByGuardians: number;
  defeatedByBomb: number;
  defeatedByHero: number;
  reachedCamp: number;
  damageTaken: number;
}

export interface BattleOptions {
  /** Defensas activas. Por defecto, las siete. */
  towers?: DefenseId[];
  /** Lugar del mapa elegido para cada defensa. Por defecto, el lugar de su desafío. */
  placement?: Placement;
  /** Mapa de la batalla. Por defecto, el campamento de la versión 1.0. */
  map?: BattleMap;
  /** Nivel de mejora de cada arma (campaña). Por defecto, nivel 1. */
  upgrades?: Upgrades;
  /** Puestos de guardianes (campaña). Cada uno ocupa un lugar del mapa. */
  posts?: { id: PostId; level: number }[];
  /** Azar de la batalla (los zombis veloces se escabullen al azar). */
  rng?: Rng;
}

const MAX_STEP = 0.05;
/** Zombi saltador: cada cuántos segundos salta y cuánto avanza. */
const JUMP_INTERVAL = 2.6;
const JUMP_LENGTH = 70;

export class Battle {
  readonly map: BattleMap;
  readonly pathLength: number;
  readonly maxBaseHealth: number;
  baseHealth: number;
  phase: BattlePhase = "countdown";
  /** Oleada actual (1..3). Durante la cuenta regresiva indica la próxima oleada. */
  waveNumber = 1;
  countdown: number;
  readonly totalWaves: number;

  readonly enemies: Enemy[] = [];
  readonly towers: Tower[];
  readonly posts: Post[];
  projectiles: Projectile[] = [];
  readonly stats: BattleStats = { defeatedByTowers: 0, defeatedByGuardians: 0, defeatedByBomb: 0, defeatedByHero: 0, reachedCamp: 0, damageTaken: 0 };

  rescue: WaveRescueState;
  /** Zombi detenido en la entrada mientras se resuelve el rescate. */
  heldEnemyId: number | null = null;

  private readonly rng: Rng;
  private spawnQueue: EnemyKind[] = [];
  private spawnTimer = 0;
  private nextId = 1;
  private pauseReasons = new Set<PauseReason>();
  private events: BattleEvent[] = [];
  /** Tiempo total de juego simulado (sin pausas). */
  elapsed = 0;

  constructor(readonly config: DifficultyConfig, options: BattleOptions = {}) {
    this.map = options.map ?? MAP_CAMPAMENTO;
    this.pathLength = pathLength(this.map.path);
    this.maxBaseHealth = config.baseHealth;
    this.baseHealth = config.baseHealth;
    this.totalWaves = config.waves.length;
    this.countdown = config.wavePauseSeconds;
    this.rescue = Battle.freshRescueState(1);
    this.rng = options.rng ?? createRng(7);
    const active = options.towers ?? DEFENSES.map((d) => d.id);
    const postList = options.posts ?? [];
    const placement = options.placement ?? defaultPlacement([...active, ...postList.map((p) => p.id)]);
    const upgrades = options.upgrades ?? {};
    this.towers = DEFENSES.filter((d) => active.includes(d.id)).map((d) => {
      const slot = this.map.slots[placement[d.id] ?? DEFENSES.indexOf(d)];
      const stats = upgradedStats({ damage: d.damage, range: d.range, reload: d.reload }, levelOf(upgrades, d.id));
      return {
        id: d.id,
        behavior: d.behavior,
        x: slot.x,
        y: slot.y,
        range: stats.range,
        damage: stats.damage,
        reload: stats.reload * config.towerReloadMultiplier,
        cooldown: 0,
        flash: 0,
        aim: Math.PI,
        lastTargets: []
      };
    });
    this.posts = postList.map((p) => {
      const slot = this.map.slots[placement[p.id] ?? 0];
      const rally = defaultRally(slot, this.map.path);
      const stats = guardianStats(p.level);
      const guardians: Guardian[] = Array.from({ length: GUARDIANS_PER_POST }, (_, index) => {
        const target = Math.max(0, rally + (index - (GUARDIANS_PER_POST - 1) / 2) * GUARDIAN_SPACING);
        return {
          id: this.nextId++,
          post: p.id,
          index,
          health: stats.health,
          maxHealth: stats.health,
          damage: stats.damage,
          interval: stats.interval,
          cooldown: 0,
          state: "alive" as const,
          distance: target,
          target,
          blocking: null,
          swing: 0
        };
      });
      return { id: p.id, x: slot.x, y: slot.y, level: p.level, rally, guardians };
    });
    if (config.waveWarnings) this.emit({ type: "wave-warning", wave: 1, seconds: this.countdown });
  }

  static freshRescueState(waveNumber: number): WaveRescueState {
    return { waveNumber, rescueTriggered: false, selectedReward: null, questionId: null, answeredCorrectly: null };
  }

  // ---------- Pausa ----------

  get isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  pause(reason: PauseReason): void {
    this.pauseReasons.add(reason);
  }

  resume(reason: PauseReason): void {
    this.pauseReasons.delete(reason);
  }

  get isOver(): boolean {
    return this.phase === "victory" || this.phase === "defeat";
  }

  // ---------- Consultas ----------

  /** Zombis que ya ingresaron al campo y siguen en él. */
  activeEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.state !== "gone");
  }

  /** Zombis de la oleada actual que todavía no ingresaron al mapa. */
  pendingSpawns(): readonly EnemyKind[] {
    return this.spawnQueue;
  }

  enemyPosition(e: Enemy): Point {
    return pointAt(e.distance, this.map.path);
  }

  get totalDefeated(): number {
    return this.stats.defeatedByTowers + this.stats.defeatedByGuardians + this.stats.defeatedByBomb + this.stats.defeatedByHero;
  }

  /** Todos los guardianes de todos los puestos. */
  get guardians(): Guardian[] {
    return this.posts.flatMap((p) => p.guardians);
  }

  /** Vuelve a convocar a una estrellita caída (el polvo lo descuenta quien llama). */
  summonGuardian(postId: PostId, index: number): boolean {
    const post = this.posts.find((p) => p.id === postId);
    const g = post?.guardians[index];
    if (!post || !g || g.state !== "down") return false;
    g.state = "alive";
    g.health = g.maxHealth;
    g.blocking = null;
    g.cooldown = g.interval;
    g.distance = g.target;
    return true;
  }

  /** Cambia el punto de reunión de un puesto (un toque en el camino cercano). */
  setRally(postId: PostId, tap: Point): boolean {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return false;
    const rally = rallyFromTap(post, tap, this.map.path);
    if (rally === null) return false;
    post.rally = rally;
    post.guardians.forEach((g, i) => {
      g.target = Math.max(0, rally + (i - (GUARDIANS_PER_POST - 1) / 2) * GUARDIAN_SPACING);
    });
    return true;
  }

  drainEvents(): BattleEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(e: BattleEvent): void {
    this.events.push(e);
  }

  // ---------- Simulación ----------

  update(dt: number): void {
    let remaining = dt;
    while (remaining > 1e-9) {
      if (this.isPaused || this.isOver) return;
      const step = Math.min(MAX_STEP, remaining);
      this.step(step);
      remaining -= step;
    }
  }

  private step(dt: number): void {
    this.elapsed += dt;
    if (this.phase === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) this.startWave();
      return;
    }

    // Aparición de zombis.
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawn(this.spawnQueue.shift()!);
        this.spawnTimer = this.config.spawnIntervalSeconds;
      }
    }

    // Movimiento. Si un zombi activa el rescate, todo se congela en ese instante.
    for (const e of this.enemies) {
      if (e.state !== "walking") continue;
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.blockedBy !== null) continue; // pelea con un guardián
      const factor = e.slowTimer > 0 ? SLOW_FACTOR : 1;
      e.distance += e.speed * factor * dt;
      if (e.kind === "saltador") {
        e.jumpTimer -= dt;
        if (e.jumpTimer <= 0) {
          e.jumpTimer = JUMP_INTERVAL;
          e.distance += JUMP_LENGTH;
          this.emit({ type: "enemy-jump", enemyId: e.id });
        }
      }
      if (e.distance < this.pathLength && this.posts.length > 0) this.tryEngage(e);
      if (e.distance >= this.pathLength) {
        e.distance = this.pathLength;
        this.onEnemyArrived(e);
        if (this.isPaused || this.isOver) return;
      }
    }

    this.updateFights(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.checkWaveEnd();
  }

  /** Un zombi que alcanza a un guardián libre se detiene a pelear con él. */
  private tryEngage(e: Enemy): void {
    let best: Guardian | null = null;
    for (const g of this.guardians) {
      if (g.state !== "alive" || g.blocking !== null || e.dodged.includes(g.id)) continue;
      const ahead = g.distance - e.distance;
      if (ahead < -6 || ahead > BLOCK_REACH) continue;
      if (!best || g.distance < best.distance) best = g;
    }
    if (!best) return;
    if (e.kind === "veloz" && this.rng() < DODGE_CHANCE) {
      e.dodged.push(best.id);
      return;
    }
    e.blockedBy = best.id;
    best.blocking = e.id;
    e.distance = Math.min(e.distance, best.distance - 12);
    best.cooldown = Math.min(best.cooldown, best.interval * 0.5);
    e.strikeCooldown = ENEMY_STRIKE_INTERVAL * 0.5;
  }

  private updateFights(dt: number): void {
    for (const g of this.guardians) {
      g.swing = Math.max(0, g.swing - dt);
      if (g.state !== "alive") continue;
      if (g.blocking === null) {
        // Libre: va a su punto de reunión.
        const gap = g.target - g.distance;
        if (Math.abs(gap) > 0.5) g.distance += Math.sign(gap) * Math.min(Math.abs(gap), GUARDIAN_SPEED * dt);
        continue;
      }
      const e = this.enemies.find((x) => x.id === g.blocking);
      if (!e || e.state !== "walking" || e.blockedBy !== g.id) {
        g.blocking = null;
        continue;
      }
      g.cooldown -= dt;
      if (g.cooldown <= 0) {
        g.cooldown = g.interval;
        g.swing = 0.25;
        this.hit(e, g.damage, "guardian");
      }
      if (e.state !== "walking" || e.blockedBy !== g.id) continue; // el zombi cayó
      e.strikeCooldown -= dt;
      if (e.strikeCooldown <= 0) {
        e.strikeCooldown = ENEMY_STRIKE_INTERVAL;
        g.health -= enemyStrike(e.damage);
        if (g.health <= 0) {
          g.health = 0;
          g.state = "down";
          g.blocking = null;
          e.blockedBy = null;
          this.emit({ type: "guardian-down", guardianId: g.id });
        }
      }
    }
  }

  private startWave(): void {
    this.phase = "wave";
    this.spawnQueue = [...this.config.waves[this.waveNumber - 1]];
    this.spawnTimer = 0;
    this.rescue = Battle.freshRescueState(this.waveNumber);
    this.emit({ type: "wave-start", wave: this.waveNumber });
  }

  private spawn(kind: EnemyKind): void {
    const s = ENEMY_STATS[kind];
    const isLastOfGame = this.waveNumber === this.totalWaves && this.spawnQueue.length === 0;
    const bonus = kind === "mochila" && isLastOfGame ? this.config.backpackHealthBonus : 1;
    const health = Math.round(s.health * this.config.enemyHealthMultiplier * bonus);
    this.enemies.push({
      id: this.nextId++,
      kind,
      wave: this.waveNumber,
      health,
      maxHealth: health,
      speed: s.speed * this.config.enemySpeedMultiplier,
      damage: s.damage,
      fog: s.fog,
      distance: 0,
      slowTimer: 0,
      state: "walking",
      blockedBy: null,
      strikeCooldown: 0,
      jumpTimer: JUMP_INTERVAL,
      dodged: []
    });
  }

  /** Aparición de los zombis chiquitos que deja un zombi doble al caer. */
  private spawnMinis(from: Enemy): void {
    const s = ENEMY_STATS.mini;
    for (const offset of [-10, 10]) {
      const health = Math.round(s.health * this.config.enemyHealthMultiplier);
      this.enemies.push({
        id: this.nextId++,
        kind: "mini",
        wave: from.wave,
        health,
        maxHealth: health,
        speed: s.speed * this.config.enemySpeedMultiplier,
        damage: s.damage,
        fog: false,
        distance: Math.max(0, from.distance + offset),
        slowTimer: 0,
        state: "walking",
        blockedBy: null,
        strikeCooldown: 0,
        jumpTimer: JUMP_INTERVAL,
        dodged: []
      });
    }
  }

  private onEnemyArrived(e: Enemy): void {
    if (!this.rescue.rescueTriggered) {
      this.rescue.rescueTriggered = true;
      e.state = "held";
      this.heldEnemyId = e.id;
      this.pause("rescue");
      this.emit({ type: "rescue-triggered", enemyId: e.id, wave: this.waveNumber });
    } else {
      this.damageBase(e);
    }
  }

  private damageBase(e: Enemy): void {
    e.state = "gone";
    e.removedBy = "base";
    this.stats.reachedCamp++;
    this.stats.damageTaken += e.damage;
    this.baseHealth = Math.max(0, this.baseHealth - e.damage);
    this.emit({ type: "base-hit", damage: e.damage });
    if (this.baseHealth <= 0) {
      this.phase = "defeat";
      this.emit({ type: "defeat" });
    }
  }

  private isRevealed(p: Point): boolean {
    return this.towers.some((t) => t.behavior === "reveal" && Math.hypot(t.x - p.x, t.y - p.y) <= REVEAL_RADIUS);
  }

  private targetsInRange(t: Tower): Enemy[] {
    const list: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.state !== "walking") continue;
      const p = this.enemyPosition(e);
      const d = Math.hypot(p.x - t.x, p.y - t.y);
      const reach = e.fog && !this.isRevealed(p) ? t.range * FOG_VISIBILITY : t.range;
      if (d <= reach) list.push(e);
    }
    // Primero los que están más cerca del campamento.
    return list.sort((a, b) => b.distance - a.distance);
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      t.flash = Math.max(0, t.flash - dt);
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const targets = this.targetsInRange(t);
      if (targets.length === 0) {
        t.cooldown = 0;
        continue;
      }
      const color = DEFENSES.find((d) => d.id === t.id)!.color;
      switch (t.behavior) {
        case "slow":
          t.lastTargets = targets.map((e) => e.id);
          this.aimAt(t, targets[0]);
          for (const e of targets) {
            e.slowTimer = SLOW_DURATION;
            this.hit(e, t.damage);
          }
          break;
        case "multi":
          for (const e of targets.slice(0, 4)) this.fire(t, e, false, color);
          break;
        case "twin":
          this.fire(t, targets[0], false, color);
          this.fire(t, targets[1] ?? targets[0], false, color);
          break;
        case "splash":
          this.fire(t, targets[0], true, color);
          break;
        default:
          this.fire(t, targets[0], false, color);
      }
      t.cooldown = t.reload;
      t.flash = 0.15;
      this.emit({ type: "tower-fired", towerId: t.id });
    }
  }

  private aimAt(t: Tower, e: Enemy): number {
    const p = this.enemyPosition(e);
    t.aim = Math.atan2(p.y - (t.y - MUZZLE_OFFSET), p.x - t.x);
    return t.aim;
  }

  private fire(t: Tower, e: Enemy, splash: boolean, color: string): void {
    const angle = this.aimAt(t, e);
    this.projectiles.push({
      id: this.nextId++,
      x: t.x,
      y: t.y - MUZZLE_OFFSET,
      targetId: e.id,
      damage: t.damage,
      splash,
      color,
      kind: PROJECTILE_KIND[t.behavior],
      angle,
      age: 0
    });
  }

  private updateProjectiles(dt: number): void {
    const alive: Projectile[] = [];
    for (const p of this.projectiles) {
      const target = this.enemies.find((e) => e.id === p.targetId);
      if (!target || target.state !== "walking") continue; // se desvanece
      const tp = this.enemyPosition(target);
      const dx = tp.x - p.x;
      const dy = tp.y - p.y;
      const dist = Math.hypot(dx, dy);
      const move = PROJECTILE_SPEED * dt;
      p.age += dt;
      if (dist > 0) p.angle = Math.atan2(dy, dx);
      if (dist <= move) {
        this.emit({ type: "projectile-hit", x: tp.x, y: tp.y, kind: p.kind, color: p.color });
        if (p.splash) {
          for (const e of this.enemies) {
            if (e.state !== "walking") continue;
            const ep = this.enemyPosition(e);
            if (Math.hypot(ep.x - tp.x, ep.y - tp.y) <= SPLASH_RADIUS) this.hit(e, p.damage);
          }
        } else {
          this.hit(target, p.damage);
        }
      } else {
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;
        alive.push(p);
      }
    }
    this.projectiles = alive;
  }

  private hit(e: Enemy, damage: number, cause: RemovalCause = "tower"): void {
    if (e.state !== "walking") return;
    e.health -= damage;
    if (e.health <= 0) this.removeEnemy(e, cause);
  }

  private removeEnemy(e: Enemy, cause: RemovalCause): void {
    if (e.state === "gone") return;
    const p = this.enemyPosition(e);
    e.state = "gone";
    e.removedBy = cause;
    e.health = Math.max(0, e.health);
    if (cause === "tower") this.stats.defeatedByTowers++;
    if (cause === "guardian") this.stats.defeatedByGuardians++;
    if (e.blockedBy !== null) {
      const g = this.guardians.find((x) => x.id === e.blockedBy);
      if (g) g.blocking = null;
      e.blockedBy = null;
    }
    if (cause === "bomb") this.stats.defeatedByBomb++;
    if (cause === "hero") this.stats.defeatedByHero++;
    this.emit({ type: "enemy-defeated", enemyId: e.id, x: p.x, y: p.y });
    if (e.kind === "doble" && (cause === "tower" || cause === "guardian")) this.spawnMinis(e);
  }

  private purgeOrphanProjectiles(): void {
    this.projectiles = this.projectiles.filter((p) => {
      const t = this.enemies.find((e) => e.id === p.targetId);
      return !!t && t.state === "walking";
    });
  }

  private checkWaveEnd(): void {
    if (this.phase !== "wave" || this.spawnQueue.length > 0) return;
    if (this.activeEnemies().length > 0) return;
    if (this.waveNumber >= this.totalWaves) {
      this.phase = "victory";
      this.emit({ type: "victory" });
      return;
    }
    this.waveNumber++;
    this.phase = "countdown";
    this.countdown = this.config.wavePauseSeconds;
    this.rescue = Battle.freshRescueState(this.waveNumber);
    if (this.config.waveWarnings) this.emit({ type: "wave-warning", wave: this.waveNumber, seconds: this.countdown });
  }

  // ---------- Resultados del rescate ----------

  private requireHeld(): Enemy {
    const held = this.enemies.find((e) => e.id === this.heldEnemyId && e.state === "held");
    if (!held) throw new Error("No hay un zombi detenido en la entrada.");
    return held;
  }

  /** Bomba Estelar: elimina a todos los zombis que están en el campo, incluido el detenido. */
  applyBomb(): Enemy[] {
    this.requireHeld();
    const affected = this.activeEnemies();
    for (const e of affected) this.removeEnemy(e, "bomb");
    this.heldEnemyId = null;
    this.purgeOrphanProjectiles();
    return affected;
  }

  /** Héroe Austral: derrota al zombi detenido y al siguiente más cercano al final del camino. */
  applyHero(): Enemy[] {
    const held = this.requireHeld();
    const others = this.enemies.filter((e) => e.state === "walking").sort((a, b) => b.distance - a.distance);
    const affected = [held, ...others.slice(0, 1)];
    for (const e of affected) this.removeEnemy(e, "hero");
    this.heldEnemyId = null;
    this.purgeOrphanProjectiles();
    return affected;
  }

  /** Respuesta incorrecta: el zombi detenido causa el daño correspondiente. */
  applyFailedRescue(): Enemy {
    const held = this.requireHeld();
    this.heldEnemyId = null;
    this.damageBase(held);
    return held;
  }

  /** Reanuda el combate después del rescate. */
  finishRescue(): void {
    this.resume("rescue");
    if (!this.isOver) this.checkWaveEnd();
  }
}
