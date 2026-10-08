import { MUZZLE_HEIGHT, WEAPON_SCALE, type Projectile, type Tower } from "../core/battle/Battle";
import { defenseById } from "../core/defenses";
import type { Point } from "../core/geometry";

/**
 * Armas de caricatura estelar: cañones, ballesta, catapulta, rayos y faro.
 * Se reconocen como armas, pero son de juguete y disparan luz y estrellas.
 * Estilo de dibujo animado: contorno oscuro, sombreado con degradados,
 * brillos, remaches y vetas de madera.
 */

type Ctx = CanvasRenderingContext2D;

const FLASH_TIME = 0.15;

/** Tinta del contorno. */
const INK = "#141a33";
const METAL = { light: "#7d93d6", base: "#3a4d8a", dark: "#1a2452" };
const STEEL = { light: "#e6ebf5", base: "#a7b2c6", dark: "#5f6a80" };
const WOOD = { light: "#c78a52", base: "#96602f", dark: "#5e3718" };

// ---------------- Primitivas ----------------

function star(ctx: Ctx, x: number, y: number, outer: number, inner: number, color: string, points = 5, rot = 0, outline = false): void {
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
  if (outline) inkStroke(ctx, 1.2);
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

function inkStroke(ctx: Ctx, width = 1.6): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Degradado vertical de tres tonos (luz arriba, sombra abajo). */
function vGrad(ctx: Ctx, y0: number, y1: number, c: { light: string; base: string; dark: string }): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c.light);
  g.addColorStop(0.45, c.base);
  g.addColorStop(1, c.dark);
  return g;
}

/** Degradado horizontal (luz a la izquierda). */
function hGrad(ctx: Ctx, x0: number, x1: number, c: { light: string; base: string; dark: string }): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, c.light);
  g.addColorStop(0.4, c.base);
  g.addColorStop(1, c.dark);
  return g;
}

/** Degradado de cilindro a lo ancho (en coordenadas ya rotadas). */
function cylGrad(ctx: Ctx, half: number, c: { light: string; base: string; dark: string }): CanvasGradient {
  const g = ctx.createLinearGradient(0, -half, 0, half);
  g.addColorStop(0, c.base);
  g.addColorStop(0.28, c.light);
  g.addColorStop(0.55, c.base);
  g.addColorStop(1, c.dark);
  return g;
}

