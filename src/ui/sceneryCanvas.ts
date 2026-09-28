import { CAMP, FIELD, PATH } from "../core/battle/data";
import type { Point } from "../core/geometry";

/**
 * Escenario de la batalla en estilo de dibujo animado: cielo con colinas y
 * pinos, césped a cuadros, camino de tierra con piedras y un campamento con
 * cerco, carpas, fogata, farol y bandera. La parte fija se dibuja una sola vez
 * en un lienzo aparte; las partes animadas se dibujan en cada cuadro.
 */

type Ctx = CanvasRenderingContext2D;

const INK = "#141a33";
const HORIZON = 108;

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
  for (let i = 1; i < PATH.length; i++) {
    const a = PATH[i - 1];
    const b = PATH[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
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
  const moon = { x: 120, y: 40 };
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
  ctx.fillStyle = "#16245e";
  ctx.fill();
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
  for (let gy = 120; gy < FIELD.height; gy += cell) {
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

function path(ctx: Ctx): void {
  const trace = () => {
    ctx.beginPath();
    PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  };
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  trace();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 50;
  ctx.stroke();
  trace();
  ctx.strokeStyle = "#6b5236";
  ctx.lineWidth = 46;
  ctx.stroke();
  trace();
  ctx.strokeStyle = "#8a6c48";
  ctx.lineWidth = 36;
  ctx.stroke();
  // Huellas de carreta.
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(60,40,20,0.35)";
  ctx.lineWidth = 2;
  for (const off of [-9, 9]) {
    ctx.beginPath();
    PATH.forEach((p, i) => {
      const next = PATH[Math.min(i + 1, PATH.length - 1)];
      const prev = PATH[Math.max(i - 1, 0)];
      const vertical = Math.abs((next.x - prev.x)) < Math.abs(next.y - prev.y);
      const q = vertical ? { x: p.x + off, y: p.y } : { x: p.x, y: p.y + off };
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();
  }
  ctx.restore();
  // Piedritas en la tierra.
  const rnd = seeded(31);
  for (let i = 1; i < PATH.length; i++) {
    const a = PATH[i - 1];
    const b = PATH[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 10; d < len; d += 22 + rnd() * 20) {
      const t = d / len;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const side = rnd() < 0.5 ? -1 : 1;
      const off = (14 + rnd() * 8) * side;
      const x = a.x + (b.x - a.x) * t + nx * off;
      const y = a.y + (b.y - a.y) * t + ny * off;
      ctx.beginPath();
      ctx.ellipse(x, y, 2.5 + rnd() * 2, 1.8 + rnd() * 1.2, rnd() * 3, 0, Math.PI * 2);
      ctx.fillStyle = rnd() < 0.5 ? "#b39a78" : "#5e4a33";
      ctx.fill();
    }
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
  const { x, y } = CAMP;
  tent(ctx, x + 16, y - 84, 21, "#ef8a6c", "#b5503a");
  tent(ctx, x + 16, y + 76, 19, "#5c9ee8", "#2f5fae");
  logBench(ctx, x + 18, y + 46);
  fence(ctx, x - 22, y - 106, y + 84, y - 44, y + 4);
  sign(ctx, x - 40, y + 102);
}

/** Dibuja la parte fija del escenario en un lienzo aparte (con la densidad de píxeles indicada). */
export function buildBackground(dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = FIELD.width * dpr;
  c.height = FIELD.height * dpr;
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  sky(ctx);
  lawn(ctx);
  for (const [px, py, r] of [[40, 300, 22], [110, 480, 26], [300, 505, 18], [640, 505, 22], [760, 95, 0], [610, 205, 16], [930, 180, 18], [180, 390, 16]] as const) {
    if (r > 0) bush(ctx, px, py, r);
  }
  for (const [px, py, r] of [[70, 200, 7], [205, 470, 6], [585, 250, 6], [740, 480, 8], [860, 470, 6], [430, 170, 5]] as const) rock(ctx, px, py, r);
  for (const [px, py, h] of [[34, 420, 46], [72, 250, 38], [720, 440, 44], [590, 480, 34], [860, 520, 40], [650, 175, 30]] as const) pine(ctx, px, py, h, "#2f6b45");
  path(ctx);
  camp(ctx);
  return c;
}

// ---------------- Partes animadas ----------------

const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({ x: (i * 173) % FIELD.width, y: 150 + ((i * 97) % 360), p: i * 0.7 }));

/** Estrellas titilantes, Cruz del Sur en el cielo, fogata, farol, bandera y luciérnagas. */
export function drawAnimatedScenery(ctx: Ctx, now: number, stars: { x: number; y: number; r: number; tw: number }[]): void {
  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.45 * Math.sin(now * 1.5 + s.tw);
    ctx.fillStyle = "#dfe6ff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Pequeña Cruz del Sur, con Gacrux anaranjada.
  for (const [x, y, r, c] of [[860, 16, 2.2, "#ffb870"], [872, 62, 2.8, "#ffffff"], [848, 42, 2, "#ffffff"], [884, 36, 2, "#ffffff"]] as const) {
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(now * 2 + x);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const { x, y } = CAMP;
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
