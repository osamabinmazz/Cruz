import type { Facing } from "../core/battle/data";
import type { EnemyKind } from "../core/difficulty";

/**
 * Zombis de caricatura: traje con corbata, piel gris verdosa, ojos desiguales,
 * brazos estirados y paso torpe. Sin sangre ni heridas: al ser derrotados caen
 * de espaldas y desaparecen en destellos.
 */

type Ctx = CanvasRenderingContext2D;

export interface ZombiePose {
  /** Fase de la caminata (avanza con la distancia recorrida). */
  walk: number;
  /** Resistencia restante (0..1). */
  health: number;
  held?: boolean;
  alpha?: number;
  /** Inclinación hacia atrás al caer (radianes). */
  fall?: number;
  /** Hacia dónde camina: de perfil (derecha o izquierda), de frente (baja) o de espaldas (sube). */
  facing?: Facing;
}

const SKIN = "#9fb58a";
const SKIN_DARK = "#7f9670";

const SCALE: Record<EnemyKind, number> = { comun: 1, veloz: 0.95, resistente: 1.05, niebla: 1, mochila: 1.12, saltador: 1, doble: 1.12, mini: 0.6, gigante: 1.7 };

interface Outfit {
  coat: string;
  coatDark: string;
  shirt: string;
  tie: string | null;
  pants: string;
  shoes: string;
}