/** Paleta de tres tonos a partir del color de la defensa. */
function tones(color: string): { light: string; base: string; dark: string } {
  return { light: mix(color, "#ffffff", 0.55), base: color, dark: mix(color, "#000000", 0.45) };
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`;
}

/** Línea gruesa con contorno de tinta (piezas de madera o metal). */
function outlinedLine(ctx: Ctx, pts: Point[], width: number, color: string | CanvasGradient): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const trace = () => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  };
  trace();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 3;
  ctx.stroke();
  trace();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function bolt(ctx: Ctx, x: number, y: number, r = 1.8): void {
  ctx.fillStyle = STEEL.base;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  inkStroke(ctx, 0.9);
  ctx.fillStyle = STEEL.light;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
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

/** Tabla de madera con degradado, vetas y contorno. */
function plank(ctx: Ctx, x: number, y: number, w: number, h: number, r = 3): void {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = vGrad(ctx, y, y + h, WOOD);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(60,30,10,0.35)";
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 2, y + (h * i) / 3);
    ctx.bezierCurveTo(x + w * 0.3, y + (h * i) / 3 - 1.5, x + w * 0.6, y + (h * i) / 3 + 1.5, x + w - 2, y + (h * i) / 3);
    ctx.stroke();
  }
  ctx.restore();
  roundRect(ctx, x, y, w, h, r);
  inkStroke(ctx);
}

function wheel(ctx: Ctx, x: number, y: number, r: number): void {
  // Llanta de madera con aro de hierro.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = WOOD.dark;
  ctx.fill();
  inkStroke(ctx, 1.8);
  ctx.beginPath();
  ctx.arc(x, y, r - 1.4, 0, Math.PI * 2);
  ctx.strokeStyle = STEEL.base;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r - 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "#3a2412";
  ctx.fill();
  // Rayos.
  ctx.strokeStyle = WOOD.light;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3));
  }
  ctx.stroke();
  // Maza metálica.
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = STEEL.base;
  ctx.fill();
  inkStroke(ctx, 1);
  // Brillo del aro.
  ctx.beginPath();
  ctx.arc(x, y, r - 1.4, Math.PI * 1.1, Math.PI * 1.45);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Barril de cañón a lo largo del eje x (coordenadas ya rotadas). */
function barrel(ctx: Ctx, from: number, length: number, width: number, band: string, emblem = true): void {
  const half = width / 2;
  const trim = tones(band);
  // Botón trasero.
  ctx.beginPath();
  ctx.arc(from - 1, 0, half * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = cylGrad(ctx, half * 0.55, METAL);
  ctx.fill();
  inkStroke(ctx, 1.4);
  // Cuerpo que se ensancha levemente hacia la boca.
  ctx.beginPath();
  ctx.moveTo(from, -half * 0.9);
  ctx.lineTo(from + length - 5, -half);
  ctx.lineTo(from + length - 5, half);
  ctx.lineTo(from, half * 0.9);
  ctx.quadraticCurveTo(from - 3, 0, from, -half * 0.9);
  ctx.closePath();
  ctx.fillStyle = cylGrad(ctx, half, METAL);
  ctx.fill();
  inkStroke(ctx);
  // Aros de refuerzo.
  for (const at of [0.18, 0.55]) {
    roundRect(ctx, from + length * at, -half - 1, 3.2, width + 2, 1.2);
    ctx.fillStyle = cylGrad(ctx, half + 1, trim);
    ctx.fill();
    inkStroke(ctx, 1.1);
  }
  // Brillo longitudinal.
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from + 3, -half * 0.45);
  ctx.lineTo(from + length - 8, -half * 0.5);
  ctx.stroke();
  // Estrella decorativa.
  if (emblem && width >= 9) star(ctx, from + length * 0.38, 1, width * 0.28, width * 0.12, trim.light, 5, 0, true);
  // Boca con reborde y ánima oscura.
  roundRect(ctx, from + length - 6, -half - 2.2, 6, width + 4.4, 2);
  ctx.fillStyle = cylGrad(ctx, half + 2.2, trim);
  ctx.fill();
  inkStroke(ctx, 1.3);
  ctx.beginPath();
  ctx.ellipse(from + length, 0, 1.6, half - 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#0b0f22";
  ctx.fill();
}

function muzzleFlash(ctx: Ctx, x: number, y: number, flash: number, color: string): void {
  if (flash <= 0) return;
  const k = flash / FLASH_TIME;
  glow(ctx, x, y, 18 * k + 6, color, 0.9);
  star(ctx, x, y, 11 * k + 3, 4 * k + 1, "#fffbe0", 6);
}

function facesLeft(angle: number): boolean {
  return Math.cos(angle) < 0;
}

export interface PlatformOptions {
  /** Nivel de mejora (el 2 suma un borde dorado). */
  level?: number;
  /** Reloj de la escena, para que las runas brillen y titilen. */
  now?: number;
  /** Lugar vacío: runas apagadas. */
  empty?: boolean;
}

/** Plataforma de piedra con runas que brillan del color del arma. */
export function platform(ctx: Ctx, x: number, y: number, color: string, o: PlatformOptions = {}): void {
  const level = o.level ?? 1;
  const now = o.now ?? 0;
  const empty = !!o.empty;
  const RX = 30;
  const RY = 9.5;
  const cy = y + 15;
  // Sombra larga: la luz de la luna viene de arriba a la izquierda.
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(x + 12, y + 25, RX + 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Costado de bloques de piedra.
  ctx.beginPath();
  ctx.ellipse(x, cy + 6, RX, RY, 0, 0, Math.PI);
  ctx.lineTo(x - RX, cy);
  ctx.ellipse(x, cy, RX, RY, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = hGrad(ctx, x - RX, x + RX, { light: "#69769f", base: "#3e4a74", dark: "#222a49" });
  ctx.fill();
  inkStroke(ctx);
  ctx.strokeStyle = "rgba(20,26,51,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const dx of [-21, -9, 3, 15, 25]) {
    const k = Math.sqrt(Math.max(0, 1 - (dx / RX) ** 2));
    ctx.moveTo(x + dx, cy + k * RY - 1);
    ctx.lineTo(x + dx, cy + 6 + k * RY);
  }
  ctx.stroke();
  // Musgo en una esquina.
  ctx.fillStyle = "rgba(90, 160, 90, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x - 21, cy + 5, 5, 2.2, 0.3, 0, Math.PI * 2);
  ctx.ellipse(x + 17, cy + 7, 3.5, 1.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Tapa.
  ctx.beginPath();
  ctx.ellipse(x, cy, RX, RY, 0, 0, Math.PI * 2);
  const top = ctx.createLinearGradient(x - RX, cy - RY, x + RX, cy + RY);
  top.addColorStop(0, "#8d9bc6");
  top.addColorStop(1, "#47537f");
  ctx.fillStyle = top;
  ctx.fill();
  inkStroke(ctx);
  // Borde dorado de nivel 2 y 3.
  if (level >= 2) {
    ctx.beginPath();
    ctx.ellipse(x, cy, RX - 1.5, RY - 0.8, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffd54a";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    for (const a of [0.4, 1.8, 3.5, 5.0]) {
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * (RX - 1.5), cy + Math.sin(a) * (RY - 0.8), 2.3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe98a";
      ctx.fill();
      inkStroke(ctx, 0.9);
    }
  }
  // Anillo rúnico que brilla.
  const pulse = empty ? 0.25 : 0.65 + 0.35 * Math.sin(now * 2.4 + x * 0.05);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, cy, 23, 6.6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = empty ? "#6b7390" : color;
  ctx.globalAlpha = 0.5 + 0.5 * pulse;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = empty ? 0 : 8 * pulse;
  ctx.stroke();
  ctx.restore();
  // Runas talladas alrededor del anillo.
  ctx.save();
  ctx.strokeStyle = empty ? "rgba(140,150,185,0.45)" : color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    const rx = 27;
    const ry = 8.1;
    const px = x + Math.cos(a) * rx;
    const py = cy + Math.sin(a) * ry;
    ctx.globalAlpha = empty ? 0.6 : 0.35 + 0.65 * Math.max(0, Math.sin(now * 2.4 + k * 0.8));
    ctx.beginPath();
    if (k % 2 === 0) {
      ctx.moveTo(px - 2, py - 1.4);
      ctx.lineTo(px, py + 1.4);
      ctx.lineTo(px + 2, py - 1.4);
    } else {
      ctx.moveTo(px - 2, py);
      ctx.lineTo(px + 2, py);
      ctx.moveTo(px, py - 1.5);
      ctx.lineTo(px, py + 1.5);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Insignia con las estrellas del nivel del arma. */
function levelBadge(ctx: Ctx, x: number, y: number, level: number): void {
  if (level < 2) return;
  const text = "★".repeat(level);
  ctx.save();
  ctx.font = "800 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 10;
  roundRect(ctx, x - 18 - w, y + 22, w, 14, 7);
  ctx.fillStyle = "rgba(11,19,48,0.9)";
  ctx.fill();
  ctx.strokeStyle = "#ffd54a";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#ffd54a";
  ctx.fillText(text, x - 18 - w / 2, y + 29.5);
  ctx.restore();
}

/** Chispas que titilan alrededor del arma (más a mayor nivel). */
function sparkles(ctx: Ctx, t: Tower, color: string, now: number): void {
  const n = 1 + t.level;
  for (let i = 0; i < n; i++) {
    const a = now * 0.9 + (i / n) * Math.PI * 2;
    const tw = Math.max(0, Math.sin(now * 3 + i * 2.1));
    if (tw < 0.05) continue;
    ctx.globalAlpha = tw;
    star(ctx, t.x + Math.cos(a) * (24 + (i % 2) * 6), t.y - 26 + Math.sin(a) * 11, 2.2 + tw * 1.6, 1, i % 2 ? "#fffbe0" : color, 4, a);
  }
  ctx.globalAlpha = 1;
}

/** Círculo de alcance del arma (al tocarla o señalarla). */
export function drawRange(ctx: Ctx, t: Tower, alpha: number, now: number): void {
  if (alpha <= 0) return;
  const color = defenseById(t.id).color;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 14, t.range, t.range * 0.82, 0, 0, Math.PI * 2);
  ctx.globalAlpha = 0.1 * alpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 0.85 * alpha;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -now * 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
}

// ---------------- Armas ----------------

function cannon(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  const recoil = (t.flash / FLASH_TIME) * 6;
  // Cureña de madera con herrajes.
  ctx.beginPath();
  ctx.moveTo(px - 17, t.y + 11);
  ctx.lineTo(px + 17, t.y + 11);
  ctx.lineTo(px + 9, py + 3);
  ctx.quadraticCurveTo(px, py - 3, px - 9, py + 3);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, py, t.y + 11, WOOD);
  ctx.fill();
  inkStroke(ctx);
  ctx.strokeStyle = "rgba(60,30,10,0.35)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(px - 12, t.y + 6);
  ctx.lineTo(px + 12, t.y + 6);
  ctx.moveTo(px - 8, t.y);
  ctx.lineTo(px + 8, t.y);
  ctx.stroke();
  bolt(ctx, px - 6, py + 6);
  bolt(ctx, px + 6, py + 6);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  barrel(ctx, -10 - recoil, 34, 13, color);
  ctx.restore();
  // Muñón que sujeta el barril.
  ctx.beginPath();
  ctx.arc(px, py, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = STEEL.base;
  ctx.fill();
  inkStroke(ctx, 1.1);
  wheel(ctx, px - 11, t.y + 10, 8.5);
  wheel(ctx, px + 11, t.y + 10, 8.5);
  const tip = { x: px + Math.cos(t.aim) * (24 - recoil), y: py + Math.sin(t.aim) * (24 - recoil) };
  muzzleFlash(ctx, tip.x, tip.y, t.flash, color);
}

function quadTurret(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  const recoil = (t.flash / FLASH_TIME) * 4;
  // Carcasa blindada.
  roundRect(ctx, px - 14, py + 1, 28, 26, 6);
  ctx.fillStyle = hGrad(ctx, px - 14, px + 14, METAL);
  ctx.fill();
  inkStroke(ctx);
  ctx.fillStyle = tones(color).dark;
  ctx.fillRect(px - 13, py + 12, 26, 3);
  for (const dx of [-9, 9]) for (const dy of [6, 21]) bolt(ctx, px + dx, py + dy, 1.5);
  // Cabezal giratorio con cuatro cañones.
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  roundRect(ctx, -3, -12.5, 12, 25, 3);
  ctx.fillStyle = hGrad(ctx, -3, 9, METAL);
  ctx.fill();
  inkStroke(ctx);
  for (const off of [-7.5, -2.5, 2.5, 7.5]) {
    ctx.save();
    ctx.translate(0, off);
    barrel(ctx, 6 - recoil, 21, 4.6, color, false);
    ctx.restore();
  }
  ctx.restore();
  // Cúpula de vidrio.
  ctx.beginPath();
  ctx.arc(px, py, 9.5, 0, Math.PI * 2);
  const dome = ctx.createRadialGradient(px - 3, py - 4, 1, px, py, 10);
  dome.addColorStop(0, "#ffffff");
  dome.addColorStop(0.35, tones(color).light);
  dome.addColorStop(1, tones(color).dark);
  ctx.fillStyle = dome;
  ctx.fill();
  inkStroke(ctx);
  ctx.beginPath();
  ctx.arc(px, py, 6.5, Math.PI * 1.1, Math.PI * 1.55);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (t.flash > 0) {
    for (const off of [-7.5, -2.5, 2.5, 7.5]) {
      const tip = {
        x: px + Math.cos(t.aim) * 27 - Math.sin(t.aim) * off,
        y: py + Math.sin(t.aim) * 27 + Math.cos(t.aim) * off
      };
      muzzleFlash(ctx, tip.x, tip.y, t.flash * 0.6, color);
    }
  }
}

function ballista(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  const woodStroke = WOOD.base;
  // Caballete.
  outlinedLine(ctx, [{ x: px - 13, y: t.y + 15 }, { x: px, y: py + 4 }, { x: px + 13, y: t.y + 15 }], 4.5, woodStroke);
  outlinedLine(ctx, [{ x: px - 8, y: t.y + 5 }, { x: px + 8, y: t.y + 5 }], 3, WOOD.dark);
  bolt(ctx, px, py + 4, 2.2);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  // Culata con canal y placa metálica.
  roundRect(ctx, -20, -4.5, 42, 9, 3);
  ctx.fillStyle = cylGrad(ctx, 4.5, WOOD);
  ctx.fill();
  inkStroke(ctx);
  ctx.fillStyle = "#3a2412";
  ctx.fillRect(-16, -1, 34, 2);
  roundRect(ctx, 16, -5.5, 7, 11, 2);
  ctx.fillStyle = cylGrad(ctx, 5.5, STEEL);
  ctx.fill();
  inkStroke(ctx, 1.1);
  roundRect(ctx, -22, -6, 6, 12, 2);
  ctx.fill();
  inkStroke(ctx, 1.1);
  // Arco con puntas.
  const bowGrad = cylGrad(ctx, 20, tones(color));
  ctx.lineCap = "round";
  for (const [w, c] of [[7.5, INK], [4.5, bowGrad]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(12, -21);
    ctx.quadraticCurveTo(27, 0, 12, 21);
    ctx.stroke();
  }
  for (const y of [-21, 21]) {
    ctx.beginPath();
    ctx.arc(12, y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = STEEL.base;
    ctx.fill();
    inkStroke(ctx, 1);
  }
  // Cuerda tensa.
  const pull = t.flash > 0 ? 0 : 8;
  ctx.strokeStyle = "#f4f6ff";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(12, -21);
  ctx.lineTo(12 - pull, 0);
  ctx.lineTo(12, 21);
  ctx.stroke();
  // Flecha de luz cargada.
  if (t.cooldown <= t.reload * 0.35) {
    outlinedLine(ctx, [{ x: 12 - pull, y: 0 }, { x: 33, y: 0 }], 2, "#fffbe0");
    ctx.fillStyle = tones(color).light;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(12 - pull + 1, 0);
      ctx.lineTo(12 - pull - 4, s * 4);
      ctx.lineTo(12 - pull + 5, 0);
      ctx.closePath();
      ctx.fill();
      inkStroke(ctx, 0.8);
    }
    star(ctx, 35, 0, 5.5, 2.2, color, 4, Math.PI / 4, true);
  }
  ctx.restore();
  muzzleFlash(ctx, px + Math.cos(t.aim) * 30, py + Math.sin(t.aim) * 30, t.flash, color);
}

function twinCannon(ctx: Ctx, t: Tower, color: string): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  const recoil = (t.flash / FLASH_TIME) * 5;
  plank(ctx, px - 18, py + 2, 36, 17, 4);
  bolt(ctx, px - 13, py + 6);
  bolt(ctx, px + 13, py + 6);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  ctx.save();
  ctx.translate(0, -6);
  barrel(ctx, -8 - recoil, 30, 9.5, "#ffb870");
  ctx.restore();
  ctx.save();
  ctx.translate(0, 6);
  barrel(ctx, -8 - recoil * 0.6, 30, 9.5, "#f4f6ff");
  ctx.restore();
  // Abrazadera que une los dos barriles.
  roundRect(ctx, 1, -12, 5, 24, 2);
  ctx.fillStyle = hGrad(ctx, 1, 6, STEEL);
  ctx.fill();
  inkStroke(ctx, 1.2);
  ctx.restore();
  wheel(ctx, px - 12, t.y + 12, 7.5);
  wheel(ctx, px + 12, t.y + 12, 7.5);
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
  const steel = STEEL.base;
  // Trípode metálico.
  for (const end of [{ x: px - 13, y: t.y + 16 }, { x: px + 13, y: t.y + 16 }, { x: px, y: t.y + 18 }]) {
    outlinedLine(ctx, [{ x: px, y: py + 5 }, end], 2.6, steel);
  }
  roundRect(ctx, px - 5, py + 2, 10, 7, 2);
  ctx.fillStyle = hGrad(ctx, px - 5, px + 5, METAL);
  ctx.fill();
  inkStroke(ctx, 1.2);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  // Antena parabólica con anillos.
  ctx.beginPath();
  ctx.moveTo(-5, -17);
  ctx.quadraticCurveTo(10, 0, -5, 17);
  ctx.quadraticCurveTo(1, 0, -5, -17);
  ctx.closePath();
  const dish = ctx.createLinearGradient(-5, -17, 6, 17);
  dish.addColorStop(0, STEEL.light);
  dish.addColorStop(0.6, STEEL.base);
  dish.addColorStop(1, STEEL.dark);
  ctx.fillStyle = dish;
  ctx.fill();
  inkStroke(ctx);
  ctx.strokeStyle = "rgba(20,26,51,0.35)";
  ctx.lineWidth = 0.8;
  for (const k of [0.45, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(-5 + 3 * k, -17 * k);
    ctx.quadraticCurveTo(8 * k, 0, -5 + 3 * k, 17 * k);
    ctx.stroke();
  }
  // Brazo emisor.
  outlinedLine(ctx, [{ x: 2, y: 0 }, { x: 16, y: 0 }], 2.2, steel);
  outlinedLine(ctx, [{ x: 4, y: -10 }, { x: 16, y: 0 }, { x: 4, y: 10 }], 1.2, steel);
  ctx.restore();
  const tip = { x: px + Math.cos(t.aim) * 17, y: py + Math.sin(t.aim) * 17 };
  const pulse = 0.5 + 0.5 * Math.sin(now * 6);
  glow(ctx, tip.x, tip.y, 11 + pulse * 4, color, 0.85);
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = "#fffbe0";
  ctx.fill();
  inkStroke(ctx, 1);
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
  const dir = facesLeft(t.aim) ? -1 : 1;
  const base = t.y + 12;
  // Marco en A y travesaño.
  outlinedLine(ctx, [{ x: px - 9, y: base - 4 }, { x: px, y: base - 26 }, { x: px + 9, y: base - 4 }], 4.5, WOOD.base);
  plank(ctx, px - 21, base - 7, 42, 8, 3);
  bolt(ctx, px - 16, base - 3, 1.5);
  bolt(ctx, px + 16, base - 3, 1.5);
  // Brazo: en reposo hacia atrás; al disparar, levantado.
  const k = t.flash > 0 ? t.flash / FLASH_TIME : 0;
  const rest = (200 * Math.PI) / 180;
  const thrown = (70 * Math.PI) / 180;
  const theta = rest + (thrown - rest) * k;
  const pivot = { x: px, y: base - 24 };
  const ux = Math.cos(theta) * dir;
  const uy = -Math.sin(theta);
  const end = { x: pivot.x + ux * 26, y: pivot.y + uy * 26 };
  const back = { x: pivot.x - ux * 9, y: pivot.y - uy * 9 };
  outlinedLine(ctx, [back, end], 4.5, WOOD.light);
  // Contrapeso.
  roundRect(ctx, back.x - 5, back.y - 3, 10, 9, 2);
  ctx.fillStyle = vGrad(ctx, back.y - 3, back.y + 6, STEEL);
  ctx.fill();
  inkStroke(ctx, 1.2);
  bolt(ctx, pivot.x, pivot.y, 2.4);
  // Cuchara con piedra estelar.
  ctx.beginPath();
  ctx.arc(end.x, end.y, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, end.y - 7, end.y + 7, WOOD);
  ctx.fill();
  inkStroke(ctx);
  ctx.beginPath();
  ctx.arc(end.x, end.y - 1, 4.8, 0, Math.PI * 2);
  ctx.fillStyle = "#3a2412";
  ctx.fill();
  if (t.cooldown <= t.reload * 0.5) star(ctx, end.x, end.y - 3, 7.5, 3.3, color, 5, 0, true);
  wheel(ctx, px - 14, base + 2, 6.5);
  wheel(ctx, px + 14, base + 2, 6.5);
  if (t.flash > 0) muzzleFlash(ctx, end.x, end.y, t.flash, color);
}

function lighthouse(ctx: Ctx, t: Tower, color: string, now: number): void {
  const px = t.x;
  const top = t.y - 30;
  // Torre a rayas, iluminada desde la izquierda.
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(px - 12, t.y + 16);
    ctx.lineTo(px - 7.5, top + 6);
    ctx.lineTo(px + 7.5, top + 6);
    ctx.lineTo(px + 12, t.y + 16);
    ctx.closePath();
  };
  ctx.save();
  body();
  ctx.fillStyle = hGrad(ctx, px - 12, px + 12, { light: "#ffffff", base: "#e6ebf5", dark: "#a9b3c9" });
  ctx.fill();
  ctx.clip();
  const stripe = hGrad(ctx, px - 12, px + 12, { light: "#5b94ff", base: "#2f6fe4", dark: "#1b43a0" });
  ctx.fillStyle = stripe;
  for (let y = top + 12; y < t.y + 16; y += 12) ctx.fillRect(px - 14, y, 28, 6);
  ctx.restore();
  body();
  inkStroke(ctx);
  // Puerta y ventana.
  roundRect(ctx, px - 3.5, t.y + 6, 7, 10, 3);
  ctx.fillStyle = WOOD.dark;
  ctx.fill();
  inkStroke(ctx, 1.1);
  ctx.beginPath();
  ctx.arc(px, top + 16, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe9a0";
  ctx.fill();
  inkStroke(ctx, 0.9);
  // Balcón con baranda.
  roundRect(ctx, px - 11, top + 3, 22, 4, 1.5);
  ctx.fillStyle = hGrad(ctx, px - 11, px + 11, METAL);
  ctx.fill();
  inkStroke(ctx, 1.2);
  // Sala de la linterna.
  roundRect(ctx, px - 8, top - 7, 16, 10, 2);
  const lampGrad = ctx.createLinearGradient(0, top - 7, 0, top + 3);
  lampGrad.addColorStop(0, "#fffbe0");
  lampGrad.addColorStop(1, "#ffd166");
  ctx.fillStyle = lampGrad;
  ctx.fill();
  inkStroke(ctx, 1.3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const dx of [-3, 3]) {
    ctx.moveTo(px + dx, top - 7);
    ctx.lineTo(px + dx, top + 3);
  }
  ctx.stroke();
  // Techo.
  ctx.beginPath();
  ctx.moveTo(px - 11, top - 7);
  ctx.lineTo(px, top - 17);
  ctx.lineTo(px + 11, top - 7);
  ctx.closePath();
  ctx.fillStyle = hGrad(ctx, px - 11, px + 11, { light: "#ff9f86", base: "#e07a5f", dark: "#a44a33" });
  ctx.fill();
  inkStroke(ctx);
  ctx.beginPath();
  ctx.arc(px, top - 18, 2, 0, Math.PI * 2);
  ctx.fillStyle = STEEL.base;
  ctx.fill();
  inkStroke(ctx, 1);
  // Haz giratorio (se orienta al objetivo al disparar).
  const beamAngle = t.flash > 0 ? t.aim : now * 1.2;
  const lamp = { x: px, y: top - 2 };
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
  star(ctx, px, t.y + 18, 7, 2.2, color, 4, 0, true);
}

/** Regla de Luz: soporte con una regla de cristal que lanza un rayo recto que atraviesa. */
function lightRuler(ctx: Ctx, t: Tower, color: string, now: number): void {
  const px = t.x;
  const py = t.y - MUZZLE_HEIGHT;
  for (const end of [{ x: px - 12, y: t.y + 16 }, { x: px + 12, y: t.y + 16 }]) outlinedLine(ctx, [{ x: px, y: py + 4 }, end], 2.6, STEEL.base);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(t.aim);
  // Regla con marcas.
  roundRect(ctx, -6, -6, 36, 12, 3);
  ctx.fillStyle = vGrad(ctx, -6, 6, { light: "#7a8fd6", base: "#34477d", dark: "#1d2b55" });
  ctx.fill();
  inkStroke(ctx, 1.4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5.4, -6);
    ctx.lineTo(i * 5.4, i % 2 ? -2 : 0);
    ctx.stroke();
  }
  // Punta que brilla.
  glow(ctx, 31, 0, 9 + 2 * Math.sin(now * 7), color, 0.9);
  ctx.restore();
  // Rayo recto al disparar.
  if (t.flash > 0) {
    const k = t.flash / FLASH_TIME;
    const tipX = px + Math.cos(t.aim) * 31;
    const tipY = py + Math.sin(t.aim) * 31;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.4);
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = 9 * k + 2;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(px + Math.cos(t.aim) * (t.range + 20), py + Math.sin(t.aim) * (t.range + 20));
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3 * k + 1;
    ctx.stroke();
    ctx.restore();
  }
}

/** Faro de la Vía Láctea: torre con una lámpara que lanza ondas de luz. */
function milkyBeacon(ctx: Ctx, t: Tower, color: string, now: number): void {
  const px = t.x;
  const top = t.y - 30;
  roundRect(ctx, px - 9, top + 10, 18, 36, 4);
  ctx.fillStyle = hGrad(ctx, px - 9, px + 9, { light: "#7a8fd6", base: "#34477d", dark: "#1d2b55" });
  ctx.fill();
  inkStroke(ctx, 1.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (const y of [top + 20, top + 31]) {
    ctx.beginPath();
    ctx.moveTo(px - 9, y);
    ctx.lineTo(px + 9, y);
    ctx.stroke();
  }
  // Lámpara.
  ctx.beginPath();
  ctx.arc(px, top + 6, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#1d2b55";
  ctx.fill();
  inkStroke(ctx, 1.5);
  glow(ctx, px, top + 6, 14 + 3 * Math.sin(now * 3), color, 0.9);
  star(ctx, px, top + 6, 6, 2.4, "#ffffff", 4, now * 0.6);
  // Ondas que salen al pulsar.
  if (t.flash > 0) {
    const k = 1 - t.flash / FLASH_TIME;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    ctx.arc(px, top + 6, 12 + k * t.range * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Bumerán de Plata: soporte con un bumerán que gira. */
function boomerangLauncher(ctx: Ctx, t: Tower, color: string, now: number): void {
  const px = t.x;
  const py = t.y - 8;
  roundRect(ctx, px - 14, t.y + 4, 28, 12, 4);
  ctx.fillStyle = vGrad(ctx, t.y + 4, t.y + 16, { light: "#b08a5c", base: "#8a5a33", dark: "#5a3a1c" });
  ctx.fill();
  inkStroke(ctx, 1.4);
  outlinedLine(ctx, [{ x: px - 10, y: t.y + 5 }, { x: px - 6, y: py + 2 }], 3, "#6b4a2b");
  outlinedLine(ctx, [{ x: px + 10, y: t.y + 5 }, { x: px + 6, y: py + 2 }], 3, "#6b4a2b");
  // Bumerán que gira sobre el soporte (más rápido al lanzar).
  ctx.save();
  ctx.translate(px, py - 6);
  ctx.rotate(now * (t.flash > 0 ? 14 : 2));
  glow(ctx, 0, 0, 16, color, 0.5);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const arms = () => {
    ctx.beginPath();
    ctx.moveTo(-17, 4);
    ctx.quadraticCurveTo(-6, -6, 0, -17);
    ctx.quadraticCurveTo(4, -4, 17, 2);
  };
  arms();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 11;
  ctx.stroke();
  arms();
  ctx.strokeStyle = color;
  ctx.lineWidth = 7.5;
  ctx.stroke();
  arms();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  star(ctx, 0, 0, 3, 1.2, "#1d2b55", 4, 0);
  ctx.restore();
}

/** Dibuja la defensa como arma, con su nombre debajo. */
export function drawWeapon(ctx: Ctx, t: Tower, positionOf: (id: number) => Point | null, now: number): void {
  const info = defenseById(t.id);
  ctx.save();
  // Las armas se dibujan más grandes que su base para que se reconozcan.
  ctx.translate(t.x, t.y);
  ctx.scale(WEAPON_SCALE, WEAPON_SCALE);
  ctx.translate(-t.x, -t.y);
  platform(ctx, t.x, t.y, info.color, { level: t.level, now });
  // Aura de nivel 3.
  if (t.level >= 3) glow(ctx, t.x, t.y - 8, 52, info.color, 0.26 + 0.08 * Math.sin(now * 3));
  // Al disparar, el arma se aplasta un poquito y vuelve.
  const k = Math.max(0, t.flash / FLASH_TIME);
  ctx.save();
  ctx.translate(t.x, t.y + 15);
  ctx.scale(1 + 0.04 * k, 1 - 0.06 * k);
  ctx.translate(-t.x, -(t.y + 15));
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
    case "regla-luz":
      lightRuler(ctx, t, info.color, now);
      break;
    case "faro-lactea":
      milkyBeacon(ctx, t, info.color, now);
      break;
    case "bumeran-plata":
      boomerangLauncher(ctx, t, info.color, now);
      break;
  }
  ctx.restore();
  sparkles(ctx, t, info.color, now);
  levelBadge(ctx, t.x, t.y, t.level);
  ctx.restore();
}

/** Radio (en el campo) dentro del cual un toque o el puntero señalan una defensa. */
export const WEAPON_HIT_RADIUS = 46;

/** Cartel con el nombre del arma; se muestra al tocarla o al pasar el puntero. */
export function drawWeaponLabel(ctx: Ctx, t: Tower, alpha: number): void {
  const info = defenseById(t.id);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "bold 13px system-ui, sans-serif";
  const name = info.name;
  const w = ctx.measureText(name).width + 22;
  const x = Math.min(Math.max(t.x - w / 2, 4), 956 - w);
  const y = t.y + 34;
  roundRect(ctx, x, y, w, 24, 12);
  ctx.fillStyle = "rgba(11,19,48,0.92)";
  ctx.fill();
  ctx.strokeStyle = info.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Pequeña flecha hacia el arma.
  ctx.beginPath();
  ctx.moveTo(t.x - 6, y);
  ctx.lineTo(t.x, y - 7);
  ctx.lineTo(t.x + 6, y);
  ctx.closePath();
  ctx.fillStyle = info.color;
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, x + w / 2, y + 12.5);
  ctx.restore();
}

/** Dibuja cada disparo según el arma que lo lanzó. */
export function drawProjectile(ctx: Ctx, p: Projectile): void {
  const back = { x: -Math.cos(p.angle), y: -Math.sin(p.angle) };
  switch (p.kind) {
    case "cannonball":
    case "twin":
    case "multi": {
      const r = p.kind === "multi" ? 3.2 : p.kind === "twin" ? 4.2 : 5.5;
      for (let i = 6; i >= 1; i--) {
        ctx.globalAlpha = 0.16 * (7 - i) * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + back.x * i * r * 1.3, p.y + back.y * i * r * 1.3, Math.max(0.8, r * (1 - i * 0.13)), 0, Math.PI * 2);
        ctx.fill();
      }
      // Chispas que se desprenden de la estela.
      for (let i = 0; i < 3; i++) {
        const ph = p.age * 14 + i * 2.1;
        const off = (Math.sin(ph) * 0.5 + 0.5) * r * 2.2;
        ctx.globalAlpha = 0.8 - i * 0.2;
        star(ctx, p.x + back.x * (r * 2.4 + i * r * 1.6) - back.y * (i - 1) * off, p.y + back.y * (r * 2.4 + i * r * 1.6) + back.x * (i - 1) * off, 2.2, 0.9, "#fffbe0", 4, ph);
      }
      ctx.globalAlpha = 1;
      glow(ctx, p.x, p.y, r * 3.4, p.color, 0.8);
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
      {
        const tail = ctx.createLinearGradient(-48, 0, 0, 0);
        tail.addColorStop(0, "rgba(255,255,255,0)");
        tail.addColorStop(1, p.color);
        ctx.strokeStyle = tail;
        ctx.lineWidth = 7;
        ctx.globalAlpha = 0.65;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-48, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
      }
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
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.5 - i * 0.1;
        star(ctx, p.x + back.x * i * 9, p.y + back.y * i * 9, 7 - i, 3 - i * 0.4, p.color, 5, p.age * 8 + i);
      }
      ctx.globalAlpha = 1;
      glow(ctx, p.x, p.y, 24, p.color, 0.7);
      ctx.fillStyle = "#6b4a2b";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      star(ctx, p.x, p.y, 9, 4, p.color, 5, p.age * 8, true);
      break;
    }
    case "boomerang": {
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.4 - i * 0.08;
        star(ctx, p.x + back.x * i * 8, p.y + back.y * i * 8, 4, 1.6, p.color, 4, p.age * 20 + i);
      }
      ctx.globalAlpha = 1;
      glow(ctx, p.x, p.y, 16, p.color, 0.7);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.age * 18);
      ctx.beginPath();
      ctx.moveTo(-10, 5);
      ctx.quadraticCurveTo(-3, -1, -1, -10);
      ctx.lineTo(4, -8);
      ctx.quadraticCurveTo(5, 0, 12, 4);
      ctx.lineTo(9, 9);
      ctx.quadraticCurveTo(0, 5, -6, 10);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      inkStroke(ctx, 1.4);
      ctx.restore();
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
      for (let i = 0; i < 3; i++) {
        const ph = p.age * 10 + i * 2;
        ctx.globalAlpha = 0.9 * Math.max(0, Math.sin(ph));
        star(ctx, p.x + back.x * (8 + i * 9), p.y + back.y * (8 + i * 9) + Math.sin(ph * 1.7) * 4, 3, 1.2, "#ffffff", 4, ph);
      }
      ctx.globalAlpha = 1;
      glow(ctx, p.x, p.y, 12, "#ffffff", 0.95);
      break;
    }
  }
}

/** Lugar vacío: pedestal sin arma, porque el desafío se respondió mal. */
export function drawEmptySlot(ctx: Ctx, x: number, y: number, now: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(WEAPON_SCALE, WEAPON_SCALE);
  ctx.translate(-x, -y);
  platform(ctx, x, y, "#6b7390", { now, empty: true });
  ctx.beginPath();
  ctx.ellipse(x, y + 15, 17, 4.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1a2142";
  ctx.fill();
  // Grieta en la piedra.
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 13);
  ctx.lineTo(x - 6, y + 16);
  ctx.lineTo(x - 2, y + 12);
  ctx.lineTo(x + 5, y + 17);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Signo de vacío que flota suavemente.
  const bob = Math.sin(now * 2) * 2;
  ctx.globalAlpha = 0.75;
  ctx.font = "900 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.strokeText("✕", x, y + 2 + bob);
  ctx.fillStyle = "#fca5a5";
  ctx.fillText("✕", x, y + 2 + bob);
  ctx.restore();
}

/** Cartel de un lugar vacío. */
export function drawEmptySlotLabel(ctx: Ctx, x: number, y: number, text: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "bold 13px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 22;
  const lx = Math.min(Math.max(x - w / 2, 4), 956 - w);
  const ly = y + 34;
  roundRect(ctx, lx, ly, w, 24, 12);
  ctx.fillStyle = "rgba(11,19,48,0.92)";
  ctx.fill();
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, lx + w / 2, ly + 12.5);
  ctx.restore();
}
