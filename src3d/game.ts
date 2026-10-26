import * as THREE from "three";
import { Battle } from "../src/core/battle/Battle";
import { MAPS } from "../src/core/battle/maps";
import { nightConfig, NIGHTS, TOTAL_NIGHTS } from "../src/core/campaign/nights";
import type { DefenseId } from "../src/core/defenses";
import { difficultyConfigs, type Difficulty, type DifficultyConfig } from "../src/core/difficulty";
import { extremeConfig } from "../src/core/extreme";
import { defaultPlacement } from "../src/core/placement";
import { createRng } from "../src/core/rng";
import { DEFAULT_LOOK, type LookOptions } from "./character";
import { ChestQuestionBank, isChestCorrect } from "../src/core/chests/questions";
import { ChestManager, type Chest } from "./chests";
import { Controls } from "./controls";
import { CARDINAL_NAME, Hud } from "./hud";
import { Player } from "./player";
import { QuizUi } from "./quiz";
import { TowerView } from "./towers";
import { cardinalOf, headingDegrees } from "./coords";
import { weaponStats } from "./weapons";
import { World } from "./world";
import { ZombieView } from "./zombies";

export interface Profile {
  name: string;
  level: Difficulty;
  look: LookOptions;
}

const STARTING_WEAPONS: DefenseId[] = ["torre-brillo", "cuarteto-luz", "lanza-eje"];
const TOWERS: DefenseId[] = ["gemelas", "plomada", "brujula-austral", "guia-punteada"];

