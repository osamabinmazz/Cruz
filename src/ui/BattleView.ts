import type { Battle, Enemy, RescueReward } from "../core/battle/Battle";
import { CAMP, FIELD, facingAt, pointAt, type Facing } from "../core/battle/data";
import { DEFENSES } from "../core/defenses";
import { SLOTS } from "../core/placement";
import type { EnemyKind } from "../core/difficulty";
import type { Game } from "../core/Game";
import type { Point } from "../core/geometry";
import type { RescueController, RescueResult } from "../core/rescue/RescueController";
import { heroForRescue, type StarHero } from "../core/rescue/heroes";
import type { AudioManager } from "./audio";
import { BOMB_ICON, starHeroIcon } from "./icons";
import { rescueVisual } from "./sky";
import { weaponIcon } from "./weaponIcons";
import { WEAPON_HIT_RADIUS, drawEmptySlot, drawEmptySlotLabel, drawProjectile, drawWeapon, drawWeaponLabel } from "./weaponsCanvas";
import { drawDashTrail, drawEnergyStrike, drawStarBomb, drawStarHero } from "./effectsCanvas";
import { NightSky } from "./nightSky";
import { buildBackground, drawAnimatedScenery, type BackgroundLayers } from "./sceneryCanvas";
import { drawZombie } from "./zombiesCanvas";

interface Fallen {
  kind: EnemyKind;
  facing: Facing;
  x: number;
  y: number;
  t: number;
}

/** Los pies del zombi quedan un poco por debajo del centro del camino. */
const FEET_OFFSET = 12;
const FALL_TIME = 0.55;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Ghost {
  id: number;
  kind: EnemyKind;
  facing: Facing;
  x: number;
  y: number;
  vanishAt: number;
  gone: boolean;
}

interface RescueAnimation {
  reward: RescueReward;
  t: number;
  duration: number;
  ghosts: Ghost[];
  /** Paradas del héroe; `sky` indica que la parada es su estrella en el cielo (que sigue girando). */
  heroStops: { at: number; p: Point; sky?: boolean }[];
  hero?: StarHero;
  facingLeft: boolean;
}

const REWARD_NAMES: Record<RescueReward, string> = { bomb: "BOMBA ESTELAR", hero: "HÉROE AUSTRAL" };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Dibuja la batalla en un lienzo y gestiona la ventana de la pregunta de emergencia. */
export class BattleView {
  readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hud: HTMLElement;
  private banner: HTMLElement;
  private rescueLayer: HTMLElement;
  private raf = 0;
  private last = 0;
  private particles: Particle[] = [];
  private fallen: Fallen[] = [];
  /** Defensa señalada por el puntero (ratón). */
  private hoverTower: string | null = null;
  /** Defensa tocada (pantalla táctil) y tiempo que su nombre sigue visible. */
  private tappedTower: string | null = null;
  private tapTimer = 0;
  private labelAlpha = new Map<string, number>();
  /** Lugares del mapa que quedaron sin arma por respuestas incorrectas. */
  /** Lugares del mapa sin arma (por respuestas incorrectas). */
  private readonly emptySlots: { key: string; x: number; y: number }[];
  private anim: RescueAnimation | null = null;
  private selectedOption: string | null = null;
  private bannerTimer = 0;
  private shake = 0;
  private overTimer = -1;
  private destroyed = false;
  private background: BackgroundLayers | null = null;
  private readonly nightSky = new NightSky();
  /** Reloj del escenario (cielo, fogata, luciérnagas): se detiene cuando el combate está pausado. */
  private sceneTime = 0;

