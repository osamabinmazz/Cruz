import { FIELD, SKY_HORIZON } from "../core/battle/data";
import { MAP_CLASICO, inWater, type BattleMap, type MapTheme } from "../core/battle/maps";
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

function tent(ctx: Ctx, x: number, y: number, s: number, color: string, dark: string): void {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(x + 3, y + s * 0.42, s * 1.15, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lona con dos caras.
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x - s, y + s * 0.4);
  ctx.lineTo(x + s, y + s * 0.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
  g.addColorStop(0, color);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.8);
  // Entrada abierta.
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.15);
  ctx.lineTo(x - s * 0.3, y + s * 0.4);
  ctx.lineTo(x + s * 0.3, y + s * 0.4);
  ctx.closePath();
  ctx.fillStyle = "#1b1426";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.15);
  ctx.quadraticCurveTo(x - s * 0.15, y + s * 0.1, x - s * 0.42, y + s * 0.4);
  ctx.lineTo(x - s * 0.3, y + s * 0.4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, 1);
  // Vientos y estacas.
  ctx.strokeStyle = "rgba(230,230,230,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x - s * 1.25, y + s * 0.45);
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 1.25, y + s * 0.45);
  ctx.stroke();
}

function fence(ctx: Ctx, x: number, y0: number, y1: number, gapTop: number, gapBottom: number): void {
  const post = (py: number) => {
    ctx.beginPath();
    ctx.moveTo(x - 4, py + 12);
    ctx.lineTo(x - 4, py - 6);
    ctx.lineTo(x, py - 11);
    ctx.lineTo(x + 4, py - 6);
    ctx.lineTo(x + 4, py + 12);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    g.addColorStop(0, "#c78a52");
    g.addColorStop(1, "#6e421f");
    ctx.fillStyle = g;
    ctx.fill();
    ink(ctx, 1.3);
  };
  for (const [a, b] of [[y0, gapTop], [gapBottom, y1]] as const) {
    for (let py = a; py <= b; py += 22) post(py);
  }
  // Arco de entrada.
  for (const py of [gapTop + 4, gapBottom - 4]) {
    ctx.beginPath();
    ctx.rect(x - 5, py - 22, 10, 36);
    ctx.fillStyle = "#8a5a33";
    ctx.fill();
    ink(ctx, 1.4);
  }
}

function sign(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = "#6e421f";
  ctx.fillRect(x - 2, y, 4, 22);
  ctx.beginPath();
  ctx.rect(x - 2, y, 4, 22);
  ink(ctx, 1);
  ctx.beginPath();
  ctx.moveTo(x - 48, y - 16);
  ctx.lineTo(x + 48, y - 16);
  ctx.lineTo(x + 48, y + 4);
  ctx.lineTo(x - 48, y + 4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - 16, 0, y + 4);
  g.addColorStop(0, "#c78a52");
  g.addColorStop(1, "#8a5a33");
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.6);
  ctx.fillStyle = "#fff3d6";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CAMPAMENTO", x, y - 5.5);
  ctx.textBaseline = "alphabetic";
}

function logBench(ctx: Ctx, x: number, y: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 5, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, y - 5, 0, y + 5);
  g.addColorStop(0, "#b77a44");
  g.addColorStop(1, "#6e421f");
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 1.3);
  ctx.beginPath();
  ctx.ellipse(x + 16, y, 2.5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#e0b27a";
  ctx.fill();
  ink(ctx, 1);
}

function camp(ctx: Ctx): void {
  const { x, y } = M.camp;
  tent(ctx, x + 16, y - 84, 21, "#ef8a6c", "#b5503a");
  tent(ctx, x + 16, y + 76, 19, "#5c9ee8", "#2f5fae");
  logBench(ctx, x + 18, y + 46);
  fence(ctx, x - 22, y - 106, y + 84, y - 44, y + 4);
  sign(ctx, x - 40, y + 102);
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
  colina: "rgba(150,120,40,0.18)",
  lago: "rgba(40,70,140,0.2)"
};