/** El juego 3D: escena, cámara en tercera persona y el bucle de cada noche. */
export class Game3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  readonly controls: Controls;
  private scene = new THREE.Scene();
  private world!: World;
  private battle!: Battle;
  private zombies!: ZombieView;
  private towers!: TowerView;
  private player!: Player;
  private hud!: Hud;
  private night = 1;
  private profile: Profile = { name: "", level: "beginner", look: DEFAULT_LOOK };
  private yaw = Math.PI / 2;
  private pitch = 0.42;
  private dist = 11;
  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private ended = false;
  private kills = 0;
  private playerDowns = 0;
  private readonly canvas: HTMLCanvasElement;
  private shake = 0;
  private chests!: ChestManager;
  private quiz!: QuizUi;
  private bank = new ChestQuestionBank(createRng(7));
  private modal = false;
  /** Mejoras ganadas en los cofres (valen para el arma en la mano y para la torre del mismo nombre). */
  private levels: Partial<Record<DefenseId, number>> = {};
  private chestsOpened = 0;
  private chestsMissed = 0

  constructor(private readonly root: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "gl";
    root.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.controls = new Controls(this.canvas, root);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize(): void {
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  get config(): DifficultyConfig {
    return this.profile.level === "extreme" ? extremeConfig(0) : difficultyConfigs[this.profile.level];
  }

  /** Empieza (o repite) una noche con el perfil elegido. */
  startNight(night: number, profile: Profile = this.profile): void {
    this.profile = profile;
    this.night = Math.max(1, Math.min(TOTAL_NIGHTS, night));
    this.ended = false;
    this.modal = false;
    if (this.night === 1) {
      this.levels = {};
      this.bank = new ChestQuestionBank(createRng(Date.now() % 100000));
    }
    this.chestsOpened = 0;
    this.chestsMissed = 0;
    this.kills = 0;
    this.playerDowns = 0;
    this.root.querySelector(".hud")?.remove();
    this.root.querySelector(".overlay")?.remove();
    this.scene = new THREE.Scene();
    const map = MAPS[NIGHTS[this.night - 1].map];
    this.world = new World(map, 11 + this.night);
    this.scene.add(this.world.group);
    const cfg = nightConfig(this.night, this.config);
    const towers = TOWERS.slice(0, Math.min(4, 1 + this.night));
    this.battle = new Battle(cfg, { towers, placement: defaultPlacement(towers), map, rescue: false, rng: createRng(100 + this.night) });
    this.zombies = new ZombieView(this.battle);
    this.towers = new TowerView(this.battle);
    this.scene.add(this.zombies.group, this.towers.group);
    this.player = new Player(this.world, this.battle, this.zombies, profile.name, profile.look, {
      onHurt: () => {
        this.shake = 0.35;
        this.hud.say("¡Ay! Un zombi te alcanzó", 1.2);
      },
      onDown: () => {
        this.playerDowns++;
        this.hud.say("¡Te derribaron! Vuelves a la escuela…", 3);
      },
      onRespawn: () => this.hud.say("¡De vuelta al juego!", 1.4),
      onShot: () => undefined,
      onKill: () => this.kills++
    });
    this.player.setWeapons(STARTING_WEAPONS, this.levels);
    for (const t of this.battle.towers) this.battle.setTowerLevel(t.id, this.levels[t.id] ?? 1);
    this.scene.add(this.player.object, this.player.bulletLayer);
    this.chests = new ChestManager(map, createRng(500 + this.night * 13 + Date.now() % 997), this.world.obstacles);
    this.scene.add(this.chests.group);
    for (let i = 0; i < 4; i++) this.chests.spawn();
    this.quiz = new QuizUi(this.root, createRng(Date.now() % 100000), profile.level === "beginner");
    this.hud = new Hud(profile.level !== "extreme", this.controls.isTouch);
    this.root.appendChild(this.hud.el);
    this.world.sky.setLight(0);
    this.scene.background = this.world.sky.bg;
    this.scene.fog = new THREE.Fog(this.world.sky.bg.getHex(), 70, 200);
    this.yaw = Math.PI / 2;
    this.controls.setEnabled(true);
    this.hud.say(`Noche ${this.night}: ${NIGHTS[this.night - 1].name}`, 3);
    if (!this.running) this.start();
  }

  private start(): void {
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private update(dt: number): void {
    this.time += dt;
    const input = this.controls.poll();
    this.yaw -= input.yaw;
    this.pitch = Math.max(0.12, Math.min(1.15, this.pitch + input.pitch));
    if (this.modal) {
      // Con una pregunta abierta el mundo se queda quieto; la cámara sí se puede girar (para «mira hacia el Sur»).
      this.player.update(0, { ...input, moveX: 0, moveY: 0, fire: false }, this.yaw);
    } else if (!this.ended) {
      this.player.update(dt, input, this.yaw);
      this.battle.update(dt);
      this.handleEvents();
      this.handleBattleEnd();
      this.handleChests(input.interactPressed);
    } else {
      this.player.update(dt, { ...input, moveX: 0, moveY: 0, fire: false }, this.yaw);
    }
    this.zombies.update(dt, this.time);
    this.towers.update();
    this.world.update(this.time);
    this.chests.update(this.modal ? 0 : dt, this.time);
    this.zombies.faceCamera(this.camera);
    // Parpadeo del estudiante al recibir un golpe.
    this.player.group.visible = !this.player.blinking;
    this.updateCamera(dt);
    this.updateHud(dt);
  }

  private updateCamera(dt: number): void {
    const target = this.player.position.clone().add(new THREE.Vector3(0, 2.6, 0));
    const offset = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(this.dist);
    const desired = target.clone().add(offset);
    desired.y = Math.max(1.2, desired.y);
    // La cámara no entra en la escuela ni en los árboles.
    for (const o of this.world.obstacles) {
      const dx = desired.x - o.x;
      const dz = desired.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d < o.r + 1 && desired.y < 14 && d > 1e-4) {
        desired.x = o.x + (dx / d) * (o.r + 1);
        desired.z = o.z + (dz / d) * (o.r + 1);
      }
    }
    this.camera.position.lerp(desired, Math.min(1, dt * 12));
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 1.2;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 1.2;
    }
    this.camera.lookAt(target);
  }

  private updateHud(dt: number): void {
    const b = this.battle;
    this.hud.tick(dt);
    this.hud.setSchool(b.baseHealth, b.maxBaseHealth);
    this.hud.setHearts(this.player.hearts);
    const nearest = this.chests.closestAvailable(this.player.position, this.time);
    this.hud.setChests(this.chests.available, nearest ? CARDINAL_NAME[cardinalOf(headingDegrees(nearest.pos.x - this.player.position.x, nearest.pos.z - this.player.position.z))] : null);
    this.hud.setCompass(this.yaw);
    this.hud.setWeapons(this.player.carried, this.player.levels, this.player.current);
    const left = b.pendingSpawns().length + b.activeEnemies().length;
    this.hud.setWave(b.phase === "countdown" ? `La oleada ${b.waveNumber} llega en ${Math.ceil(b.countdown)} s` : `Oleada ${b.waveNumber} de ${b.totalWaves} · quedan ${left} zombis`);
  }

  private handleEvents(): void {
    for (const e of this.battle.drainEvents()) {
      if (e.type === "wave-start" && e.wave > 1 && this.chests.available < 8) {
        this.chests.spawn();
        this.chests.spawn();
        this.hud.say("¡Aparecieron cofres nuevos! Busca las columnas de luz", 3.2);
      }
    }
  }

  /** Cofre cercano: muestra la pista de «E» y, al apretarla, abre la pregunta. */
  private handleChests(interact: boolean): void {
    const near = this.chests.nearest(this.player.position);
    const locked = near && near.lockedUntil > this.time;
    this.hud.setPrompt(near ? (locked ? `🔒 Cofre con candado (${Math.ceil(near.lockedUntil - this.time)} s)` : this.controls.isTouch ? "Toca ✋ para abrir el cofre" : "Presiona E para abrir el cofre") : null);
    if (!near || !interact || this.player.isDown) return;
    if (locked) {
      this.hud.say("El cofre tiene candado. ¡Vuelve en unos segundos!", 1.6);
      return;
    }
    void this.openChest(near);
  }

  private async openChest(chest: Chest): Promise<void> {
    this.modal = true;
    this.controls.setEnabled(false);
    this.hud.setPrompt(null);
    chest.question = chest.question ?? this.bank.drawAny();
    const q = chest.question;
    // Las preguntas de «mira hacia…» necesitan la cámara: se habilita el mouse/dedo pero no el movimiento.
    this.controls.setEnabled(true);
    const heading = () => headingDegrees(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const res = await this.quiz.ask(q, heading);
    if (res.answer === null) {
      this.modal = false;
      return;
    }
    this.controls.setEnabled(false);
    const correct = isChestCorrect(q, res.answer);
    const lock = this.profile.level === "beginner" ? 20 : this.profile.level === "advanced" ? 30 : 45;
    await this.quiz.feedback(q, correct, lock);
    if (correct) {
      this.chestsOpened++;
      chest.question = null;
      this.chests.open(chest);
      await this.chooseUpgrade();
    } else {
      this.chestsMissed++;
      chest.question = null;
      this.chests.lockFor(chest, this.time + lock);
    }
    this.controls.setEnabled(true);
    this.modal = false;
  }

  /** Premio del cofre: sube un nivel un arma o una torre; si todo está al máximo, cura la escuela. */
  private chooseUpgrade(): Promise<void> {
    const ids: DefenseId[] = [...this.player.carried, ...this.battle.towers.map((t) => t.id)];
    const options = ids.filter((id) => (this.levels[id] ?? 1) < 3);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "overlay";
      if (options.length === 0) {
        const heal = Math.round(this.battle.maxBaseHealth * 0.25);
        this.battle.baseHealth = Math.min(this.battle.maxBaseHealth, this.battle.baseHealth + heal);
        overlay.innerHTML = `<div class="card"><h1>¡TODO AL MÁXIMO!</h1><p>Tus armas ya están en nivel 3. El cofre cura la escuela: +${heal} de energía.</p><div class="row"><button class="btn primary" data-ok>SEGUIR</button></div></div>`;
      } else {
        overlay.innerHTML = `<div class="card"><h1>¡COFRE ABIERTO!</h1><p>Elige qué mejorar:</p><div class="upg">${options
          .map((id) => {
            const lv = this.levels[id] ?? 1;
            const a = weaponStats(id, lv);
            const b = weaponStats(id, lv + 1);
            const hand = this.player.carried.includes(id);
            return `<button class="btn" data-up="${id}">${hand ? "🔫" : "🗼"} ${a.name} <span class="st">${"★".repeat(lv)} → ${"★".repeat(lv + 1)} · poder ${Math.round(a.dps)} → ${Math.round(b.dps)}</span></button>`;
          })
          .join("")}</div></div>`;
      }
      overlay.addEventListener("click", (e) => {
        const t = e.target as HTMLElement;
        const up = t.closest<HTMLElement>("[data-up]")?.dataset.up as DefenseId | undefined;
        if (up) {
          this.levels[up] = (this.levels[up] ?? 1) + 1;
          this.player.setWeapons(this.player.carried, this.levels);
          this.battle.setTowerLevel(up, this.levels[up]!);
          this.hud.say(`¡${weaponStats(up, this.levels[up]!).name} subió al nivel ${this.levels[up]}!`, 2.6);
        } else if (!t.closest("[data-ok]")) return;
        overlay.remove();
        resolve();
      });
      this.root.appendChild(overlay);
    });
  }

  private handleBattleEnd(): void {
    const b = this.battle;
    if (b.phase !== "victory" && b.phase !== "defeat") return;
    this.ended = true;
    this.controls.setEnabled(false);
    const win = b.phase === "victory";
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const hasNext = win && this.night < TOTAL_NIGHTS;
    overlay.innerHTML = `<div class="card">
      <h1>${win ? (this.night >= TOTAL_NIGHTS ? "¡LA ESCUELA ESTÁ A SALVO!" : "¡NOCHE GANADA!") : "LA ESCUELA SE QUEDÓ SIN ENERGÍA"}</h1>
      <p>${win ? "Defendiste la escuela con tus armas y tus torres." : "Los zombis llegaron. ¡Inténtalo otra vez, tú puedes!"}</p>
      <div class="stats">
        <div class="stat"><b>${this.kills}</b>zombis derrotados por ti</div>
        <div class="stat"><b>${b.totalDefeated}</b>zombis detenidos en total</div>
        <div class="stat"><b>${Math.round(b.baseHealth)}/${b.maxBaseHealth}</b>energía de la escuela</div>
        <div class="stat"><b>${this.chestsOpened}</b>cofres abiertos</div>
        <div class="stat"><b>${this.playerDowns}</b>veces derribado</div>
      </div>
      <div class="row">
        ${hasNext ? '<button class="btn primary" data-go="next">SIGUIENTE NOCHE</button>' : ""}
        <button class="btn ${hasNext ? "" : "primary"}" data-go="again">${win ? "REPETIR LA NOCHE" : "INTENTAR OTRA VEZ"}</button>
      </div>
    </div>`;
    overlay.addEventListener("click", (e) => {
      const go = (e.target as HTMLElement).closest<HTMLElement>("[data-go]")?.dataset.go;
      if (go === "next") this.startNight(this.night + 1);
      else if (go === "again") this.startNight(this.night);
    });
    this.root.appendChild(overlay);
  }
}