  constructor(
    private readonly game: Game,
    private readonly battle: Battle,
    private readonly rescue: RescueController,
    private readonly audio: AudioManager,
    private readonly onOver: () => void
  ) {
    this.emptySlots = SLOTS.map((p, i) => ({ key: `vacio-${i}`, x: p.x, y: p.y })).filter(
      (p) => !battle.towers.some((t) => t.x === p.x && t.y === p.y)
    );
    this.root = document.createElement("div");
    this.root.className = "battle";
    this.root.innerHTML = `
      <div class="battle-hud" aria-live="polite"></div>
      <div class="canvas-wrap">
        <canvas width="${FIELD.width}" height="${FIELD.height}" aria-label="Campo de batalla"></canvas>
        <div class="battle-banner hidden"></div>
        <div class="rescue-layer hidden"></div>
      </div>
      <p class="note battle-tip">Toca o señala una defensa para ver su nombre.</p>
      <div class="defense-legend">${DEFENSES.map(
        (d) =>
          battle.towers.some((t) => t.id === d.id)
            ? `<span class="legend-chip" style="--c:${d.color}">${weaponIcon(d.id)}${d.name}</span>`
            : `<span class="legend-chip lost" title="Lugar vacío" style="--c:#6b7390">${weaponIcon(d.id)}${d.name} (vacío)</span>`
      ).join("")}</div>`;
    this.canvas = this.root.querySelector("canvas")!;
    this.canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      this.hoverTower = this.towerAt(e);
      this.canvas.style.cursor = this.hoverTower ? "pointer" : "default";
    });
    this.canvas.addEventListener("pointerleave", () => (this.hoverTower = null));
    this.canvas.addEventListener("pointerdown", (e) => {
      const id = this.towerAt(e);
      this.tappedTower = id;
      this.tapTimer = id ? 2.5 : 0;
    });
    this.ctx = this.canvas.getContext("2d")!;
    this.hud = this.root.querySelector(".battle-hud")!;
    this.banner = this.root.querySelector(".battle-banner")!;
    this.rescueLayer = this.root.querySelector(".rescue-layer")!;
    this.rescueLayer.addEventListener("click", (e) => this.onRescueClick(e));
    this.resizeCanvas();
    window.addEventListener("resize", this.resizeCanvas);
  }

  start(): void {
    this.audio.startMusic();
    this.last = performance.now();
    this.handleEvents();
    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resizeCanvas);
    this.audio.stopMusic();
  }

  /** Defensa que está debajo del puntero o del dedo. */
  private towerAt(e: PointerEvent): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((e.clientY - rect.top) / rect.height) * FIELD.height;
    let best: string | null = null;
    let bestD = WEAPON_HIT_RADIUS;
    // Incluye los lugares vacíos, que también muestran su cartel.
    for (const p of this.labelTargets()) {
      const d = Math.hypot(p.x - x, p.y - 4 - y);
      if (d <= bestD) {
        best = p.key;
        bestD = d;
      }
    }
    return best;
  }

  /** Armas y lugares vacíos que pueden mostrar un cartel. */
  private labelTargets(): { key: string; x: number; y: number }[] {
    return [...this.battle.towers.map((t) => ({ key: t.id as string, x: t.x, y: t.y })), ...this.emptySlots];
  }

  private resizeCanvas = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = FIELD.width * dpr;
    this.canvas.height = FIELD.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.background = buildBackground(dpr);
  };

  // ---------------- Bucle ----------------

  private tick(dt: number): void {
    if (this.tapTimer > 0) {
      this.tapTimer -= dt;
      if (this.tapTimer <= 0) this.tappedTower = null;
    }
    for (const { key } of this.labelTargets()) {
      const on = key === this.hoverTower || key === this.tappedTower;
      const a = this.labelAlpha.get(key) ?? 0;
      this.labelAlpha.set(key, Math.max(0, Math.min(1, a + (on ? dt * 8 : -dt * 4))));
    }
    const frozen = this.game.paused;
    if (!frozen && (!this.battle.isPaused || this.anim)) this.sceneTime += dt;
    if (!frozen) {
      this.battle.update(dt);
      this.updateParticles(dt);
      this.updateAnimation(dt);
      if (this.bannerTimer > 0) {
        this.bannerTimer -= dt;
        if (this.bannerTimer <= 0) this.banner.classList.add("hidden");
      }
      this.shake = Math.max(0, this.shake - dt);
      if (this.overTimer > 0 && this.rescue.stage === "idle" && !this.anim) {
        this.overTimer -= dt;
        if (this.overTimer <= 0) this.onOver();
      }
    }
    this.handleEvents();
    this.draw();
    this.renderHud();
  }

  private handleEvents(): void {
    for (const e of this.battle.drainEvents()) {
      switch (e.type) {
        case "wave-warning":
          this.showBanner(`¡Atención! La oleada ${e.wave} llega en ${Math.round(e.seconds)} segundos.`, 3.5, "warn");
          this.audio.warning();
          break;
        case "wave-start":
          this.showBanner(`¡OLEADA ${e.wave}!`, 1.6, "wave");
          this.audio.setMusicIntensity(e.wave);
          break;
        case "enemy-defeated":
          if (!this.anim?.ghosts.some((g) => g.id === e.enemyId)) {
            const enemy = this.battle.enemies.find((x) => x.id === e.enemyId);
            if (enemy && this.rescue.stage === "idle") {
              this.fallen.push({ kind: enemy.kind, facing: facingAt(enemy.distance), x: e.x, y: e.y, t: 0 });
              this.audio.groan();
            }
            else this.burst(e.x, e.y - 20, "#fff3b0", 14);
          }
          break;
        case "base-hit":
          this.shake = 0.4;
          this.audio.hit();
          break;
        case "rescue-triggered":
          this.openRescue();
          break;
        case "victory":
          this.showBanner("¡CAMPAMENTO A SALVO!", 3, "win");
          this.audio.fanfare();
          this.overTimer = 2.2;
          break;
        case "defeat":
          this.showBanner("El campamento se quedó sin energía.", 3, "lose");
          this.overTimer = 2.2;
          break;
        case "tower-fired":
          if (this.rescue.stage === "idle" && !this.anim) this.audio.weapon(e.towerId);
          break;
        case "projectile-hit":
          if (e.kind === "rock") {
            this.burst(e.x, e.y - 18, e.color, 14, 1.2);
            this.burst(e.x, e.y - 18, "#fff3b0", 6, 0.8);
          } else {
            this.burst(e.x, e.y - 18, e.color, e.kind === "multi" ? 3 : 6, 0.6);
          }
          break;
      }
    }
  }

  private showBanner(text: string, seconds: number, kind: string): void {
    this.banner.className = `battle-banner ${kind}`;
    this.banner.textContent = text;
    this.bannerTimer = seconds;
  }

  private renderHud(): void {
    const b = this.battle;
    const pct = Math.round((b.baseHealth / b.maxBaseHealth) * 100);
    let status = "";
    if (b.phase === "countdown") {
      status = this.game.config.waveWarnings
        ? `Oleada ${b.waveNumber} en ${Math.max(0, Math.ceil(b.countdown))} s`
        : `Preparando la oleada ${b.waveNumber}…`;
    } else if (b.phase === "wave") {
      status = `Zombis por llegar: ${b.pendingSpawns().length + b.activeEnemies().length}`;
    }
    const html = `
      <div class="hud-item"><b>OLEADA</b> ${b.waveNumber} / ${b.totalWaves}</div>
      <div class="hud-item energy"><b>ENERGÍA DEL CAMPAMENTO</b>
        <span class="energy-bar"><span style="width:${pct}%" class="${pct < 35 ? "low" : ""}"></span></span>
        ${b.baseHealth} / ${b.maxBaseHealth}</div>
      <div class="hud-item"><b>ZOMBIS DETENIDOS</b> ${b.totalDefeated}</div>
      <div class="hud-item status">${status}</div>`;
    if (this.hud.dataset.html !== html) {
      this.hud.innerHTML = html;
      this.hud.dataset.html = html;
    }
  }

  // ---------------- Rescate ----------------

  private openRescue(): void {
    this.rescue.open();
    this.audio.alert();
    this.audio.duckMusic(true);
    this.selectedOption = null;
    this.renderRescue();
  }

  private renderRescue(): void {
    const r = this.rescue;
    const layer = this.rescueLayer;
    layer.classList.remove("hidden");
    const wave = this.battle.rescue.waveNumber;

    if (r.stage === "choosing") {
      const nextHero = heroForRescue(r.stats.heroesChosen);
      layer.innerHTML = `<div class="rescue-modal" role="dialog" aria-modal="true">
        <h2 class="rescue-title">¡UN ZOMBI ATRAVESÓ LAS DEFENSAS!</h2>
        <p class="rescue-sub">Puedes intentar detenerlo respondiendo una pregunta.</p>
        <p class="rescue-wave">Oleada ${wave} · Elige tu premio antes de ver la pregunta</p>
        <div class="reward-cards">
          <button class="reward-card bomb" data-rescue="reward" data-reward="bomb">
            ${BOMB_ICON}<span class="reward-name">BOMBA ESTELAR</span>
            <span class="reward-level hard">Pregunta difícil</span>
            <span class="reward-desc">Si respondes correctamente, eliminará todos los zombis que estén actualmente en el campo.</span>
          </button>
          <button class="reward-card hero" data-rescue="reward" data-reward="hero" style="--c:${nextHero.color}">
            ${starHeroIcon(nextHero.color)}<span class="reward-name">HÉROE AUSTRAL</span>
            <span class="reward-level easy">Pregunta más fácil</span>
            <span class="reward-star">Esta vez baja del cielo: <b>${nextHero.name}</b></span>
            <span class="reward-desc">Si respondes correctamente, derrotará al zombi que llegó al campamento y al siguiente zombi más cercano.</span>
          </button>
        </div></div>`;
      return;
    }

    if (r.stage === "question" && r.question) {
      const q = r.question;
      const reward = this.battle.rescue.selectedReward!;
      const letters = "ABCD";
      layer.innerHTML = `<div class="rescue-modal" role="dialog" aria-modal="true">
        <div class="rescue-meta">
          <span>Oleada ${wave}</span><span aria-hidden="true">·</span>
          <span>Premio: <b>${REWARD_NAMES[reward]}</b></span><span aria-hidden="true">·</span>
          <span class="reward-level ${q.category === "hard" ? "hard" : "easy"}">Pregunta ${q.category === "hard" ? "DIFÍCIL" : "FÁCIL"}</span>
        </div>
        <h2 class="rescue-question">${esc(q.prompt)}</h2>
        ${q.visual ? `<div class="rescue-visual">${rescueVisual(q.visual)}</div>` : ""}
        <div class="rescue-options ${r.presentedOptions.some((o) => o.visual) ? "visual-options" : ""}">
          ${r.presentedOptions
            .map(
              (o, i) => `<button class="rescue-option ${this.selectedOption === o.id ? "selected" : ""}" data-rescue="option" data-id="${o.id}">
                <span class="opt-letter">${letters[i]}</span>
                ${o.visual ? `<span class="opt-visual">${rescueVisual(o.visual)}</span><span>${esc(o.text)} ${letters[i]}</span>` : `<span>${esc(o.text)}</span>`}
              </button>`
            )
            .join("")}
        </div>
        <p class="one-try">Solo tienes un intento.</p>
        <button class="btn primary big" data-rescue="confirm" ${this.selectedOption ? "" : "disabled"}>CONFIRMAR</button>
      </div>`;
      return;
    }

    if (r.stage === "result" && r.lastResult) {
      const res = r.lastResult;
      if (res.correct) {
        layer.innerHTML = `<div class="rescue-modal result ok"><h2 class="result-title">¡RESPUESTA CORRECTA!</h2>
          <p>${
            res.reward === "bomb" || !res.hero
              ? "¡La Bomba Estelar está lista!"
              : `¡${res.hero.name}, ${res.hero.intro}, baja del cielo a ayudarte!`
          }</p></div>`;
      } else {
        const correctText = res.correctOption.visual ? `el esquema ${"ABCD"[r.presentedOptions.findIndex((o) => o.id === res.correctOption.id)]}` : res.correctOption.text;
        layer.innerHTML = `<div class="rescue-modal result no"><h2 class="result-title">ESTA VEZ NO</h2>
          <p class="correct-answer">Respuesta correcta: <b>${esc(correctText)}</b></p>
          <p class="explanation">${esc(res.explanation)}</p>
          <button class="btn primary big" data-rescue="continue">CONTINUAR</button></div>`;
      }
    }
  }

  private onRescueClick(e: Event): void {
    const el = (e.target as Element).closest<HTMLElement>("[data-rescue]");
    if (!el || (el as HTMLButtonElement).disabled) return;
    const action = el.dataset.rescue;
    if (action === "reward" && this.rescue.stage === "choosing") {
      this.audio.click();
      this.rescue.chooseReward(el.dataset.reward as RescueReward);
      this.selectedOption = null;
      this.renderRescue();
    } else if (action === "option" && this.rescue.stage === "question") {
      this.audio.click();
      this.selectedOption = el.dataset.id!;
      this.renderRescue();
    } else if (action === "confirm" && this.rescue.stage === "question" && this.selectedOption) {
      const ghostsSource = this.snapshotForAnimation();
      const result = this.rescue.answer(this.selectedOption);
      this.renderRescue();
      if (result.correct) {
        this.audio.correct();
        window.setTimeout(() => this.startRescueAnimation(result, ghostsSource), 1300);
      } else {
        this.audio.wrong();
      }
    } else if (action === "continue" && this.rescue.stage === "result") {
      this.closeRescue();
    }
  }

  private snapshotForAnimation(): Map<number, Point> {
    const m = new Map<number, Point>();
    for (const e of this.battle.activeEnemies()) m.set(e.id, this.battle.enemyPosition(e));
    return m;
  }

  private startRescueAnimation(result: RescueResult, positions: Map<number, Point>): void {
    if (this.destroyed) return;
    this.rescueLayer.classList.add("hidden");
    this.rescueLayer.innerHTML = "";
    this.audio.heroic();
    const center = { x: FIELD.width / 2, y: FIELD.height / 2 };
    const ghosts: Ghost[] = result.defeated.map((e: Enemy, i) => {
      const p = positions.get(e.id) ?? pointAt(e.distance);
      let vanishAt: number;
      if (result.reward === "bomb") vanishAt = 2.5 + Math.hypot(p.x - center.x, p.y - center.y) / 950;
      else vanishAt = i === 0 ? 1.5 : 2.25;
      return { id: e.id, kind: e.kind, facing: facingAt(e.distance), x: p.x, y: p.y, vanishAt, gone: false };
    });
    const heroStops: { at: number; p: Point; sky?: boolean }[] = [];
    let duration = 4.2;
    if (result.reward === "hero") {
      // La estrella baja del cielo, derrota a los zombis y vuelve a su lugar en la Cruz del Sur.
      const start = { x: CAMP.x - 10, y: CAMP.y - 60 };
      const sky = { x: 0, y: 0 };
      heroStops.push({ at: 0, p: sky, sky: true }, { at: 0.8, p: start });
      heroStops.push({ at: 1.2, p: { x: ghosts[0].x - 26, y: ghosts[0].y } });
      let last = ghosts[0];
      if (ghosts[1]) {
        heroStops.push({ at: 1.6, p: { x: ghosts[0].x - 26, y: ghosts[0].y } });
        heroStops.push({ at: 2.05, p: { x: ghosts[1].x - 26, y: ghosts[1].y } });
        last = ghosts[1];
      }
      const lastStrike = Math.max(...ghosts.map((g) => g.vanishAt));
      heroStops.push({ at: lastStrike + 0.7, p: { x: last.x - 26, y: last.y } });
      duration = lastStrike + 1.6;
      heroStops.push({ at: duration, p: sky, sky: true });
      if (result.hero) this.nightSky.away.add(result.hero.id);
    }
    this.anim = { reward: result.reward, t: 0, duration, ghosts, heroStops, facingLeft: true, hero: result.hero };
  }

  private updateAnimation(dt: number): void {
    const a = this.anim;
    if (!a) return;
    const prev = a.t;
    a.t += dt;
    if (a.reward === "bomb") {
      for (const mark of [1.0, 1.5, 2.0]) if (prev < mark && a.t >= mark) this.audio.countdown();
      if (prev < 2.5 && a.t >= 2.5) this.audio.whoosh();
    }
    for (const g of a.ghosts) {
      if (!g.gone && a.t >= g.vanishAt) {
        g.gone = true;
        this.burst(g.x, g.y - 20, a.reward === "bomb" ? "#ffe66d" : "#8fd3ff", 22);
        this.fallen.push({ kind: g.kind, facing: g.facing, x: g.x, y: g.y, t: 0 });
        if (a.reward === "hero") this.audio.energy();
        else this.audio.sparkle();
      }
    }
    if (a.t >= a.duration) {
      if (a.hero) this.nightSky.away.delete(a.hero.id);
      this.anim = null;
      this.closeRescue();
    }
  }

  private closeRescue(): void {
    this.rescueLayer.classList.add("hidden");
    this.rescueLayer.innerHTML = "";
    this.audio.duckMusic(false);
    this.rescue.finish();
  }

  // ---------------- Partículas ----------------

  private burst(x: number, y: number, color: string, count: number, scale = 1): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (40 + Math.random() * 120) * scale;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: 0,
        max: (0.6 + Math.random() * 0.5) * Math.min(1, scale + 0.2),
        color,
        size: (2 + Math.random() * 3) * scale
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const f of this.fallen) {
      const before = f.t;
      f.t += dt;
      if (before < FALL_TIME && f.t >= FALL_TIME) this.burst(f.x + 18, f.y + 4, "#fff3b0", 16);
    }
    this.fallen = this.fallen.filter((f) => f.t < FALL_TIME + 0.05);
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  // ---------------- Dibujo ----------------

  private draw(): void {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * this.shake, (Math.random() - 0.5) * 8 * this.shake);
    if (this.background) ctx.drawImage(this.background.sky, 0, 0, FIELD.width, FIELD.height);
    this.nightSky.draw(ctx, this.sceneTime);
    if (this.background) ctx.drawImage(this.background.ground, 0, 0, FIELD.width, FIELD.height);
    drawAnimatedScenery(ctx, this.sceneTime);
    const now = performance.now() / 1000;
    const positionOf = (id: number) => {
      const e = this.battle.enemies.find((x) => x.id === id && x.state === "walking");
      return e ? this.battle.enemyPosition(e) : null;
    };
    for (const t of this.battle.towers) drawWeapon(ctx, t, positionOf, now);
    for (const p of this.emptySlots) drawEmptySlot(ctx, p.x, p.y, now);
    const enemies = [...this.battle.activeEnemies()].sort((a, b) => this.battle.enemyPosition(a).y - this.battle.enemyPosition(b).y);
    for (const e of enemies) {
      const p = this.battle.enemyPosition(e);
      drawZombie(ctx, e.kind, p.x, p.y + FEET_OFFSET, {
        walk: e.distance * 0.11,
        health: e.health / e.maxHealth,
        held: e.state === "held",
        facing: facingAt(e.distance)
      });
    }
    for (const f of this.fallen) {
      const k = Math.min(1, f.t / FALL_TIME);
      drawZombie(ctx, f.kind, f.x, f.y + FEET_OFFSET, { walk: 0, health: 1, fall: k * 1.4, alpha: 1 - k * 0.8, facing: f.facing });
    }
    if (this.anim) for (const g of this.anim.ghosts) if (!g.gone) drawZombie(ctx, g.kind, g.x, g.y + FEET_OFFSET, { walk: g.x * 0.11, health: 1, facing: g.facing });
    for (const pr of this.battle.projectiles) drawProjectile(ctx, pr);
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      this.drawStar(ctx, p.x, p.y, p.size * 1.6, p.size * 0.6, p.color);
    }
    ctx.globalAlpha = 1;
    for (const t of this.battle.towers) {
      const a = this.labelAlpha.get(t.id) ?? 0;
      if (a > 0) drawWeaponLabel(ctx, t, a);
    }
    for (const p of this.emptySlots) {
      const a = this.labelAlpha.get(p.key) ?? 0;
      if (a > 0) drawEmptySlotLabel(ctx, p.x, p.y, "Lugar vacío", a);
    }
    ctx.restore();

    if (this.battle.isPaused && (this.rescue.stage !== "idle" || this.anim)) {
      ctx.fillStyle = "rgba(5, 8, 30, 0.35)";
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (this.anim) this.drawAnimation(ctx, this.anim);
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, color: string, points = 5): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / points) * i - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawAnimation(ctx: CanvasRenderingContext2D, a: RescueAnimation): void {
    const t = a.t;
    if (a.reward === "bomb") {
      drawStarBomb(ctx, t, FIELD.width, FIELD.height);
      return;
    }
    // Héroe Austral: posición según las paradas de su recorrido.
    // Las paradas en el cielo siguen a la estrella del héroe, que gira con la Cruz del Sur.
    const skyPos = a.hero ? this.nightSky.cross(this.sceneTime)[a.hero.id] : { x: CAMP.x, y: 0 };
    const stops = a.heroStops.map((s) => (s.sky ? { ...s, p: { x: skyPos.x, y: skyPos.y + 14 } } : s));
    let p = stops[stops.length - 1].p;
    let seg: { from: Point; dur: number } | null = null;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].at) {
        const s0 = stops[i - 1];
        const s1 = stops[i];
        const k = s1.at === s0.at ? 1 : (t - s0.at) / (s1.at - s0.at);
        const ease = k * k * (3 - 2 * k);
        p = { x: s0.p.x + (s1.p.x - s0.p.x) * ease, y: s0.p.y + (s1.p.y - s0.p.y) * ease };
        seg = { from: s0.p, dur: s1.at - s0.at };
        break;
      }
    }
    const lastStrike = Math.max(...a.ghosts.map((g) => g.vanishAt));
    const appear = Math.min(1, t / 0.25);
    // Al llegar de vuelta a su estrella se achica y se funde con ella.
    const home = t > a.duration - 0.35 ? Math.max(0, (a.duration - t) / 0.35) : 1;
    const leaving = t < 0.3 ? 0.4 + (t / 0.3) * 0.6 : 1;
    const waving = t > lastStrike + 0.2;
    // Mira hacia el próximo zombi que va a derrotar.
    const next = a.ghosts.filter((g) => !g.gone).sort((g1, g2) => g1.vanishAt - g2.vanishAt)[0];
    if (next && Math.abs(next.x - p.x) > 2) a.facingLeft = next.x < p.x;
    if (seg && seg.dur < 1 && Math.hypot(p.x - seg.from.x, p.y - seg.from.y) > 20) {
      drawDashTrail(ctx, { x: seg.from.x, y: seg.from.y + FEET_OFFSET }, { x: p.x, y: p.y + FEET_OFFSET }, 1);
    }
    let strike = 0;
    for (const g of a.ghosts) {
      strike = Math.max(strike, 1 - Math.min(1, Math.abs(t - g.vanishAt) / 0.3));
      drawEnergyStrike(ctx, g.x, g.y - 20, t - g.vanishAt);
    }
    ctx.save();
    const hx = p.x;
    const hy = p.y + FEET_OFFSET;
    const scale = 1.3 * Math.min(leaving, home);
    ctx.translate(hx, hy);
    ctx.scale(scale, scale);
    ctx.translate(-hx, -hy);
    drawStarHero(
      ctx,
      hx,
      hy,
      { alpha: appear * Math.max(0.2, home), waving, facingLeft: a.facingLeft, time: t, strike },
      a.hero?.color ?? "#bfe3ff"
    );
    ctx.restore();
  }
}
