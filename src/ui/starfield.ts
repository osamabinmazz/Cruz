/**
 * Fondo de estrellas de la página: estrellas que titilan y se desplazan muy
 * despacio, y de vez en cuando una estrella fugaz. Es solo decorativo.
 */
interface BgStar {
  x: number;
  y: number;
  r: number;
  tw: number;
  depth: number;
}

interface Shooting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class Starfield {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private stars: BgStar[] = [];
  private shooting: Shooting | null = null;
  private nextShooting = 4;
  private raf = 0;
  private last = 0;
  private time = 0;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "starfield";
    this.canvas.setAttribute("aria-hidden", "true");
    parent.prepend(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    const count = Math.round((w * h) / 5200);
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() < 0.9 ? 0.4 + Math.random() * 0.8 : 1.2 + Math.random() * 0.8,
      tw: Math.random() * 6,
      depth: 0.3 + Math.random() * 0.7
    }));
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.time += dt;
      this.draw(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private draw(dt: number): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of this.stars) {
      s.x -= s.depth * 3 * dt;
      if (s.x < -2) s.x = canvas.width + 2;
      ctx.globalAlpha = (0.35 + 0.45 * Math.sin(this.time * (1 + s.depth) + s.tw)) * s.depth + 0.15;
      ctx.fillStyle = "#dfe6ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Estrella fugaz ocasional.
    this.nextShooting -= dt;
    if (!this.shooting && this.nextShooting <= 0) {
      this.shooting = { x: Math.random() * canvas.width * 0.8 + canvas.width * 0.2, y: Math.random() * canvas.height * 0.4, vx: -520, vy: 260, life: 0 };
      this.nextShooting = 7 + Math.random() * 8;
    }
    if (this.shooting) {
      const sh = this.shooting;
      sh.life += dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      const a = Math.max(0, 1 - sh.life / 0.9);
      const g = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 0.18, sh.y - sh.vy * 0.18);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * 0.18, sh.y - sh.vy * 0.18);
      ctx.stroke();
      if (a <= 0) this.shooting = null;
    }
    ctx.globalAlpha = 1;
  }
}
