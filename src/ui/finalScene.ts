import { STAR_HEROES } from "../core/rescue/heroes";
import { drawStarHero, starShape } from "./effectsCanvas";

/**
 * Escena de la pantalla final: las cuatro estrellas de la Cruz del Sur
 * saludan y, si se defendió el campamento, hay fuegos de estrellas.
 */

const W = 960;
const H = 260;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

const COLORS = ["#ffd54a", "#9be7ff", "#7cf5c4", "#ff8fab", "#ffb870", "#ffffff"];

export class FinalScene {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private sparks: Spark[] = [];
  private nextBurst = 0.2;
  private raf = 0;
  private last = 0;
  private time = 0;
  private stopped = false;

  constructor(private readonly victory: boolean) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "final-scene";
    this.canvas.setAttribute("aria-hidden", "true");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.stopped) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
  }

  private burst(): void {
    const x = 80 + Math.random() * (W - 160);
    const y = 30 + Math.random() * 90;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + Math.random() * 0.2;
      const s = 70 + Math.random() * 90;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.9 + Math.random() * 0.6, color, size: 3 + Math.random() * 3 });
    }
  }

  private update(dt: number): void {
    this.time += dt;
    this.nextBurst -= dt;
    if (this.nextBurst <= 0) {
      if (this.victory) this.burst();
      this.nextBurst = this.victory ? 0.5 + Math.random() * 0.7 : 99;
    }
    for (const s of this.sparks) {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 60 * dt;
      s.vx *= 0.985;
    }
    this.sparks = this.sparks.filter((s) => s.life < s.max);
  }

  private draw(): void {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#070d33");
    g.addColorStop(1, "#1b2d63");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = 0.3 + 0.4 * Math.sin(this.time * 2 + i * 1.7);
      ctx.fillStyle = "#dfe6ff";
      ctx.fillRect((i * 157) % W, (i * 71) % H, 1.6, 1.6);
    }
    for (const s of this.sparks) {
      ctx.globalAlpha = 1 - s.life / s.max;
      ctx.fillStyle = s.color;
      starShape(ctx, s.x, s.y, s.size, s.size * 0.42, 5, s.life * 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Las cuatro estrellas de la cruz saludan en fila.
    STAR_HEROES.forEach((h, i) => {
      const x = W / 2 + (i - 1.5) * 150;
      const y = H - 20 + Math.sin(this.time * 3 + i) * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1.35, 1.35);
      ctx.translate(-x, -y);
      drawStarHero(ctx, x, y, { alpha: 1, waving: true, facingLeft: i < 2, time: this.time + i * 0.4, strike: 0 }, h.color);
      ctx.restore();
    });
  }
}
