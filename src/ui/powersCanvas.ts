import type { Pickup } from "../core/battle/Battle";
import { PICKUP_TTL } from "../core/battle/Battle";
import { LLUVIA_RADIUS, type PowerId } from "../core/battle/powers";
import { starShape } from "./effectsCanvas";

/** Dibujo del polvo estelar del suelo y de los efectos de los poderes de estrella. */

type Ctx = CanvasRenderingContext2D;

/** Un efecto de poder en curso. */
export interface PowerFx {
  kind: PowerId;
  /** Segundos desde que se lanzó. */
  t: number;
  x: number;
  y: number;
  points: { x: number; y: number }[];
}

/** Cuánto dura el dibujo de cada poder. */
export const FX_DURATION: Record<PowerId, number> = { rayo: 0.7, lluvia: 1.4, congelar: 0.9, escudo: 1.2 };

/** Polvo estelar: una estrellita que brilla, flota y titila antes de apagarse. */
export function drawPickup(ctx: Ctx, p: Pickup, now: number): void {
  const left = PICKUP_TTL - p.age;
  if (left < 2 && Math.sin(now * 22) > 0) return; // titila antes de apagarse
  const bob = Math.sin(now * 4 + p.id) * 3;
  const pop = Math.min(1, p.age * 6);
  const r = (7 + Math.min(p.value, 4) * 1.2) * (0.6 + 0.4 * pop);
  const x = p.x;
  const y = p.y - 16 + bob;
  const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.8);
  g.addColorStop(0, "rgba(255,240,150,0.85)");
  g.addColorStop(1, "rgba(255,240,150,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
  ctx.fill();
  starShape(ctx, x, y, r, r * 0.45, 5, now * 1.2);
  ctx.fillStyle = "#ffe66d";
  ctx.fill();
  ctx.strokeStyle = "#141a33";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (p.value > 1) {
    ctx.font = "800 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#141a33";
    ctx.fillText(String(p.value), x, y + 3.5);
  }
}

/** Texto que sube y se desvanece (por ejemplo "+3 ✦"). */
export function drawFloater(ctx: Ctx, x: number, y: number, text: string, life: number, color = "#fff3b0"): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - life / 1.1);
  ctx.font = "900 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#141a33";
  ctx.strokeText(text, x, y - life * 34);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y - life * 34);
  ctx.restore();
}

function zigzag(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, seed: number): void {
  const n = 7;
  ctx.moveTo(x1, y1);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const off = (Math.sin(seed * 12.9 + i * 78.2) * 0.5) * 22;
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const len = Math.hypot(nx, ny) || 1;
    ctx.lineTo(x1 + (x2 - x1) * t + (nx / len) * off, y1 + (y2 - y1) * t + (ny / len) * off);
  }
  ctx.lineTo(x2, y2);
}

/** Dibuja un poder que está ocurriendo. */
export function drawPowerFx(ctx: Ctx, fx: PowerFx, field: { width: number; height: number }, camp: { x: number; y: number }): void {
  const k = Math.min(1, fx.t / FX_DURATION[fx.kind]);
  ctx.save();
  switch (fx.kind) {
    case "rayo": {
      ctx.globalAlpha = 1 - k;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const pts = fx.points.length ? fx.points : [{ x: fx.x, y: fx.y }];
      const seed = Math.floor(fx.t * 30);
      for (const [color, width] of [["rgba(255,230,109,0.6)", 12], ["#ffffff", 3.5]] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        zigzag(ctx, pts[0].x, 0, pts[0].x, pts[0].y - 10, seed);
        for (let i = 1; i < pts.length; i++) zigzag(ctx, pts[i - 1].x, pts[i - 1].y - 14, pts[i].x, pts[i].y - 14, seed + i);
        ctx.stroke();
      }
      for (const p of pts) {
        const g = ctx.createRadialGradient(p.x, p.y - 14, 2, p.x, p.y - 14, 36);
        g.addColorStop(0, "rgba(255,245,180,0.9)");
        g.addColorStop(1, "rgba(255,245,180,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 14, 36, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "lluvia": {
      // Zona marcada y estrellas que caen.
      ctx.globalAlpha = 0.25 * (1 - k);
      ctx.fillStyle = "#ffb870";
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y, LLUVIA_RADIUS, LLUVIA_RADIUS * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 16; i++) {
        const delay = (i / 16) * 0.8;
        const t = fx.t - delay;
        if (t < 0 || t > 0.45) continue;
        const kk = t / 0.45;
        const ang = i * 2.399;
        const dist = Math.sqrt((i + 1) / 16) * LLUVIA_RADIUS * 0.9;
        const tx = fx.x + Math.cos(ang) * dist;
        const ty = fx.y + Math.sin(ang) * dist * 0.8;
        const sx = tx - 60;
        const sy = ty - 260;
        const x = sx + (tx - sx) * kk;
        const y = sy + (ty - sy) * kk;
        ctx.strokeStyle = "rgba(255,200,120,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 22 * (1 - kk), y - 60 * (1 - kk));
        ctx.lineTo(x, y);
        ctx.stroke();
        starShape(ctx, x, y, 11, 4.5, 5, kk * 6);
        ctx.fillStyle = "#fff3b0";
        ctx.fill();
        if (kk > 0.9) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = "#ffd54a";
          ctx.beginPath();
          ctx.arc(tx, ty, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      break;
    }
    case "congelar": {
      ctx.globalAlpha = 0.35 * (1 - k);
      ctx.fillStyle = "#aef0ff";
      ctx.fillRect(0, 0, field.width, field.height);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = "#e6fbff";
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const x = (i * 211) % field.width;
        const y = ((i * 137) % (field.height - 260)) + 240;
        starShape(ctx, x, y, 14 + (i % 3) * 5, 4, 6, i);
        ctx.stroke();
      }
      break;
    }
    case "escudo": {
      const r = 70 + k * 40;
      ctx.globalAlpha = 0.55 * (1 - k);
      const g = ctx.createRadialGradient(camp.x, camp.y - 30, r * 0.5, camp.x, camp.y - 30, r);
      g.addColorStop(0, "rgba(124,196,255,0.05)");
      g.addColorStop(1, "rgba(124,196,255,0.8)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(camp.x, camp.y - 30, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/** Burbuja suave alrededor de la escuela mientras el escudo está activo. */
export function drawShieldBubble(ctx: Ctx, camp: { x: number; y: number }, now: number): void {
  ctx.save();
  const r = 74 + Math.sin(now * 3) * 3;
  const g = ctx.createRadialGradient(camp.x, camp.y - 30, r * 0.6, camp.x, camp.y - 30, r);
  g.addColorStop(0, "rgba(124,196,255,0.04)");
  g.addColorStop(1, "rgba(124,196,255,0.45)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(camp.x, camp.y - 30, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(200,235,255,0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** Bloque de hielo sobre un zombi congelado. */
export function drawIce(ctx: Ctx, x: number, y: number, left: number): void {
  ctx.save();
  ctx.globalAlpha = Math.min(0.75, left * 0.5 + 0.2);
  ctx.beginPath();
  ctx.roundRect(x - 22, y - 70, 44, 78, 10);
  ctx.fillStyle = "rgba(174,240,255,0.55)";
  ctx.fill();
  ctx.strokeStyle = "#e6fbff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 58);
  ctx.lineTo(x - 6, y - 40);
  ctx.moveTo(x + 10, y - 30);
  ctx.lineTo(x + 16, y - 10);
  ctx.stroke();
  ctx.restore();
}