const OUTFITS: Record<EnemyKind, Outfit> = {
  comun: { coat: "#7a5638", coatDark: "#5e412a", shirt: "#f1ede0", tie: "#d6453d", pants: "#4f3d33", shoes: "#2b2323" },
  veloz: { coat: "#e8c547", coatDark: "#c9a52d", shirt: "#e8c547", tie: null, pants: "#3558a8", shoes: "#f4f6ff" },
  resistente: { coat: "#6f5a8a", coatDark: "#554470", shirt: "#f1ede0", tie: "#3c8d5a", pants: "#3f3a4f", shoes: "#2b2323" },
  niebla: { coat: "#8e9ab3", coatDark: "#6f7b94", shirt: "#c9d2e6", tie: null, pants: "#5b6378", shoes: "#3d4254" },
  mochila: { coat: "#b59a62", coatDark: "#94794a", shirt: "#e9dfc3", tie: "#d6453d", pants: "#6b5a3f", shoes: "#3b2d22" },
  saltador: { coat: "#4fa66b", coatDark: "#3a8052", shirt: "#f4f6ff", tie: null, pants: "#2f4f7a", shoes: "#ff9f43" },
  doble: { coat: "#8f5fb0", coatDark: "#6f4590", shirt: "#7ad0c4", tie: "#ffd54a", pants: "#3f6f78", shoes: "#2b2323" },
  mini: { coat: "#b9c97a", coatDark: "#98a85a", shirt: "#f1ede0", tie: null, pants: "#5a6a3f", shoes: "#2b2323" },
  gigante: { coat: "#8a2f3a", coatDark: "#6a2029", shirt: "#d9cfa8", tie: "#ffd54a", pants: "#3a2a2f", shoes: "#1f1a1a" }
};

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, width: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function leg(ctx: Ctx, swing: number, o: Outfit): void {
  const hipX = 0;
  const hipY = -18;
  const knee = { x: hipX + Math.sin(swing) * 7, y: hipY + 9 };
  const foot = { x: knee.x + Math.sin(swing * 0.6) * 5, y: 0 };
  limb(ctx, hipX, hipY, knee.x, knee.y, 7, o.pants);
  limb(ctx, knee.x, knee.y, foot.x, foot.y - 2, 6, o.pants);
  ctx.fillStyle = o.shoes;
  ctx.beginPath();
  ctx.ellipse(foot.x + 3, foot.y - 1, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function arm(ctx: Ctx, bob: number, o: Outfit, front: boolean): void {
  const sy = -36 + (front ? 1 : -1);
  const hand = { x: 21, y: -35 + bob };
  const elbow = { x: 11, y: -35 + bob * 0.5 };
  limb(ctx, 2, sy, elbow.x, elbow.y, 7, front ? o.coat : o.coatDark);
  limb(ctx, elbow.x, elbow.y, hand.x - 3, hand.y, 5, front ? SKIN : SKIN_DARK);
  // Mano con dedos colgando.
  ctx.fillStyle = front ? SKIN : SKIN_DARK;
  ctx.beginPath();
  ctx.ellipse(hand.x, hand.y + 1, 4, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = front ? SKIN : SKIN_DARK;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(hand.x + 1 + i * 1.5, hand.y + 2);
    ctx.lineTo(hand.x + 2 + i * 1.8, hand.y + 6);
    ctx.stroke();
  }
}

function torso(ctx: Ctx, kind: EnemyKind, o: Outfit): void {
  // Saco.
  ctx.fillStyle = o.coat;
  rr(ctx, -9, -42, 19, 26, 6);
  ctx.fill();
  if (kind === "veloz") {
    // Camiseta deportiva con número.
    ctx.fillStyle = "#3558a8";
    ctx.fillRect(-9, -33, 19, 3);
    ctx.fillStyle = "#3558a8";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("7", 1, -21);
    return;
  }
  if (kind === "niebla") {
    // Capa con capucha.
    ctx.fillStyle = o.coatDark;
    ctx.beginPath();
    ctx.moveTo(-10, -42);
    ctx.lineTo(-13, -14);
    ctx.lineTo(-4, -16);
    ctx.closePath();
    ctx.fill();
    return;
  }
  // Camisa y corbata.
  ctx.fillStyle = o.shirt;
  ctx.beginPath();
  ctx.moveTo(-2, -42);
  ctx.lineTo(7, -42);
  ctx.lineTo(3, -26);
  ctx.closePath();
  ctx.fill();
  if (o.tie) {
    ctx.fillStyle = o.tie;
    ctx.beginPath();
    ctx.moveTo(1.5, -40);
    ctx.lineTo(4.5, -40);
    ctx.lineTo(5, -29);
    ctx.lineTo(3, -26);
    ctx.lineTo(1, -29);
    ctx.closePath();
    ctx.fill();
  }
  // Solapas y botones.
  ctx.strokeStyle = o.coatDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -42);
  ctx.lineTo(1, -32);
  ctx.moveTo(7, -42);
  ctx.lineTo(5, -32);
  ctx.stroke();
  ctx.fillStyle = o.coatDark;
  ctx.beginPath();
  ctx.arc(-3, -24, 1.2, 0, Math.PI * 2);
  ctx.arc(-3, -20, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function head(ctx: Ctx, kind: EnemyKind, bob: number): void {
  const hx = 4;
  const hy = -52 + bob * 0.3;
  // Cuello.
  limb(ctx, 2, -42, 3, -45, 5, SKIN_DARK);
  // Cabeza (un poco inclinada hacia adelante).
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.12);
  ctx.fillStyle = kind === "niebla" ? "#b7c3cf" : SKIN;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mandíbula.
  ctx.beginPath();
  ctx.ellipse(2, 7, 7, 5, 0, 0, Math.PI);
  ctx.fill();
  // Pelo despeinado.
  if (kind !== "resistente" && kind !== "mochila" && kind !== "niebla") {
    ctx.strokeStyle = "#3b3326";
    ctx.lineWidth = 1.4;
    for (const [x1, y1, x2, y2] of [[-4, -10, -7, -15], [-1, -11, 0, -16], [3, -10, 6, -14]] as const) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2 + 2, (y1 + y2) / 2, x2, y2);
      ctx.stroke();
    }
  }
  if (kind === "veloz") {
    ctx.fillStyle = "#d6453d";
    ctx.fillRect(-10, -6, 20, 3.5);
  }
  // Ojos desiguales.
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.arc(1, -2, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -1, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b1b2f";
  ctx.beginPath();
  ctx.arc(2.2, -1.2, 1.4, 0, Math.PI * 2);
  ctx.arc(8.8, -0.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  // Cejas caídas.
  ctx.strokeStyle = "#4c5a43";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-3, -7);
  ctx.lineTo(4, -6.5);
  ctx.moveTo(6, -5);
  ctx.lineTo(10.5, -4.5);
  ctx.stroke();
  // Boca abierta con dos dientes.
  ctx.fillStyle = "#3b2530";
  ctx.beginPath();
  ctx.ellipse(4, 6, 4.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffdf0";
  ctx.fillRect(2, 3.6, 1.8, 2);
  ctx.fillRect(5, 3.6, 1.8, 1.6);
  ctx.restore();
}

function hat(ctx: Ctx, kind: EnemyKind, bob: number, health: number): void {
  const hx = 4;
  const hy = -52 + bob * 0.3;
  if (kind === "resistente") {
    // Cono de tránsito: se inclina cuando pierde resistencia.
    ctx.save();
    ctx.translate(hx - 1, hy - 7);
    ctx.rotate(health < 0.5 ? -0.35 : -0.08);
    ctx.fillStyle = "#f08a24";
    ctx.beginPath();
    ctx.moveTo(-11, 2);
    ctx.lineTo(11, 2);
    ctx.lineTo(2, -24);
    ctx.lineTo(-2, -24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3e0";
    ctx.beginPath();
    ctx.moveTo(-6.5, -9);
    ctx.lineTo(6.5, -9);
    ctx.lineTo(5.3, -13);
    ctx.lineTo(-5.3, -13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c96c12";
    rr(ctx, -13, 0, 26, 4, 2);
    ctx.fill();
    ctx.restore();
  } else if (kind === "mochila") {
    // Olla metálica como casco.
    ctx.save();
    ctx.translate(hx, hy - 7);
    ctx.rotate(health < 0.5 ? -0.25 : -0.05);
    ctx.fillStyle = "#aab4c3";
    rr(ctx, -11, -12, 22, 14, 3);
    ctx.fill();
    ctx.fillStyle = "#8793a5";
    ctx.fillRect(-12, 0, 24, 3);
    ctx.fillStyle = "#dfe6ff";
    ctx.fillRect(-7, -10, 3, 9);
    ctx.strokeStyle = "#6c7789";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(13, -4, 3, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    if (health < 0.5) {
      ctx.strokeStyle = "#6c7789";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(2, -12);
      ctx.lineTo(4, -7);
      ctx.lineTo(1, -4);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === "niebla") {
    ctx.fillStyle = "#6f7b94";
    ctx.beginPath();
    ctx.arc(hx - 1, hy - 1, 13, Math.PI * 0.85, Math.PI * 2.1);
    ctx.lineTo(hx - 12, hy + 8);
    ctx.closePath();
    ctx.fill();
  }
}

function backpack(ctx: Ctx): void {
  ctx.fillStyle = "#8a5a33";
  rr(ctx, -22, -44, 15, 26, 5);
  ctx.fill();
  ctx.fillStyle = "#6b4426";
  rr(ctx, -21, -30, 13, 9, 3);
  ctx.fill();
  ctx.fillStyle = "#3558a8";
  ctx.beginPath();
  ctx.ellipse(-15, -47, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, -8, -42, -2, -30, 2.5, "#6b4426");
}


// ---------------- Vistas de frente y de espaldas ----------------

/** Piernas vistas de frente o de espaldas: una rodilla sube mientras la otra baja. */
function legsFrontal(ctx: Ctx, phase: number, o: Outfit): void {
  for (const side of [-1, 1]) {
    const lift = Math.max(0, Math.sin(phase + (side > 0 ? Math.PI : 0))) * 4;
    const x = side * 4.5;
    limb(ctx, x, -18, x + side * 0.5, -2 - lift, 7, o.pants);
    ctx.fillStyle = o.shoes;
    ctx.beginPath();
    ctx.ellipse(x + side * 0.8, -1 - lift, 4.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function torsoFrontal(ctx: Ctx, kind: EnemyKind, o: Outfit, back: boolean): void {
  ctx.fillStyle = o.coat;
  rr(ctx, -11, -42, 22, 26, 7);
  ctx.fill();
  if (back) {
    // Costura central y cuello del saco.
    ctx.strokeStyle = o.coatDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(0, -17);
    ctx.stroke();
    ctx.fillStyle = o.coatDark;
    rr(ctx, -6, -43, 12, 4, 2);
    ctx.fill();
    return;
  }
  if (kind === "veloz") {
    ctx.fillStyle = "#3558a8";
    ctx.fillRect(-11, -33, 22, 3);
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("7", 0, -20);
    return;
  }
  if (kind === "niebla") {
    ctx.fillStyle = o.coatDark;
    ctx.beginPath();
    ctx.moveTo(-3, -42);
    ctx.lineTo(0, -18);
    ctx.lineTo(3, -42);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillStyle = o.shirt;
  ctx.beginPath();
  ctx.moveTo(-5, -42);
  ctx.lineTo(5, -42);
  ctx.lineTo(0, -26);
  ctx.closePath();
  ctx.fill();
  if (o.tie) {
    ctx.fillStyle = o.tie;
    ctx.beginPath();
    ctx.moveTo(-1.6, -40);
    ctx.lineTo(1.6, -40);
    ctx.lineTo(2.2, -29);
    ctx.lineTo(0, -26);
    ctx.lineTo(-2.2, -29);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = o.coatDark;
  for (const y of [-24, -20]) {
    ctx.beginPath();
    ctx.arc(-6, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === "mochila") {
    limb(ctx, -7, -42, -8, -24, 2.5, "#6b4426");
    limb(ctx, 7, -42, 8, -24, 2.5, "#6b4426");
  }
}

/** Brazos estirados hacia el espectador (de frente) o hacia adelante (de espaldas). */
function armsFrontal(ctx: Ctx, bob: number, o: Outfit, back: boolean): void {
  for (const side of [-1, 1]) {
    const b = side > 0 ? bob : -bob;
    const shoulder = { x: side * 10, y: -38 };
    const hand = { x: side * (back ? 15 : 9), y: back ? -41 + b : -30 + b };
    limb(ctx, shoulder.x, shoulder.y, hand.x, hand.y, 7, back ? o.coatDark : o.coat);
    ctx.fillStyle = back ? SKIN_DARK : SKIN;
    ctx.beginPath();
    ctx.ellipse(hand.x, hand.y + (back ? -2 : 2), 4, back ? 3 : 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!back) {
      ctx.strokeStyle = SKIN;
      ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(hand.x + i * 1.6, hand.y + 5);
        ctx.lineTo(hand.x + i * 1.9, hand.y + 8);
        ctx.stroke();
      }
    }
  }
}

function headFrontal(ctx: Ctx, kind: EnemyKind, bob: number, back: boolean): void {
  const hy = -53 + bob * 0.3;
  limb(ctx, 0, -42, 0, -45, 5, SKIN_DARK);
  ctx.save();
  ctx.translate(0, hy);
  ctx.rotate(back ? -0.06 : 0.08);
  ctx.fillStyle = kind === "niebla" ? "#b7c3cf" : back ? SKIN_DARK : SKIN;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  const bareHead = kind !== "resistente" && kind !== "mochila" && kind !== "niebla";
  if (back) {
    // Nuca con orejas y pelo.
    ctx.beginPath();
    ctx.ellipse(-10.5, 1, 2.4, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(10.5, 1, 2.4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (bareHead) {
      ctx.fillStyle = "#3b3326";
      ctx.beginPath();
      ctx.ellipse(0, -5, 9, 6, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    if (kind === "veloz") {
      ctx.fillStyle = "#d6453d";
      ctx.fillRect(-10.5, -5, 21, 3.5);
      ctx.fillRect(-2, -2, 4, 7);
    }
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.ellipse(0, 7, 7.5, 5, 0, 0, Math.PI);
  ctx.fill();
  if (bareHead) {
    ctx.strokeStyle = "#3b3326";
    ctx.lineWidth = 1.4;
    for (const [x1, y1, x2, y2] of [[-4, -10, -7, -15], [0, -11, 1, -16], [4, -10, 7, -14]] as const) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2 + 2, (y1 + y2) / 2, x2, y2);
      ctx.stroke();
    }
  }
  if (kind === "veloz") {
    ctx.fillStyle = "#d6453d";
    ctx.fillRect(-10.5, -6, 21, 3.5);
  }
  // Ojos desiguales, de frente.
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.arc(-4, -1, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4.5, -0.5, 3.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b1b2f";
  ctx.beginPath();
  ctx.arc(-3.5, 0, 1.4, 0, Math.PI * 2);
  ctx.arc(4.2, 0.3, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4c5a43";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-8, -6.5);
  ctx.lineTo(-1, -5.5);
  ctx.moveTo(2, -4.5);
  ctx.lineTo(7.5, -5);
  ctx.stroke();
  ctx.fillStyle = "#3b2530";
  ctx.beginPath();
  ctx.ellipse(0, 6.5, 4.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffdf0";
  ctx.fillRect(-2.2, 4, 1.8, 2);
  ctx.fillRect(0.8, 4, 1.8, 1.6);
  ctx.restore();
}

function hatFrontal(ctx: Ctx, kind: EnemyKind, bob: number, health: number): void {
  // Los sombreros son simétricos: se reutiliza el dibujo de perfil centrado.
  ctx.save();
  ctx.translate(-4, -1);
  hat(ctx, kind, bob, health);
  ctx.restore();
}

function backpackFront(ctx: Ctx): void {
  // De espaldas, la mochila se ve completa sobre el saco.
  ctx.fillStyle = "#8a5a33";
  rr(ctx, -10, -42, 20, 24, 5);
  ctx.fill();
  ctx.fillStyle = "#6b4426";
  rr(ctx, -8, -30, 16, 9, 3);
  ctx.fill();
  ctx.fillStyle = "#c9a36b";
  ctx.fillRect(-1, -28, 2, 4);
  ctx.fillStyle = "#3558a8";
  ctx.beginPath();
  ctx.ellipse(0, -44, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrontal(ctx: Ctx, kind: EnemyKind, o: Outfit, phase: number, bob: number, health: number, back: boolean): void {
  if (!back && kind === "mochila") {
    // De frente la mochila asoma por detrás de los hombros.
    ctx.fillStyle = "#6b4426";
    rr(ctx, -13, -44, 26, 10, 4);
    ctx.fill();
  }
  if (back) armsFrontal(ctx, bob, o, true);
  legsFrontal(ctx, phase, o);
  torsoFrontal(ctx, kind, o, back);
  if (back && kind === "mochila") backpackFront(ctx);
  headFrontal(ctx, kind, bob, back);
  hatFrontal(ctx, kind, bob, health);
  if (!back) armsFrontal(ctx, bob, o, false);
}

/** Dibuja un zombi con los pies en (x, y), orientado según el tramo del camino. */
export function drawZombie(ctx: Ctx, kind: EnemyKind, x: number, y: number, pose: ZombiePose): void {
  const o = OUTFITS[kind];
  const s = SCALE[kind];
  const speed = kind === "veloz" ? 1.6 : 1;
  const phase = pose.walk * speed;
  const swing = Math.sin(phase) * 0.7;
  const bob = Math.sin(phase * 2) * 1.5;
  const lean = kind === "veloz" ? 0.2 : 0.08;

  // Sombra.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 1, 14 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = (pose.alpha ?? 1) * (kind === "niebla" ? 0.62 : 1);
  ctx.translate(x, y);
  ctx.scale(s, s);
  const sideways = (pose.facing ?? "right") === "right" || pose.facing === "left";
  ctx.rotate((sideways ? lean : 0) * (pose.facing === "left" ? -1 : 1) - (pose.fall ?? 0));
  ctx.translate(0, -Math.abs(bob) * 0.5);

  if (kind === "niebla") {
    ctx.fillStyle = "rgba(207,216,255,0.45)";
    for (const [dx, dy, r] of [[-12, -4, 9], [8, -2, 8], [-2, 0, 11]] as const) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const facing = pose.facing ?? "right";
  if (facing === "down" || facing === "up") {
    drawFrontal(ctx, kind, o, phase, bob, pose.health, facing === "up");
  } else {
    if (facing === "left") ctx.scale(-1, 1);
    if (kind === "mochila") backpack(ctx);
    arm(ctx, -bob, o, false);
    leg(ctx, -swing, o);
    leg(ctx, swing, o);
    torso(ctx, kind, o);
    head(ctx, kind, bob);
    hat(ctx, kind, bob, pose.health);
    arm(ctx, bob, o, true);
    if (kind === "mochila") limb(ctx, -6, -42, 4, -24, 2.5, "#6b4426");
  }
  ctx.restore();

  const top = y - 72 * s;
  if (pose.health < 1 && !pose.fall) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    rr(ctx, x - 15, top, 30, 5, 2);
    ctx.fill();
    ctx.fillStyle = pose.health > 0.4 ? "#7cf5c4" : "#ffd166";
    rr(ctx, x - 15, top, 30 * Math.max(0.05, pose.health), 5, 2);
    ctx.fill();
  }
  if (pose.held) {
    ctx.strokeStyle = "#ffd54a";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(x + 2, y - 30 * s, 26 * s, 40 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
