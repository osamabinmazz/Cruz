/**
 * Efectos especiales: Héroe Austral, Bomba Estelar e impactos de los disparos.
 * Estilo de dibujo animado con contorno; sin armas ni violencia realista.
 */

type Ctx = CanvasRenderingContext2D;

const INK = "#141a33";

function ink(ctx: Ctx, w = 1.6): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

export function starShape(ctx: Ctx, x: number, y: number, outer: number, inner: number, points = 5, rot = 0): void {
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
}

function radialGlow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number): void {
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

// ---------------- Héroes estrella ----------------

export interface HeroPose {
  alpha: number;
  waving: boolean;
  facingLeft: boolean;
  /** Segundos de animación (para la capa y el saludo). */
  time: number;
  /** Levanta el escudo con energía (0..1). */
  strike: number;
}

/** Mezcla un color hexadecimal con blanco (t = 0 original, 1 blanco). */
function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (sh: number) => Math.round(((n >> sh) & 255) + (255 - ((n >> sh) & 255)) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/**
 * Héroe estrella: una estrella con cara, capa azul y el escudo con la Cruz del
 * Sur, en el color de su estrella (Acrux, Mimosa, Gacrux o Delta). Pies en (x, y).
 */
export function drawStarHero(ctx: Ctx, x: number, y: number, pose: HeroPose, color: string): void {
  ctx.save();
  ctx.globalAlpha = pose.alpha;
  ctx.translate(x, y);
  if (pose.facingLeft) ctx.scale(-1, 1);
  const t = pose.time;
  const bob = Math.sin(t * 6) * 2;
  const cy = -34 + bob;

  radialGlow(ctx, 0, cy, 60, color, 0.55 * pose.alpha);
  ctx.globalAlpha = pose.alpha;

  // Capa azul que flamea detrás de la estrella.
  const wave = Math.sin(t * 8) * 5;
  ctx.beginPath();
  ctx.moveTo(-6, cy - 12);
  ctx.quadraticCurveTo(-26, cy + 4, -34 + wave, cy + 30);
  ctx.quadraticCurveTo(-18, cy + 30 + wave * 0.3, -2, cy + 20);
  ctx.lineTo(8, cy - 10);
  ctx.closePath();
  const cape = ctx.createLinearGradient(-34, cy - 12, 8, cy + 30);
  cape.addColorStop(0, "#5b94ff");
  cape.addColorStop(1, "#1d4fb8");
  ctx.fillStyle = cape;
  ctx.fill();
  ink(ctx);
  ctx.fillStyle = "#fff3b0";
  for (const [sx, sy] of [[-20, 8], [-26, 20], [-12, 14]] as const) {
    starShape(ctx, sx + wave * 0.4, cy + sy, 2.2, 0.9, 4);
    ctx.fill();
  }

  // Cuerpo: una estrella de cinco puntas que se balancea.
  ctx.save();
  ctx.translate(0, cy);
  ctx.rotate(Math.sin(t * 5) * 0.08 + (pose.waving ? Math.sin(t * 12) * 0.12 : 0));
  starShape(ctx, 0, 0, 24, 11.5);
  const body = ctx.createRadialGradient(-6, -8, 2, 0, 0, 26);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.45, lighten(color, 0.35));
  body.addColorStop(1, color);
  ctx.fillStyle = body;
  ctx.fill();
  ink(ctx, 2);
  // Brillo.
  ctx.beginPath();
  ctx.ellipse(-6, -9, 4, 2.4, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();
  // Cara.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(-3.5, -1, 1.6, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(4.5, -1, 1.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-3, -2, 0.6, 0, Math.PI * 2);
  ctx.arc(5, -2, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.5, 3, 3.6, 0.2, Math.PI - 0.2);
  ink(ctx, 1.5);
  ctx.fillStyle = "rgba(255,120,140,0.5)";
  ctx.beginPath();
  ctx.arc(-7.5, 3, 1.8, 0, Math.PI * 2);
  ctx.arc(9, 3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Escudo con la Cruz del Sur (se levanta al golpear con energía).
  const lift = pose.strike * 8;
  ctx.save();
  ctx.translate(20 + pose.strike * 6, cy + 10 - lift);
  if (pose.strike > 0) radialGlow(ctx, 0, 0, 34, "rgba(160,220,255,1)", pose.strike);
  ctx.globalAlpha = pose.alpha;
  const shieldPath = () => {
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.quadraticCurveTo(0, -12, 8, -9);
    ctx.lineTo(8, 2);
    ctx.quadraticCurveTo(7, 9, 0, 13);
    ctx.quadraticCurveTo(-7, 9, -8, 2);
    ctx.closePath();
  };
  shieldPath();
  const sh = ctx.createLinearGradient(-8, -9, 8, 13);
  sh.addColorStop(0, "#27509e");
  sh.addColorStop(1, "#0f2458");
  ctx.fillStyle = sh;
  ctx.fill();
  ctx.strokeStyle = "#ffd54a";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  shieldPath();
  ink(ctx, 1);
  for (const [sx, sy, r, c] of [[0, -5, 1.5, "#ffb870"], [0, 7, 2, "#ffffff"], [-4.5, 1, 1.3, "#ffffff"], [4.5, 0, 1.3, "#ffffff"]] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Estela de chispas alrededor.
  for (let i = 0; i < 5; i++) {
    const a = t * 2.5 + (i / 5) * Math.PI * 2;
    ctx.globalAlpha = pose.alpha * (0.5 + 0.5 * Math.sin(t * 6 + i));
    ctx.fillStyle = i % 2 ? "#ffffff" : color;
    starShape(ctx, Math.cos(a) * 34, cy + Math.sin(a) * 30, 3.2, 1.2, 4, a);
    ctx.fill();
  }
  ctx.restore();
}

/** Golpe de energía del héroe: anillo, rayos y estrellas. `dt` son segundos desde el golpe. */
export function drawEnergyStrike(ctx: Ctx, x: number, y: number, dt: number): void {
  if (dt < -0.15 || dt > 0.45) return;
  const k = Math.max(0, dt) / 0.45;
  const a = 1 - k;
  radialGlow(ctx, x, y, 40 + k * 40, "rgba(170,225,255,1)", a * 0.8);
  ctx.strokeStyle = `rgba(200,235,255,${a})`;
  ctx.lineWidth = 6 * a + 1;
  ctx.beginPath();
  ctx.arc(x, y, 16 + k * 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.2;
    const r0 = 14 + k * 30;
    const r1 = 26 + k * 60;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
    ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = a;
  ctx.fillStyle = "#fffbe0";
  starShape(ctx, x, y, 16 * (1 - k * 0.5), 6, 4, k * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Estela del héroe cuando se desplaza rápido. */
export function drawDashTrail(ctx: Ctx, from: { x: number; y: number }, to: { x: number; y: number }, alpha: number): void {
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  g.addColorStop(0, "rgba(120,190,255,0)");
  g.addColorStop(1, `rgba(170,225,255,${0.7 * alpha})`);
  ctx.strokeStyle = g;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y - 30);
  ctx.lineTo(to.x, to.y - 30);
  ctx.stroke();
}

// ---------------- Bomba Estelar ----------------

/** Secuencia completa: estrella que crece, cuenta 3‑2‑1 y ondas luminosas. */
export function drawStarBomb(ctx: Ctx, t: number, width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  if (t < 2.6) {
    const grow = Math.min(1, t / 1.0);
    const ease = 1 - Math.pow(1 - grow, 3);
    const pulse = 1 + Math.sin(t * 14) * 0.05 * (t > 1 ? 1 + (t - 1) : 1);
    radialGlow(ctx, cx, cy, 150 * ease, "rgba(255,240,160,0.9)", 0.9);
    // Rayos giratorios detrás de la estrella.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.8);
    ctx.globalAlpha = 0.35 * ease;
    ctx.fillStyle = "#fff3b0";
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(140 * ease, -10);
      ctx.lineTo(140 * ease, 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // Estrella con cara simpática y mecha.
    const R = 64 * ease * pulse;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 0.9);
    ctx.quadraticCurveTo(cx + 10, cy - R * 1.35, cx + 26, cy - R * 1.4);
    ink(ctx, 5);
    ctx.strokeStyle = "#c9b6ff";
    ctx.lineWidth = 3;
    ctx.stroke();
    const spark = 5 + Math.sin(t * 30) * 2;
    ctx.fillStyle = "#fffbe0";
    starShape(ctx, cx + 26, cy - R * 1.4, spark * 1.6, spark * 0.6, 4, t * 6);
    ctx.fill();
    starShape(ctx, cx, cy, R, R * 0.46);
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 2, cx, cy, R);
    g.addColorStop(0, "#fff6c2");
    g.addColorStop(0.6, "#ffd54a");
    g.addColorStop(1, "#f0a91a");
    ctx.fillStyle = g;
    ctx.fill();
    ink(ctx, 3);
    if (R > 20) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(cx - R * 0.16, cy - R * 0.05, R * 0.05, R * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + R * 0.16, cy - R * 0.05, R * 0.05, R * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy + R * 0.1, R * 0.14, 0.15, Math.PI - 0.15);
      ink(ctx, 2.2);
    }
    // Chispas que orbitan.
    for (let i = 0; i < 6; i++) {
      const ang = t * 3 + (i / 6) * Math.PI * 2;
      const rr = R * 1.45;
      ctx.fillStyle = i % 2 ? "#ffffff" : "#9be7ff";
      starShape(ctx, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 6, 2.4, 4, ang);
      ctx.fill();
    }
  }
  // Cuenta regresiva en un globo.
  if (t >= 1.0 && t < 2.5) {
    const n = 3 - Math.floor((t - 1.0) / 0.5);
    const local = ((t - 1.0) % 0.5) / 0.5;
    const pop = 1 + (1 - Math.min(1, local * 4)) * 0.4;
    ctx.save();
    ctx.translate(cx, cy - 120);
    ctx.scale(pop, pop);
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#3b2f7a";
    ctx.fill();
    ctx.strokeStyle = "#ffd54a";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = "900 38px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(String(n), 0, 2);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }
  // Ondas luminosas de colores.
  if (t >= 2.5) {
    const k = t - 2.5;
    const colors = ["255,245,190", "155,231,255", "255,184,112"];
    colors.forEach((c, i) => {
      const r = Math.max(0, (k - i * 0.12) * 950);
      const a = Math.max(0, 1 - k / 1.4);
      ctx.strokeStyle = `rgba(${c},${a})`;
      ctx.lineWidth = 26 - i * 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    // Estrellas que salen despedidas con la onda.
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const r = k * 700;
      ctx.globalAlpha = Math.max(0, 1 - k / 1.2);
      ctx.fillStyle = i % 2 ? "#fff3b0" : "#9be7ff";
      starShape(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 9, 3.5, 5, k * 6);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,250,220,${Math.max(0, 0.45 - k / 2.5)})`;
    ctx.fillRect(0, 0, width, height);
  }
}
