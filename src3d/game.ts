import * as THREE from "three";
import { Battle, type Enemy } from "../src/core/battle/Battle";
import { recordAnswer, recordNight, topicStats, type Student3 } from "../src/core/students3d";
import { saveStudent3 } from "./store";
import { MAPS } from "../src/core/battle/maps";
import { nightConfig, NIGHTS, TOTAL_NIGHTS } from "../src/core/campaign/nights";
import { ALL_DEFENSES, type DefenseId } from "../src/core/defenses";
import type { BattleMap } from "../src/core/battle/maps";
import { difficultyConfigs, type Difficulty, type DifficultyConfig } from "../src/core/difficulty";
import { extremeConfig } from "../src/core/extreme";
import { defaultPlacement } from "../src/core/placement";
import { createRng } from "../src/core/rng";
import { DEFAULT_LOOK, type LookOptions } from "./character";
import { CHEST_QUESTIONS, ChestQuestionBank, chestCorrectText, isChestCorrect, type ChestQuestion, type ChestTopic } from "../src/core/chests/questions";
import { ChestManager, type Chest } from "./chests";
import { Controls } from "./controls";
import { Effects } from "./effects";
import { pickReview, pickTopic } from "../src/core/adaptive";
import { ENDLESS_REPAIR, cycleNight, endlessScale, endlessWaves } from "../src/core/endless";
import { MissionManager } from "./missions";
import { DAY_STORY, showStory } from "./story";
import { detailOf, loadSettings, saveSettings, type Detail, type Quality, type Settings } from "./settings";
import { NIGHT_WEATHER, WEATHER_INFO, Weather } from "./weather";
import { sfx } from "./sound";
import { ico } from "./icons";
import { CARDINAL_NAME, Hud } from "./hud";
import { Player, type PlayerEvents } from "./player";
import { textSprite } from "./blocks";
import { QuizUi } from "./quiz";
import { TowerView, type TowerLike } from "./towers";
import { cardinalOf, headingDegrees, toWorld } from "./coords";
import { upgradedStats } from "../src/core/campaign/upgrades";
import { MAX_LEVEL, MAX_TOWER_LEVEL, SYNERGIES, activeSynergies, handStats, weaponStats } from "./weapons";
import { ENDLESS_THEMES, World } from "./world";
import { ZombieView } from "./zombies";

export interface Profile {
  name: string;
  level: Difficulty;
  look: LookOptions;
}

const STARTING_WEAPONS: DefenseId[] = ["torre-brillo", "cuarteto-luz", "lanza-eje"];
/** Libera de la tarjeta gráfica lo de una escena que ya no se usa (cada día se arma un mundo nuevo). */
function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      (mat as THREE.MeshBasicMaterial).map?.dispose();
      mat.dispose();
    }
  });
}

/** Jefes de las noches especiales: tipo de zombi, nombre y cuánta vida extra tienen. */
const BOSSES: Record<number, { kind: "resistente" | "doble" | "gigante"; name: string; mult: number }> = {
  3: { kind: "resistente", name: "Rey Relámpago", mult: 3 },
  4: { kind: "doble", name: "Sombra Roja", mult: 3 },
  5: { kind: "gigante", name: "El Gigante sin Estrella", mult: 1.4 }
};

