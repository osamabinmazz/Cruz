import type { BattleMap } from "../src/core/battle/maps";
import type { DefenseId } from "../src/core/defenses";
import { cardinalOf, headingDegrees } from "./coords";
import { weaponStats } from "./weapons";

export const CARDINAL_NAME: Record<string, string> = { N: "Norte", NE: "Noreste", E: "Este", SE: "Sureste", S: "Sur", SO: "Suroeste", O: "Oeste", NO: "Noroeste" };

/** Interfaz sobre el 3D: energía de la escuela, corazones, brújula, armas y mensajes. */
export class Hud {
  readonly el = document.createElement("div");
  private readonly energy: HTMLElement;
  private readonly energyText: HTMLElement;
  private readonly wave: HTMLElement;
  private readonly hearts: HTMLElement;
  private readonly rose: HTMLElement;
  private readonly dir: HTMLElement;
  private readonly weapons: HTMLElement;
  private readonly msg: HTMLElement;
  private readonly chests: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly dash: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly flash: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly dust: HTMLElement;
  private readonly sound: HTMLButtonElement;
  private readonly mini: HTMLCanvasElement;
  private readonly miniCtx: CanvasRenderingContext2D | null;
  private miniBase: HTMLCanvasElement | null = null;
  private msgTimer = 0;
  private bannerTimer = 0;
  private lastWeapons = "";

