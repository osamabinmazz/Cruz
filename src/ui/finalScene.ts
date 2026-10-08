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

  constructor(
    private readonly victory: boolean,
    /** Al terminar la campaña amanece: el cielo pasa de la noche al alba y sale el sol. */
    private readonly dawn = false
  ) {
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
    // 0 = noche, 1 = amanecer completo (tarda unos 9 segundos).
    const d = this.dawn ? Math.min(1, this.time / 9) : 0;
    const e = d * d * (3 - 2 * d);
    const mix = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * e)).join(",")})`;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix([7, 13, 51], [52, 72, 150]));
    g.addColorStop(0.65, mix([27, 45, 99], [255, 150, 120]));
    g.addColorStop(1, mix([27, 45, 99], [255, 205, 130]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = (0.3 + 0.4 * Math.sin(this.time * 2 + i * 1.7)) * (1 - e);
      ctx.fillStyle = "#dfe6ff";
      ctx.fillRect((i * 157) % W, (i * 71) % H, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    if (this.dawn) this.drawSun(e);
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

  /** Sol que sale detrás de las colinas, con rayos que giran despacio, y la escuela en silueta. */
  private drawSun(e: number): void {
    const ctx = this.ctx;
    const sx = W * 0.72;
    const sy = H + 30 - e * 120;
    const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 190);
    glow.addColorStop(0, `rgba(255,236,170,${0.85 * e})`);
    glow.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.time * 0.08);
    ctx.fillStyle = `rgba(255,240,190,${0.22 * e})`;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, -230);
      ctx.lineTo(14, -230);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#fff1b8";
    ctx.beginPath();
    ctx.arc(sx, sy, 34, 0, Math.PI * 2);
    ctx.fill();
    // Colinas y la escuela en silueta.
    ctx.fillStyle = `rgb(${Math.round(20 + 30 * e)},${Math.round(34 + 20 * e)},${Math.round(60 - 10 * e)})`;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H - 46);
    ctx.quadraticCurveTo(160, H - 78, 330, H - 40);
    ctx.quadraticCurveTo(520, H - 70, 700, H - 38);
    ctx.quadraticCurveTo(840, H - 62, W, H - 36);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a2230";
    const bx = 110;
    const by = H - 52;
    ctx.fillRect(bx, by - 30, 70, 30);
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - 30);
    ctx.lineTo(bx + 35, by - 52);
    ctx.lineTo(bx + 76, by - 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,214,120,${0.4 + 0.5 * e})`;
    for (const wx of [bx + 10, bx + 42]) ctx.fillRect(wx, by - 22, 14, 12);
    ctx.fillStyle = "#2a2230";
    ctx.fillRect(bx + 60, by - 66, 2, 36);
    ctx.fillStyle = "#3a5db8";
    ctx.fillRect(bx + 62, by - 66, 14, 9);
  }
}
