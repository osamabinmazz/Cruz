import { FIELD, SKY_HORIZON } from "../core/battle/data";
import { MAP_CLASICO, inWater, type BattleMap, type MapTheme } from "../core/battle/maps";
import { starShape } from "./effectsCanvas";
import type { Point } from "../core/geometry";

/**
 * Escenario de la batalla en estilo de dibujo animado: cielo con colinas y
 * pinos, césped a cuadros, camino de tierra con piedras y un campamento con
 * cerco, carpas, fogata, farol y bandera. La parte fija se dibuja una sola vez
 * en un lienzo aparte; las partes animadas se dibujan en cada cuadro.
 */

type Ctx = CanvasRenderingContext2D;

const INK = "#141a33";

/** Mapa que se está dibujando (se fija al armar el fondo). */
let M: BattleMap = MAP_CLASICO;
const HORIZON = SKY_HORIZON;

function ink(ctx: Ctx, w = 1.6): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Pseudoaleatorio fijo para que el escenario sea siempre igual. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function distToPath(p: Point): number {
  let best = Infinity;
  for (const route of M.routes) {
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1];
      const b = route[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
    }
  }
  return best;
}

// ---------------- Fondo fijo ----------------

function sky(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 10);
  g.addColorStop(0, "#070d33");
  g.addColorStop(1, "#23377a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, HORIZON + 10);
  // Luna creciente.
  const moon = { x: 86, y: 56 };
  const glow = ctx.createRadialGradient(moon.x, moon.y, 4, moon.x, moon.y, 50);
  glow.addColorStop(0, "rgba(255,248,210,0.35)");
  glow.addColorStop(1, "rgba(255,248,210,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(moon.x - 50, moon.y - 50, 100, 100);
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#fff4c7";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moon.x + 7, moon.y - 4, 13, 0, Math.PI * 2);
  ctx.fillStyle = "#101c4f";
  ctx.fill();
}

/** Colinas y pinos en silueta sobre el horizonte (tapan las estrellas que bajan). */
function horizonLandscape(ctx: Ctx): void {
  // Colinas lejanas en dos capas.
  const hills = (base: number, amp: number, color: string, phase: number) => {
    ctx.beginPath();
    ctx.moveTo(0, HORIZON + 12);
    for (let x = 0; x <= FIELD.width; x += 20) {
      ctx.lineTo(x, base - Math.sin(x / 90 + phase) * amp - Math.sin(x / 37 + phase * 2) * amp * 0.3);
    }
    ctx.lineTo(FIELD.width, HORIZON + 12);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  hills(HORIZON - 14, 10, "#1b2c5e", 0.4);
  hills(HORIZON - 4, 7, "#15294a", 2.1);
  // Pinos en silueta sobre el horizonte.
  const rnd = seeded(12);
  for (let x = 10; x < FIELD.width; x += 26 + rnd() * 30) {
    const h = 16 + rnd() * 16;
    pine(ctx, x, HORIZON + 4, h, "#10213a", false);
  }
}

function pine(ctx: Ctx, x: number, y: number, h: number, color: string, outlined = true): void {
  const w = h * 0.55;
  ctx.fillStyle = "#4a3120";
  ctx.fillRect(x - h * 0.05, y - h * 0.18, h * 0.1, h * 0.2);
  for (let i = 0; i < 3; i++) {
    const top = y - h + i * h * 0.25;
    const bottom = y - h * 0.15 - (2 - i) * h * 0.12;
    const ww = w * (0.55 + i * 0.25);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + ww / 2, bottom);
    ctx.lineTo(x - ww / 2, bottom);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (outlined) ink(ctx, 1.3);
  }
  if (outlined) {
    ctx.beginPath();
    ctx.moveTo(x - 1, y - h + 4);
    ctx.lineTo(x - w * 0.18, y - h * 0.55);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function lawn(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, HORIZON, 0, FIELD.height);
  g.addColorStop(0, "#1f4034");
  g.addColorStop(1, "#122b22");
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON + 2, FIELD.width, FIELD.height - HORIZON);
  const cell = 60;
  for (let gy = HORIZON + 12; gy < FIELD.height; gy += cell) {
    for (let gx = 0; gx < FIELD.width; gx += cell) {
      if (((gx + gy) / cell) % 2 === 0) continue;
      ctx.fillStyle = "rgba(110, 180, 100, 0.09)";
      ctx.fillRect(gx, gy, cell, cell);
    }
  }
  // Matas de pasto y florecitas.
  const rnd = seeded(7);
  for (let i = 0; i < 170; i++) {
    const p = { x: rnd() * FIELD.width, y: HORIZON + 14 + rnd() * (FIELD.height - HORIZON - 14) };
    if (distToPath(p) < 30) continue;
    if (rnd() < 0.18) {
      ctx.fillStyle = ["#f4f6ff", "#9be7ff", "#ffe66d"][Math.floor(rnd() * 3)];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.strokeStyle = rnd() < 0.5 ? "#3d7a50" : "#2f6443";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x - 3, p.y);
    ctx.lineTo(p.x - 4, p.y - 5);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - 7);
    ctx.moveTo(p.x + 3, p.y);
    ctx.lineTo(p.x + 4.5, p.y - 5);
    ctx.stroke();
  }
}

function bush(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + r * 0.55, r * 1.3, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  const blobs: [number, number, number][] = [[-0.7, 0, 0.7], [0.7, 0.05, 0.7], [0, -0.35, 0.85]];
  ctx.beginPath();
  for (const [dx, dy, k] of blobs) {
    ctx.moveTo(x + dx * r + k * r, y + dy * r);
    ctx.arc(x + dx * r, y + dy * r, k * r, 0, Math.PI * 2);
  }
  const g = ctx.createLinearGradient(0, y - r, 0, y + r * 0.6);
  g.addColorStop(0, "#4f9a5c");
  g.addColorStop(1, "#23553a");
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.5);
  // Brillos.
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.65, r * 0.35, r * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function rock(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.4);
  ctx.quadraticCurveTo(x - r * 0.9, y - r * 0.6, x - r * 0.1, y - r * 0.7);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 0.6, x + r, y + r * 0.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, "#a7b2c6");
  g.addColorStop(1, "#56607a");
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.3);
}

/** Traza una ruta como una línea continua. */
function trace(ctx: Ctx, route: Point[]): void {
  ctx.beginPath();
  route.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

/** Puntos de una ruta cada `step` píxeles, con la dirección del camino en cada uno. */
function along(route: Point[], step: number, from = 0): { x: number; y: number; nx: number; ny: number; tx: number; ty: number }[] {
  const out: { x: number; y: number; nx: number; ny: number; tx: number; ty: number }[] = [];
  let carry = from;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const tx = (b.x - a.x) / len;
    const ty = (b.y - a.y) / len;
    for (let d = carry; d < len; d += step) {
      out.push({ x: a.x + tx * d, y: a.y + ty * d, tx, ty, nx: -ty, ny: tx });
      carry = d + step - len;
    }
    if (carry >= len) carry -= len;
    else carry = Math.max(0, carry);
  }
  return out;
}

