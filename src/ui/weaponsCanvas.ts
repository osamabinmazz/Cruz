import { MUZZLE_HEIGHT, WEAPON_SCALE, type Projectile, type Tower } from "../core/battle/Battle";
import { defenseById } from "../core/defenses";
import type { Point } from "../core/geometry";

/**
 * Armas de caricatura estelar: cañones, ballesta, catapulta, rayos y faro.
 * Se reconocen como armas, pero son de juguete y disparan luz y estrellas.
 */

type Ctx = CanvasRenderingContext2D;

const FLASH_TIME = 0.15;

function star(ctx: Ctx, x: number, y: number, outer: number, inner: number, color: string, points = 5, rot = 0): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2 + rot;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function wheel(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = "#6b4a2b";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c9a36b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = "#c9a36b";
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** Barril de cañón dibujado a lo largo del eje x (ya rotado). */
function barrel(ctx: Ctx, from: number, length: number, width: number, body: string, band: string): void {
  ctx.fillStyle = body;
  roundRect(ctx, from, -width / 2, length, width, width / 2.5);
  ctx.fill();
  ctx.fillStyle = band;
  ctx.fillRect(from + length * 0.35, -width / 2, 3, width);
  roundRect(ctx, from + length - 5, -width / 2 - 2, 5, width + 4, 2);
  ctx.fill();
}

function muzzleFlash(ctx: Ctx, x: number, y: number, flash: number, color: string): void {
  if (flash <= 0) return;
  const k = flash / FLASH_TIME;
  glow(ctx, x, y, 18 * k + 6, color, 0.9);
  star(ctx, x, y, 11 * k + 3, 4 * k + 1, "#fffbe0", 6);
}

/** Recoge el ángulo en el rango [-π, π] y dice si apunta a la izquierda. */
function facesLeft(angle: number): boolean {
  return Math.cos(angle) < 0;
}

function platform(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = "#222c4d";
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------- Armas ----------------

function cannon(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  const recoil = (t.flash / FLASH_TIME) * 6;
  // Cureña.
  ctx.fillStyle = "#8a5a33";
  ctx.beginPath();
  ctx.moveTo(px - 16, t.y + 10);
  ctx.lineTo(px + 16, t.y + 10);
  ctx.lineTo(px + 8, py + 2);
  ctx.lineTo(px - 8, py + 2);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  barrel(ctx, -10 - recoil, 34, 13, "#2b3a6b", color);
  ctx.restore();
  wheel(ctx, px - 11, t.y + 10, 8);
  wheel(ctx, px + 11, t.y + 10, 8);
  const tip = { x: px + Math.cos(t.aim) * (24 - recoil), y: py + Math.sin(t.aim) * (24 - recoil) };
  muzzleFlash(ctx, tip.x, tip.y, t.flash, color);
}

function quadTurret(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  const recoil = (t.flash / FLASH_TIME) * 4;
  ctx.fillStyle = "#34477d";
  roundRect(ctx, px - 13, py, 26, 26, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  ctx.fillStyle = "#1d2b55";
  roundRect(ctx, -2, -11, 10, 22, 3);
  ctx.fill();
  for (const off of [-7.5, -2.5, 2.5, 7.5]) {
    ctx.save();
    ctx.translate(0, off);
    barrel(ctx, 4 - recoil, 22, 4.5, "#2b3a6b", color);
    ctx.restore();
  }
  ctx.restore();
  if (t.flash > 0) {
    for (const off of [-7.5, -2.5, 2.5, 7.5]) {
      const tip = {
        x: px + Math.cos(t.aim) * 26 - Math.sin(t.aim) * off,
        y: py + Math.sin(t.aim) * 26 + Math.cos(t.aim) * off
      };
      muzzleFlash(ctx, tip.x, tip.y, t.flash * 0.6, color);
    }
  }
}

function ballista(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  // Soporte.
  ctx.strokeStyle = "#8a5a33";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px - 12, t.y + 16);
  ctx.lineTo(px, py + 4);
  ctx.lineTo(px + 12, t.y + 16);
  ctx.stroke();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  // Culata.
  ctx.fillStyle = "#6b4a2b";
  roundRect(ctx, -18, -4, 38, 8, 3);
  ctx.fill();
  // Arco.
  const pull = t.flash > 0 ? 0 : 7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(10, -20);
  ctx.quadraticCurveTo(24, 0, 10, 20);
  ctx.stroke();
  // Cuerda.
  ctx.strokeStyle = "#f4f6ff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, -20);
  ctx.lineTo(10 - pull, 0);
  ctx.lineTo(10, 20);
  ctx.stroke();
  // Flecha de luz cargada.
  // La flecha de luz vuelve a cargarse poco después de cada disparo.
  if (t.cooldown <= t.reload * 0.35) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(10 - pull, 0);
    ctx.lineTo(32, 0);
    ctx.stroke();
    star(ctx, 34, 0, 5, 2, color, 4, Math.PI / 4);
  }
  ctx.restore();
  muzzleFlash(ctx, px + Math.cos(t.aim) * 28, py + Math.sin(t.aim) * 28, t.flash, color);
}

function twinCannon(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  const recoil = (t.flash / FLASH_TIME) * 5;
  ctx.fillStyle = "#8a5a33";
  roundRect(ctx, px - 17, py + 2, 34, 16, 4);
  ctx.fill();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  ctx.save();
  ctx.translate(0, -6);
  barrel(ctx, -8 - recoil, 30, 9, "#2b3a6b", "#ffb870");
  ctx.restore();
  ctx.save();
  ctx.translate(0, 6);
  barrel(ctx, -8 - recoil * 0.6, 30, 9, "#2b3a6b", "#ffffff");
  ctx.restore();
  ctx.restore();
  wheel(ctx, px - 12, t.y + 12, 7);
  wheel(ctx, px + 12, t.y + 12, 7);
  for (const off of [-6, 6]) {
    const tip = {
      x: px + Math.cos(t.aim) * 22 - Math.sin(t.aim) * off,
      y: py + Math.sin(t.aim) * 22 + Math.cos(t.aim) * off
    };
    muzzleFlash(ctx, tip.x, tip.y, t.flash * 0.8, off < 0 ? color : "#ffffff");
  }
}

function slowRay(ctx: Ctx, t: Tower, color: string, positionOf: (id: number) => Point | null, now: number): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  // Trípode.
  ctx.strokeStyle = "#8d99ae";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, py + 4);
  ctx.lineTo(px - 12, t.y + 16);
  ctx.moveTo(px, py + 4);
  ctx.lineTo(px + 12, t.y + 16);
  ctx.moveTo(px, py + 4);
  ctx.lineTo(px, t.y + 18);
  ctx.stroke();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  // Antena parabólica.
  ctx.fillStyle = "#dfe6ff";
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.quadraticCurveTo(10, 0, -4, 16);
  ctx.quadraticCurveTo(2, 0, -4, -16);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  ctx.restore();
  const tip = { x: px + Math.cos(t.aim) * 16, y: py + Math.sin(t.aim) * 16 };
  const pulse = 0.5 + 0.5 * Math.sin(now * 6);
  glow(ctx, tip.x, tip.y, 10 + pulse * 4, color, 0.8);
  // Rayos punteados que frenan.
  if (t.flash > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset = -now * 60;
    ctx.globalAlpha = Math.min(1, (t.flash / FLASH_TIME) * 1.5);
    for (const id of t.lastTargets) {
      const p = positionOf(id);
      if (!p) continue;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(p.x, p.y - 10);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

function catapult(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const left = facesLeft(t.aim);
  const dir = left ? -1 : 1;
  const base = t.y + 12;
  // Marco.
  ctx.fillStyle = "#8a5a33";
  roundRect(ctx, px - 20, base - 6, 40, 8, 3);
  ctx.fill();
  ctx.strokeStyle = "#8a5a33";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px - 8, base - 4);
  ctx.lineTo(px, base - 26);
  ctx.lineTo(px + 8, base - 4);
  ctx.stroke();
  // Brazo: en reposo hacia atrás; al disparar, levantado.
  // Ángulo del brazo (0 = hacia adelante, positivo hacia arriba).
  const k = t.flash > 0 ? t.flash / FLASH_TIME : 0;
  const rest = (200 * Math.PI) / 180;
  const thrown = (70 * Math.PI) / 180;
  const theta = rest + (thrown - rest) * k;
  const pivot = { x: px, y: base - 24 };
  const ux = Math.cos(theta) * dir;
  const uy = -Math.sin(theta);
  const end = { x: pivot.x + ux * 26, y: pivot.y + uy * 26 };
  ctx.strokeStyle = "#c9a36b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pivot.x - ux * 8, pivot.y - uy * 8);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  // Cuchara con piedra estelar.
  ctx.fillStyle = "#6b4a2b";
  ctx.beginPath();
  ctx.arc(end.x, end.y, 7, 0, Math.PI * 2);
  ctx.fill();
  if (t.cooldown <= t.reload * 0.5) star(ctx, end.x, end.y - 2, 7, 3, color);
  wheel(ctx, px - 14, base + 2, 6);
  wheel(ctx, px + 14, base + 2, 6);
  if (t.flash > 0) muzzleFlash(ctx, end.x, end.y, t.flash, color);
}

function lighthouse(ctx: Ctx, t: Tower, color: string, now: number): void {
  const px = t.x;
  const top = t.y - 30;
  // Torre a rayas.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px - 12, t.y + 16);
  ctx.lineTo(px - 7, top + 6);
  ctx.lineTo(px + 7, top + 6);
  ctx.lineTo(px + 12, t.y + 16);
  ctx.closePath();
  ctx.fillStyle = "#f4f6ff";
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = "#2f6fe4";
  for (let y = top + 12; y < t.y + 16; y += 12) ctx.fillRect(px - 14, y, 28, 6);
  ctx.restore();
  // Linterna.
  ctx.fillStyle = "#1d2b55";
  ctx.fillRect(px - 9, top - 4, 18, 10);
  ctx.fillStyle = "#e07a5f";
  ctx.beginPath();
  ctx.moveTo(px - 11, top - 4);
  ctx.lineTo(px, top - 14);
  ctx.lineTo(px + 11, top - 4);
  ctx.closePath();
  ctx.fill();
  // Haz giratorio (se orienta al objetivo al disparar).
  const beamAngle = t.flash > 0 ? t.aim : now * 1.2;
  const lamp = { x: px, y: top + 1 };
  ctx.save();
  ctx.translate(lamp.x, lamp.y);
  ctx.rotate(beamAngle);
  const g = ctx.createLinearGradient(0, 0, 90, 0);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(90,209,255,0)");
  ctx.globalAlpha = t.flash > 0 ? 0.85 : 0.35;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(90, -16);
  ctx.lineTo(90, 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  glow(ctx, lamp.x, lamp.y, 12, "#fffbe0", 0.9);
  // Rosa de los vientos en la base.
  star(ctx, px, t.y + 18, 7, 2, color, 4);
}

/** Dibuja la defensa como arma, con su nombre debajo. */
export function drawWeapon(ctx: Ctx, t: Tower, positionOf: (id: number) => Point | null, now: number): void {
  const info = defenseById(t.id);
  ctx.save();
  // Las armas se dibujan un poco más grandes que su base para que se reconozcan.
  ctx.translate(t.x, t.y);
  ctx.scale(WEAPON_SCALE, WEAPON_SCALE);
  ctx.translate(-t.x, -t.y);
  platform(ctx, t.x, t.y, info.color);
  switch (t.id) {
    case "torre-brillo":
      cannon(ctx, t, info.color);
      break;
    case "cuarteto-luz":
      quadTurret(ctx, t, info.color);
      break;
    case "lanza-eje":
      ballista(ctx, t, info.color);
      break;
    case "gemelas":
      twinCannon(ctx, t, info.color);
      break;
    case "guia-punteada":
      slowRay(ctx, t, info.color, positionOf, now);
      break;
    case "plomada":
      catapult(ctx, t, info.color);
      break;
    case "brujula-austral":
      lighthouse(ctx, t, info.color, now);
      break;
  }
  ctx.restore();
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  const label = info.name.replace("Gemelas Gacrux y Acrux", "Gemelas");
  ctx.strokeText(label, t.x, t.y + 48);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, t.x, t.y + 48);
}

/** Dibuja cada disparo según el arma que lo lanzó. */
export function drawProjectile(ctx: Ctx, p: Projectile): void {
  const back = { x: -Math.cos(p.angle), y: -Math.sin(p.angle) };
  switch (p.kind) {
    case "cannonball":
    case "twin":
    case "multi": {
      const r = p.kind === "multi" ? 3.2 : p.kind === "twin" ? 4.2 : 5.5;
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.18 * (4 - i);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + back.x * i * r * 1.6, p.y + back.y * i * r * 1.6, r * (1 - i * 0.18), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      glow(ctx, p.x, p.y, r * 3, p.color, 0.7);
      ctx.fillStyle = "#1d2b55";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bolt": {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(2, 0);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-26, -5);
      ctx.lineTo(-23, 0);
      ctx.lineTo(-26, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      star(ctx, p.x, p.y, 6, 2.4, p.color, 4, p.angle + Math.PI / 4);
      break;
    }
    case "rock": {
      glow(ctx, p.x, p.y, 20, p.color, 0.6);
      ctx.fillStyle = "#6b4a2b";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      star(ctx, p.x, p.y, 9, 4, p.color, 5, p.age * 8);
      break;
    }
    case "ray": {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const g = ctx.createLinearGradient(-30, 0, 4, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, p.color);
      ctx.strokeStyle = g;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.restore();
      glow(ctx, p.x, p.y, 9, "#ffffff", 0.9);
      break;
    }
  }
}
