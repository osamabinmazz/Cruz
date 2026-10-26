import type { DefenseId } from "../src/core/defenses";
import { cardinalOf, headingDegrees } from "./coords";
import { weaponStats } from "./weapons";

const NAME: Record<string, string> = { N: "Norte", NE: "Noreste", E: "Este", SE: "Sureste", S: "Sur", SO: "Suroeste", O: "Oeste", NO: "Noroeste" };

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
  private readonly prompt: HTMLElement;
  private msgTimer = 0;
  private lastWeapons = "";

  constructor(showCompass: boolean, isTouch: boolean) {
    this.el.className = "hud";
    this.el.innerHTML = `
      <div class="hud-top">
        <div class="hud-wave"></div>
        <div class="bar"><i></i><span></span></div>
      </div>
      <div class="hud-hearts"></div>
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
    this.prompt = this.el.querySelector(".hud-prompt")!;
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
    this.dir.textContent = `Miras al ${NAME[cardinalOf(heading)]}`;
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

  setPrompt(text: string | null): void {
    this.prompt.textContent = text ?? "";
    this.prompt.classList.toggle("show", !!text);
  }

  tick(dt: number): void {
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.msg.classList.remove("show");
    }
  }
}