/** Segundos que dura un día (se puede adelantar con el botón de la noche). */
const DAY_SECONDS = 90;

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
  /** Quien juega ahora: su avance se guarda solo. */
  student: Student3 | null = null;
  /** Enciende las cuatro estrellas de la cruz (al terminar la historia). */
  lightAllStars(): void {
    this.world?.sky.setLit(4);
  }

  disposeHud(): void {
    this.hud?.dispose();
  }

  /** Para volver al menú de estudiantes. */
  onMenu: () => void = () => undefined;
  onDiploma: (s: Student3) => void = () => undefined;
  private chestsOpened = 0;
  private chestsMissed = 0;
  private fx = new Effects();
  private combo = 0;
  private comboLeft = 0;
  private dust = 0;
  private lastBase = 0;
  private lowWarn = 0;
  private fov = 62;
  /** Ángulo de visión normal: más abierto con el celular vertical, para ver a los costados. */
  private baseFov = 62;
  private stepTimer = 0;
  private lookIdle = 0;
  private warnedChase = false;
  private seenEnemies = new Set<number>();
  private stompTimer = 0;
  /** Número de la noche en «Noches sin fin» (0 = historia). */
  endless = 0;
  private endlessSchool = 0;
  /** Carga del poder estelar (0 a 1). */
  private power = 0;
  private bossId: number | null = null;
  private bossDone = false;
  /** Preguntas que falló en esta noche, para repasarlas al terminar. */
  private missed: ChestQuestion[] = [];
  settings: Settings = loadSettings();
  /** Nivel de detalle que va eligiendo el juego solo según qué tan fluido va (2 = alto, 0 = bajo). */
  private autoLevel: Detail = 2;
  private fpsEma = 60;
  private fpsTimer = 0;
  private pauseEl: HTMLElement | null = null;
  private missions!: MissionManager;
  private missionNext = 0;
  private weather = new Weather("clear");
  private phase: "day" | "night" = "day";
  private dayLeft = 0;
  private light = 0;
  private map!: BattleMap;
  private placed: Partial<Record<DefenseId, number>> = {};
  private hand: DefenseId[] = [...STARTING_WEAPONS];
  private markers = new THREE.Group();
  private slotArrows: THREE.Mesh[] = [];
  private chestPromptActive = false;

  constructor(private readonly root: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "gl";
    root.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.controls = new Controls(this.canvas, root);
    // Las sombras suaves gastan batería: en celulares y tablets se queda solo la sombra redonda bajo los pies.
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.autoLevel = this.controls.isTouch ? 1 : 2;
    this.applyDetail();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("keydown", (e) => {
      if ((e.code === "Escape" || e.code === "KeyP") && (e.target as HTMLElement)?.tagName !== "INPUT" && this.running && this.root.querySelector(".hud")) {
        if (this.pauseEl) this.closePause();
        else this.openPause();
        return;
      }
      if (e.code === "KeyN" && (e.target as HTMLElement)?.tagName !== "INPUT" && this.phase === "day" && this.running && !this.ended && this.root.querySelector(".hud")) this.beginNight();
    });
    this.resize();
  }

  private resize(): void {
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Con el celular vertical la pantalla es angosta: se abre la vista para no perder lo que está a los costados.
    this.baseFov = this.camera.aspect < 1 ? 62 + (1 - this.camera.aspect) * 34 : 62;
    this.fov = this.baseFov;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  get config(): DifficultyConfig {
    return this.profile.level === "extreme" ? extremeConfig(this.student?.ease ?? 0) : difficultyConfigs[this.profile.level];
  }

  /** Arma las cosas de un día nuevo: el mundo, el estudiante, los cofres y la interfaz. La batalla de verdad empieza al caer la noche. */
  startDay(night: number, profile: Profile = this.profile, keep = false): void {
    this.profile = profile;
    this.night = this.endless > 0 ? cycleNight(this.endless) : Math.max(1, Math.min(TOTAL_NIGHTS, night));
    this.ended = false;
    this.modal = false;
    this.phase = "day";
    this.dayLeft = this.endless > 0 ? 55 : DAY_SECONDS;
    if (this.night === 1 && !keep) {
      this.levels = {};
      this.placed = {};
      this.hand = [...STARTING_WEAPONS];
      this.bank = new ChestQuestionBank(createRng(Date.now() % 100000));
    }
    this.chestsOpened = 0;
    this.chestsMissed = 0;
    this.kills = 0;
    this.playerDowns = 0;
    this.combo = 0;
    this.comboLeft = 0;
    this.dust = 0;
    this.lowWarn = 0;
    this.warnedChase = false;
    this.bossId = null;
    this.bossDone = false;
    this.seenEnemies = new Set();
    this.missed = [];
    this.light = 0;
    this.fx = new Effects();
    this.hud?.dispose();
    this.root.querySelector(".hud")?.remove();
    this.root.querySelector(".overlay")?.remove();
    disposeScene(this.scene);
    this.scene = new THREE.Scene();
    const map = MAPS[NIGHTS[this.night - 1].map];
    this.map = map;
    this.world = new World(map, 11 + this.night + this.endless * 3, this.endless > 0 ? ENDLESS_THEMES[(this.endless - 1) % ENDLESS_THEMES.length] : undefined);
    this.scene.add(this.world.group);
    // De día no hay zombis: una batalla vacía y quieta mantiene al estudiante y a las torres funcionando.
    this.battle = new Battle(nightConfig(this.night, this.config), { towers: [], placement: {}, map, rescue: false, rng: createRng(100 + this.night) });
    this.zombies = new ZombieView(this.battle);
    this.towers = new TowerView(this.placedTowers());
    this.scene.add(this.zombies.group, this.towers.group, this.fx.group);
    this.zombies.onDamaged = (at, amount, kind) => this.fx.burst(at, kind === "gigante" ? 0xb04a3a : 0x8fd16b, Math.min(6, 2 + Math.floor(amount / 4)), 3.5, 0.16);
    this.towers.onTrail = (at, color) => this.fx.burst(at, color, 1, 0.5, 0.1, 0);
    this.player = new Player(this.world, this.battle, this.zombies, profile.name, profile.look, this.playerEvents());
    this.player.setWeapons(this.hand, this.levels);
    this.scene.add(this.player.object, this.player.bulletLayer);
    this.chests = new ChestManager(map, createRng(500 + this.night * 13 + (Date.now() % 997)), this.world.obstacles);
    this.scene.add(this.chests.group);
    for (let i = 0; i < 5; i++) this.chests.spawn();
    this.buildMarkers();
    // Misión de orientación del día: la bandera solo se ve de cerca (más lejos en Principiante).
    this.missions = new MissionManager(map, createRng(900 + this.night * 31 + (Date.now() % 977)), this.world.obstacles, this.world.school.position.clone(), profile.level === "beginner" ? 46 : 24, profile.level !== "beginner");
    this.scene.add(this.missions.group);
    this.missions.next();
    this.missionNext = 0;
    this.weather.dispose();
    this.weather = new Weather(NIGHT_WEATHER[this.night - 1]);
    this.weather.onThunder = () => sfx.thunder();
    this.scene.add(this.weather.group);
    this.quiz = new QuizUi(this.root, createRng(Date.now() % 100000), profile.level === "beginner");
    this.hud = new Hud(profile.level !== "extreme", this.controls.isTouch, map, () => sfx.toggle(), sfx.enabled, () => sfx.toggleVoice(), sfx.voiceOn, () => this.openPause());
    this.root.appendChild(this.hud.el);
    this.hud.setNightButton(() => this.beginNight());
    this.hud.onSlot = (i) => (this.controls.state.swapPressed = i + 1);
    this.applySettings();
    this.lastBase = this.battle.baseHealth;
    this.world.sky.setLight(0, 0);
    this.world.sky.setShadowCaster("sun");
    this.scene.background = this.world.sky.bg;
    this.scene.fog = new THREE.Fog(this.world.sky.bg.getHex(), 70, 200);
    this.yaw = Math.PI / 2;
    this.controls.setEnabled(true);
    sfx.startMusic3("day", this.night);
    this.hud.announce(`DÍA ${this.night}`, 2.4);
    this.hud.say(this.night === 1 ? "Antes de la noche: pon torres en los pedestales, elige tus armas en la escuela y abre cofres" : "Prepara la defensa: torres, armas y cofres", 5);
    sfx.sunrise();
    // En pantallas táctiles, una pista para mirar alrededor (solo la primera vez).
    if (this.controls.isTouch) {
      try {
        if (!localStorage.getItem("cruz3-pista-mirar")) {
          localStorage.setItem("cruz3-pista-mirar", "1");
          window.setTimeout(() => this.hud.say("Arrastra un dedo en la parte derecha de la pantalla para mirar alrededor", 5), 2500);
        }
      } catch {
        /* sin almacenamiento */
      }
    }
    // Las estrellas de la Cruz del Sur que ya se ganaron están encendidas.
    const won = this.student ? new Set(this.student.results.filter((r) => r.victory).map((r) => r.night)).size : Math.max(0, this.night - 1);
    this.world.sky.setLit(Math.min(4, won));
    // Fase de la Luna de cada noche (las de luna roja son lunas llenas).
    this.world.sky.setMoonPhase([1, 0.78, 0.5, 1, 1][this.night - 1] ?? 1);
    const st = this.student;
    if (this.endless > 0) {
      this.hud.announce(`NOCHE ${this.endless} SIN FIN`, 2.2);
      sfx.speakAcrux(`Noche ${this.endless}. Los zombis son más fuertes. ¿Hasta dónde llegas?`);
    } else if (st && this.settings.story && (st.storySeen ?? 0) < this.night) {
      this.modal = true;
      this.controls.setEnabled(false);
      void showStory(this.root, DAY_STORY[this.night - 1], st.name, (t) => sfx.speakAcrux(t)).then(() => {
        st.storySeen = this.night;
        this.persist();
        this.modal = false;
        this.controls.setEnabled(true);
      });
    } else {
      sfx.speakAcrux(this.night === 1 ? "Hola. Antes de la noche, pon torres en los pedestales, elige tus armas en la escuela y abre cofres." : `Día ${this.night}. Prepara tu defensa y busca la bandera de la misión.`);
    }
    if (!this.running) this.start();
  }

  /** Empieza o continúa la partida de un estudiante guardado: vuelve a su día, sus armas y sus torres. */
  startStudent(student: Student3, night = student.night): void {
    this.endless = 0;
    this.student = student;
    this.levels = { ...student.levels } as Partial<Record<DefenseId, number>>;
    this.hand = student.hand.length >= 2 ? ([...student.hand] as DefenseId[]) : [...STARTING_WEAPONS];
    this.placed = { ...student.placed } as Partial<Record<DefenseId, number>>;
    this.bank = new ChestQuestionBank(createRng(Date.now() % 100000));
    this.startDay(Math.min(TOTAL_NIGHTS, Math.max(1, night)), { name: student.name, level: student.level, look: student.look }, true);
  }

  /** «Noches sin fin»: se desbloquea al terminar la historia. Se conservan las armas y mejoras ganadas. */
  startEndless(student: Student3): void {
    this.student = student;
    this.levels = { ...student.levels } as Partial<Record<DefenseId, number>>;
    this.hand = student.hand.length >= 2 ? ([...student.hand] as DefenseId[]) : [...STARTING_WEAPONS];
    this.placed = { ...student.placed } as Partial<Record<DefenseId, number>>;
    this.bank = new ChestQuestionBank(createRng(Date.now() % 100000));
    this.endless = 1;
    this.endlessSchool = 0;
    this.startDay(1, { name: student.name, level: student.level, look: student.look }, true);
  }

  /** Fin de una noche sin fin: gana y sigue, o pierde y se guarda la racha. */
  private endlessEnd(win: boolean): void {
    const b = this.battle;
    const st = this.student;
    const survived = win ? this.endless : this.endless - 1;
    const record = !!st && survived > (st.endlessBest ?? 0);
    if (st && record) {
      st.endlessBest = survived;
      this.persist();
    }
    this.hud.setNightButton(null);
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<div class="card">
      <h1>${win ? `¡Noche ${this.endless} superada!` : "La escuela cayó"}</h1>
      <p>${win ? "Los zombis vienen más fuertes. Repara, mejora y prepárate." : `Resististe ${survived} ${survived === 1 ? "noche" : "noches"} seguidas.`}</p>
      ${record ? '<p class="note">¡Nuevo récord personal!</p>' : st?.endlessBest ? `<p class="note">Tu mejor racha: ${st.endlessBest} noches.</p>` : ""}
      <div class="stats">
        <div class="stat"><b>${this.kills}</b>zombis derrotados por ti</div>
        <div class="stat"><b>${b.totalDefeated}</b>zombis detenidos</div>
        <div class="stat"><b>${Math.round(b.baseHealth)}/${b.maxBaseHealth}</b>energía de la escuela</div>
      </div>
      <div class="row">${win ? '<button class="btn primary" data-go="next">Siguiente noche</button>' : '<button class="btn primary" data-go="again">Empezar de nuevo</button>'}<button class="btn" data-go="menu">Salir al menú</button></div>
    </div>`;
    overlay.addEventListener("click", (e) => {
      const go = (e.target as HTMLElement).closest<HTMLElement>("[data-go]")?.dataset.go;
      if (go === "next") {
        this.endlessSchool = b.baseHealth;
        this.endless++;
        this.startDay(cycleNight(this.endless), this.profile, true);
      } else if (go === "again" && st) this.startEndless(st);
      else if (go === "menu") {
        overlay.remove();
        this.endless = 0;
        this.onMenu();
      }
    });
    this.root.appendChild(overlay);
  }

  /** Guarda el avance del estudiante (armas, mejoras y torres incluidas). */
  private persist(): void {
    const s = this.student;
    if (!s) return;
    s.levels = { ...this.levels } as Record<string, number>;
    s.hand = [...this.hand];
    s.placed = { ...this.placed } as Record<string, number>;
    s.updatedAt = Date.now();
    saveStudent3(s);
  }

  /** Compatibilidad: empezar «una noche» es empezar su día. */
  startNight(night: number, profile: Profile = this.profile): void {
    this.startDay(night, profile);
  }

  private playerEvents(): PlayerEvents {
    return {
      onHurt: () => {
        this.shake = 0.35;
        this.combo = 0;
        this.hud.flashScreen("hurt");
        this.hud.say("¡Cuidado! Un zombi te alcanzó", 1.2);
        sfx.hit();
      },
      onDown: () => {
        this.playerDowns++;
        this.hud.say("Te derribaron. Reapareces en la escuela…", 3);
        sfx.wrong();
      },
      onRespawn: () => {
        this.hud.say("¡De vuelta al juego!", 1.4);
        sfx.sparkle();
        this.fx.ring(this.player.position, 0xffffff, 5, 0.6);
      },
      onShot: (id) => {
        sfx.weapon(id);
        const a = this.player.heading;
        const muzzle = new THREE.Vector3(this.player.position.x + Math.sin(a) * 1.1, this.player.position.y + 2.0, this.player.position.z + Math.cos(a) * 1.1);
        this.fx.burst(muzzle, weaponStats(id, 1).color, 3, 3, 0.14, 0);
      },
      onHit: (at, damage, color) => {
        this.fx.burst(at, color, 4, 4, 0.15);
        this.fx.float(at.clone().setY(at.y + 1.2), String(Math.max(1, Math.round(damage))), "#fff3b0", 1.1);
      },
      onKill: (at, big) => {
        this.kills++;
        this.power = Math.min(1, this.power + 0.025);
        this.combo++;
        this.comboLeft = 3;
        this.fx.zombieDown(at.clone().setY(0), big);
        if (big) this.shake = 0.5;
        if (this.combo % 5 === 0) {
          this.hud.announce(`¡RACHA x${this.combo}!`, 1.4);
          sfx.energy();
          const heal = Math.min(this.battle.maxBaseHealth - this.battle.baseHealth, 3 + this.combo);
          if (heal > 0) {
            this.battle.baseHealth += heal;
            this.fx.float(this.player.position.clone().setY(4.2), `+${Math.round(heal)} energía`, "#8ff7cd", 1.5);
          }
        }
      },
      onDash: () => {
        sfx.whoosh();
        this.fx.burst(this.player.position.clone().setY(0.6), 0xffffff, 8, 3, 0.2, 2);
        this.fov = this.baseFov + 12;
      },
      onTrail: (at, color) => this.fx.burst(at, color, 1, 0.6, 0.12, 0),
      onExplode: (at, size, color) => {
        this.fx.ring(at.clone().setY(0), color, size * 1.6, 0.4);
        this.fx.burst(at, color, 12, 7, 0.24);
        this.shake = Math.max(this.shake, 0.18);
      }
    };
  }

  // ---------------- Armas y torres ----------------

  /** Las armas que ya tiene el estudiante: dos nuevas cada vez que cae una noche, desde cuatro. */
  private unlocked(): DefenseId[] {
    return ALL_DEFENSES.slice(0, this.endless > 0 ? ALL_DEFENSES.length : 3 + this.night).map((d) => d.id);
  }

  private towerLimit(): number {
    return Math.min(this.world.slots.length, this.endless > 0 ? 3 + Math.floor(this.endless / 2) : 1 + this.night);
  }

  /** Torres colocadas, listas para dibujar (quietas, de día). */
  private placedTowers(): TowerLike[] {
    const out: TowerLike[] = [];
    for (const [id, slot] of Object.entries(this.placed) as [DefenseId, number][]) {
      const info = ALL_DEFENSES.find((d) => d.id === id);
      const at = this.map.slots[slot];
      if (info && at) out.push({ id, behavior: info.behavior, x: at.x, y: at.y, aim: Math.PI, flash: 0, level: Math.min(MAX_TOWER_LEVEL, this.levels[id] ?? 1) });
    }
    return out;
  }

  /** Flechas doradas sobre los pedestales vacíos y un cartel en la escuela. */
  private buildMarkers(): void {
    this.markers = new THREE.Group();
    this.slotArrows = this.world.slots.map((p) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 4), new THREE.MeshBasicMaterial({ color: 0xffd54a }));
      m.rotation.x = Math.PI;
      m.position.set(p.x, 3.4, p.z);
      this.markers.add(m);
      return m;
    });
    const label = textSprite("Armería (E)", { color: "#fff3b0", bg: "rgba(20,30,70,0.8)", size: 5 });
    label.position.set(this.world.school.position.x, 11, this.world.school.position.z);
    this.markers.add(label);
    this.scene.add(this.markers);
  }

  private rangeRing: THREE.Mesh | null = null;

  /** Muestra (o esconde, con null) el círculo de alcance de una torre en el suelo. */
  private showRange(at: THREE.Vector3 | null, radius = 0, color = "#ffffff"): void {
    if (!at) {
      if (this.rangeRing) this.rangeRing.visible = false;
      return;
    }
    if (!this.rangeRing || this.rangeRing.parent !== this.scene) {
      this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      this.rangeRing.rotation.x = -Math.PI / 2;
      this.scene.add(this.rangeRing);
    }
    this.rangeRing.visible = true;
    this.rangeRing.position.set(at.x, 0.15, at.z);
    this.rangeRing.scale.setScalar(radius);
    (this.rangeRing.material as THREE.MeshBasicMaterial).color.set(color);
  }

  private nearestSlot(): number {
    let best = -1;
    let bestD = 4.6;
    this.world.slots.forEach((p, i) => {
      const d = Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  private nearArmory(): boolean {
    const sp = this.world.school.position;
    return Math.hypot(sp.x - this.player.position.x, sp.z - this.player.position.z) < 15;
  }

  private slotOwner(slot: number): DefenseId | null {
    const e = (Object.entries(this.placed) as [DefenseId, number][]).find(([, s]) => s === slot);
    return e ? e[0] : null;
  }

  private refreshPlaced(): void {
    this.towers.rebuild(this.placedTowers());
  }

  /** Menú de un pedestal: poner una torre, cambiarla o quitarla. */
  private openSlotMenu(slot: number): Promise<void> {
    return this.pick((close) => {
      const owner = this.slotOwner(slot);
      const count = Object.keys(this.placed).length;
      const limit = this.towerLimit();
      const rows = this.unlocked()
        .map((id) => {
          const st = weaponStats(id, this.levels[id] ?? 1);
          const at = this.placed[id];
          const here = at === slot;
          const blocked = at === undefined && owner === null && count >= limit;
          const note = here ? "está aquí" : at !== undefined ? "está en otro pedestal: se cambia" : blocked ? `máximo ${limit} torres` : "";
          return `<button class="btn ${here ? "on" : ""}" data-t="${id}" ${blocked ? "disabled" : ""}><span class="sw" style="background:${st.color}"></span>${st.name} ${"★".repeat(this.levels[id] ?? 1)}<small>${note}</small></button>`;
        })
        .join("");
      return {
        html: `<h1>${ico("tower", 34)} Pedestal</h1><p>Elige la torre para este lugar (${count}/${limit} torres puestas). Las torres disparan solas de noche.</p><div class="pick">${rows}</div><div class="row">${owner ? '<button class="btn" data-rm>QUITAR LA TORRE</button>' : ""}<button class="btn primary" data-ok>LISTO</button></div>`,
        onClick: (t) => {
          const id = t.closest<HTMLElement>("[data-t]")?.dataset.t as DefenseId | undefined;
          if (id) {
            const from = this.placed[id];
            if (owner && owner !== id) {
              if (from !== undefined) this.placed[owner] = from;
              else delete this.placed[owner];
            }
            this.placed[id] = slot;
            this.refreshPlaced();
            this.persist();
            sfx.unlock();
            this.fx.ring(this.world.slots[slot], weaponStats(id, 1).color, 5, 0.6);
            sfx.place();
            this.hud.say(`${weaponStats(id, 1).name} colocada`, 1.6);
            return true;
          }
          if (t.closest("[data-rm]") && owner) {
            delete this.placed[owner];
            this.refreshPlaced();
            this.persist();
            sfx.click();
            return true;
          }
          if (t.closest("[data-ok]")) close();
          return false;
        }
      };
    });
  }

  /** Armería de la escuela: de 2 a 3 armas para llevar en la mano. */
  private openArmory(): Promise<void> {
    let chosen = [...this.hand];
    return this.pick((close) => {
      const rows = this.unlocked()
        .map((id) => {
          const st = handStats(id, this.levels[id] ?? 1, chosen.includes(id) ? chosen : [...chosen, id]);
          const n = chosen.indexOf(id);
          return `<button class="btn ${n >= 0 ? "on" : ""}" data-w="${id}"><span class="sw" style="background:${st.color}"></span>${n >= 0 ? `${n + 1}. ` : ""}${st.name} ${"★".repeat(this.levels[id] ?? 1)}<small>poder ${Math.round(st.dps)}</small></button>`;
        })
        .join("");
      const ok = chosen.length >= 2 && chosen.length <= 3;
      const active = activeSynergies(chosen);
      const combos = SYNERGIES.filter((s) => s.ids.every((id) => this.unlocked().includes(id)))
        .map((s) => `<li class="${active.includes(s) ? "on" : ""}">${active.includes(s) ? "✔ " : ""}<b>${s.name}</b>: ${s.ids.map((i) => weaponStats(i, 1).name).join(" + ")} · ${s.text}</li>`)
        .join("");
      return {
        html: `<h1>${ico("shield", 34)} Armería</h1><p>Elige de 2 a 3 armas para llevar en la mano (teclas 1, 2 y 3). Elegidas: ${chosen.length}</p><div class="pick">${rows}</div><ul class="combos"><li class="hd">Combos (llevando las dos armas juntas)</li>${combos}</ul><div class="row"><button class="btn primary" data-ok ${ok ? "" : "disabled"}>LISTO</button></div>`,
        onClick: (t) => {
          const id = t.closest<HTMLElement>("[data-w]")?.dataset.w as DefenseId | undefined;
          if (id) {
            if (chosen.includes(id)) chosen = chosen.filter((x) => x !== id);
            else chosen = [...chosen, id].slice(-3);
            sfx.click();
            return true;
          }
          if (t.closest("[data-ok]") && ok) {
            this.hand = chosen;
            this.player.setWeapons(this.hand, this.levels);
            this.player.current = 0;
            this.persist();
            sfx.unlock();
            close();
          }
          return false;
        }
      };
    });
  }

  /** Ventana con botones que se redibuja cuando `onClick` devuelve true. */
  private pick(build: (close: () => void) => { html: string; onClick: (target: HTMLElement) => boolean }): Promise<void> {
    this.modal = true;
    this.controls.setEnabled(false);
    this.hud.setPrompt(null);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "overlay";
      const close = () => {
        overlay.remove();
        this.controls.setEnabled(true);
        this.modal = false;
        resolve();
      };
      let current = build(close);
      const paint = () => {
        current = build(close);
        overlay.innerHTML = `<div class="card">${current.html}</div>`;
      };
      paint();
      overlay.addEventListener("click", (e) => {
        if (current.onClick(e.target as HTMLElement)) paint();
      });
      this.root.appendChild(overlay);
    });
  }

  /** De día: acercarse a un pedestal o a la escuela muestra la pista de «E». */
  private handleDayInteract(interact: boolean): void {
    this.showRange(null);
    if (this.chestPromptActive) return;
    const slot = this.nearestSlot();
    const armory = slot < 0 && this.nearArmory();
    const key = this.controls.isTouch ? `Toca ${ico("hand", 16)}` : `Presiona <kbd>E</kbd>`;
    if (slot >= 0) this.hud.setPrompt(`${key} para ${this.slotOwner(slot) ? "cambiar o quitar la torre" : "poner una torre aquí"}`);
    // Junto a una torre se ve hasta dónde dispara.
    const owner = slot >= 0 ? this.slotOwner(slot) : null;
    if (owner) {
      const d = ALL_DEFENSES.find((x) => x.id === owner)!;
      const r = upgradedStats({ damage: d.damage, range: d.range, reload: d.reload }, Math.min(MAX_TOWER_LEVEL, this.levels[owner] ?? 1)).range * 0.1;
      this.showRange(this.world.slots[slot], r, d.color);
    }
    else if (armory) this.hud.setPrompt(`${key} para elegir tus armas`);
    if (!interact || this.player.isDown) return;
    if (slot >= 0) void this.openSlotMenu(slot);
    else if (armory) void this.openArmory();
  }

  /** Cae la noche: se crea la batalla con las torres que pusiste. */
  private beginNight(): void {
    if (this.phase !== "day" || this.modal) return;
    this.phase = "night";
    if (Object.keys(this.placed).length === 0) {
      // Sin torres sería muy difícil: se ponen las dos primeras en sus lugares recomendados.
      this.placed = defaultPlacement(this.unlocked().slice(0, 2)) as Partial<Record<DefenseId, number>>;
      this.hud.say("No pusiste torres, así que colocamos dos para empezar", 3.5);
    }
    // Si vienen más torres de las permitidas esta noche (por ejemplo, desde «Noches sin fin»), se quitan las sobrantes.
    const limit = this.towerLimit();
    for (const extra of (Object.keys(this.placed) as DefenseId[]).slice(limit)) delete this.placed[extra];
    const ids = Object.keys(this.placed) as DefenseId[];
    const base = nightConfig(this.night, this.config);
    // La luna roja pone a los zombis un poco más fuertes.
    let cfg = this.night === 4 ? { ...base, enemyHealthMultiplier: base.enemyHealthMultiplier * 1.08 } : base;
    if (this.endless > 0) {
      // Noches sin fin: oleadas generadas, zombis cada vez más fuertes y la escuela se repara solo en parte.
      const sc = endlessScale(this.endless);
      const waves = endlessWaves(this.endless);
      cfg = { ...this.config, waves, totalEnemies: waves.reduce((n, w) => n + w.length, 0), enemyHealthMultiplier: this.config.enemyHealthMultiplier * sc.health, enemySpeedMultiplier: this.config.enemySpeedMultiplier * sc.speed };
    }
    // El jefe de las noches 3 y 4 llega al final de la última oleada (en la 5 ya viene el gigante).
    const boss = BOSSES[this.night];
    if (boss && this.night < 5 && (this.endless === 0 || this.endless % 5 !== 0)) {
      const waves = cfg.waves.map((w) => [...w]);
      waves[waves.length - 1].push(boss.kind);
      cfg = { ...cfg, waves, totalEnemies: cfg.totalEnemies + 1 };
    }
    this.battle = new Battle(cfg, { towers: ids, placement: this.placed, map: this.map, rescue: false, rng: createRng(100 + this.night) });
    for (const t of this.battle.towers) this.battle.setTowerLevel(t.id, Math.min(MAX_TOWER_LEVEL, this.levels[t.id] ?? 1));
    if (this.endless > 1 && this.endlessSchool > 0) this.battle.baseHealth = Math.min(this.battle.maxBaseHealth, this.endlessSchool + this.battle.maxBaseHealth * ENDLESS_REPAIR);
    this.zombies.setBattle(this.battle);
    this.towers.bind(this.battle, this.battle.towers);
    this.player.setBattle(this.battle);
    this.markers.visible = false;
    this.showRange(null);
    this.world.sky.setShadowCaster("moon");
    this.missions.clear();
    this.hud.setMission(null);
    const kind = NIGHT_WEATHER[this.night - 1];
    const info = WEATHER_INFO[kind];
    this.hud.say(`${info.title}: ${info.tip}`, 5);
    sfx.speakAcrux(`${info.title}. ${info.tip}`);
    if (kind === "redmoon") (this.world.sky.moon.material as THREE.MeshBasicMaterial).color.setHex(0xff6a50);
    if (kind === "giant") (this.world.sky.moon.material as THREE.MeshBasicMaterial).color.setHex(0xff4a3a);
    // Las noches especiales traen un cofre estelar: hay que mirar hacia un punto cardinal para abrirlo.
    if (kind !== "clear") this.chests.spawnSpecial();
    this.hud.setNightButton(null);
    this.hud.setPrompt(null);
    this.lastBase = this.battle.baseHealth;
    this.hud.announce(`NOCHE ${this.night}`, 2.4);
    this.hud.say(`${NIGHTS[this.night - 1].name}: ¡defiende la escuela!`, 3);
    sfx.nightfall();
    sfx.startMusic3("night", this.night);
    if (kind === "storm" || kind === "giant") sfx.rain(true);
  }

  private start(): void {
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.trackFps((now - this.last) / 1000);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Si el juego va lento, baja solo el detalle gráfico (solo en la calidad «automática»). */
  private trackFps(raw: number): void {
    if (raw <= 0 || raw > 1 || document.hidden) return;
    this.fpsEma = this.fpsEma * 0.96 + (1 / raw) * 0.04;
    this.fpsTimer += raw;
    if (this.fpsTimer < 3 || this.time < 6) return;
    this.fpsTimer = 0;
    if (this.settings.quality === "auto" && this.autoLevel > 0 && this.fpsEma < 34 && !this.modal) {
      this.autoLevel = (this.autoLevel - 1) as Detail;
      this.fpsEma = 60;
      this.applyDetail();
      this.hud?.say("Bajamos un poco los gráficos para que el juego vaya más fluido", 3.5);
    }
  }

  /** Aplica el nivel de detalle: resolución, sombras, adornos y cantidad de partículas. */
  private applyDetail(): void {
    const d = detailOf(this.settings.quality, this.autoLevel);
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(d === 2 ? Math.min(2, dpr) : d === 1 ? Math.min(1.5, dpr) : 1);
    const shadows = d === 2 || (d === 1 && !this.controls.isTouch);
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const mat of Array.isArray(m) ? m : m ? [m] : []) mat.needsUpdate = true;
      });
    }
    if (this.fx) this.fx.maxParticles = [90, 180, 260][d];
    this.world?.setLowDetail(d === 0);
    this.resize();
  }

  /** Aplica los ajustes de accesibilidad y ayudas. */
  private applySettings(): void {
    this.root.classList.toggle("big-text", this.settings.bigText);
    this.root.classList.toggle("big-touch", this.settings.bigTouch);
    if (this.player) this.player.autoFire = this.settings.autoFire;
    if (this.hud) this.hud.reducedMotion = this.settings.reducedMotion;
    this.applyDetail();
  }

  /** Menú de pausa y ajustes. */
  openPause(): void {
    if (this.pauseEl || this.modal || this.ended) return;
    this.modal = true;
    this.controls.setEnabled(false);
    const s = this.settings;
    const v = sfx.volumes;
    const el = document.createElement("div");
    el.className = "overlay";
    const check = (id: string, label: string, on: boolean) => `<label class="opt-row"><input type="checkbox" id="${id}" ${on ? "checked" : ""} /> ${label}</label>`;
    el.innerHTML = `<div class="card settings">
      <h1>${ico("pause", 30)} Pausa</h1>
      <div class="set-grid">
        <label>Música <input type="range" id="s-music" min="0" max="100" value="${Math.round(v.music * 100)}" /></label>
        <label>Efectos <input type="range" id="s-sfx" min="0" max="100" value="${Math.round(v.sfx * 100)}" /></label>
        <label>Cámara <input type="range" id="s-sens" min="50" max="200" value="${Math.round(s.sensitivity * 100)}" /></label>
        <label>Gráficos <select id="s-quality"><option value="auto">Automático</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja (más fluido)</option></select></label>
      </div>
      <div class="set-checks">
        ${check("s-big", "Letra grande", s.bigText)}
        ${check("s-auto", "Disparar solo cuando hay un zombi a tiro", s.autoFire)}
        ${check("s-calm", "Menos movimiento (sin temblores ni relámpagos)", s.reducedMotion)}
        ${check("s-touch", "Botones táctiles grandes", s.bigTouch)}
        ${check("s-story", "Contar la historia de Acrux cada día", s.story)}
        ${check("s-follow", "La cámara se acomoda sola detrás al caminar", s.followCam ?? this.controls.isTouch)}
      </div>
      <div class="row"><button class="btn primary" data-resume>Seguir jugando</button><button class="btn" data-exit>Salir al menú</button></div>
      <p class="note">Esc o P para pausar o seguir.</p>
    </div>`;
    (el.querySelector("#s-quality") as HTMLSelectElement).value = s.quality;
    const get = <T extends HTMLElement>(id: string) => el.querySelector<T>(`#${id}`)!;
    const apply = () => {
      this.settings = {
        quality: get<HTMLSelectElement>("s-quality").value as Quality,
        sensitivity: Number(get<HTMLInputElement>("s-sens").value) / 100,
        bigText: get<HTMLInputElement>("s-big").checked,
        autoFire: get<HTMLInputElement>("s-auto").checked,
        reducedMotion: get<HTMLInputElement>("s-calm").checked,
        bigTouch: get<HTMLInputElement>("s-touch").checked,
        story: get<HTMLInputElement>("s-story").checked,
        followCam: get<HTMLInputElement>("s-follow").checked
      };
      saveSettings(this.settings);
      sfx.setVolumes(Number(get<HTMLInputElement>("s-music").value) / 100, Number(get<HTMLInputElement>("s-sfx").value) / 100);
      this.applySettings();
    };
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
    el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-resume]")) this.closePause();
      else if (t.closest("[data-exit]") && confirm("¿Salir al menú? Tu avance de los días anteriores ya está guardado.")) {
        el.remove();
        this.pauseEl = null;
        this.onMenu();
      }
    });
    this.root.appendChild(el);
    this.pauseEl = el;
  }

  private closePause(): void {
    this.pauseEl?.remove();
    this.pauseEl = null;
    this.modal = false;
    this.controls.setEnabled(true);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private update(dt: number): void {
    this.time += dt;
    const input = this.controls.poll();
    // Pasitos mientras corre por el suelo.
    this.stepTimer -= dt;
    if (!this.modal && Math.hypot(input.moveX, input.moveY) > 0.2 && this.player.position.y < 0.2 && !this.player.isDown && this.stepTimer <= 0) {
      this.stepTimer = 0.3;
      sfx.step();
    }
    this.yaw -= input.yaw * this.settings.sensitivity;
    // Cámara que sigue: al caminar sin mover la cámara, se acomoda despacio detrás del estudiante.
    this.lookIdle = input.yaw !== 0 || input.pitch !== 0 ? 0 : this.lookIdle + dt;
    const follow = this.settings.followCam ?? this.controls.isTouch;
    if (follow && !this.modal && !input.fire && this.lookIdle > 0.6 && Math.hypot(input.moveX, input.moveY) > 0.3 && this.player) {
      let d = this.player.heading + Math.PI - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 1.6);
    }
    this.pitch = Math.max(0.12, Math.min(1.15, this.pitch + input.pitch * this.settings.sensitivity));
    if (this.modal) {
      // Con una pregunta abierta el mundo se queda quieto; la cámara sí se puede girar (para «mira hacia el Sur»).
      this.player.update(0, { ...input, moveX: 0, moveY: 0, fire: false }, this.yaw);
    } else if (this.phase === "day") {
      this.player.update(dt, input, this.yaw);
      this.dayLeft -= dt;
      this.handleMissions(dt);
      if (this.dayLeft <= 0) this.beginNight();
      this.hud.setPrompt(null);
      this.handleChests(input.interactPressed, true);
      if (!this.modal && this.phase === "day") this.handleDayInteract(input.interactPressed);
    } else if (!this.ended) {
      this.player.update(dt, input, this.yaw);
      this.battle.update(dt);
      this.handlePickups();
      this.updateBoss();
      this.zombieSounds(dt);
      if (input.powerPressed) this.usePower();
      this.handleSchoolDamage();
      this.handleEvents();
      this.handleBattleEnd();
      this.handleChests(input.interactPressed, false);
    } else {
      this.player.update(dt, { ...input, moveX: 0, moveY: 0, fire: false }, this.yaw);
    }
    // De noche los zombis cercanos persiguen al estudiante; la escuela es un lugar seguro.
    const sp = this.world.school.position;
    const safe = Math.hypot(sp.x - this.player.position.x, sp.z - this.player.position.z) < 13;
    this.zombies.setChase(this.phase === "night" && !this.ended && !this.modal && !this.player.isDown && !safe ? this.player.position : null);
    this.zombies.update(dt, this.time);
    if (this.zombies.chasing > 0 && !this.warnedChase && this.phase === "night") {
      this.warnedChase = true;
      this.hud.say("¡Te persiguen! Dispara, esquiva (C) o corre a la escuela", 3.2);
      sfx.alert();
    }
    this.towers.update();
    this.fx.update(dt);
    this.fx.syncPickups(this.battle.pickups, this.time);
    this.comboLeft = Math.max(0, this.comboLeft - dt);
    if (this.comboLeft === 0) this.combo = 0;
    this.world.update(this.time);
    this.world.sky.follow(this.player.position);
    this.updateSky(dt);
    this.chests.update(this.modal ? 0 : dt, this.time);
    this.zombies.faceCamera(this.camera);
    // Parpadeo del estudiante al recibir un golpe.
    this.player.group.visible = !this.player.blinking;
    this.updateCamera(dt);
    this.updateHud(dt);
  }

  /** Misión de orientación: ir a la bandera. Al llegar da una mejora; después aparece otra (hasta tres por día). */
  private handleMissions(dt: number): void {
    const m = this.missions.mission;
    if (!m) {
      this.hud.setMission(null);
      return;
    }
    if (m.reached) {
      this.missionNext -= dt;
      this.hud.setMission(null);
      if (this.missionNext <= 0 && this.missions.completed < 3 && !this.modal) {
        this.missions.next();
        this.hud.say("Hay una misión nueva de orientación", 2.4);
      }
      return;
    }
    const near = this.missions.update(this.player.position, this.time);
    if (near) {
      this.missionNext = 3;
      this.hud.announce("¡MISIÓN CUMPLIDA!", 2);
      sfx.unlock();
      this.fx.burst(m.target.clone().setY(3), 0x7fc8ff, 36, 10, 0.3);
      this.fx.ring(m.target, 0x7fc8ff, 8, 0.8);
      this.power = Math.min(1, this.power + 0.34);
      this.hud.flashScreen("good");
      this.modal = true;
      this.controls.setEnabled(false);
      void this.chooseUpgrade("¡Misión cumplida!").then(() => {
        this.controls.setEnabled(true);
        this.modal = false;
      });
      return;
    }
    const help = this.profile.level === "beginner" ? `<small>${this.missions.progressText(this.player.position)} · la bandera queda hacia el ${this.missions.directionFrom(this.player.position)}</small>` : `<small>${m.hint}</small>`;
    this.hud.setMission(`<b>${ico("compass", 14)} Misión de orientación</b>${m.text}${help}`);
  }

  /** De día el Sol sale por el Este y se pone por el Oeste; al caer la noche el cielo se oscurece despacio. */
  private updateSky(dt: number): void {
    if (this.phase === "day") {
      const t = Math.min(1, Math.max(0, 1 - this.dayLeft / DAY_SECONDS));
      this.light = Math.min(1, 0.45 + Math.sqrt(Math.sin(Math.PI * t)) * 0.7);
      this.world.sky.setLight(this.light, t);
    } else if (this.light > 0) {
      this.light = Math.max(0, this.light - dt / 2.5);
      this.world.sky.setLight(this.light, 1);
    }
    // Relámpagos y luna roja: tiñen el cielo y la niebla.
    if (this.phase === "night") {
      this.world.sky.finalize(this.weather.tint(), 0.55 * (1 - this.light), this.weather.flash);
      this.world.sky.hemi.intensity += this.weather.flash * 3;
      const [near, far] = this.weather.fogRange();
      const fog = this.scene.fog as THREE.Fog | null;
      if (fog) {
        fog.near += (near - fog.near) * Math.min(1, dt * 1.5);
        fog.far += (far - fog.far) * Math.min(1, dt * 1.5);
      }
      this.weather.update(dt, this.player.position, this.settings.reducedMotion);
    }
    this.weather.group.visible = this.phase === "night";
    const bg = this.world.sky.bg;
    this.scene.background = bg;
    if (this.scene.fog) this.scene.fog.color.copy(bg);
    const bob = Math.sin(this.time * 3) * 0.35;
    this.slotArrows.forEach((a, i) => {
      a.visible = this.phase === "day" && this.slotOwner(i) === null;
      a.position.y = 3.4 + bob;
      a.rotation.y = this.time * 2;
    });
  }

  private updateCamera(dt: number): void {
    const target = this.player.position.clone().add(new THREE.Vector3(0, 2.6, 0));
    const offset = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(this.dist);
    const desired = target.clone().add(offset);
    desired.y = Math.max(1.2, desired.y);
    // La cámara se acerca al estudiante si hay una pared o un árbol en medio (no entra en la escuela ni en los árboles).
    const steps = 16;
    let free = target.clone();
    for (let i = 1; i <= steps; i++) {
      const p = target.clone().lerp(desired, i / steps);
      const blocked = p.y < 14 && this.world.obstacles.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < o.r + 0.6);
      if (blocked) break;
      free = p;
    }
    const got = free.distanceTo(target);
    if (got < 5) free.copy(target).addScaledVector(offset.clone().normalize(), 5);
    // Con algo en medio, la cámara se acerca y sube un poco para seguir viendo al estudiante.
    if (got < this.dist - 0.5) free.y += Math.min(4, (this.dist - Math.max(got, 5)) * 0.5);
    desired.copy(free);
    this.camera.position.lerp(desired, Math.min(1, dt * 12));
    // La vista se abre un instante al esquivar.
    if (this.settings.reducedMotion) this.fov = this.baseFov;
    this.fov += (this.baseFov - this.fov) * Math.min(1, dt * 6);
    if (Math.abs(this.camera.fov - this.fov) > 0.05) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.settings.reducedMotion) this.shake = 0;
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
    this.hud.setPower(this.power);
    this.hud.setDash(this.player.dashReady);
    this.hud.setCombo(this.combo, this.comboLeft);
    this.hud.setDust(this.dust);
    const low = b.baseHealth / b.maxBaseHealth < 0.3 && !this.ended;
    this.hud.setLowEnergy(low);
    if (low) {
      this.lowWarn -= dt;
      if (this.lowWarn <= 0) {
        this.lowWarn = 4;
        sfx.warning();
      }
    }
    this.hud.drawMinimap(
      this.player.position,
      this.player.heading,
      b.activeEnemies().map((e) => {
        const p = this.zombies.position(e);
        return { x: p.x, z: p.z, big: e.kind === "gigante" };
      }),
      this.chests.chests.filter((c) => !c.gone).map((c) => ({ x: c.pos.x, z: c.pos.z, locked: c.lockedUntil > this.time })),
      b.towers.map((t) => ({ x: t.x * 0.1, z: t.y * 0.1 })),
      b.pickups.map((p) => ({ x: p.x * 0.1, z: p.y * 0.1 }))
    );
    this.hud.setWeapons(this.player.carried, this.player.levels, this.player.current);
    const left = b.pendingSpawns().length + b.activeEnemies().length;
    if (this.phase === "day") {
      this.hud.setWave(`${this.endless > 0 ? `Noche ${this.endless} sin fin` : `Día ${this.night}`} · la noche llega en ${Math.max(0, Math.ceil(this.dayLeft))} s`);
      return;
    }
    this.hud.setWave(b.phase === "countdown" ? `La oleada ${b.waveNumber} llega en ${Math.ceil(b.countdown)} s` : `Oleada ${b.waveNumber} de ${b.totalWaves} · quedan ${left} zombis`);
  }

  /** Poder estelar: una explosión de estrellas que daña a todos los zombis cercanos y protege un instante. */
  private usePower(): void {
    if (this.player.isDown) return;
    if (this.power < 1) {
      this.hud.say("El poder estelar se carga con respuestas correctas, misiones y zombis derrotados", 2.6);
      return;
    }
    this.power = 0;
    sfx.power("rayo");
    const at = this.player.position.clone();
    this.fx.ring(at, 0xe2b6ff, 15, 0.7);
    this.fx.ring(at, 0xffffff, 9, 0.5);
    this.fx.burst(at.clone().setY(1.6), 0xe2b6ff, 50, 14, 0.3);
    this.hud.flashScreen("good");
    this.hud.announce("¡PODER ESTELAR!", 1.4);
    this.shake = Math.max(this.shake, 0.4);
    this.player.grantInvuln(1.6);
    for (const e of [...this.battle.activeEnemies()]) {
      const p = this.zombies.position(e);
      if (Math.hypot(p.x - at.x, p.z - at.z) > 15) continue;
      const dmg = e.id === this.bossId ? e.maxHealth * 0.12 : Math.max(16, e.maxHealth * 0.45);
      this.fx.burst(p.clone().setY(2), 0xe2b6ff, 8, 6, 0.2);
      if (this.battle.strike(e.id, dmg)) {
        this.kills++;
        this.fx.zombieDown(p.clone().setY(0), e.kind === "gigante");
      }
    }
  }

  /** Jefe de la noche: se marca cuando sale, se le sube la vida, tiene barra propia y da premio al caer. */
  private updateBoss(): void {
    const B = BOSSES[this.night];
    if (!B || this.bossDone) return;
    const b = this.battle;
    if (this.bossId === null) {
      if (b.waveNumber !== b.totalWaves || b.pendingSpawns().length > 0) return;
      const cands = b.enemies.filter((e) => e.kind === B.kind && e.wave === b.totalWaves && e.state !== "gone");
      const e = cands.sort((a, c) => c.id - a.id)[0];
      if (!e) return;
      this.bossId = e.id;
      // En Principiante el jefe es menos resistente.
      const mult = this.profile.level === "beginner" ? 1 + (B.mult - 1) * 0.5 : B.mult;
      e.health *= mult;
      e.maxHealth *= mult;
      this.zombies.setBoss(e.id, "JEFE");
      this.hud.announce(`¡${B.name.toUpperCase()}!`, 2.4);
      sfx.alert();
      this.shake = 0.4;
    }
    const e = b.enemies.find((x) => x.id === this.bossId);
    if (!e) return;
    if (e.state === "gone") {
      this.bossDone = true;
      this.bossId = null;
      this.hud.setBoss(null);
      if (e.removedBy && e.removedBy !== "base") {
        this.hud.announce("¡JEFE DERROTADO!", 2.4);
        sfx.fanfare();
        this.fx.burst(this.zombies.position(e).setY(3), 0xffd54a, 60, 14, 0.35);
        const heal = Math.min(b.maxBaseHealth - b.baseHealth, Math.round(b.maxBaseHealth * 0.2));
        if (heal > 0) b.baseHealth += heal;
        this.power = 1;
      }
      return;
    }
    this.hud.setBoss(B.name, e.health / e.maxHealth);
  }

  /** Polvo estelar de los zombis que derrotas: tócalo y la escuela recupera energía. */
  private handlePickups(): void {
    if (this.player.isDown) return;
    const got = this.fx.collect(this.battle, this.player.position);
    if (got <= 0) return;
    this.dust += got;
    const heal = Math.min(this.battle.maxBaseHealth - this.battle.baseHealth, got * 2);
    if (heal > 0) this.battle.baseHealth += heal;
    this.fx.float(this.player.position.clone().setY(4), `+${got * 2} energía`, "#ffe066", 1.2);
    this.hud.flashScreen("gold");
    sfx.sparkle();
  }

  /** Cuando los zombis le quitan energía a la escuela se nota en la pantalla y en el sonido. */
  private handleSchoolDamage(): void {
    const now = this.battle.baseHealth;
    if (now < this.lastBase - 0.01) {
      this.shake = Math.max(this.shake, 0.22);
      this.hud.flashScreen("hurt");
      const school = toWorld(this.battle.map.camp);
      this.fx.burst(school.setY(2.5), 0xff6b6b, 6, 5);
      sfx.hit();
    }
    this.lastBase = now;
  }

  /** El zombi con ese número y qué tan cerca está del estudiante (1 = a su lado, 0 = lejísimos), para el volumen. */
  private nearInfo(id: number): { e: Enemy | null; vol: number } {
    const e = this.battle.enemies.find((x) => x.id === id) ?? null;
    if (!e) return { e: null, vol: 0 };
    const p = this.zombies.position(e);
    return { e, vol: Math.max(0, 1 - Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) / 55) };
  }

  /** Sonidos de los zombis: aparecer, caer, saltar y las pisadas del gigante. */
  private zombieSounds(dt: number): void {
    for (const e of this.battle.activeEnemies()) {
      if (this.seenEnemies.has(e.id)) continue;
      this.seenEnemies.add(e.id);
      sfx.zombie(e.kind, "spawn", Math.max(0.35, this.nearInfo(e.id).vol));
    }
    this.stompTimer -= dt;
    const giant = this.battle.activeEnemies().find((e) => e.kind === "gigante");
    if (giant && this.stompTimer <= 0) {
      const d = this.nearInfo(giant.id).vol;
      this.stompTimer = 0.95;
      sfx.stomp(d);
      if (d > 0.4 && !this.settings.reducedMotion) this.shake = Math.max(this.shake, 0.12 * d);
    }
  }

  private handleEvents(): void {
    for (const e of this.battle.drainEvents()) {
      if (e.type === "enemy-defeated") {
        const { e: en, vol } = this.nearInfo(e.enemyId);
        if (en) sfx.zombie(en.kind, "die", Math.max(0.3, vol));
      }
      if (e.type === "enemy-jump") {
        const { e: en, vol } = this.nearInfo(e.enemyId);
        if (en) sfx.zombie(en.kind, "jump", vol);
      }
      if (e.type === "wave-start") {
        this.hud.announce(`OLEADA ${e.wave}`, 1.8);
        sfx.alert();
        sfx.setMusicIntensity(e.wave);
      }
      if (e.type === "wave-start" && e.wave > 1 && this.chests.available < 8) {
        this.chests.spawn();
        this.chests.spawn();
        this.hud.say("Aparecieron cofres nuevos. Busca las columnas de luz", 3.2);
        sfx.sparkle();
      }
    }
  }

  /** Cofre cercano: muestra la pista de «E» y, al apretarla, abre la pregunta. */
  private handleChests(interact: boolean, day: boolean): void {
    const near = this.chests.nearest(this.player.position);
    this.chestPromptActive = !!near;
    const locked = near && near.lockedUntil > this.time;
    if (!near && !day) this.hud.setPrompt(null);
    if (near) this.hud.setPrompt(near ? (locked ? `Cofre con candado: se abre en ${Math.ceil(near.lockedUntil - this.time)} s` : this.controls.isTouch ? `Toca ${ico("hand", 16)} para abrir el ${near.special ? "cofre estelar" : "cofre"}` : `Presiona <kbd>E</kbd> para abrir el ${near.special ? "cofre estelar" : "cofre"}`) : null);
    if (!near || !interact || this.player.isDown) return;
    if (locked) {
      this.hud.say("El cofre tiene candado. Vuelve en unos segundos.", 1.6);
      return;
    }
    void this.openChest(near);
  }

  private async openChest(chest: Chest): Promise<void> {
    this.modal = true;
    this.controls.setEnabled(false);
    this.hud.setPrompt(null);
    // De día preguntan sobre el Sol y los puntos cardinales; de noche, sobre la Cruz del Sur y los puntos cardinales.
    const topics: ChestTopic[] = this.phase === "day" ? ["sol", "cardinales", "sol", "luna"] : ["cruz", "cardinales", "cruz", "luna"];
    chest.question = chest.question ?? (chest.special ? this.bank.drawFace() : this.nextQuestion(topics));
    const q = chest.question;
    this.world.sky.glow = q.topic === "cruz" ? 1 : 0;
    // Las preguntas de «mira hacia…» necesitan la cámara: se habilita el mouse/dedo pero no el movimiento.
    this.controls.setEnabled(true);
    const heading = () => headingDegrees(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const res = await this.quiz.ask(q, heading);
    if (res.answer === null) {
      this.world.sky.glow = 0;
      this.modal = false;
      return;
    }
    this.controls.setEnabled(false);
    this.world.sky.glow = 0;
    const correct = isChestCorrect(q, res.answer);
    const lock = this.profile.level === "beginner" ? 20 : this.profile.level === "advanced" ? 30 : 45;
    if (this.student) {
      recordAnswer(this.student, { topic: q.topic, qid: q.id, correct, usedHint: res.usedHint });
      this.persist();
    }
    if (correct) sfx.correct();
    else sfx.wrong();
    sfx.speakAcrux(`${correct ? "¡Correcto!" : "Esta vez no."} ${q.explanation}`);
    await this.quiz.feedback(q, correct, lock);
    if (correct) {
      sfx.unlock();
      this.fx.burst(chest.pos.clone().setY(1.5), 0xffd54a, 30, 9, 0.3);
      this.fx.ring(chest.pos, 0xffd54a, 7, 0.7);
      this.hud.flashScreen("good");
      this.chestsOpened++;
      this.power = Math.min(1, this.power + 0.34);
      chest.question = null;
      this.chests.open(chest);
      sfx.chestOpen();
      await this.chooseUpgrade();
      if (chest.special) {
        // El cofre estelar también cura un poco la escuela.
        const heal = Math.min(this.battle.maxBaseHealth - this.battle.baseHealth, Math.round(this.battle.maxBaseHealth * 0.15));
        if (heal > 0) this.battle.baseHealth += heal;
        this.fx.float(this.player.position.clone().setY(4.2), `+${heal} energía`, "#8ff7cd", 1.5);
      }
    } else {
      this.chestsMissed++;
      if (!this.missed.some((m) => m.id === q.id)) this.missed.push(q);
      chest.question = null;
      this.chests.lockFor(chest, this.time + lock);
    }
    this.controls.setEnabled(true);
    this.modal = false;
  }

  /** Pregunta del cofre: a veces una que había fallado; si no, de un tema elegido con más peso en los más flojos. */
  private nextQuestion(topics: ChestTopic[]): ChestQuestion {
    const st = this.student;
    if (st) {
      const rng = () => Math.random();
      const review = pickReview(st.answers, rng, 0.25);
      const q = review ? CHEST_QUESTIONS.find((x) => x.id === review && x.format !== "face") : undefined;
      if (q) return q;
      return this.bank.draw(pickTopic(st.answers, topics, rng));
    }
    return this.bank.draw(topics[Math.floor(Math.random() * topics.length)]);
  }

  /** Premio del cofre: sube un nivel un arma o una torre; si todo está al máximo, cura la escuela. */
  private chooseUpgrade(title = "¡Cofre abierto!"): Promise<void> {
    const ids: DefenseId[] = [...new Set<DefenseId>([...this.player.carried, ...(Object.keys(this.placed) as DefenseId[])])];
    // Las torres llegan al nivel 3; las armas de la mano pueden llegar al 4 (Maestría).
    const maxOf = (id: DefenseId) => (this.player.carried.includes(id) ? MAX_LEVEL : MAX_TOWER_LEVEL);
    const options = ids.filter((id) => (this.levels[id] ?? 1) < maxOf(id));
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "overlay";
      if (options.length === 0) {
        const heal = Math.round(this.battle.maxBaseHealth * 0.25);
        this.battle.baseHealth = Math.min(this.battle.maxBaseHealth, this.battle.baseHealth + heal);
        overlay.innerHTML = `<div class="card"><h1>¡Todo al máximo!</h1><p>Tus armas ya están al máximo. El cofre cura la escuela: +${heal} de energía.</p><div class="row"><button class="btn primary" data-ok>Seguir</button></div></div>`;
      } else {
        overlay.innerHTML = `<div class="card"><h1>${title}</h1><p>Elige qué mejorar:</p><div class="upg">${options
          .map((id) => {
            const lv = this.levels[id] ?? 1;
            const a = weaponStats(id, lv);
            const b = weaponStats(id, lv + 1);
            const hand = this.player.carried.includes(id);
            const tower = this.placed[id] !== undefined;
            return `<button class="btn" data-up="${id}">${hand ? ico("fire", 18) : ""}${tower ? ico("tower", 18) : ""} ${a.name} <span class="st">${"★".repeat(lv)} → ${"★".repeat(lv + 1)} · poder ${Math.round(a.dps)} → ${Math.round(b.dps)}</span></button>`;
          })
          .join("")}</div></div>`;
      }
      overlay.addEventListener("click", (e) => {
        const t = e.target as HTMLElement;
        const up = t.closest<HTMLElement>("[data-up]")?.dataset.up as DefenseId | undefined;
        if (up) {
          this.levels[up] = (this.levels[up] ?? 1) + 1;
          this.player.setWeapons(this.player.carried, this.levels);
          this.battle.setTowerLevel(up, Math.min(MAX_TOWER_LEVEL, this.levels[up]!));
          if (this.phase === "day") this.refreshPlaced();
          this.persist();
          this.hud.say(`¡${weaponStats(up, this.levels[up]!).name} subió al nivel ${this.levels[up]}!`, 2.6);
          this.hud.announce(`¡NIVEL ${this.levels[up]}!`, 1.6);
          this.fx.ring(this.player.position, weaponStats(up, 1).color, 8, 0.8);
          this.fx.burst(this.player.position.clone().setY(2), weaponStats(up, 1).color, 24, 8, 0.25);
          sfx.heroic();
        } else if (!t.closest("[data-ok]")) return;
        overlay.remove();
        resolve();
      });
      this.root.appendChild(overlay);
    });
  }

  /** Resumen de aprendizaje: acierto por tema, un repaso corto del tema más flojo y las preguntas falladas esta noche. */
  private reviewHtml(final: boolean): string {
    const st = this.student;
    if (!st) return "";
    const topics = topicStats(st).filter((t) => t.total > 0);
    if (topics.length === 0) return "";
    const TIPS: Record<ChestTopic, string> = {
      cruz: "Busca la Cruz del Sur, sigue su eje mayor de Gacrux a Acrux y baja hasta el horizonte: ahí está el Sur aproximado.",
      sol: "El Sol sale por el Este, al mediodía queda hacia el Norte (en el hemisferio sur) y se pone por el Oeste. La sombra apunta al lado contrario del Sol.",
      cardinales: "Con el Norte arriba, el Este queda a la derecha. Si miras al Norte, el Oeste queda a la izquierda y el Sur a tu espalda.",
      luna: "La Luna sale por el Este y se pone por el Oeste, y brilla porque refleja la luz del Sol. En luna llena sale cuando el Sol se pone."
    };
    const weakest = [...topics].filter((t) => t.total >= 2).sort((a, b) => a.accuracy - b.accuracy)[0];
    const bars = topics.map((t) => `<div class="rv-row"><span>${t.name}</span><div class="rv-bar"><i style="width:${t.accuracy}%"></i></div><b>${t.accuracy}%</b></div>`).join("");
    const tip = weakest && weakest.accuracy < 85 ? `<p class="rv-tip"><b>Para repasar (${weakest.name}):</b> ${TIPS[weakest.topic as ChestTopic]}</p>` : final ? '<p class="rv-tip"><b>¡Muy bien!</b> Dominas los tres temas.</p>' : "";
    const missed = this.missed.slice(0, 3).map((q) => `<li>${q.prompt.replace(/</g, "&lt;")} <b>→ ${chestCorrectText(q).replace(/</g, "&lt;")}</b></li>`).join("");
    return `<div class="review"><h2>${final ? "Lo que aprendiste" : "Cómo vas aprendiendo"}</h2>${bars}${tip}${missed ? `<p class="rv-miss">Fallaste esta noche:</p><ul>${missed}</ul>` : ""}</div>`;
  }

  private handleBattleEnd(): void {
    const b = this.battle;
    if (b.phase !== "victory" && b.phase !== "defeat") return;
    this.ended = true;
    this.controls.setEnabled(false);
    const win = b.phase === "victory";
    sfx.stopMusic();
    if (win) sfx.fanfare();
    else sfx.warning();
    if (this.endless > 0) {
      this.endlessEnd(win);
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const hasNext = win && this.night < TOTAL_NIGHTS;
    const last = win && this.night >= TOTAL_NIGHTS;
    this.hud.setNightButton(null);
    const st = this.student;
    if (st) {
      recordNight(st, { night: this.night, victory: win, kills: this.kills, stopped: b.totalDefeated, chestsOpened: this.chestsOpened, chestsMissed: this.chestsMissed, downs: this.playerDowns });
      this.persist();
    }
    const extremeLoss = !win && this.profile.level === "extreme";
    const review = this.reviewHtml(last);
    overlay.innerHTML = `<div class="card">
      <h1>${win ? (last ? "¡La escuela está a salvo!" : "¡Noche ganada!") : "La escuela se quedó sin energía"}</h1>
      <p>${win ? (last ? "Resististe las cinco noches y venciste al gigante. ¡Ya sabes orientarte con la Cruz del Sur, el Sol y los puntos cardinales!" : "Defendiste la escuela con tus armas y tus torres. ¡Buen trabajo!") : "Los zombis llegaron hasta la escuela. Inténtalo otra vez: ahora ya conoces el camino."}</p>
      ${extremeLoss ? `<p class="note">En el nivel Extremo, cada derrota hace la siguiente noche un poco más fácil, hasta que la superes.</p>` : ""}
      ${review}
      <div class="stats">
        <div class="stat"><b>${this.kills}</b>zombis derrotados por ti</div>
        <div class="stat"><b>${b.totalDefeated}</b>zombis detenidos en total</div>
        <div class="stat"><b>${Math.round(b.baseHealth)}/${b.maxBaseHealth}</b>energía de la escuela</div>
        <div class="stat"><b>${this.chestsOpened}</b>cofres abiertos</div>
        <div class="stat"><b>${this.playerDowns}</b>veces derribado</div>
      </div>
      <div class="row">
        ${hasNext ? '<button class="btn primary" data-go="next">Siguiente día</button>' : ""}
        ${last ? '<button class="btn primary" data-go="diploma">Ver mi diploma</button>' : ""}
        <button class="btn ${hasNext || last ? "" : "primary"}" data-go="again">${win ? "Repetir este día" : "Intentar otra vez"}</button>
        <button class="btn" data-go="menu">Salir al menú</button>
      </div>
    </div>`;
    overlay.addEventListener("click", (e) => {
      const go = (e.target as HTMLElement).closest<HTMLElement>("[data-go]")?.dataset.go;
      if (go === "next") this.startDay(this.night + 1, this.profile, true);
      else if (go === "again") this.startDay(this.night, this.profile, true);
      else if (go === "menu") {
        overlay.remove();
        this.onMenu();
      } else if (go === "diploma" && this.student) this.onDiploma(this.student);
    });
    this.root.appendChild(overlay);
  }
}
