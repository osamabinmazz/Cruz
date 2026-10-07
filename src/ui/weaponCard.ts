import type { Projectile, Tower } from "../core/battle/Battle";
import { defenseById, type DefenseId } from "../core/defenses";
import { starShape } from "./effectsCanvas";
import { drawProjectile, drawWeapon } from "./weaponsCanvas";

/**
 * Tarjeta grande que aparece al desbloquear un arma: gira al entrar y muestra
 * el arma disparando, con su nombre y lo que hace.
 */

const W = 420;
const H = 250;
const PIVOT_Y = 21;

export class WeaponCard {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tower: Tower;
  private projectiles: Projectile[] = [];
  private raf = 0;
  private last = 0;
  private time = 0;
  private closed = false;

  constructor(id: DefenseId, slotNumber: number, private readonly onClose: () => void) {
    const d = defenseById(id);
    this.root = document.createElement("div");
    this.root.className = "card-overlay";
    this.root.innerHTML = `<div class="weapon-card" role="dialog" aria-modal="true" aria-label="Nueva arma: ${d.name}" style="--c:${d.color}">
      <div class="card-ribbon">¡NUEVA ARMA!</div>
      <canvas width="${W}" height="${H}" aria-hidden="true"></canvas>
      <h2>${d.name}</h2>
      <p>${d.description}</p>
      <p class="note">${slotNumber > 0 ? `Irá al lugar ${slotNumber} del mapa. Antes de la batalla podrás moverla.` : "Ya es parte de tu equipo. Antes de la batalla eliges qué llevar y dónde ponerlo."}</p>
      <button class="btn primary big" data-card="close">¡GENIAL!</button>
    </div>`;
    this.canvas = this.root.querySelector("canvas")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.tower = {
      id,
      behavior: d.behavior,
      x: 150,
      y: 150,
      range: 0,
      damage: 0,
      reload: 1.1,
      cooldown: 0.6,
      flash: 0,
      aim: -0.25,
      lastTargets: []
    };
    this.root.addEventListener("click", (e) => {
      const el = (e.target as Element).closest("[data-card]");
      if (el || e.target === this.root) this.close();
    });
  }

  open(parent: HTMLElement): void {
    parent.appendChild(this.root);
    (this.root.querySelector("[data-card]") as HTMLButtonElement).focus();
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.closed) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this.raf);
    this.root.remove();
    this.onClose();
  }

  private update(dt: number): void {
    this.time += dt;
    const t = this.tower;
    t.aim = -0.25 + Math.sin(this.time * 1.3) * 0.15;
    t.flash = Math.max(0, t.flash - dt);
    t.cooldown -= dt;
    if (t.cooldown <= 0) {
      t.cooldown = t.reload;
      t.flash = 0.15;
      const color = defenseById(t.id).color;
      const kind = t.behavior === "long" ? "bolt" : t.behavior === "splash" ? "rock" : t.behavior === "reveal" || t.behavior === "slow" ? "ray" : "cannonball";
      this.projectiles.push({ id: 1, x: t.x, y: t.y - PIVOT_Y, targetId: 0, damage: 0, splash: false, color, kind, angle: t.aim, age: 0 });
    }
    for (const p of this.projectiles) {
      p.age += dt;
      p.x += Math.cos(p.angle) * 380 * dt;
      p.y += Math.sin(p.angle) * 380 * dt;
    }
    this.projectiles = this.projectiles.filter((p) => p.x < W + 30 && p.age < 2);
  }

  private draw(): void {
    const ctx = this.ctx;
    const color = defenseById(this.tower.id).color;
    const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, "#26377a");
    g.addColorStop(1, "#0b1330");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Rayos de luz que giran detrás del arma.
    ctx.save();
    ctx.translate(150, 130);
    ctx.rotate(this.time * 0.4);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(300, -18);
      ctx.lineTo(300, 18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // Estrellitas que titilan.
    for (let i = 0; i < 14; i++) {
      const x = (i * 97) % W;
      const y = (i * 53) % H;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.time * 3 + i);
      ctx.fillStyle = "#ffffff";
      starShape(ctx, x, y, 3, 1.2, 4, i);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(150, 150);
    ctx.scale(1.7, 1.7);
    ctx.translate(-150, -150);
    drawWeapon(ctx, this.tower, () => null, this.time);
    ctx.restore();
    for (const p of this.projectiles) {
      // Los disparos salen desde la boca del arma agrandada.
      const q = { ...p, x: 150 + (p.x - 150) * 1.7, y: 150 + (p.y - 150) * 1.7 };
      drawProjectile(ctx, q);
    }
  }
}