  constructor(showCompass: boolean, isTouch: boolean, private readonly map: BattleMap, onSound: () => boolean, soundOn: boolean) {
    this.el.className = "hud";
    this.el.innerHTML = `
      <div class="hud-top">
        <div class="hud-wave"></div>
        <div class="bar"><i></i><span></span></div>
      </div>
      <div class="hud-flash"></div>
      <div class="hud-hearts"></div>
      <div class="hud-dash" title="Esquivar (C)"><i></i><span>${isTouch ? "💨" : "C · Esquivar"}</span></div>
      <div class="hud-chests"></div>
      <canvas class="hud-mini" width="168" height="120"></canvas>
      <div class="hud-dust"></div>
      <div class="hud-combo"></div>
      <div class="hud-banner"></div>
      <button class="hud-sound" aria-label="Sonido">${soundOn ? "🔊" : "🔇"}</button>
      <div class="hud-compass" ${showCompass ? "" : 'style="display:none"'}><div class="rose"><b class="n">N</b><b class="e">E</b><b class="s">S</b><b class="o">O</b></div><div class="needle"></div><div class="dir"></div></div>
      <div class="hud-weapons"></div>
      <div class="hud-msg"></div>
      <div class="hud-prompt"></div>
      ${isTouch ? "" : '<div class="hud-help">WASD mover · clic derecho + arrastrar: mirar · Espacio o clic: disparar · 1-2-3 arma · E abrir/usar</div>'}`;
    this.energy = this.el.querySelector(".bar i")!;
    this.energyText = this.el.querySelector(".bar span")!;
    this.wave = this.el.querySelector(".hud-wave")!;
    this.hearts = this.el.querySelector(".hud-hearts")!;
    this.rose = this.el.querySelector(".rose")!;
    this.dir = this.el.querySelector(".dir")!;
    this.weapons = this.el.querySelector(".hud-weapons")!;
    this.msg = this.el.querySelector(".hud-msg")!;
    this.chests = this.el.querySelector(".hud-chests")!;
    this.prompt = this.el.querySelector(".hud-prompt")!;
    this.dash = this.el.querySelector(".hud-dash i")!;
    this.combo = this.el.querySelector(".hud-combo")!;
    this.flash = this.el.querySelector(".hud-flash")!;
    this.banner = this.el.querySelector(".hud-banner")!;
    this.dust = this.el.querySelector(".hud-dust")!;
    this.sound = this.el.querySelector(".hud-sound")!;
    this.mini = this.el.querySelector(".hud-mini")!;
    this.miniCtx = this.mini.getContext("2d");
    this.sound.addEventListener("click", () => {
      this.sound.textContent = onSound() ? "🔊" : "🔇";
    });
    this.sound.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  /** Destello de color en los bordes de la pantalla (daño, polvo estelar, mejoras). */
  flashScreen(kind: "hurt" | "gold" | "good"): void {
    this.flash.className = "hud-flash";
    void this.flash.offsetWidth;
    this.flash.className = `hud-flash ${kind}`;
  }

  /** Cartel grande en el centro (oleadas, rachas). */
  announce(text: string, seconds = 2): void {
    this.banner.textContent = text;
    this.banner.classList.remove("show");
    void this.banner.offsetWidth;
    this.banner.classList.add("show");
    this.bannerTimer = seconds;
  }

  setDash(ready: number): void {
    this.dash.style.width = `${Math.round(ready * 100)}%`;
    this.dash.parentElement!.classList.toggle("ready", ready >= 1);
  }

  setCombo(n: number, secondsLeft: number): void {
    this.combo.textContent = n >= 3 ? `🔥 Racha x${n}` : "";
    this.combo.style.opacity = n >= 3 ? String(Math.min(1, 0.4 + secondsLeft / 2)) : "0";
  }

  setDust(n: number): void {
    this.dust.textContent = `✨ Polvo estelar: ${n}`;
  }

  setLowEnergy(low: boolean): void {
    this.energy.parentElement!.classList.toggle("low", low);
  }

  /** Mapa pequeño: el estudiante (blanco), la escuela, los cofres (dorado), los zombis (verde) y el Norte arriba. */
  drawMinimap(player: { x: number; z: number }, heading: number, zombies: { x: number; z: number; big: boolean }[], chests: { x: number; z: number; locked: boolean }[], towers: { x: number; z: number }[], dust: { x: number; z: number }[]): void {
    const g = this.miniCtx;
    if (!g) return;
    const W = this.mini.width;
    const H = this.mini.height;
    const sx = W / 96;
    const sz = H / 69;
    if (!this.miniBase) {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const b = c.getContext("2d")!;
      b.fillStyle = "#1f3b2c";
      b.fillRect(0, 0, W, H);
      b.fillStyle = "#2f5f8f";
      for (const w of this.map.water) {
        if (w.kind === "rect") b.fillRect(w.x * 0.1 * sx, w.y * 0.1 * sz, w.w * 0.1 * sx, w.h * 0.1 * sz);
        else {
          b.beginPath();
          b.ellipse(w.x * 0.1 * sx, w.y * 0.1 * sz, w.w * 0.1 * sx, w.h * 0.1 * sz, 0, 0, Math.PI * 2);
          b.fill();
        }
      }
      b.strokeStyle = "#c9b27a";
      b.lineWidth = 3;
      for (const r of this.map.routes) {
        b.beginPath();
        r.forEach((p, i) => (i ? b.lineTo(p.x * 0.1 * sx, p.y * 0.1 * sz) : b.moveTo(p.x * 0.1 * sx, p.y * 0.1 * sz)));
        b.stroke();
      }
      b.fillStyle = "#e8e2c8";
      b.fillRect(this.map.camp.x * 0.1 * sx - 7, this.map.camp.y * 0.1 * sz - 7, 14, 14);
      this.miniBase = c;
    }
    g.drawImage(this.miniBase, 0, 0);
    const dot = (x: number, z: number, color: string, r: number) => {
      g.fillStyle = color;
      g.beginPath();
      g.arc(x * sx, z * sz, r, 0, Math.PI * 2);
      g.fill();
    };
    for (const t of towers) dot(t.x, t.z, "#7fb2ff", 3);
    for (const d of dust) dot(d.x, d.z, "#ffe066", 2);
    for (const c of chests) dot(c.x, c.z, c.locked ? "#ff6b6b" : "#ffd54a", 4.5);
    for (const z of zombies) dot(z.x, z.z, z.big ? "#ff8f5a" : "#8fd16b", z.big ? 5 : 2.6);
    g.save();
    g.translate(player.x * sx, player.z * sz);
    g.rotate(heading);
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#000";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, 7);
    g.lineTo(-5, -5);
    g.lineTo(5, -5);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    g.fillStyle = "#fff";
    g.font = "bold 12px system-ui";
    g.fillText("N", W / 2 - 4, 12);
  }

  setSchool(hp: number, max: number): void {
    this.energy.style.width = `${Math.max(0, (hp / max) * 100)}%`;
    this.energyText.textContent = `🏫 ENERGÍA DE LA ESCUELA ${Math.ceil(hp)} / ${max}`;
  }

  setWave(text: string): void {
    this.wave.textContent = text;
  }

  setHearts(n: number, max = 3): void {
    this.hearts.textContent = "❤️".repeat(Math.max(0, n)) + "🖤".repeat(Math.max(0, max - n));
  }

  /** La brújula gira con la cámara: la N siempre señala el Norte del mundo. */
  setCompass(cameraYaw: number): void {
    // La cámara mira hacia (−sin yaw, −cos yaw); el rumbo es 0 hacia el Norte (−z) y 90 hacia el Este (+x).
    const heading = headingDegrees(-Math.sin(cameraYaw), -Math.cos(cameraYaw));
    this.rose.style.transform = `rotate(${-heading}deg)`;
    this.dir.textContent = `Miras al ${CARDINAL_NAME[cardinalOf(heading)]}`;
  }

  setWeapons(ids: DefenseId[], levels: Partial<Record<DefenseId, number>>, current: number): void {
    const key = JSON.stringify([ids, levels, current]);
    if (key === this.lastWeapons) return;
    this.lastWeapons = key;
    this.weapons.innerHTML = ids
      .map((id, i) => {
        const st = weaponStats(id, levels[id] ?? 1);
        return `<div class="slot ${i === current ? "on" : ""}"><div class="sw" style="background:${st.color}"></div>${i + 1}. ${st.name.split(" ")[0]}<small>${"★".repeat(levels[id] ?? 1)}</small></div>`;
      })
      .join("");
  }

  say(text: string, seconds = 2.4): void {
    this.msg.textContent = text;
    this.msg.classList.add("show");
    this.msgTimer = seconds;
  }

  /** Cuántos cofres hay y hacia dónde queda el más cercano (¡con puntos cardinales!). */
  setChests(count: number, where: string | null): void {
    this.chests.innerHTML = `📦 Cofres: ${count}${where ? `<small>El más cercano está al ${where}</small>` : ""}`;
  }

  setPrompt(text: string | null): void {
    this.prompt.textContent = text ?? "";
    this.prompt.classList.toggle("show", !!text);
  }

  tick(dt: number): void {
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.msg.classList.remove("show");
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.classList.remove("show");
    }
  }
}