/** Cantidad de adornos por paisaje: [arbustos, piedras, pinos]. */
const DECOR: Record<MapTheme, [number, number, number]> = {
  campamento: [7, 6, 9],
  bosque: [6, 4, 18],
  rio: [9, 8, 6],
  colina: [5, 14, 5],
  lago: [10, 6, 7]
};

/** Adornos del mapa: los del campamento son fijos; los demás se reparten sin tocar el camino ni los lugares. */
function decorFor(map: BattleMap): { bushes: [number, number, number][]; rocks: [number, number, number][]; pines: [number, number, number][] } {
  if (map.id === "clasico") {
    return {
      bushes: [[40, 450, 22], [110, 630, 26], [300, 655, 18], [640, 655, 22], [610, 355, 16], [930, 330, 18], [180, 540, 16]],
      rocks: [[70, 350, 7], [205, 620, 6], [585, 400, 6], [740, 630, 8], [860, 620, 6], [430, 320, 5]],
      pines: [[34, 570, 46], [72, 400, 38], [720, 590, 44], [590, 630, 34], [860, 670, 40], [650, 325, 30]]
    };
  }
  const rnd = seeded(map.id.length * 97 + 5);
  const taken: Point[] = [...map.slots, map.camp];
  const place = (n: number, make: () => [number, number, number]): [number, number, number][] => {
    const out: [number, number, number][] = [];
    let tries = 0;
    while (out.length < n && tries++ < 400) {
      const d = make();
      const p = { x: d[0], y: d[1] };
      if (distToPath(p) < 48 + d[2]) continue;
      if (inWater(p, M.water, 20 + d[2])) continue;
      if (taken.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 62 + d[2])) continue;
      out.push(d);
      taken.push(p);
    }
    return out;
  };
  const [nb, nr, np] = DECOR[map.theme];
  const px = () => 20 + rnd() * (FIELD.width - 40);
  const py = () => HORIZON + 30 + rnd() * (FIELD.height - HORIZON - 40);
  return {
    bushes: place(nb, () => [px(), py(), 14 + rnd() * 12]),
    rocks: place(nr, () => [px(), py(), 5 + rnd() * 4]),
    pines: place(np, () => [px(), py(), 30 + rnd() * 18])
  };
}

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
  const decor = decorFor(map);
  for (const [px, py, r] of decor.bushes) bush(ctx, px, py, r);
  for (const [px, py, r] of decor.rocks) rock(ctx, px, py, r);
  for (const [px, py, h] of decor.pines) pine(ctx, px, py, h, "#2f6b45");
  waterBodies(ctx);
  path(ctx);
  bridges(ctx);
  arrows(ctx);
  if (map.id !== "clasico") portal(ctx);
  camp(ctx);
  return { sky: skyCanvas, ground: c };
}

// ---------------- Partes animadas ----------------

const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({ x: (i * 173) % FIELD.width, y: HORIZON + 60 + ((i * 97) % 360), p: i * 0.7 }));

