import { FIELD, SKY_HORIZON } from "../core/battle/data";
import type { Point } from "../core/geometry";
import { STAR_HEROES, type StarHeroId } from "../core/rescue/heroes";

/**
 * Cielo nocturno del mapa de batalla. Las estrellas y la Cruz del Sur giran
 * lentamente en sentido horario alrededor del polo sur celeste, como se ve al
 * mirar hacia el Sur. Una guía tenue muestra el procedimiento: la
 * prolongación del eje mayor desde Acrux y la bajada al horizonte, donde queda
 * el Sur aproximado aunque la cruz cambie de posición.
 */

type Ctx = CanvasRenderingContext2D;

/** Segundos que tarda el cielo en dar una vuelta completa en el juego. */
export const SKY_TURN_SECONDS = 180;

export const SKY_POLE: Point = { x: 520, y: 140 };
const CROSS_RADIUS = 80;
const AXIS = 60;
const START_ANGLE = Math.PI - 0.4;

interface BgStar {
  r: number;
  a: number;
  size: number;
  tw: number;
}

export type CrossStarId = StarHeroId | "epsilon";

export class NightSky {
  private readonly stars: BgStar[] = [];
  /** Estrellas que bajaron al campamento como héroes (se ven apagadas en el cielo). */
  readonly away = new Set<StarHeroId>();

  constructor(seed = 21) {
    let s = seed;
    const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 170; i++) {
      this.stars.push({ r: 25 + Math.sqrt(rand()) * 680, a: rand() * Math.PI * 2, size: 0.4 + rand() * 1.3, tw: rand() * 6 });
    }
  }

  /** Ángulo de giro del cielo (sentido horario en pantalla). */
  angle(time: number): number {
    return (time / SKY_TURN_SECONDS) * Math.PI * 2;
  }

  /** Posición de las estrellas de la Cruz del Sur en un instante. */
  cross(time: number): Record<CrossStarId, Point> {
    const theta = START_ANGLE + this.angle(time);
    const u = { x: Math.cos(theta), y: Math.sin(theta) }; // del polo hacia la cruz
    const v = { x: -Math.sin(theta), y: Math.cos(theta) };
    const c = { x: SKY_POLE.x + u.x * CROSS_RADIUS, y: SKY_POLE.y + u.y * CROSS_RADIUS };
    const at = (du: number, dv: number): Point => ({ x: c.x + u.x * du + v.x * dv, y: c.y + u.y * du + v.y * dv });
    return {
      gacrux: at(AXIS * 0.4, 0),
      acrux: at(-AXIS * 0.6, 0),
      mimosa: at(0, -AXIS * 0.42),
      delta: at(0, AXIS * 0.34),
      epsilon: at(-AXIS * 0.3, AXIS * 0.28)
    };
  }

  draw(ctx: Ctx, time: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, SKY_HORIZON);
    ctx.clip();

    // Estrellas de fondo que giran alrededor del polo.
    const rot = this.angle(time);
    for (const st of this.stars) {
      const a = st.a + rot;
      const x = SKY_POLE.x + Math.cos(a) * st.r;
      const y = SKY_POLE.y + Math.sin(a) * st.r;
      if (x < -4 || x > FIELD.width + 4 || y < -4 || y > SKY_HORIZON) continue;
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(time * 1.6 + st.tw);
      ctx.fillStyle = "#dfe6ff";
      ctx.beginPath();
      ctx.arc(x, y, st.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const p = this.cross(time);

    // Guía del procedimiento: prolongación desde Acrux y bajada al horizonte.
    ctx.lineCap = "round";
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = "rgba(124,245,196,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.acrux.x, p.acrux.y);
    ctx.lineTo(SKY_POLE.x, SKY_POLE.y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,184,112,0.45)";
    ctx.beginPath();
    ctx.moveTo(SKY_POLE.x, SKY_POLE.y);
    ctx.lineTo(SKY_POLE.x, SKY_HORIZON - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(124,245,196,0.7)";
    ctx.beginPath();
    ctx.arc(SKY_POLE.x, SKY_POLE.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Palos de la cruz.
    ctx.strokeStyle = "rgba(223,230,255,0.4)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.gacrux.x, p.gacrux.y);
    ctx.lineTo(p.acrux.x, p.acrux.y);
    ctx.moveTo(p.mimosa.x, p.mimosa.y);
    ctx.lineTo(p.delta.x, p.delta.y);
    ctx.stroke();

    // Estrellas de la cruz con sus nombres.
    const size: Record<CrossStarId, number> = { acrux: 5.6, gacrux: 5, mimosa: 5, delta: 4.2, epsilon: 2.4 };
    // Los nombres se ubican hacia afuera de la cruz para que no se encimen.
    const mid = { x: (p.mimosa.x + p.delta.x) / 2, y: (p.mimosa.y + p.delta.y) / 2 };
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (const id of ["epsilon", "delta", "mimosa", "gacrux", "acrux"] as CrossStarId[]) {
      const hero = STAR_HEROES.find((h) => h.id === id);
      const color = hero?.color ?? "#dfe6ff";
      const pos = p[id];
      const dim = hero && this.away.has(hero.id) ? 0.2 : 1;
      const r = size[id] * (1 + 0.08 * Math.sin(time * 3 + pos.x));
      const g = ctx.createRadialGradient(pos.x, pos.y, 0.5, pos.x, pos.y, r * 4);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.7 * dim;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 4, 0, Math.PI * 2);
      ctx.fill();
      if (id !== "epsilon") {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.6 * dim;
        ctx.beginPath();
        ctx.moveTo(pos.x - r * 3.4, pos.y);
        ctx.lineTo(pos.x + r * 3.4, pos.y);
        ctx.moveTo(pos.x, pos.y - r * 3.4);
        ctx.lineTo(pos.x, pos.y + r * 3.4);
        ctx.stroke();
      }
      ctx.globalAlpha = dim;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (hero) {
        const dx = pos.x - mid.x;
        const dy = pos.y - mid.y;
        const d = Math.hypot(dx, dy) || 1;
        const lx = pos.x + (dx / d) * 16;
        const ly = pos.y + (dy / d) * 14;
        ctx.textAlign = dx < -4 ? "right" : dx > 4 ? "left" : "center";
        ctx.globalAlpha = 0.9 * dim;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(7,13,51,0.85)";
        ctx.strokeText(hero.name, lx, ly);
        ctx.fillStyle = color;
        ctx.fillText(hero.name, lx, ly);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  /** Marca del Sur sobre el horizonte; se dibuja después del paisaje para que se lea entera. */
  drawSouthMark(ctx: Ctx): void {
    ctx.font = "900 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(7,13,51,0.85)";
    ctx.strokeText("SUR", SKY_POLE.x, SKY_HORIZON - 10);
    ctx.fillStyle = "#ffd54a";
    ctx.fillText("SUR", SKY_POLE.x, SKY_HORIZON - 10);
  }
}
