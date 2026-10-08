import type { Guardian, Post } from "../core/battle/guardians";
import { SUMMON_COST } from "../core/battle/guardians";
import { starShape } from "./effectsCanvas";

/**
 * Dibujo de los puestos de guardianes y de las estrellitas que pelean en el
 * camino: estrellas con cara, capa azul, escudo y espada de luz.
 */

type Ctx = CanvasRenderingContext2D;

const INK = "#141a33";

function ink(ctx: Ctx, w = 1.6): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Puesto de guardianes: una tarima de madera con un estandarte y su nivel. */
export function drawPost(ctx: Ctx, post: Post, color: string, selected: boolean, now: number): void {
  const { x, y } = post;
  ctx.save();
  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, 170, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(143, 211, 255, 0.10)";
    ctx.fill();
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -now * 12;
    ctx.strokeStyle = "rgba(143, 211, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Tarima.
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 40, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#6b4a2b";
  ctx.fill();
  ink(ctx);
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 36, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#a9794a";
  ctx.fill();
  ink(ctx, 1.2);
  // Mástil y estandarte.
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 16);
  ctx.lineTo(x - 4, y - 44);
  ctx.strokeStyle = "#4a3120";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.stroke();
  const wave = Math.sin(now * 4) * 3;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 44);
  ctx.quadraticCurveTo(x + 14, y - 46 + wave, x + 30, y - 38 + wave * 0.6);
  ctx.quadraticCurveTo(x + 18, y - 32, x + 30, y - 24 + wave * 0.4);
  ctx.quadraticCurveTo(x + 14, y - 28 + wave, x - 3, y - 26);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, 1.4);
  ctx.fillStyle = "#fff3b0";
  starShape(ctx, x + 10, y - 35 + wave * 0.5, 4.5, 1.9, 5);
  ctx.fill();
  // Nivel.
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff3b0";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeText("★".repeat(post.level), x, y + 40);
  ctx.fillText("★".repeat(post.level), x, y + 40);
  ctx.restore();
}

export interface GuardianLook {
  time: number;
  facingLeft: boolean;
  level: number;
  /** Está peleando: la espada golpea. */
  fighting: boolean;
}

/** Estrellita guardiana con los pies en (x, y). */
export function drawGuardian(ctx: Ctx, g: Guardian, x: number, y: number, look: GuardianLook): void {
  const t = look.time;
  const bob = Math.sin(t * 5 + g.id) * 1.5;
  const cy = -20 + bob;
  const swing = g.swing > 0 ? Math.sin((1 - g.swing / 0.25) * Math.PI) : 0;
  ctx.save();
  ctx.translate(x, y);
  if (look.facingLeft) ctx.scale(-1, 1);

  // Aura de nivel 3 y sombra.
  ctx.beginPath();
  ctx.ellipse(0, 2, 13, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();
  if (look.level >= 3) {
    const aura = ctx.createRadialGradient(0, cy, 4, 0, cy, 30);
    aura.addColorStop(0, "rgba(255,243,176,0.55)");
    aura.addColorStop(1, "rgba(255,243,176,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(-32, cy - 32, 64, 64);
  }

  // Capa: más brillante con el nivel.
  const wave = Math.sin(t * 7 + g.id) * 3;
  ctx.beginPath();
  ctx.moveTo(-3, cy - 6);
  ctx.quadraticCurveTo(-15, cy + 2, -18 + wave, cy + 17);
  ctx.quadraticCurveTo(-9, cy + 17, -1, cy + 11);
  ctx.closePath();
  ctx.fillStyle = look.level >= 2 ? "#ff7b9c" : "#3f78e0";
  ctx.fill();
  ink(ctx, 1.2);

  // Espada de luz.
  ctx.save();
  ctx.translate(10, cy + 2);
  ctx.rotate(-0.9 + swing * 1.6);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(20, 0);
  ctx.strokeStyle = look.level >= 3 ? "#fff3b0" : "#cfe9ff";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = "rgba(143,211,255,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Cuerpo: estrella con cara.
  ctx.beginPath();
  starShape(ctx, 0, cy, 14, 6.4, 5, -0.1);
  ctx.fillStyle = "#ffe66d";
  ctx.fill();
  ink(ctx, 1.5);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-3.5, cy - 1.5, 1.6, 0, Math.PI * 2);
  ctx.arc(3.5, cy - 1.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, cy + 2, 3, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Escudo.
  ctx.beginPath();
  ctx.moveTo(-14, cy + 2);
  ctx.lineTo(-5, cy + 2);
  ctx.lineTo(-5, cy + 9);
  ctx.quadraticCurveTo(-9.5, cy + 15, -14, cy + 9);
  ctx.closePath();
  ctx.fillStyle = "#4f8cff";
  ctx.fill();
  ink(ctx, 1.2);
  ctx.restore();

  // Barra de vida (solo si está herido o peleando).
  if (g.health < g.maxHealth || look.fighting) {
    const w = 28;
    const k = Math.max(0, g.health / g.maxHealth);
    ctx.fillStyle = "rgba(10,15,40,0.8)";
    ctx.fillRect(x - w / 2, y - 48, w, 5);
    ctx.fillStyle = k > 0.5 ? "#7cf5c4" : k > 0.25 ? "#ffd54a" : "#ff6b6b";
    ctx.fillRect(x - w / 2 + 1, y - 47, (w - 2) * k, 3);
  }
}

/** Estrellita caída: un contorno que parpadea; al tocarla se vuelve a convocar. */
export function drawDownGuardian(ctx: Ctx, x: number, y: number, now: number, affordable: boolean): void {
  const pulse = 0.55 + Math.sin(now * 5) * 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = affordable ? pulse + 0.2 : 0.4;
  ctx.beginPath();
  starShape(ctx, 0, -20, 14, 6.4, 5, -0.1);
  ctx.fillStyle = "rgba(255,230,109,0.25)";
  ctx.fill();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = affordable ? "#fff3b0" : "#9aa3c7";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // Costo.
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  const label = `↻ ${SUMMON_COST} ✦`;
  const w = ctx.measureText(label).width + 12;
  ctx.fillStyle = affordable ? "rgba(255,213,74,0.95)" : "rgba(90,98,130,0.9)";
  ctx.beginPath();
  ctx.roundRect(-w / 2, -50, w, 17, 8);
  ctx.fill();
  ink(ctx, 1.2);
  ctx.fillStyle = affordable ? "#2a2000" : "#e6e9f7";
  ctx.fillText(label, 0, -37.5);
  ctx.restore();
}

/** Marca del punto de reunión de un puesto. */
export function drawRallyMarker(ctx: Ctx, x: number, y: number, now: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 7 + Math.sin(now * 4), 0, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.restore();
}
