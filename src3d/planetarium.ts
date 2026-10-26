import { CROSS, EXTRA_STARS, GUIDE_END, SKY, rotate, type Point } from "../src/core/geometry";
import { ico } from "./icons";

/**
 * Mini planetario: el cielo del Sur como se ve mirando hacia el Sur. Se puede tocar cada estrella para saber
 * cómo se llama, mostrar las guías (eje mayor y prolongación hasta el Sur) y avanzar las horas de la noche
 * para ver cómo gira el cielo alrededor del polo sur celeste.
 */
interface Star {
  p: Point;
  size: number;
  color: string;
  name?: string;
  info?: string;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const NAMED: Star[] = [
  { p: CROSS.acrux, size: 5.5, color: "#dff0ff", name: "Acrux", info: "La estrella más brillante de la Cruz del Sur, en el pie de la cruz. Desde ella seguimos la línea-guía hacia el Sur." },
  { p: CROSS.gacrux, size: 4.6, color: "#ffc58a", name: "Gacrux", info: "Una estrella anaranjada en la cabeza de la cruz. Con Acrux marca el eje mayor." },
  { p: CROSS.mimosa, size: 4.6, color: "#c3dcff", name: "Mimosa", info: "Brilla en el brazo izquierdo de la cruz (mirando al Sur), casi tan fuerte como Acrux." },
  { p: CROSS.delta, size: 3.6, color: "#ffffff", name: "Delta Crucis", info: "La más tenue de las cuatro estrellas principales, en el brazo derecho." },
  { p: EXTRA_STARS.epsilon, size: 2.6, color: "#dde8ff", name: "Épsilon", info: "Una estrella pequeña dentro de la cruz. No es una de las cuatro principales: no la confundas." },
  { p: { x: 95, y: 78 }, size: 6, color: "#fff1d2", name: "Alfa del Centauro", info: "Una de las dos estrellas guía, muy brillante, a un lado de la cruz. Ayuda a reconocerla." },
  { p: { x: 52, y: 66 }, size: 5.2, color: "#dfe8ff", name: "Beta del Centauro", info: "La otra estrella guía. Junto con Alfa, sirve para no confundir la Cruz del Sur con otras figuras." }
];

const POLE = GUIDE_END;
const W = SKY.width;
const H = SKY.height;

export function openPlanetarium(root: HTMLElement, onClose: () => void): void {
  const rnd = seeded(19);
  const field: Star[] = Array.from({ length: 260 }, () => {
    const mag = rnd();
    return { p: { x: rnd() * W, y: rnd() * (SKY.horizonY - 6) }, size: 0.6 + mag * mag * 1.6, color: mag > 0.8 ? "#ffe9c9" : mag > 0.5 ? "#e8f0ff" : "#b9c8f0" };
  });
  let hours = 0;
  let guides = false;
  let picked: Star | null = null;

  const el = document.createElement("div");
  el.className = "overlay";
  el.innerHTML = `<div class="card planetarium">
    <h1>${ico("dust", 30, "gold")} Planetario</h1>
    <p>Mira hacia el <b>Sur</b>. Toca una estrella para conocerla.</p>
    <canvas class="plan-canvas" width="${W * 2}" height="${H * 2}"></canvas>
    <div class="plan-info" aria-live="polite">Toca la Cruz del Sur para empezar.</div>
    <div class="plan-controls">
      <label>Hora de la noche <input type="range" id="p-hours" min="0" max="12" step="0.25" value="0" /> <b id="p-h">0 h</b></label>
      <label class="opt-row"><input type="checkbox" id="p-guides" /> Mostrar las guías (eje mayor y Sur)</label>
    </div>
    <div class="row"><button class="btn primary" data-close>Volver</button></div>
  </div>`;
  root.appendChild(el);
  const canvas = el.querySelector<HTMLCanvasElement>(".plan-canvas")!;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  const turned = (p: Point): Point => rotate(p, POLE, hours * 15);

  const draw = () => {
    const sky = ctx.createLinearGradient(0, 0, 0, SKY.horizonY);
    sky.addColorStop(0, "#02061c");
    sky.addColorStop(1, "#14245a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Vía Láctea: una franja suave.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#9bb4ff";
    ctx.beginPath();
    ctx.ellipse(turned({ x: 240, y: 120 }).x, turned({ x: 240, y: 120 }).y, 150, 34, -0.8 + (hours * 15 * Math.PI) / 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (const s of field) {
      const q = turned(s.p);
      if (q.y > SKY.horizonY - 2) continue;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    const line = (a: Point, b: Point, color: string, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (guides) {
      const g = turned(CROSS.gacrux);
      const a = turned(CROSS.acrux);
      const end = turned(POLE);
      line(g, a, "#ffd54a");
      line(a, end, "#ffd54a", [5, 4]);
      ctx.fillStyle = "#ffd54a";
      ctx.font = "bold 9px system-ui";
      ctx.fillText("polo sur celeste", end.x + 6, end.y + 3);
      ctx.beginPath();
      ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
      ctx.fill();
      if (end.y < SKY.horizonY) line(end, { x: end.x, y: SKY.horizonY }, "#7fe0ff", [3, 3]);
      ctx.fillStyle = "#7fe0ff";
      ctx.fillText("SUR", end.x - 9, SKY.horizonY - 4);
    }
    for (const s of NAMED) {
      const q = turned(s.p);
      const halo = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, s.size * 3.2);
      halo.addColorStop(0, s.color);
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = halo;
      ctx.fillRect(q.x - s.size * 3.2, q.y - s.size * 3.2, s.size * 6.4, s.size * 6.4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      if (picked === s) {
        ctx.strokeStyle = "#ffd54a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(q.x, q.y, s.size + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px system-ui";
        ctx.fillText(s.name!, q.x + s.size + 8, q.y - 6);
      }
    }
    // Horizonte, con el Este a la izquierda y el Oeste a la derecha (mirando al Sur).
    ctx.fillStyle = "#0b1a14";
    ctx.fillRect(0, SKY.horizonY, W, H - SKY.horizonY);
    ctx.fillStyle = "#cdd6f4";
    ctx.font = "bold 12px system-ui";
    ctx.fillText("ESTE", 8, H - 12);
    ctx.textAlign = "right";
    ctx.fillText("OESTE", W - 8, H - 12);
    ctx.textAlign = "center";
    ctx.fillText("SUR", W / 2, H - 12);
    ctx.textAlign = "left";
  };

  const info = el.querySelector<HTMLElement>(".plan-info")!;
  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    let best: Star | null = null;
    let bd = 22;
    for (const s of NAMED) {
      const q = turned(s.p);
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    picked = best;
    info.innerHTML = best ? `<b>${best.name}</b>: ${best.info}` : "Esa es una estrella más del cielo. Prueba con las más brillantes.";
    draw();
  });
  el.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === "p-hours") {
      hours = Number(t.value);
      el.querySelector("#p-h")!.textContent = `${hours} h`;
    } else if (t.id === "p-guides") guides = t.checked;
    draw();
  });
  el.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-close]")) {
      el.remove();
      onClose();
    }
  });
  draw();
}