/** Fogata, farol, bandera y luciérnagas. `now` es el reloj del escenario (se detiene en las pausas). */
export function drawAnimatedScenery(ctx: Ctx, now: number): void {
  const { x, y } = M.camp;
  // Fogata.
  const fire = { x: x + 22, y: y + 30 };
  const flick = 1 + Math.sin(now * 13) * 0.08 + Math.sin(now * 7.3) * 0.06;
  const glow = ctx.createRadialGradient(fire.x, fire.y - 6, 3, fire.x, fire.y - 6, 70 * flick);
  glow.addColorStop(0, "rgba(255,190,90,0.45)");
  glow.addColorStop(1, "rgba(255,190,90,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(fire.x, fire.y - 6, 70 * flick, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(fire.x + Math.cos(a) * 11, fire.y + 3 + Math.sin(a) * 4, 3.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#8d99ae";
    ctx.fill();
    ink(ctx, 1);
  }
  for (const rot of [-0.5, 0.5]) {
    ctx.save();
    ctx.translate(fire.x, fire.y + 1);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.rect(-10, -2.5, 20, 5);
    ctx.fillStyle = "#7a4a26";
    ctx.fill();
    ink(ctx, 1.1);
    ctx.restore();
  }
  const flame = (h: number, w: number, color: string, sway: number) => {
    ctx.beginPath();
    ctx.moveTo(fire.x - w, fire.y);
    ctx.quadraticCurveTo(fire.x - w * 1.1, fire.y - h * 0.5, fire.x + sway, fire.y - h);
    ctx.quadraticCurveTo(fire.x + w * 1.1, fire.y - h * 0.5, fire.x + w, fire.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  flame(22 * flick, 8, "#ff7a3d", Math.sin(now * 9) * 3);
  ink(ctx, 1.2);
  flame(15 * flick, 5.5, "#ffc53d", Math.sin(now * 11 + 1) * 2);
  flame(8 * flick, 3, "#fff3b0", Math.sin(now * 13 + 2) * 1.2);
  // Chispas que suben.
  for (let i = 0; i < 4; i++) {
    const t = (now * 0.8 + i * 0.25) % 1;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(fire.x + Math.sin(now * 3 + i * 2) * 6, fire.y - 20 - t * 34, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Farol en un poste.
  const lamp = { x: x - 36, y: y - 70 };
  ctx.beginPath();
  ctx.rect(lamp.x - 2, lamp.y, 4, 40);
  ctx.fillStyle = "#6e421f";
  ctx.fill();
  ink(ctx, 1);
  const lg = ctx.createRadialGradient(lamp.x, lamp.y - 6, 1, lamp.x, lamp.y - 6, 34);
  lg.addColorStop(0, `rgba(255,225,130,${0.5 + Math.sin(now * 5) * 0.08})`);
  lg.addColorStop(1, "rgba(255,225,130,0)");
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(lamp.x, lamp.y - 6, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(lamp.x - 5, lamp.y - 13, 10, 12);
  ctx.fillStyle = "#ffe08a";
  ctx.fill();
  ink(ctx, 1.3);
  ctx.beginPath();
  ctx.moveTo(lamp.x - 7, lamp.y - 13);
  ctx.lineTo(lamp.x, lamp.y - 19);
  ctx.lineTo(lamp.x + 7, lamp.y - 13);
  ctx.closePath();
  ctx.fillStyle = "#2b3a6b";
  ctx.fill();
  ink(ctx, 1.2);

  // Bandera con la Cruz del Sur que flamea.
  const pole = { x: x + 38, y: y + 4 };
  ctx.beginPath();
  ctx.rect(pole.x - 1.5, pole.y - 66, 3, 66);
  ctx.fillStyle = "#dfe6ff";
  ctx.fill();
  ink(ctx, 1);
  ctx.beginPath();
  const fw = 30;
  const fh = 20;
  const top = pole.y - 64;
  ctx.moveTo(pole.x, top);
  for (let i = 0; i <= 6; i++) {
    const fx = pole.x - (fw * i) / 6;
    ctx.lineTo(fx, top + Math.sin(now * 5 + i * 0.9) * 2 * (i / 6));
  }
  for (let i = 6; i >= 0; i--) {
    const fx = pole.x - (fw * i) / 6;
    ctx.lineTo(fx, top + fh + Math.sin(now * 5 + i * 0.9) * 2 * (i / 6));
  }
  ctx.closePath();
  ctx.fillStyle = "#1d4fb8";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.fillStyle = "#fff";
  for (const [dx, dy, r] of [[-14, 4, 1.4], [-12, 16, 1.8], [-19, 10, 1.3], [-8, 9, 1.3]] as const) {
    ctx.beginPath();
    ctx.arc(pole.x + dx, top + dy + Math.sin(now * 5 + 3) * 0.8, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Luciérnagas.
  for (const f of FIREFLIES) {
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