function path(ctx: Ctx): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Primero el borde de todas las rutas, luego la tierra: así los cruces y las bifurcaciones se unen sin costuras.
  for (const [color, width] of [[INK, 54], ["#6b5236", 49], ["#8a6c48", 39], ["#9a7b55", 26]] as const) {
    for (const route of M.routes) {
      trace(ctx, route);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }
  // Huellas de carreta.
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(60,40,20,0.38)";
  ctx.lineWidth = 2;
  for (const route of M.routes) {
    for (const off of [-9, 9]) {
      ctx.beginPath();
      route.forEach((p, i) => {
        const prev = route[Math.max(i - 1, 0)];
        const next = route[Math.min(i + 1, route.length - 1)];
        const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
        const q = { x: p.x - ((next.y - prev.y) / len) * off, y: p.y + ((next.x - prev.x) / len) * off };
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    }
  }
  ctx.restore();
  // Piedras en los bordes y en la tierra.
  const rnd = seeded(31);
  for (const route of M.routes) {
    for (const p of along(route, 15)) {
      const side = rnd() < 0.5 ? -1 : 1;
      const edge = rnd() < 0.55;
      const off = (edge ? 22 + rnd() * 5 : 6 + rnd() * 14) * side;
      const x = p.x + p.nx * off;
      const y = p.y + p.ny * off;
      const big = edge && rnd() < 0.3;
      ctx.beginPath();
      ctx.ellipse(x, y, (big ? 4.5 : 2.5) + rnd() * 2, (big ? 3.2 : 1.8) + rnd() * 1.2, rnd() * 3, 0, Math.PI * 2);
      ctx.fillStyle = edge ? (rnd() < 0.5 ? "#a8a29a" : "#7d786f") : rnd() < 0.5 ? "#b39a78" : "#5e4a33";
      ctx.fill();
      if (big) ink(ctx, 1);
    }
  }
}

/** Flechas que indican hacia dónde caminan los zombis (una cada tanto, sin repetirlas en tramos compartidos). */
function arrows(ctx: Ctx): void {
  const placed: Point[] = [];
  for (const route of M.routes) {
    for (const p of along(route, 96, 70)) {
      if (p.x < 40 || Math.hypot(p.x - M.camp.x, p.y - M.camp.y) < 90) continue;
      if (placed.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 50)) continue;
      placed.push(p);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.ty, p.tx));
      ctx.strokeStyle = "rgba(255, 243, 176, 0.42)";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-5, -7);
      ctx.lineTo(3, 0);
      ctx.lineTo(-5, 7);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Puerta de los zombis: un arco de piedra con una luz verde, en el borde por donde entran. */
function portal(ctx: Ctx): void {
  const start = M.routes[0][0];
  const y = start.y;
  ctx.save();
  const glow = ctx.createRadialGradient(8, y, 4, 8, y, 70);
  glow.addColorStop(0, "rgba(140, 255, 120, 0.55)");
  glow.addColorStop(1, "rgba(140, 255, 120, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-10, y - 80, 100, 160);
  // Arco.
  ctx.beginPath();
  ctx.moveTo(-6, y + 44);
  ctx.lineTo(-6, y - 22);
  ctx.quadraticCurveTo(-6, y - 52, 22, y - 52);
  ctx.quadraticCurveTo(50, y - 52, 50, y - 22);
  ctx.lineTo(50, y + 44);
  ctx.lineTo(34, y + 44);
  ctx.lineTo(34, y - 18);
  ctx.quadraticCurveTo(34, y - 36, 22, y - 36);
  ctx.quadraticCurveTo(10, y - 36, 10, y - 18);
  ctx.lineTo(10, y + 44);
  ctx.closePath();
  ctx.fillStyle = "#6f6a72";
  ctx.fill();
  ink(ctx, 2);
  // Interior oscuro.
  ctx.beginPath();
  ctx.moveTo(10, y + 44);
  ctx.lineTo(10, y - 18);
  ctx.quadraticCurveTo(10, y - 36, 22, y - 36);
  ctx.quadraticCurveTo(34, y - 36, 34, y - 18);
  ctx.lineTo(34, y + 44);
  ctx.closePath();
  ctx.fillStyle = "rgba(10, 30, 20, 0.85)";
  ctx.fill();
  // Piedras del arco y enredaderas.
  ctx.strokeStyle = "rgba(20,20,30,0.45)";
  ctx.lineWidth = 1.2;
  for (const [x1, y1, x2, y2] of [[-6, y - 4, 10, y - 4], [34, y - 4, 50, y - 4], [-6, y + 22, 10, y + 22], [34, y + 22, 50, y + 22], [8, y - 46, 14, y - 36], [36, y - 46, 30, y - 36]] as const) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.strokeStyle = "#3f8f4f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, y - 22);
  ctx.quadraticCurveTo(40, y - 8, 46, y + 10);
  ctx.stroke();
  ctx.restore();
}

/** Agua del mapa (río o lago), con orillas y brillos. */
function waterBodies(ctx: Ctx): void {
  for (const w of M.water) {
    ctx.save();
    ctx.beginPath();
    if (w.kind === "rect") ctx.roundRect(w.x, w.y, w.w, w.h, 24);
    else ctx.ellipse(w.x, w.y, w.w, w.h, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1c4e78";
    ctx.fill();
    ink(ctx, 3);
    ctx.clip();
    const g = ctx.createLinearGradient(0, w.kind === "rect" ? w.y : w.y - w.h, 0, w.kind === "rect" ? w.y + w.h : w.y + w.h);
    g.addColorStop(0, "#2f78a8");
    g.addColorStop(1, "#173f66");
    ctx.fillStyle = g;
    ctx.fillRect(w.kind === "rect" ? w.x : w.x - w.w, w.kind === "rect" ? w.y : w.y - w.h, w.kind === "rect" ? w.w : w.w * 2, w.kind === "rect" ? w.h : w.h * 2);
    // Ondas fijas.
    const rnd = seeded(w.x + w.y);
    ctx.strokeStyle = "rgba(190, 230, 255, 0.35)";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    const area = w.kind === "rect" ? w.w * w.h : Math.PI * w.w * w.h;
    for (let i = 0; i < Math.round(area / 1400); i++) {
      const x = w.kind === "rect" ? w.x + 8 + rnd() * (w.w - 16) : w.x + (rnd() * 2 - 1) * w.w * 0.85;
      const y = w.kind === "rect" ? w.y + 8 + rnd() * (w.h - 16) : w.y + (rnd() * 2 - 1) * w.h * 0.8;
      const len = 8 + rnd() * 12;
      ctx.beginPath();
      ctx.moveTo(x - len / 2, y);
      ctx.quadraticCurveTo(x, y - 3, x + len / 2, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Puentes de madera donde una ruta cruza el agua. */
function bridges(ctx: Ctx): void {
  if (M.water.length === 0) return;
  const inside = (p: Point) => M.water.some((w) => (w.kind === "rect" ? p.x >= w.x - 10 && p.x <= w.x + w.w + 10 && p.y >= w.y && p.y <= w.y + w.h : ((p.x - w.x) / (w.w + 10)) ** 2 + ((p.y - w.y) / (w.h + 10)) ** 2 <= 1));
  const drawn: Point[] = [];
  for (const route of M.routes) {
    const pts = along(route, 4).filter(inside);
    if (pts.length < 2) continue;
    const mid = pts[Math.floor(pts.length / 2)];
    if (drawn.some((q) => Math.hypot(q.x - mid.x, q.y - mid.y) < 30)) continue;
    drawn.push(mid);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const a = { x: first.x - first.tx * 12, y: first.y - first.ty * 12 };
    const b = { x: last.x + last.tx * 12, y: last.y + last.ty * 12 };
    ctx.save();
    ctx.lineCap = "butt";
    for (const [color, width] of [[INK, 56], ["#6f4a2a", 50], ["#b98b52", 42]] as const) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    // Tablones.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const tx = dx / len;
    const ty = dy / len;
    ctx.strokeStyle = "rgba(60, 35, 15, 0.55)";
    ctx.lineWidth = 1.6;
    for (let d = 4; d < len; d += 9) {
      ctx.beginPath();
      ctx.moveTo(a.x + tx * d - ty * 20, a.y + ty * d + tx * 20);
      ctx.lineTo(a.x + tx * d + ty * 20, a.y + ty * d - tx * 20);
      ctx.stroke();
    }
    // Barandas.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a.x - ty * 24 * side, a.y + tx * 24 * side);
      ctx.lineTo(b.x - ty * 24 * side, b.y + tx * 24 * side);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = "#d9a96a";
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Geometría de la escuela respecto de la entrada (donde termina el camino). */
/** La escuela se corre a la izquierda para que quepa entera en el campo. */
const SCHOOL_SHIFT = -75;

function schoolBox(): { bx: number; w: number; top: number; base: number } {
  return { bx: M.camp.x - 45, w: 150, top: M.camp.y - 112, base: M.camp.y + 4 };
}

/** La escuela: edificio con tejado, ventanas, reloj y puerta; patio con columpio, pizarrón y cartel. */
function camp(ctx: Ctx): void {
  const { x, y } = M.camp;
  const { bx, w, top, base } = schoolBox();
  // Sombra larga del edificio.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(bx + w / 2 + 10, base + 8, w * 0.62, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pared.
  ctx.beginPath();
  ctx.rect(bx, top, w, base - top);
  const wall = ctx.createLinearGradient(bx, 0, bx + w, 0);
  wall.addColorStop(0, "#f2e4bd");
  wall.addColorStop(1, "#d6c392");
  ctx.fillStyle = wall;
  ctx.fill();
  ink(ctx, 1.8);
  // Zócalo de ladrillos.
  ctx.beginPath();
  ctx.rect(bx, base - 20, w, 20);
  ctx.fillStyle = "#b86b4a";
  ctx.fill();
  ink(ctx, 1.4);
  ctx.strokeStyle = "rgba(60,25,15,0.45)";
  ctx.lineWidth = 1;
  for (let row = 0; row < 2; row++) {
    ctx.beginPath();
    ctx.moveTo(bx, base - 20 + row * 10 + 10);
    ctx.lineTo(bx + w, base - 20 + row * 10 + 10);
    for (let c = 0; c < w; c += 14) {
      ctx.moveTo(bx + c + (row % 2) * 7, base - 20 + row * 10);
      ctx.lineTo(bx + c + (row % 2) * 7, base - 20 + row * 10 + 10);
    }
    ctx.stroke();
  }
  // Techo.
  ctx.beginPath();
  ctx.moveTo(bx - 10, top + 2);
  ctx.lineTo(bx + w + 10, top + 2);
  ctx.lineTo(bx + w - 8, top - 36);
  ctx.lineTo(bx + 14, top - 36);
  ctx.closePath();
  const roof = ctx.createLinearGradient(0, top - 36, 0, top + 2);
  roof.addColorStop(0, "#c44f43");
  roof.addColorStop(1, "#8f3028");
  ctx.fillStyle = roof;
  ctx.fill();
  ink(ctx, 1.8);
  ctx.strokeStyle = "rgba(60,15,10,0.4)";
  ctx.lineWidth = 1.2;
  for (let r = 1; r < 3; r++) {
    ctx.beginPath();
    ctx.moveTo(bx - 10 + r * 6, top + 2 - r * 12);
    ctx.lineTo(bx + w + 10 - r * 6, top + 2 - r * 12);
    ctx.stroke();
  }
  // Puerta de madera con arco, escalones y luz cálida.
  const dx = x + 48;
  const dw = 38;
  const dt = base - 62;
  ctx.beginPath();
  ctx.moveTo(dx, base);
  ctx.lineTo(dx, dt + 14);
  ctx.quadraticCurveTo(dx, dt, dx + dw / 2, dt);
  ctx.quadraticCurveTo(dx + dw, dt, dx + dw, dt + 14);
  ctx.lineTo(dx + dw, base);
  ctx.closePath();
  const door = ctx.createLinearGradient(dx, 0, dx + dw, 0);
  door.addColorStop(0, "#8a5a33");
  door.addColorStop(1, "#5e3718");
  ctx.fillStyle = door;
  ctx.fill();
  ink(ctx, 1.8);
  ctx.beginPath();
  ctx.moveTo(dx + dw / 2, dt + 2);
  ctx.lineTo(dx + dw / 2, base);
  ctx.strokeStyle = "rgba(30,15,5,0.6)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#ffd54a";
  ctx.beginPath();
  ctx.arc(dx + dw / 2 - 5, base - 26, 1.8, 0, Math.PI * 2);
  ctx.arc(dx + dw / 2 + 5, base - 26, 1.8, 0, Math.PI * 2);
  ctx.fill();
  for (const [sx, sw, sy] of [[dx - 6, dw + 12, base], [dx - 12, dw + 24, base + 6]] as const) {
    ctx.beginPath();
    ctx.rect(sx, sy, sw, 6);
    ctx.fillStyle = "#b8b4a8";
    ctx.fill();
    ink(ctx, 1.2);
  }
  // Reloj sobre la puerta.
  const cxk = dx + dw / 2;
  const cyk = top + 26;
  ctx.beginPath();
  ctx.arc(cxk, cyk, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#fffbe8";
  ctx.fill();
  ink(ctx, 1.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cxk, cyk);
  ctx.lineTo(cxk, cyk - 7);
  ctx.moveTo(cxk, cyk);
  ctx.lineTo(cxk + 5, cyk + 2);
  ctx.stroke();
  // Marcos de las ventanas (la luz y las siluetas se dibujan animadas).
  for (const [wx, wy] of windows()) {
    ctx.beginPath();
    ctx.rect(wx - 2, wy - 2, 28, 32);
    ctx.fillStyle = "#6b4a2b";
    ctx.fill();
    ink(ctx, 1.4);
  }
  // Cartel de la escuela.
  const sx = x + 8;
  const sy = y + 30;
  ctx.fillStyle = "#6e421f";
  ctx.fillRect(sx - 2, sy, 4, 24);
  ctx.beginPath();
  ctx.roundRect(sx - 30, sy - 14, 60, 18, 4);
  ctx.fillStyle = "#2f6fe4";
  ctx.fill();
  ink(ctx, 1.4);
  ctx.font = "900 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("ESCUELA", sx, sy - 1.5);
  // Columpio en el patio.
  const wx = x + 80;
  const wy = y + 64;
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  for (const [lw, col] of [[7, INK], [4, "#d9a96a"]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(wx - 24, wy + 8);
    ctx.lineTo(wx - 12, wy - 30);
    ctx.lineTo(wx + 12, wy - 30);
    ctx.lineTo(wx + 24, wy + 8);
    ctx.stroke();
  }
  ctx.strokeStyle = "#3a3a4e";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(wx - 6, wy - 30);
  ctx.lineTo(wx - 6, wy - 4);
  ctx.moveTo(wx + 6, wy - 30);
  ctx.lineTo(wx + 6, wy - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(wx - 9, wy - 4, 18, 4, 2);
  ctx.fillStyle = "#ef6c4d";
  ctx.fill();
  ink(ctx, 1.1);
  // Pizarrón en un caballete, con la Cruz del Sur dibujada con tiza.
  const px = x - 130;
  const py = y - 70;
  ctx.strokeStyle = INK;
  for (const [lw, col] of [[6, INK], [3.4, "#a9794a"]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(px - 24, py + 38);
    ctx.lineTo(px - 14, py);
    ctx.moveTo(px + 24, py + 38);
    ctx.lineTo(px + 14, py);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(px - 30, py - 30, 60, 38, 4);
  ctx.fillStyle = "#1f4a3a";
  ctx.fill();
  ctx.strokeStyle = "#a9794a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ink(ctx, 1.2);
  ctx.fillStyle = "#f4f6ff";
  for (const [cx2, cy2, r] of [[px, py - 22, 1.8], [px - 8, py - 8, 1.6], [px + 7, py - 14, 1.5], [px + 12, py - 24, 1.4]] as const) {
    ctx.beginPath();
    ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(244,246,255,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py - 22);
  ctx.lineTo(px - 8, py - 8);
  ctx.moveTo(px + 12, py - 24);
  ctx.lineTo(px - 8, py - 8);
  ctx.stroke();
}

/** Posición (esquina superior izquierda) de las cuatro ventanas de la escuela que se ven. */
function windows(): [number, number][] {
  const { bx, top } = schoolBox();
  return [
    [bx + 10, top + 10],
    [bx + 10, top + 52]
  ];
}

/** Dibuja la parte fija del escenario en un lienzo aparte (con la densidad de píxeles indicada). */
export interface BackgroundLayers {
  /** Cielo fijo (degradado y luna), debajo de las estrellas que giran. */
  sky: HTMLCanvasElement;
  /** Paisaje: horizonte, césped, camino y campamento, por encima de las estrellas. */
  ground: HTMLCanvasElement;
}

function layer(dpr: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = FIELD.width * dpr;
  c.height = FIELD.height * dpr;
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return [c, ctx];
}

/** Dibuja las partes fijas del escenario una sola vez (con la densidad de píxeles indicada). */
/** Tinte del césped según el paisaje de cada noche. */
const TINT: Record<MapTheme, string> = {
  campamento: "rgba(0,0,0,0)",
  bosque: "rgba(8,70,40,0.28)",
  rio: "rgba(20,100,130,0.16)",
  colina: "rgba(150,120,40,0.2)",
  lago: "rgba(40,70,140,0.2)"
};

interface Spot {
  x: number;
  y: number;
  s: number;
}

interface Mound extends Spot {
  ry: number;
}

interface Decorations {
  bushes: Spot[];
  rocks: Spot[];
  pines: Spot[];
  oaks: Spot[];
  dead: Spot[];
  logs: Spot[];
  mushrooms: Spot[];
  reeds: Spot[];
  ruins: Spot[];
  flowers: Spot[];
  mounds: Mound[];
}

type DecorKind = keyof Decorations;

/** Cantidad de adornos de cada tipo según el paisaje. */
const DECOR: Record<MapTheme, Partial<Record<DecorKind, number>>> = {
  bosque: { bushes: 6, rocks: 3, pines: 14, oaks: 5, dead: 3, logs: 3, mushrooms: 6, flowers: 4, mounds: 4 },
  rio: { bushes: 8, rocks: 7, pines: 4, oaks: 5, logs: 2, mushrooms: 3, reeds: 10, flowers: 8, mounds: 3 },
  colina: { bushes: 4, rocks: 14, pines: 4, oaks: 2, dead: 4, ruins: 3, flowers: 5, mounds: 7 },
  lago: { bushes: 6, rocks: 6, pines: 6, oaks: 3, dead: 2, logs: 2, reeds: 12, flowers: 5, mounds: 3 },
  campamento: { bushes: 6, rocks: 5, pines: 8, oaks: 4, logs: 2, mushrooms: 4, flowers: 6, mounds: 3 }
};

/** Tamaño de cada tipo de adorno: [mínimo, máximo]. */
const SIZE: Record<DecorKind, [number, number]> = {
  bushes: [14, 26],
  rocks: [5, 9],
  pines: [44, 66],
  oaks: [46, 62],
  dead: [30, 40],
  logs: [16, 22],
  mushrooms: [6, 9],
  reeds: [14, 20],
  ruins: [22, 30],
  flowers: [8, 12],
  mounds: [40, 80]
};

const EMPTY: Decorations = { bushes: [], rocks: [], pines: [], oaks: [], dead: [], logs: [], mushrooms: [], reeds: [], ruins: [], flowers: [], mounds: [] };

/** Adornos del mapa: los del mapa clásico son fijos; los demás se reparten sin tocar las rutas, el agua ni los lugares. */
function decorFor(map: BattleMap): Decorations {
  if (map.id === "clasico") {
    const spots = (list: [number, number, number][]): Spot[] => list.map(([x, y, s]) => ({ x, y, s }));
    return {
      ...EMPTY,
      bushes: spots([[40, 450, 22], [110, 630, 26], [300, 655, 18], [640, 655, 22], [610, 355, 16], [930, 330, 18], [180, 540, 16]]),
      rocks: spots([[70, 350, 7], [205, 620, 6], [585, 400, 6], [740, 630, 8], [860, 620, 6], [430, 320, 5]]),
      pines: spots([[34, 570, 46], [72, 400, 38], [720, 590, 44], [590, 630, 34], [860, 670, 40], [650, 325, 30]])
    };
  }
  const rnd = seeded(map.id.length * 97 + 5);
  const taken: Point[] = [...map.slots, map.camp];
  const out: Decorations = { bushes: [], rocks: [], pines: [], oaks: [], dead: [], logs: [], mushrooms: [], reeds: [], ruins: [], flowers: [], mounds: [] };
  const px = () => 20 + rnd() * (FIELD.width - 40);
  const py = () => HORIZON + 34 + rnd() * (FIELD.height - HORIZON - 44);
  const order: DecorKind[] = ["mounds", "pines", "oaks", "dead", "ruins", "logs", "bushes", "rocks", "mushrooms", "reeds", "flowers"];
  for (const kind of order.filter((k) => (DECOR[map.theme][k] ?? 0) > 0)) {
    const n = DECOR[map.theme][kind] ?? 0;
    const [lo, hi] = SIZE[kind];
    let tries = 0;
    while (out[kind].length < n && tries++ < 600) {
      const size = lo + rnd() * (hi - lo);
      let p: Point = { x: px(), y: py() };
      if (kind === "reeds") {
        // Las cañas crecen en la orilla.
        if (map.water.length === 0) break;
        if (!inWater(p, map.water, 34) || inWater(p, map.water, 4)) continue;
      }
      const tall = kind === "pines" || kind === "oaks" || kind === "dead";
      const reach = kind === "flowers" || kind === "mushrooms" ? 8 : tall ? size * 0.3 : kind === "mounds" ? size * 0.35 : size * 0.7;
      if (distToPath(p) < 42 + reach) continue;
      if (kind !== "reeds" && inWater(p, map.water, 14 + reach)) continue;
      const gap = kind === "flowers" || kind === "mushrooms" ? 30 : tall ? 30 + size * 0.55 : kind === "mounds" ? 30 + size * 0.7 : 44 + size * 0.5;
      if (taken.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < gap)) continue;
      if (kind === "mounds") out.mounds.push({ x: p.x, y: p.y, s: size, ry: size * (0.45 + rnd() * 0.15) });
      else out[kind].push({ x: p.x, y: p.y, s: size });
      taken.push(p);
    }
  }
  return out;
}

// ---------------- Relieve, texturas y luz ----------------

/** Sombra suave bajo un adorno (la luz de la luna viene de arriba a la izquierda). */
function shadow(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.35, y + 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Loma con volumen: luz arriba a la izquierda, sombra abajo a la derecha. */
function mound(ctx: Ctx, m: Mound, theme: MapTheme): void {
  const rx = m.s;
  const rocky = theme === "colina";
  shadow(ctx, m.x + 6, m.y + m.ry * 0.7, rx * 1.05, m.ry * 0.45);
  const g = ctx.createRadialGradient(m.x - rx * 0.35, m.y - m.ry * 0.55, 4, m.x, m.y, rx * 1.05);
  g.addColorStop(0, rocky ? "#6f7a52" : "#3f7d57");
  g.addColorStop(0.55, rocky ? "#4d5a3c" : "#2a5f42");
  g.addColorStop(1, rocky ? "#2e3827" : "#173a2b");
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, rx, m.ry, 0, Math.PI, 0);
  ctx.quadraticCurveTo(m.x + rx * 1.02, m.y + m.ry * 0.5, m.x + rx * 0.9, m.y + m.ry * 0.55);
  ctx.lineTo(m.x - rx * 0.9, m.y + m.ry * 0.55);
  ctx.quadraticCurveTo(m.x - rx * 1.02, m.y + m.ry * 0.5, m.x - rx, m.y);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.4);
  // Brillo en el borde de arriba a la izquierda.
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, rx * 0.88, m.ry * 0.86, 0, Math.PI * 1.08, Math.PI * 1.62);
  ctx.strokeStyle = "rgba(220,255,220,0.28)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.stroke();
  // Pasto sobre la loma.
  const rnd = seeded(Math.round(m.x * 7 + m.y));
  ctx.strokeStyle = "rgba(120,190,120,0.5)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const tx = m.x + (rnd() - 0.5) * rx * 1.3;
    const ty = m.y + (rnd() * 0.5 - 0.1) * m.ry;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 1.5, ty - 5);
    ctx.moveTo(tx + 2, ty);
    ctx.lineTo(tx + 3.2, ty - 4);
    ctx.stroke();
  }
}

/** Manchas de tierra, arena, barro u hojas según el paisaje, y pasto más denso. */
function groundTexture(ctx: Ctx, map: BattleMap): void {
  const rnd = seeded(map.id.length * 31 + 3);
  const patch: Record<MapTheme, [string, number]> = {
    bosque: ["rgba(20, 50, 28, 0.35)", 16],
    rio: ["rgba(120, 100, 60, 0.22)", 12],
    colina: ["rgba(160, 135, 70, 0.24)", 18],
    lago: ["rgba(100, 110, 140, 0.18)", 12],
    campamento: ["rgba(130, 100, 60, 0.24)", 14]
  };
  const [color, count] = patch[map.theme];
  for (let i = 0; i < count; i++) {
    const p = { x: rnd() * FIELD.width, y: HORIZON + 20 + rnd() * (FIELD.height - HORIZON - 30) };
    if (distToPath(p) < 36 || inWater(p, map.water, 10)) continue;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 22 + rnd() * 34, 8 + rnd() * 14, rnd() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pasto alto en matas más densas.
  for (let i = 0; i < 90; i++) {
    const p = { x: rnd() * FIELD.width, y: HORIZON + 16 + rnd() * (FIELD.height - HORIZON - 20) };
    if (distToPath(p) < 34 || inWater(p, map.water, 8)) continue;
    ctx.strokeStyle = ["#356f48", "#2a5c3d", "#49875a"][Math.floor(rnd() * 3)];
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(p.x + k * 2.2, p.y);
      ctx.lineTo(p.x + k * 3.2, p.y - 5 - rnd() * 5);
    }
    ctx.stroke();
  }
}

function oak(ctx: Ctx, x: number, y: number, h: number): void {
  shadow(ctx, x, y, h * 0.5, h * 0.14);
  ctx.fillStyle = "#4a3120";
  ctx.fillRect(x - h * 0.07, y - h * 0.4, h * 0.14, h * 0.42);
  ink(ctx, 1.2);
  const lobes: [number, number, number][] = [[0, -0.72, 0.34], [-0.26, -0.55, 0.28], [0.26, -0.55, 0.28], [0, -0.48, 0.3]];
  for (const [dx, dy, r] of lobes) {
    const g = ctx.createRadialGradient(x + dx * h - r * h * 0.3, y + dy * h - r * h * 0.3, 2, x + dx * h, y + dy * h, r * h);
    g.addColorStop(0, "#58a46b");
    g.addColorStop(1, "#2f6e47");
    ctx.beginPath();
    ctx.arc(x + dx * h, y + dy * h, r * h, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ink(ctx, 1.3);
  }
}

function deadTree(ctx: Ctx, x: number, y: number, h: number): void {
  shadow(ctx, x, y, h * 0.3, h * 0.1);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  const branch = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    ctx.lineWidth = w + 2.4;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.lineWidth = w;
    ctx.strokeStyle = "#6b5a4a";
    ctx.stroke();
  };
  branch(x, y, x + 1, y - h * 0.7, 5);
  branch(x + 1, y - h * 0.45, x - h * 0.3, y - h * 0.75, 3);
  branch(x + 1, y - h * 0.55, x + h * 0.32, y - h * 0.82, 3);
  branch(x + 1, y - h * 0.7, x - h * 0.1, y - h, 2.4);
}

function log(ctx: Ctx, x: number, y: number, r: number): void {
  shadow(ctx, x, y + 4, r * 1.7, r * 0.45);
  ctx.beginPath();
  ctx.roundRect(x - r * 1.5, y - r * 0.55, r * 3, r * 1.1, r * 0.5);
  ctx.fillStyle = "#7a4d28";
  ctx.fill();
  ink(ctx, 1.4);
  ctx.beginPath();
  ctx.ellipse(x + r * 1.5, y, r * 0.4, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#d1a06a";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.beginPath();
  ctx.ellipse(x + r * 1.5, y, r * 0.18, r * 0.28, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(90,50,20,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function mushrooms(ctx: Ctx, x: number, y: number, r: number, theme: MapTheme): void {
  const glowy = theme === "bosque" || theme === "lago";
  for (const [dx, dy, k] of [[0, 0, 1], [r * 1.5, 2, 0.7], [-r * 1.2, 3, 0.6]] as const) {
    ctx.fillStyle = "#e7dcc4";
    ctx.fillRect(x + dx - 1.4 * k, y + dy - 4 * k, 2.8 * k, 5 * k);
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy - 4 * k, r * k, r * 0.7 * k, 0, Math.PI, 0);
    ctx.fillStyle = glowy ? "#7fd3ff" : "#d6453d";
    ctx.fill();
    ink(ctx, 1);
    ctx.fillStyle = "#f8f4ea";
    ctx.beginPath();
    ctx.arc(x + dx - r * 0.3 * k, y + dy - 6 * k, 1 * k, 0, Math.PI * 2);
    ctx.arc(x + dx + r * 0.35 * k, y + dy - 5.2 * k, 0.8 * k, 0, Math.PI * 2);
    ctx.fill();
  }
}

function reeds(ctx: Ctx, x: number, y: number, h: number): void {
  for (let i = -2; i <= 2; i++) {
    const bx = x + i * 3.4;
    const top = y - h * (0.7 + ((i + 5) % 3) * 0.15);
    ctx.strokeStyle = "#3f7a4c";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + i * 1.4, y - h * 0.5, bx + i * 2, top);
    ctx.stroke();
    ctx.fillStyle = "#6b4a2b";
    ctx.beginPath();
    ctx.ellipse(bx + i * 2, top - 2, 1.8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, 0.8);
  }
}

function ruin(ctx: Ctx, x: number, y: number, s: number): void {
  shadow(ctx, x, y, s * 0.8, s * 0.22);
  ctx.beginPath();
  ctx.roundRect(x - s * 0.7, y - s * 0.12, s * 1.4, s * 0.3, 4);
  ctx.fillStyle = "#8c8f9c";
  ctx.fill();
  ink(ctx, 1.4);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.1);
  ctx.lineTo(x - s * 0.3, y - s * 1.0);
  ctx.lineTo(x - s * 0.05, y - s * 1.12);
  ctx.lineTo(x + s * 0.12, y - s * 0.86);
  ctx.lineTo(x + s * 0.3, y - s * 0.95);
  ctx.lineTo(x + s * 0.3, y - s * 0.1);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0);
  g.addColorStop(0, "#b8bbc8");
  g.addColorStop(1, "#6f7384");
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.4);
  ctx.strokeStyle = "rgba(30,34,52,0.5)";
  ctx.lineWidth = 1;
  for (const k of [0.3, 0.55, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * k);
    ctx.lineTo(x + s * 0.3, y - s * k);
    ctx.stroke();
  }
}

function flowers(ctx: Ctx, x: number, y: number, r: number, theme: MapTheme): void {
  const colors = theme === "colina" ? ["#ffd54a", "#ffb870", "#fff3b0"] : theme === "lago" ? ["#9be7ff", "#cdb4ff", "#f4f6ff"] : ["#ff8fab", "#ffd54a", "#f4f6ff", "#9be7ff"];
  const rnd = seeded(Math.round(x * 3 + y));
  for (let i = 0; i < 6; i++) {
    const fx = x + (rnd() - 0.5) * r * 2.4;
    const fy = y + (rnd() - 0.5) * r;
    ctx.strokeStyle = "#2f6443";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - 4);
    ctx.stroke();
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(fx, fy - 5, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Luz de la luna sobre el suelo y borde oscuro del campo. */
function lighting(ctx: Ctx): void {
  const moon = ctx.createRadialGradient(86, 56, 20, 86, 56, 620);
  moon.addColorStop(0, "rgba(200, 225, 255, 0.13)");
  moon.addColorStop(1, "rgba(200, 225, 255, 0)");
  ctx.fillStyle = moon;
  ctx.fillRect(0, HORIZON, FIELD.width, FIELD.height - HORIZON);
  const v = ctx.createRadialGradient(FIELD.width / 2, FIELD.height * 0.62, 240, FIELD.width / 2, FIELD.height * 0.62, 700);
  v.addColorStop(0, "rgba(0,0,12,0)");
  v.addColorStop(1, "rgba(0,0,12,0.38)");
  ctx.fillStyle = v;
  ctx.fillRect(0, HORIZON, FIELD.width, FIELD.height - HORIZON);
}

/** Cosas del escenario que se mueven en cada cuadro (se arman al dibujar el fondo). */
interface Alive {
  trees: { x: number; y: number; h: number; kind: "pine" | "oak"; phase: number }[];
  tufts: { x: number; y: number; phase: number }[];
  perch: Point | null;
}
let A: Alive = { trees: [], tufts: [], perch: null };

/** Dibuja las partes fijas del escenario una sola vez (con la densidad de píxeles indicada). */
export function buildBackground(dpr: number, map: BattleMap = MAP_CLASICO): BackgroundLayers {
  M = map;
  const [skyCanvas, skyCtx] = layer(dpr);
  sky(skyCtx);
  const [c, ctx] = layer(dpr);
  horizonLandscape(ctx);
  lawn(ctx);
  ctx.fillStyle = TINT[map.theme];
  ctx.fillRect(0, HORIZON, FIELD.width, FIELD.height - HORIZON);
  if (map.id !== "clasico") groundTexture(ctx, map);
  const decor = decorFor(map);
  for (const m of decor.mounds) mound(ctx, m, map.theme);
  waterBodies(ctx);
  for (const f of decor.flowers) flowers(ctx, f.x, f.y, f.s, map.theme);
  for (const r of decor.reeds) reeds(ctx, r.x, r.y, r.s);
  for (const m of decor.mushrooms) mushrooms(ctx, m.x, m.y, m.s, map.theme);
  for (const b of decor.bushes) bush(ctx, b.x, b.y, b.s);
  for (const r of decor.rocks) rock(ctx, r.x, r.y, r.s);
  for (const l of decor.logs) log(ctx, l.x, l.y, l.s * 0.5);
  for (const d of decor.dead) deadTree(ctx, d.x, d.y, d.s);
  for (const u of decor.ruins) ruin(ctx, u.x, u.y, u.s);
  path(ctx);
  bridges(ctx);
  arrows(ctx);
  if (map.id !== "clasico") portal(ctx);
  ctx.save();
  ctx.translate(SCHOOL_SHIFT, 0);
  camp(ctx);
  ctx.restore();
  lighting(ctx);

  // Los árboles se dibujan en cada cuadro para que se mezan con el viento.
  const trees = [
    ...decor.pines.map((p) => ({ x: p.x, y: p.y, h: p.s, kind: "pine" as const })),
    ...decor.oaks.map((p) => ({ x: p.x, y: p.y, h: p.s, kind: "oak" as const }))
  ];
  const rnd = seeded(map.id.length * 13 + 1);
  const tufts: Alive["tufts"] = [];
  for (let i = 0; i < 40; i++) {
    const p = { x: rnd() * FIELD.width, y: HORIZON + 40 + rnd() * (FIELD.height - HORIZON - 50) };
    if (distToPath(p) < 36 || inWater(p, map.water, 8)) continue;
    tufts.push({ x: p.x, y: p.y, phase: rnd() * 6 });
  }
  const perch = decor.pines.length ? decor.pines.reduce((a, b) => (a.y < b.y ? a : b)) : null;
  A = {
    trees: trees.map((t, i) => ({ ...t, phase: i * 1.3 })),
    tufts,
    perch: perch ? { x: perch.x, y: perch.y - perch.s * 0.82 } : null
  };
  return { sky: skyCanvas, ground: c };
}

// ---------------- Partes animadas ----------------

const MORE_FIREFLIES = Array.from({ length: 18 }, (_, i) => ({ x: (i * 211 + 40) % FIELD.width, y: HORIZON + 40 + ((i * 131) % 380), p: i * 1.1 + 5 }));
const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({ x: (i * 173) % FIELD.width, y: HORIZON + 60 + ((i * 97) % 360), p: i * 0.7 }));

/** Fogata, farol, bandera y luciérnagas. `now` es el reloj del escenario (se detiene en las pausas). */
export function drawAnimatedScenery(ctx: Ctx, now: number): void {
  animatedNature(ctx, now);
  ctx.save();
  ctx.translate(SCHOOL_SHIFT, 0);
  animatedSchool(ctx, now);
  ctx.restore();
  // Luciérnagas.
  const flies = M.theme === "bosque" ? FIREFLIES.concat(MORE_FIREFLIES) : FIREFLIES;
  for (const f of flies) {
    const fx = f.x + Math.sin(now * 0.7 + f.p) * 18;
    const fy = f.y + Math.cos(now * 0.9 + f.p * 1.3) * 12;
    const a = 0.25 + 0.55 * Math.max(0, Math.sin(now * 2.2 + f.p * 3));
    const g = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, 7);
    g.addColorStop(0, `rgba(220,255,140,${a})`);
    g.addColorStop(1, "rgba(220,255,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}


// ---------------- Naturaleza que se mueve ----------------

/** Agua con ondas y reflejos de estrellas, árboles y pasto que se mecen, y animales. */
function animatedNature(ctx: Ctx, now: number): void {
  // Agua: reflejos de estrellas que titilan y ondas que se agrandan.
  for (const w of M.water) {
    ctx.save();
    ctx.beginPath();
    if (w.kind === "rect") ctx.roundRect(w.x, w.y, w.w, w.h, 24);
    else ctx.ellipse(w.x, w.y, w.w, w.h, 0, 0, Math.PI * 2);
    ctx.clip();
    const rnd = seeded(Math.round(w.x * 3 + w.y));
    const area = w.kind === "rect" ? w.w * w.h : Math.PI * w.w * w.h;
    for (let i = 0; i < Math.round(area / 2600); i++) {
      const x = w.kind === "rect" ? w.x + 6 + rnd() * (w.w - 12) : w.x + (rnd() * 2 - 1) * w.w * 0.9;
      const y = w.kind === "rect" ? w.y + 6 + rnd() * (w.h - 12) : w.y + (rnd() * 2 - 1) * w.h * 0.85;
      const tw = Math.max(0, Math.sin(now * 2.2 + i * 1.7));
      ctx.globalAlpha = tw * 0.9;
      starShape(ctx, x + Math.sin(now * 0.8 + i) * 2, y, 2.6 + tw * 1.6, 1, 4);
      ctx.fillStyle = "#e6f4ff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const t = (now * 0.35 + i / 3) % 1;
      const cx = w.kind === "rect" ? w.x + w.w * (0.3 + 0.4 * ((i * 0.37) % 1)) : w.x + (((i * 0.61) % 1) - 0.5) * w.w;
      const cy = w.kind === "rect" ? w.y + w.h * ((i * 0.31 + 0.2) % 1) : w.y + (((i * 0.43) % 1) - 0.5) * w.h;
      ctx.globalAlpha = (1 - t) * 0.5;
      ctx.strokeStyle = "#cfeaff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 4 + t * 20, 1.8 + t * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    fishJump(ctx, w, now);
  }
  // Pasto que se mece.
  ctx.lineCap = "round";
  for (const t of A.tufts) {
    const sway = Math.sin(now * 1.8 + t.phase) * 2.2;
    ctx.strokeStyle = "#4f9a64";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(t.x + k * 2.4, t.y);
      ctx.quadraticCurveTo(t.x + k * 3, t.y - 4, t.x + k * 3.6 + sway, t.y - 8);
    }
    ctx.stroke();
  }
  // Árboles que se mecen con el viento.
  for (const tree of A.trees) {
    const sway = Math.sin(now * 1.1 + tree.phase) * 0.03 + Math.sin(now * 2.3 + tree.phase * 2) * 0.012;
    ctx.save();
    ctx.translate(tree.x, tree.y);
    ctx.transform(1, 0, sway, 1, 0, 0);
    if (tree.kind === "pine") {
      shadow(ctx, 0, 0, tree.h * 0.4, tree.h * 0.12);
      pine(ctx, 0, 0, tree.h, "#2f6b45");
    } else oak(ctx, 0, 0, tree.h);
    ctx.restore();
  }
  // Búho en lo alto de un pino (solo en el bosque).
  if (M.theme === "bosque" && A.perch) owl(ctx, A.perch.x, A.perch.y, now);
}

function owl(ctx: Ctx, x: number, y: number, now: number): void {
  const blink = Math.sin(now * 0.7) > 0.96 ? 0.15 : 1;
  const turn = Math.sin(now * 0.4) * 1.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8a6c48";
  ctx.fill();
  ink(ctx, 1.2);
  for (const dx of [-2.6, 2.6]) {
    ctx.beginPath();
    ctx.ellipse(dx + turn * 0.4, -2, 2.4, 2.4 * blink, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fff3b0";
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(dx + turn * 0.7, -2, 0.9 * blink, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-1.2 + turn * 0.4, 0);
  ctx.lineTo(1.2 + turn * 0.4, 0);
  ctx.lineTo(turn * 0.4, 2.4);
  ctx.closePath();
  ctx.fillStyle = "#ffb870";
  ctx.fill();
  ctx.restore();
}

/** Pez que salta de vez en cuando. */
function fishJump(ctx: Ctx, w: { kind: "rect" | "ellipse"; x: number; y: number; w: number; h: number }, now: number): void {
  const period = 7.5;
  const t = (now + w.x * 0.013) % period;
  if (t > 0.9) return;
  const k = t / 0.9;
  const slot = Math.floor((now + w.x * 0.013) / period);
  const rnd = seeded(slot * 17 + Math.round(w.y));
  const cx = w.kind === "rect" ? w.x + 14 + rnd() * (w.w - 28) : w.x + (rnd() * 2 - 1) * w.w * 0.6;
  const cy = w.kind === "rect" ? w.y + 30 + rnd() * (w.h - 60) : w.y + (rnd() * 2 - 1) * w.h * 0.4;
  const x = cx + (k - 0.5) * 22;
  const y = cy - Math.sin(k * Math.PI) * 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5 + k * 1.1);
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 3.2, 0, 0, Math.PI * 2);
  ctx.moveTo(-7, 0);
  ctx.lineTo(-13, -3.5);
  ctx.lineTo(-13, 3.5);
  ctx.closePath();
  ctx.fillStyle = "#cfe9ff";
  ctx.fill();
  ink(ctx, 1);
  ctx.restore();
  if (k < 0.2 || k > 0.8) {
    const r = k < 0.2 ? k * 5 : (1 - k) * 5;
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "#e6f4ff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx + (k < 0.2 ? -11 : 11), cy + 2, 4 + r * 6, 1.6 + r * 2.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Clima de cada paisaje, por encima de todo: lluvia fina, niebla, viento con hojas y murciélagos. */
export function drawWeather(ctx: Ctx, now: number): void {
  switch (M.theme) {
    case "rio": {
      ctx.strokeStyle = "rgba(190, 225, 255, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const sx = (i * 97.3) % (FIELD.width + 80);
        const sy = HORIZON * 0.3 + ((now * 380 + i * 53.7) % (FIELD.height - HORIZON * 0.3 + 30));
        const x = sx - ((sy / FIELD.height) * 60);
        ctx.moveTo(x, sy);
        ctx.lineTo(x - 5, sy + 13);
      }
      ctx.stroke();
      break;
    }
    case "lago": {
      for (let i = 0; i < 5; i++) {
        const y = HORIZON + 60 + i * 95 + Math.sin(now * 0.3 + i) * 14;
        const x = ((now * (10 + i * 3) + i * 220) % (FIELD.width + 500)) - 300;
        const g = ctx.createLinearGradient(x, 0, x + 520, 0);
        g.addColorStop(0, "rgba(210,225,245,0)");
        g.addColorStop(0.5, "rgba(210,225,245,0.14)");
        g.addColorStop(1, "rgba(210,225,245,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + 260, y, 260, 34, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "colina": {
      // Viento: hojas que cruzan el campo.
      for (let i = 0; i < 12; i++) {
        const t = (now * (0.06 + (i % 4) * 0.02) + i * 0.083) % 1;
        const x = -30 + t * (FIELD.width + 60);
        const y = HORIZON + 40 + ((i * 71) % 380) + Math.sin(t * 9 + i) * 26;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 14 + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? "#c9a24a" : "#8fb35a";
        ctx.fill();
        ink(ctx, 0.8);
        ctx.restore();
      }
      // Un murciélago cruza el cielo de vez en cuando.
      const period = 16;
      const bt = (now % period) / 5;
      if (bt < 1) {
        const bx = -30 + bt * (FIELD.width + 60);
        const by = 120 + Math.sin(bt * 8) * 22;
        const flap = Math.sin(now * 18) * 5;
        ctx.fillStyle = "#0d1230";
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx - 8, by - 6 - flap, bx - 15, by + 1);
        ctx.quadraticCurveTo(bx - 8, by + 2, bx, by + 3);
        ctx.quadraticCurveTo(bx + 8, by + 2, bx + 15, by + 1);
        ctx.quadraticCurveTo(bx + 8, by - 6 - flap, bx, by);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
}


// ---------------- La escuela que se anima ----------------

/** Estado de ánimo de la escuela: se asusta cuando llega un zombi y celebra cuando se gana. */
const MOOD = { alarm: 0, cheer: 0 };

export function setSchoolMood(alarm: number, cheer: number): void {
  MOOD.alarm = alarm;
  MOOD.cheer = cheer;
}

/** Ventanas con luz y gente que se asoma, bandera, farol y el timbre visual. */
function animatedSchool(ctx: Ctx, now: number): void {
  const { x, y } = M.camp;
  const { bx, top } = schoolBox();
  // Ventanas encendidas con siluetas.
  windows().forEach(([wx, wy], i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, 24, 28);
    ctx.clip();
    const g = ctx.createLinearGradient(wx, wy, wx, wy + 28);
    g.addColorStop(0, "#ffe9a6");
    g.addColorStop(1, "#ffc861");
    ctx.fillStyle = g;
    ctx.fillRect(wx, wy, 24, 28);
    // Persona que se asoma: estudiante o docente.
    const teacher = i === 1;
    const panic = MOOD.alarm;
    const cheer = MOOD.cheer;
    const bob = Math.sin(now * (3 + i) + i * 2) * 1.6 + (panic > 0 ? Math.sin(now * 30 + i) * 3 * panic : 0) - cheer * Math.abs(Math.sin(now * 8 + i)) * 5;
    const hx = wx + 12 + Math.sin(now * 0.8 + i) * 2 * (1 - panic);
    const hy = wy + 20 + bob;
    ctx.fillStyle = teacher ? "#4f6fb5" : "#e0675a";
    ctx.beginPath();
    ctx.ellipse(hx, hy + 12, 9, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#f1c9a0";
    ctx.beginPath();
    ctx.arc(hx, hy, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = teacher ? "#6b6b7a" : "#3b2a1e";
    ctx.beginPath();
    ctx.arc(hx, hy - 2.4, 5.6, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(hx - 2, hy - 0.4, 0.9, 0, Math.PI * 2);
    ctx.arc(hx + 2, hy - 0.4, 0.9, 0, Math.PI * 2);
    ctx.fill();
    if (panic > 0.1) {
      ctx.beginPath();
      ctx.ellipse(hx, hy + 2.6, 1.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(hx, hy + 1.6, 2, 0.2, Math.PI - 0.2);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    if (cheer > 0.1) {
      ctx.strokeStyle = teacher ? "#4f6fb5" : "#e0675a";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - 7, hy + 10);
      ctx.lineTo(hx - 10, hy - 3 - Math.sin(now * 9) * 3);
      ctx.moveTo(hx + 7, hy + 10);
      ctx.lineTo(hx + 10, hy - 3 - Math.sin(now * 9 + 1) * 3);
      ctx.stroke();
    }
    ctx.restore();
    // Brillo cálido alrededor de la ventana.
    const gl = ctx.createRadialGradient(wx + 12, wy + 14, 6, wx + 12, wy + 14, 46);
    gl.addColorStop(0, `rgba(255,220,130,${0.28 + MOOD.alarm * 0.2 * Math.abs(Math.sin(now * 14))})`);
    gl.addColorStop(1, "rgba(255,220,130,0)");
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(wx + 12, wy + 14, 46, 0, Math.PI * 2);
    ctx.fill();
    // Cruz de la ventana.
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx + 12, wy);
    ctx.lineTo(wx + 12, wy + 28);
    ctx.moveTo(wx, wy + 14);
    ctx.lineTo(wx + 24, wy + 14);
    ctx.stroke();
  });
  // La escuela tiembla un poquito cuando algo la golpea.
  if (MOOD.alarm > 0.05) {
    ctx.fillStyle = `rgba(255,80,60,${0.18 * MOOD.alarm})`;
    ctx.fillRect(bx, top - 36, 150, 150);
  }
  // Bandera con la Cruz del Sur sobre el techo.
  const pole = { x: bx + 24, y: top - 30 };
  ctx.beginPath();
  ctx.rect(pole.x - 1.5, pole.y - 56, 3, 56);
  ctx.fillStyle = "#dfe6ff";
  ctx.fill();
  ink(ctx, 1);
  ctx.beginPath();
  const fw = 30;
  const fh = 20;
  const ftop = pole.y - 54;
  ctx.moveTo(pole.x, ftop);
  for (let i = 0; i <= 6; i++) ctx.lineTo(pole.x + (fw * i) / 6, ftop + Math.sin(now * 5 + i * 0.9) * 2 * (i / 6));
  for (let i = 6; i >= 0; i--) ctx.lineTo(pole.x + (fw * i) / 6, ftop + fh + Math.sin(now * 5 + i * 0.9) * 2 * (i / 6));
  ctx.closePath();
  ctx.fillStyle = "#1d4fb8";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.fillStyle = "#fff";
  for (const [dx, dy, r] of [[14, 4, 1.4], [12, 16, 1.8], [19, 10, 1.3], [8, 9, 1.3]] as const) {
    ctx.beginPath();
    ctx.arc(pole.x + dx, ftop + dy + Math.sin(now * 5 + 3) * 0.8, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Farol del patio.
  const lamp = { x: x - 40, y: y - 6 };
  ctx.beginPath();
  ctx.rect(lamp.x - 2, lamp.y, 4, 40);
  ctx.fillStyle = "#6e421f";
  ctx.fill();
  ink(ctx, 1);
  const lg = ctx.createRadialGradient(lamp.x, lamp.y - 6, 1, lamp.x, lamp.y - 6, 40);
  lg.addColorStop(0, `rgba(255,225,130,${0.5 + Math.sin(now * 5) * 0.08})`);
  lg.addColorStop(1, "rgba(255,225,130,0)");
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(lamp.x, lamp.y - 6, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(lamp.x - 5, lamp.y - 13, 10, 12);
  ctx.fillStyle = "#fff3b0";
  ctx.fill();
  ink(ctx, 1);
  ctx.beginPath();
  ctx.moveTo(lamp.x - 7, lamp.y - 13);
  ctx.lineTo(lamp.x, lamp.y - 19);
  ctx.lineTo(lamp.x + 7, lamp.y - 13);
  ctx.closePath();
  ctx.fillStyle = "#2b3a6b";
  ctx.fill();
  ink(ctx, 1.2);
  // Columpio que se mece.
  const sw = Math.sin(now * 1.6) * 0.18;
  const wx = x + 80;
  const wy = y + 64;
  ctx.save();
  ctx.translate(wx, wy - 30);
  ctx.rotate(sw);
  ctx.strokeStyle = "#3a3a4e";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-6, 26);
  ctx.moveTo(6, 0);
  ctx.lineTo(6, 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-9, 26, 18, 4, 2);
  ctx.fillStyle = "#ef6c4d";
  ctx.fill();
  ink(ctx, 1.1);
  ctx.restore();
}
