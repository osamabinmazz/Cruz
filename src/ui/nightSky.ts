import { FIELD, SKY_HORIZON } from "../core/battle/data";
import type { Point } from "../core/geometry";
import { STAR_HEROES, type StarHeroId } from "../core/rescue/heroes";

/**
 * Cielo nocturno del mapa de batalla, como un cielo real: cientos de estrellas
 * de distinto brillo y color, la Vía Láctea con la mancha oscura del Saco de
 * Carbón junto a la Cruz del Sur, y dos estrellas muy brillantes cercanas a la
 * cruz. Todo gira lentamente en sentido horario alrededor del polo sur
 * celeste, como se ve al mirar hacia el Sur. No hay nombres, líneas ni guías:
 * la Cruz del Sur hay que reconocerla, como en el cielo verdadero.
 */

type Ctx = CanvasRenderingContext2D;

/** Segundos que tarda el cielo en dar una vuelta completa en el juego. */
export const SKY_TURN_SECONDS = 180;

export const SKY_POLE: Point = { x: 520, y: 140 };
const CROSS_RADIUS = 80;
const AXIS = 60;
const START_ANGLE = Math.PI - 0.4;

/** Estrella del fondo en coordenadas del cielo (relativas al polo, sin girar). */
interface SkyStar {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  /** Fase del titileo; negativa si la estrella no titila. */
  tw: number;
}

export type CrossStarId = StarHeroId | "epsilon";

const STAR_TINTS = ["#ffffff", "#ffffff", "#ffffff", "#dfe8ff", "#cfdcff", "#fff4e0", "#ffe2b8", "#ffd2a8"];

export class NightSky {
  private readonly stars: SkyStar[] = [];
  /** Estrellas que bajaron al campamento como héroes (se ven apagadas en el cielo). */
  readonly away = new Set<StarHeroId>();
  /** Centro y dirección de la Vía Láctea (en coordenadas del cielo). */
  private readonly band: { cx: number; cy: number; angle: number };
  private readonly coalsack: Point;
  private readonly pointers: { p: Point; size: number; color: string }[];

