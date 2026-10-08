import type { Projectile, Tower } from "../core/battle/Battle";
import { FIELD, facingAt, pointAt } from "../core/battle/data";
import { DEFENSES } from "../core/defenses";
import type { EnemyKind } from "../core/difficulty";
import type { Point } from "../core/geometry";
import { STAR_HEROES } from "../core/rescue/heroes";
import { drawStarHero } from "./effectsCanvas";
import { NightSky } from "./nightSky";
import { buildBackground, drawAnimatedScenery, type BackgroundLayers } from "./sceneryCanvas";
import { drawProjectile, drawWeapon } from "./weaponsCanvas";
import { drawZombie } from "./zombiesCanvas";

/**
 * Escena animada de la pantalla de inicio: el cielo que gira con la Cruz del
 * Sur, zombis que caminan por el camino, armas que disparan y un héroe estrella
 * que saluda. Reutiliza los mismos dibujos de la batalla; es solo decorativa.
 */

/** Parte visible del campo de batalla (desde arriba). */
const VIEW_HEIGHT = 430;
const FEET_OFFSET = 12;

interface Walker {
  kind: EnemyKind;
  distance: number;
  from: number;
  to: number;
  speed: number;
}

export class TitleScene {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private layers: BackgroundLayers | null = null;
  private readonly sky = new NightSky(5);
  private raf = 0;
  private last = 0;
  private time = 40;
  private destroyed = false;
  private readonly towers: Tower[];
  private projectiles: Projectile[] = [];
  private nextId = 1;
  private readonly walkers: Walker[] = [
    // Tramos del camino que se ven en la escena (por distancia recorrida).
    { kind: "comun", distance: 60, from: 0, to: 440, speed: 26 },
    { kind: "resistente", distance: 230, from: 0, to: 440, speed: 20 },
    { kind: "veloz", distance: 380, from: 0, to: 440, speed: 38 },
    { kind: "mochila", distance: 1150, from: 1120, to: 1400, speed: 18 },
    { kind: "niebla", distance: 1300, from: 1120, to: 1400, speed: 24 }
  ];

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "title-scene";
    this.canvas.setAttribute("aria-hidden", "true");
    this.ctx = this.canvas.getContext("2d")!;
    this.towers = DEFENSES.filter((d) => d.slot.y < VIEW_HEIGHT).map((d, i) => ({
      id: d.id,
      behavior: d.behavior,
      x: d.slot.x,
      y: d.slot.y,
      range: 400,
      damage: 0,
      level: 1,
      reload: 1.4 + i * 0.35,
      cooldown: i * 0.4,
      flash: 0,
      aim: Math.PI,
      lastTargets: []
    }));
    this.resize();
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = FIELD.width * dpr;
    this.canvas.height = VIEW_HEIGHT * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layers = buildBackground(dpr);
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
  }

  private walkerPos(w: Walker): Point {
    return pointAt(w.distance);
  }

  private update(dt: number): void {
    this.time += dt;
    for (const w of this.walkers) {
      w.distance += w.speed * dt;
      if (w.distance > w.to) w.distance = w.from;
    }
    for (const t of this.towers) {
      t.flash = Math.max(0, t.flash - dt);
      t.cooldown -= dt;
      // Apunta al zombi más cercano; de vez en cuando dispara.
      let best: Walker | null = null;
      let bestD = Infinity;
      for (const w of this.walkers) {
        const p = this.walkerPos(w);
        const d = Math.hypot(p.x - t.x, p.y - t.y);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      }
      if (!best) continue;
      const bp = this.walkerPos(best);
      t.aim = Math.atan2(bp.y - (t.y - 21), bp.x - t.x);
      if (t.cooldown <= 0 && bestD < 380) {
        t.cooldown = t.reload;
        t.flash = 0.15;
        const color = DEFENSES.find((d) => d.id === t.id)!.color;
        const kind = t.behavior === "long" ? "bolt" : t.behavior === "splash" ? "rock" : t.behavior === "reveal" ? "ray" : "cannonball";
        this.projectiles.push({ id: this.nextId++, x: t.x, y: t.y - 21, targetId: this.walkers.indexOf(best), damage: 0, splash: false, color, kind, angle: t.aim, age: 0 });
      }
    }
    this.projectiles = this.projectiles.filter((p) => {
      const w = this.walkers[p.targetId];
      const target = this.walkerPos(w);
      const dx = target.x - p.x;
      const dy = target.y - 18 - p.y;
      const d = Math.hypot(dx, dy);
      const move = 420 * dt;
      p.age += dt;
      if (d <= move) return false;
      p.angle = Math.atan2(dy, dx);
      p.x += (dx / d) * move;
      p.y += (dy / d) * move;
      return p.age < 2;
    });
  }

  private draw(): void {
    const ctx = this.ctx;
    const now = this.time;
    if (!this.layers) return;
    ctx.drawImage(this.layers.sky, 0, 0, FIELD.width, FIELD.height);
    this.sky.draw(ctx, now);
    ctx.drawImage(this.layers.ground, 0, 0, FIELD.width, FIELD.height);
    drawAnimatedScenery(ctx, now);
    for (const t of this.towers) drawWeapon(ctx, t, () => null, now);
    const walkers = [...this.walkers].sort((a, b) => this.walkerPos(a).y - this.walkerPos(b).y);
    for (const w of walkers) {
      const p = this.walkerPos(w);
      drawZombie(ctx, w.kind, p.x, p.y + FEET_OFFSET, { walk: w.distance * 0.11, health: 1, facing: facingAt(w.distance) });
    }
    for (const p of this.projectiles) drawProjectile(ctx, p);
    // Un héroe estrella saluda desde el cielo.
    const hero = STAR_HEROES[Math.floor(now / 8) % STAR_HEROES.length];
    ctx.save();
    const hx = 820;
    const hy = 150 + Math.sin(now * 1.5) * 6;
    ctx.translate(hx, hy);
    ctx.scale(1.2, 1.2);
    ctx.translate(-hx, -hy);
    drawStarHero(ctx, hx, hy, { alpha: 1, waving: true, facingLeft: true, time: now, strike: 0 }, hero.color);
    ctx.restore();
    // Suave oscurecimiento en la parte baja para fundir con la página.
    const fade = ctx.createLinearGradient(0, VIEW_HEIGHT - 120, 0, VIEW_HEIGHT);
    fade.addColorStop(0, "rgba(11,19,48,0)");
    fade.addColorStop(1, "rgba(11,19,48,0.95)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, VIEW_HEIGHT - 120, FIELD.width, 120);
  }
}
