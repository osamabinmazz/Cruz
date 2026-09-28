import { DEFENSES, type DefenseBehavior, type DefenseId } from "../defenses";
import type { DifficultyConfig, EnemyKind } from "../difficulty";
import type { Point } from "../geometry";
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
export type RemovalCause = "tower" | "bomb" | "hero" | "base";

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
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  splash: boolean;
  color: string;
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
  | { type: "victory" }
  | { type: "defeat" };

export interface BattleStats {
  defeatedByTowers: number;
  defeatedByBomb: number;
  defeatedByHero: number;
  reachedCamp: number;
  damageTaken: number;
}

export interface BattleOptions {
  /** Defensas activas. Por defecto, las siete. */
  towers?: DefenseId[];
}

const MAX_STEP = 0.05;

export class Battle {
  readonly pathLength = pathLength();
  readonly maxBaseHealth: number;
  baseHealth: number;
  phase: BattlePhase = "countdown";
  /** Oleada actual (1..3). Durante la cuenta regresiva indica la próxima oleada. */
  waveNumber = 1;
  countdown: number;
  readonly totalWaves: number;

  readonly enemies: Enemy[] = [];
  readonly towers: Tower[];
  projectiles: Projectile[] = [];
  readonly stats: BattleStats = { defeatedByTowers: 0, defeatedByBomb: 0, defeatedByHero: 0, reachedCamp: 0, damageTaken: 0 };

  rescue: WaveRescueState;
  /** Zombi detenido en la entrada mientras se resuelve el rescate. */
  heldEnemyId: number | null = null;

  private spawnQueue: EnemyKind[] = [];
  private spawnTimer = 0;
  private nextId = 1;
  private pauseReasons = new Set<PauseReason>();
  private events: BattleEvent[] = [];
  /** Tiempo total de juego simulado (sin pausas). */
  elapsed = 0;

  constructor(readonly config: DifficultyConfig, options: BattleOptions = {}) {
    this.maxBaseHealth = config.baseHealth;
    this.baseHealth = config.baseHealth;
    this.totalWaves = config.waves.length;
    this.countdown = config.wavePauseSeconds;
    this.rescue = Battle.freshRescueState(1);
    const active = options.towers ?? DEFENSES.map((d) => d.id);
    this.towers = DEFENSES.filter((d) => active.includes(d.id)).map((d) => ({
      id: d.id,
      behavior: d.behavior,
      x: d.slot.x,
      y: d.slot.y,
      range: d.range,
      damage: d.damage,
      reload: d.reload * config.towerReloadMultiplier,
      cooldown: 0,
      flash: 0
    }));
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
    return pointAt(e.distance);
  }

  get totalDefeated(): number {
    return this.stats.defeatedByTowers + this.stats.defeatedByBomb + this.stats.defeatedByHero;
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
      const factor = e.slowTimer > 0 ? SLOW_FACTOR : 1;
      e.distance += e.speed * factor * dt;
      if (e.distance >= this.pathLength) {
        e.distance = this.pathLength;
        this.onEnemyArrived(e);
        if (this.isPaused || this.isOver) return;
      }
    }

    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.checkWaveEnd();
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
      state: "walking"
    });
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

  private fire(t: Tower, e: Enemy, splash: boolean, color: string): void {
    this.projectiles.push({ id: this.nextId++, x: t.x, y: t.y, targetId: e.id, damage: t.damage, splash, color });
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
      if (dist <= move) {
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

  private hit(e: Enemy, damage: number): void {
    if (e.state !== "walking") return;
    e.health -= damage;
    if (e.health <= 0) this.removeEnemy(e, "tower");
  }

  private removeEnemy(e: Enemy, cause: RemovalCause): void {
    if (e.state === "gone") return;
    const p = this.enemyPosition(e);
    e.state = "gone";
    e.removedBy = cause;
    e.health = Math.max(0, e.health);
    if (cause === "tower") this.stats.defeatedByTowers++;
    if (cause === "bomb") this.stats.defeatedByBomb++;
    if (cause === "hero") this.stats.defeatedByHero++;
    this.emit({ type: "enemy-defeated", enemyId: e.id, x: p.x, y: p.y });
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