  constructor(seed = 21) {
    let s = seed;
    const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const tint = () => STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)];
    // Muchas estrellas débiles y pocas brillantes, como en el cielo real.
    const magnitude = () => {
      const m = rand();
      return m < 0.72 ? 0.35 + rand() * 0.45 : m < 0.93 ? 0.8 + rand() * 0.5 : 1.3 + rand() * 0.9;
    };
    const add = (x: number, y: number, size: number) =>
      this.stars.push({ x, y, size, color: tint(), alpha: 0.35 + Math.min(0.6, size * 0.3) + rand() * 0.1, tw: rand() < 0.35 ? rand() * 6 : -1 });

    for (let i = 0; i < 560; i++) {
      const r = 10 + Math.sqrt(rand()) * 700;
      const a = rand() * Math.PI * 2;
      add(Math.cos(a) * r, Math.sin(a) * r, magnitude());
    }

    // La Vía Láctea pasa por la Cruz del Sur: una franja con muchas más estrellas débiles.
    const crossCenter = { x: Math.cos(START_ANGLE) * CROSS_RADIUS, y: Math.sin(START_ANGLE) * CROSS_RADIUS };
    const bandAngle = START_ANGLE + Math.PI / 2 + 0.35;
    this.band = { cx: crossCenter.x, cy: crossCenter.y, angle: bandAngle };
    const along = { x: Math.cos(bandAngle), y: Math.sin(bandAngle) };
    const across = { x: -along.y, y: along.x };
    for (let i = 0; i < 520; i++) {
      const t = (rand() - 0.5) * 1500;
      const w = (rand() + rand() + rand() - 1.5) * 55;
      add(crossCenter.x + along.x * t + across.x * w, crossCenter.y + along.y * t + across.y * w, 0.3 + rand() * 0.55);
    }

    // Saco de Carbón: nube oscura junto a la cruz, del lado de Acrux y Mimosa.
    const u = { x: Math.cos(START_ANGLE), y: Math.sin(START_ANGLE) };
    const v = { x: -u.y, y: u.x };
    this.coalsack = { x: crossCenter.x - u.x * AXIS * 0.35 - v.x * AXIS * 0.75, y: crossCenter.y - u.y * AXIS * 0.35 - v.y * AXIS * 0.75 };
    // Dos estrellas muy brillantes cerca de la cruz, del lado de Mimosa.
    this.pointers = [
      { p: { x: crossCenter.x - v.x * AXIS * 1.7 + u.x * AXIS * 0.2, y: crossCenter.y - v.y * AXIS * 1.7 + u.y * AXIS * 0.2 }, size: 3.8, color: "#dfe8ff" },
      { p: { x: crossCenter.x - v.x * AXIS * 2.6 + u.x * AXIS * 0.5, y: crossCenter.y - v.y * AXIS * 2.6 + u.y * AXIS * 0.5 }, size: 4.6, color: "#fff1d2" }
    ];
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

  /** Lleva un punto del cielo (relativo al polo) a la pantalla, girado. */
  private place(p: Point, cos: number, sin: number): Point {
    return { x: SKY_POLE.x + p.x * cos - p.y * sin, y: SKY_POLE.y + p.x * sin + p.y * cos };
  }

  private glowStar(ctx: Ctx, pos: Point, r: number, color: string, alpha: number): void {
    const g = ctx.createRadialGradient(pos.x, pos.y, 0.3, pos.x, pos.y, r * 3.6);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.55 * alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r * 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx: Ctx, time: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, SKY_HORIZON);
    ctx.clip();
    const rot = this.angle(time);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Resplandor de la Vía Láctea y la nube oscura del Saco de Carbón.
    const bc = this.place({ x: this.band.cx, y: this.band.cy }, cos, sin);
    ctx.save();
    ctx.translate(bc.x, bc.y);
    ctx.rotate(this.band.angle + rot);
    for (const [w, a] of [[110, 0.06], [60, 0.07], [28, 0.06]] as const) {
      const g = ctx.createLinearGradient(0, -w, 0, w);
      g.addColorStop(0, "rgba(170,185,255,0)");
      g.addColorStop(0.5, `rgba(190,200,255,${a})`);
      g.addColorStop(1, "rgba(170,185,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-900, -w, 1800, w * 2);
    }
    ctx.restore();
    const cs = this.place(this.coalsack, cos, sin);
    const dark = ctx.createRadialGradient(cs.x, cs.y, 2, cs.x, cs.y, 34);
    dark.addColorStop(0, "rgba(6,10,36,0.55)");
    dark.addColorStop(1, "rgba(6,10,36,0)");
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(cs.x, cs.y, 34, 26, rot, 0, Math.PI * 2);
    ctx.fill();

    // Estrellas de fondo.
    for (const st of this.stars) {
      const p = this.place(st, cos, sin);
      if (p.x < -4 || p.x > FIELD.width + 4 || p.y < -4 || p.y > SKY_HORIZON) continue;
      const twinkle = st.tw >= 0 ? 0.75 + 0.25 * Math.sin(time * 2.2 + st.tw) : 1;
      ctx.globalAlpha = st.alpha * twinkle;
      ctx.fillStyle = st.color;
      if (st.size < 0.7) {
        ctx.fillRect(p.x - st.size, p.y - st.size, st.size * 2, st.size * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, st.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dos estrellas muy brillantes cerca de la cruz.
    for (const ptr of this.pointers) this.glowStar(ctx, this.place(ptr.p, cos, sin), ptr.size, ptr.color, 1);

    // La Cruz del Sur: sus estrellas se destacan por su brillo, sin nombres ni líneas.
    const p = this.cross(time);
    const size: Record<CrossStarId, number> = { acrux: 3.6, gacrux: 3.2, mimosa: 3.2, delta: 2.6, epsilon: 1.5 };
    for (const id of ["epsilon", "delta", "mimosa", "gacrux", "acrux"] as CrossStarId[]) {
      const hero = STAR_HEROES.find((h) => h.id === id);
      const dim = hero && this.away.has(hero.id) ? 0.2 : 1;
      const twinkle = 1 + 0.06 * Math.sin(time * 3 + p[id].x);
      this.glowStar(ctx, p[id], size[id] * twinkle, hero?.color ?? "#dfe6ff", dim);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
