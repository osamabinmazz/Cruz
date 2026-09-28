import type { Battle, Enemy, RescueReward } from "../core/battle/Battle";
import { CAMP, FIELD, PATH, pointAt } from "../core/battle/data";
import { DEFENSES, defenseById } from "../core/defenses";
import type { EnemyKind } from "../core/difficulty";
import type { Game } from "../core/Game";
import type { Point } from "../core/geometry";
import type { RescueController, RescueResult } from "../core/rescue/RescueController";
import type { AudioManager } from "./audio";
import { BOMB_ICON, HERO_ICON } from "./icons";
import { rescueVisual } from "./sky";

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
  heroStops: { at: number; p: Point }[];
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
  private anim: RescueAnimation | null = null;
  private selectedOption: string | null = null;
  private bannerTimer = 0;
  private shake = 0;
  private overTimer = -1;
  private destroyed = false;
  private bgStars: { x: number; y: number; r: number; tw: number }[] = [];

  constructor(
    private readonly game: Game,
    private readonly battle: Battle,
    private readonly rescue: RescueController,
    private readonly audio: AudioManager,
    private readonly onOver: () => void
  ) {
    this.root = document.createElement("div");
    this.root.className = "battle";
    this.root.innerHTML = `
      <div class="battle-hud" aria-live="polite"></div>
      <div class="canvas-wrap">
        <canvas width="${FIELD.width}" height="${FIELD.height}" aria-label="Campo de batalla"></canvas>
        <div class="battle-banner hidden"></div>
        <div class="rescue-layer hidden"></div>
      </div>
      <div class="defense-legend">${DEFENSES.map(
        (d) => `<span class="legend-chip" style="--c:${d.color}"><i></i>${d.name}</span>`
      ).join("")}</div>`;
    this.canvas = this.root.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.hud = this.root.querySelector(".battle-hud")!;
    this.banner = this.root.querySelector(".battle-banner")!;
    this.rescueLayer = this.root.querySelector(".rescue-layer")!;
    this.rescueLayer.addEventListener("click", (e) => this.onRescueClick(e));
    for (let i = 0; i < 70; i++) {
      this.bgStars.push({ x: Math.random() * FIELD.width, y: Math.random() * 90, r: Math.random() * 1.3 + 0.3, tw: Math.random() * 6 });
    }
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

  private resizeCanvas = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = FIELD.width * dpr;
    this.canvas.height = FIELD.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // ---------------- Bucle ----------------

  private tick(dt: number): void {
    const frozen = this.game.paused;
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
          break;
        case "enemy-defeated":
          if (!this.anim?.ghosts.some((g) => g.id === e.enemyId)) this.burst(e.x, e.y, "#fff3b0", 14);
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
          <button class="reward-card hero" data-rescue="reward" data-reward="hero">
            ${HERO_ICON}<span class="reward-name">HÉROE AUSTRAL</span>
            <span class="reward-level easy">Pregunta más fácil</span>
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
          <p>${res.reward === "bomb" ? "¡La Bomba Estelar está lista!" : "¡El Héroe Austral viene en camino!"}</p></div>`;
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
      if (result.reward === "bomb") vanishAt = 2.6 + Math.hypot(p.x - center.x, p.y - center.y) / 1100;
      else vanishAt = i === 0 ? 1.0 : 1.7;
      return { id: e.id, kind: e.kind, x: p.x, y: p.y, vanishAt, gone: false };
    });
    const heroStops: { at: number; p: Point }[] = [];
    let duration = 4.2;
    if (result.reward === "hero") {
      const start = { x: CAMP.x - 10, y: CAMP.y - 60 };
      heroStops.push({ at: 0, p: start }, { at: 0.6, p: start });
      heroStops.push({ at: 0.95, p: { x: ghosts[0].x - 26, y: ghosts[0].y } });
      if (ghosts[1]) {
        heroStops.push({ at: 1.25, p: { x: ghosts[0].x - 26, y: ghosts[0].y } });
        heroStops.push({ at: 1.65, p: { x: ghosts[1].x - 26, y: ghosts[1].y } });
        duration = 3.4;
      } else {
        duration = 2.7;
      }
    }
    this.anim = { reward: result.reward, t: 0, duration, ghosts, heroStops };
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
        this.burst(g.x, g.y, a.reward === "bomb" ? "#ffe66d" : "#8fd3ff", 22);
        this.audio.sparkle();
      }
    }
    if (a.t >= a.duration) {
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

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0, max: 0.6 + Math.random() * 0.5, color, size: 2 + Math.random() * 3 });
    }
  }

  private updateParticles(dt: number): void {
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
    this.drawGround(ctx);
    this.drawPath(ctx);
    this.drawCamp(ctx);
    for (const t of this.battle.towers) this.drawTower(ctx, t.id, t.x, t.y, t.flash, t.behavior === "slow" ? t.range : 0);
    const enemies = [...this.battle.activeEnemies()].sort((a, b) => this.battle.enemyPosition(a).y - this.battle.enemyPosition(b).y);
    for (const e of enemies) {
      const p = this.battle.enemyPosition(e);
      this.drawZombie(ctx, e.kind, p.x, p.y, e.health / e.maxHealth, e.state === "held");
    }
    if (this.anim) for (const g of this.anim.ghosts) if (!g.gone) this.drawZombie(ctx, g.kind, g.x, g.y, 1, false);
    for (const pr of this.battle.projectiles) this.drawStar(ctx, pr.x, pr.y, 5, 2.2, pr.color);
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      this.drawStar(ctx, p.x, p.y, p.size * 1.6, p.size * 0.6, p.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.battle.isPaused && (this.rescue.stage !== "idle" || this.anim)) {
      ctx.fillStyle = "rgba(5, 8, 30, 0.35)";
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (this.anim) this.drawAnimation(ctx, this.anim);
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, "#0b1440");
    g.addColorStop(0.18, "#1b2d5c");
    g.addColorStop(0.2, "#1d3a33");
    g.addColorStop(1, "#11261f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const now = performance.now() / 1000;
    for (const s of this.bgStars) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now * 1.5 + s.tw);
      ctx.fillStyle = "#dfe6ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pequeña Cruz del Sur en el cielo del campamento.
    ctx.fillStyle = "#fff";
    for (const [x, y, r] of [[860, 20, 2.2], [872, 62, 2.8], [848, 44, 2], [884, 38, 2]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Arbustos.
    ctx.fillStyle = "#1a3d2e";
    for (const [x, y, r] of [[60, 300, 26], [120, 470, 30], [380, 200, 20], [660, 480, 26], [700, 60, 18], [930, 140, 22], [330, 500, 18]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D): void {
    const trace = () => {
      ctx.beginPath();
      PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    };
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    trace();
    ctx.strokeStyle = "#5b4a33";
    ctx.lineWidth = 46;
    ctx.stroke();
    trace();
    ctx.strokeStyle = "#7a6446";
    ctx.lineWidth = 34;
    ctx.stroke();
    trace();
    ctx.setLineDash([6, 14]);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawCamp(ctx: CanvasRenderingContext2D): void {
    const { x, y } = CAMP;
    // Cerco de entrada.
    ctx.fillStyle = "#8a6a45";
    for (let i = 0; i < 5; i++) ctx.fillRect(x - 26, y - 70 + i * 26, 8, 20);
    // Carpas.
    const tent = (tx: number, ty: number, s: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tx, ty - s);
      ctx.lineTo(tx - s, ty + s * 0.4);
      ctx.lineTo(tx + s, ty + s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.moveTo(tx, ty - s * 0.2);
      ctx.lineTo(tx - s * 0.25, ty + s * 0.4);
      ctx.lineTo(tx + s * 0.25, ty + s * 0.4);
      ctx.closePath();
      ctx.fill();
    };
    tent(x + 10, y - 40, 26, "#e07a5f");
    tent(x + 18, y + 30, 22, "#3d85c6");
    // Farol.
    const glow = ctx.createRadialGradient(x - 2, y - 2, 2, x - 2, y - 2, 60);
    glow.addColorStop(0, "rgba(255,220,120,0.45)");
    glow.addColorStop(1, "rgba(255,220,120,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x - 6, y - 8, 8, 12);
    // Bandera con la Cruz del Sur.
    ctx.fillStyle = "#ddd";
    ctx.fillRect(x + 30, y - 110, 3, 60);
    ctx.fillStyle = "#1d4fb8";
    ctx.fillRect(x + 33, y - 110, 28, 20);
    ctx.fillStyle = "#fff";
    for (const [dx, dy] of [[47, 104], [47, 94], [41, 99], [53, 100]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y - 200 + dy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CAMPAMENTO", x - 14, y + 72);
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

  private drawTower(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, flash: number, slowRange: number): void {
    const info = defenseById(id as never);
    if (slowRange && flash > 0) {
      ctx.strokeStyle = info.color;
      ctx.globalAlpha = flash * 3;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(x, y, slowRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#2a3558";
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a4a7a";
    ctx.fillRect(x - 9, y - 4, 18, 20);
    const glow = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, 30 + flash * 60);
    glow.addColorStop(0, info.color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 14, 30 + flash * 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    this.drawStar(ctx, x, y - 14, 14 + flash * 10, 6, info.color);
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const label = info.name.replace("Gemelas Gacrux y Acrux", "Gemelas");
    ctx.strokeText(label, x, y + 38);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x, y + 38);
  }

  private drawZombie(ctx: CanvasRenderingContext2D, kind: EnemyKind, x: number, y: number, health: number, held: boolean): void {
    const size = kind === "resistente" ? 1.3 : kind === "mochila" ? 1.4 : kind === "veloz" ? 0.85 : 1;
    const bob = Math.sin(performance.now() / 150 + x) * (this.battle.isPaused ? 0 : 2);
    ctx.save();
    ctx.translate(x, y - 10 * size + bob);
    ctx.scale(size, size);
    if (kind === "niebla") {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#cfd8ff";
      for (const [dx, dy, r] of [[-12, 8, 10], [10, 10, 9], [0, 14, 12]] as const) {
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.6;
    }
    if (kind === "mochila") {
      ctx.fillStyle = "#a0673a";
      ctx.fillRect(-18, -6, 10, 18);
    }
    if (kind === "veloz") {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      for (const dy of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.moveTo(-22, dy);
        ctx.lineTo(-14, dy);
        ctx.stroke();
      }
    }
    // Cuerpo.
    ctx.fillStyle = kind === "niebla" ? "#9fb7c9" : "#7cc47f";
    ctx.beginPath();
    ctx.ellipse(0, 4, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brazos estirados.
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.lineTo(18, -4);
    ctx.moveTo(6, 4);
    ctx.lineTo(18, 3);
    ctx.stroke();
    // Cabeza.
    ctx.fillStyle = kind === "niebla" ? "#b7c9d9" : "#94d69a";
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.fill();
    if (kind === "resistente") {
      ctx.fillStyle = "#8d99ae";
      ctx.beginPath();
      ctx.arc(0, -14, 9.5, Math.PI, 0);
      ctx.fill();
    }
    // Ojos simpáticos.
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-3, -12, 3, 0, Math.PI * 2);
    ctx.arc(4, -12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1b2f";
    ctx.beginPath();
    ctx.arc(-2, -12, 1.3, 0, Math.PI * 2);
    ctx.arc(5, -12, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1b1b2f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, -6);
    ctx.lineTo(4, -6);
    ctx.stroke();
    ctx.restore();

    // Barra de resistencia.
    if (health < 1) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x - 14, y - 38 * size, 28, 4);
      ctx.fillStyle = health > 0.4 ? "#7cf5c4" : "#ffd166";
      ctx.fillRect(x - 14, y - 38 * size, 28 * Math.max(0, health), 4);
    }
    if (held) {
      ctx.strokeStyle = "#ffd54a";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, y - 10, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, waving: boolean): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, -10, 4, 0, -10, 46);
    glow.addColorStop(0, "rgba(140,200,255,0.6)");
    glow.addColorStop(1, "rgba(140,200,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -10, 46, 0, Math.PI * 2);
    ctx.fill();
    // Capa azul.
    ctx.fillStyle = "#2f6fe4";
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(-22, 22);
    ctx.lineTo(22, 22);
    ctx.lineTo(10, -18);
    ctx.closePath();
    ctx.fill();
    // Cuerpo y cabeza.
    ctx.fillStyle = "#f4e3c1";
    ctx.fillRect(-7, -18, 14, 30);
    ctx.fillStyle = "#f7d7b5";
    ctx.beginPath();
    ctx.arc(0, -26, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b4a2b";
    ctx.beginPath();
    ctx.arc(0, -29, 9, Math.PI, 0);
    ctx.fill();
    // Escudo con la Cruz del Sur.
    ctx.fillStyle = "#12306e";
    ctx.strokeStyle = "#ffd54a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(0, -8);
    ctx.lineTo(0, 6);
    ctx.quadraticCurveTo(-7, 14, -14, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    for (const [dx, dy] of [[-7, -5], [-7, 6], [-11, 0], [-3, 0]] as const) {
      ctx.beginPath();
      ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Brazo (saluda al retirarse).
    ctx.strokeStyle = "#f4e3c1";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(7, -12);
    const wave = waving ? Math.sin(performance.now() / 90) * 6 : 0;
    ctx.lineTo(waving ? 14 + wave : 16, waving ? -30 : -4);
    ctx.stroke();
    ctx.restore();
  }

  private drawAnimation(ctx: CanvasRenderingContext2D, a: RescueAnimation): void {
    const t = a.t;
    if (a.reward === "bomb") {
      const cx = FIELD.width / 2;
      const cy = FIELD.height / 2;
      if (t < 2.6) {
        const grow = Math.min(1, t / 1.0);
        const pulse = 1 + Math.sin(t * 12) * 0.05;
        const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 120 * grow);
        glow.addColorStop(0, "rgba(255,240,160,0.8)");
        glow.addColorStop(1, "rgba(255,240,160,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 120 * grow, 0, Math.PI * 2);
        ctx.fill();
        this.drawStar(ctx, cx, cy, 60 * grow * pulse, 26 * grow * pulse, "#ffd54a");
      }
      if (t >= 1.0 && t < 2.5) {
        const n = 3 - Math.floor((t - 1.0) / 0.5);
        ctx.fillStyle = "#3b2f7a";
        ctx.font = "bold 54px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(n), cx, cy + 4);
        ctx.textBaseline = "alphabetic";
      }
      if (t >= 2.5) {
        const r = (t - 2.5) * 900;
        ctx.strokeStyle = `rgba(255,245,190,${Math.max(0, 1 - (t - 2.5) / 1.4)})`;
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,250,220,${Math.max(0, 0.35 - (t - 2.5) / 3)})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
      return;
    }
    // Héroe Austral.
    const stops = a.heroStops;
    let p = stops[stops.length - 1].p;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].at) {
        const s0 = stops[i - 1];
        const s1 = stops[i];
        const k = s1.at === s0.at ? 1 : (t - s0.at) / (s1.at - s0.at);
        p = { x: s0.p.x + (s1.p.x - s0.p.x) * k, y: s0.p.y + (s1.p.y - s0.p.y) * k };
        break;
      }
    }
    const lastStrike = Math.max(...a.ghosts.map((g) => g.vanishAt));
    const appear = Math.min(1, t / 0.5);
    const fade = t > a.duration - 0.6 ? Math.max(0, (a.duration - t) / 0.6) : 1;
    const waving = t > lastStrike + 0.2;
    for (const g of a.ghosts) {
      const dt = t - g.vanishAt;
      if (dt > -0.15 && dt < 0.35) {
        const r = 20 + Math.max(0, dt) * 120;
        ctx.strokeStyle = `rgba(160,220,255,${Math.max(0, 1 - Math.max(0, dt) / 0.35)})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(g.x, g.y - 10, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    this.drawHero(ctx, p.x, p.y, appear * fade, waving);
  }
}
