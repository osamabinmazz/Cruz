import { Battle } from "./battle/Battle";
import { ChallengeManager, type ChallengeOutcome } from "./ChallengeManager";
import type { DefenseId } from "./defenses";
import { extremeConfig, nextEase } from "./extreme";
import { difficultyConfigs, levelName, type Difficulty, type DifficultyConfig } from "./difficulty";
import { RescueController, RescueQuestionBank, type RescueStats } from "./rescue/RescueController";
import { createRng, type Rng } from "./rng";
import { carryDefault, defaultPlacement, isValidCarry, isValidPlacement, putItem, removeItem, placeWeapon, type Placement, type SlotItem } from "./placement";
import { Campaign, type CampaignSave, type NightResult } from "./campaign/Campaign";
import { nightConfig } from "./campaign/nights";
import { MAPS } from "./battle/maps";
import { isPostId, type PostId } from "./battle/guardians";
import type { PowerId } from "./battle/powers";
import type { SubmitResult } from "./ChallengeManager";
import type { DifficultyConfig as Cfg } from "./difficulty";

export type Screen =
  | "menu"
  | "level-select"
  | "mission"
  | "demo"
  | "challenge"
  | "synthesis"
  | "placement"
  | "battle"
  | "final"
  // Campaña 2.0
  | "students"
  | "new-student"
  | "nights"
  | "story"
  | "night-result"
  | "workshop"
  | "campaign-final";

/** Datos que se guardan para poder continuar una partida. */
export interface SaveData {
  version: 1;
  difficulty: Difficulty;
  outcomes: ChallengeOutcome[];
  totalAttempts: number;
  hintsUsed: number;
  usedQuestions: string[];
  placement: Placement | null;
  /** Dónde se retoma: los desafíos, la síntesis o la colocación de armas (la batalla vuelve a empezar). */
  stage: "challenge" | "synthesis" | "placement";
}

export interface FinalSummary {
  difficulty: Difficulty;
  levelMessage: string;
  victory: boolean;
  challengesCompleted: number;
  correctAnswers: number;
  attempts: number;
  hintsUsed: number;
  zombiesStopped: number;
  baseEnergy: number;
  maxBaseEnergy: number;
  defenses: DefenseId[];
  /** Defensas perdidas: sus lugares quedaron vacíos en el mapa. */
  lostDefenses: DefenseId[];
  rescue: RescueStats;
}

/**
 * Máquina de estados de la partida:
 * menú → ELIGE TU NIVEL → misión → (demostración) → 7 desafíos → síntesis → colocar armas → batalla → pantalla final.
 *
 * El nivel se elige una sola vez por partida. Solo puede cambiarse reiniciando
 * la partida o volviendo al menú principal.
 */
export class Game {
  screen: Screen = "menu";
  difficulty: Difficulty | null = null;
  /** Derrotas seguidas en el modo extremo; cada una suaviza un poco la siguiente partida. */
  extremeEase = 0;
  /** Se avisa al terminar una batalla del modo extremo con la nueva suavidad, para guardarla. */
  onExtremeEase: ((ease: number) => void) | null = null;
  challenges: ChallengeManager | null = null;
  battle: Battle | null = null;
  rescue: RescueController | null = null;
  bank: RescueQuestionBank | null = null;
  paused = false;
  /** Lugar elegido para cada arma ganada (pantalla de colocación). */
  placement: Placement | null = null;
  /** Campaña del estudiante que está jugando (null en la partida rápida). */
  campaign: Campaign | null = null;
  /** Resultado de la última batalla de la campaña. */
  nightResult: NightResult | null = null;
  /** Polvo estelar recogido tocándolo durante la batalla actual. */
  nightCollected = 0;
  private rng: Rng;

  constructor(private readonly seed?: number) {
    this.rng = createRng(seed);
  }

  get config(): DifficultyConfig {
    if (!this.difficulty) throw new Error("Todavía no se eligió un nivel.");
    if (this.difficulty === "extreme") return extremeConfig(this.campaign ? this.campaign.data.ease ?? 0 : this.extremeEase);
    return difficultyConfigs[this.difficulty];
  }

  // ---------- Campaña ----------

  /** Menú → CAMPAÑA: lista de estudiantes. */
  openStudents(): void {
    this.reset();
    this.screen = "students";
  }

  openNewStudent(): void {
    if (this.screen !== "students") throw new Error("Primero hay que abrir la lista de estudiantes.");
    this.screen = "new-student";
  }

  /** Empieza o retoma la campaña de un estudiante. */
  enterCampaign(campaign: Campaign): void {
    this.reset();
    this.campaign = campaign;
    this.difficulty = campaign.data.difficulty;
    this.bank = new RescueQuestionBank(this.rng);
    for (const id of campaign.data.usedQuestions) this.bank.used.add(id);
    this.screen = "nights";
  }

  /** Crea la campaña de un estudiante nuevo. */
  createStudent(name: string, difficulty: Difficulty): Campaign {
    const campaign = Campaign.create(name, difficulty);
    this.enterCampaign(campaign);
    return campaign;
  }

  private requireCampaign(): Campaign {
    if (!this.campaign) throw new Error("No hay una campaña en curso.");
    return this.campaign;
  }

  /** Configuración de la batalla de la noche actual. */
  get nightBattleConfig(): Cfg {
    const c = this.requireCampaign();
    const cfg = nightConfig(c.night, this.config);
    // Las mejoras de la escuela suman energía.
    return { ...cfg, baseHealth: Math.round(cfg.baseHealth * c.schoolHealthFactor) };
  }

  /** Desde la lista de noches: cuenta de la historia y, si ya hay respuestas, directo al desafío. */
  startNight(): void {
    const c = this.requireCampaign();
    if (this.screen !== "nights") throw new Error("Primero hay que elegir la noche.");
    const answered = c.nightOutcomes().length;
    if (answered === 0) this.screen = "story";
    else this.beginNightChallenges();
  }

  /** Empieza los desafíos de la noche (los repasos primero) o, si ya están, la colocación. */
  beginNightChallenges(): void {
    const c = this.requireCampaign();
    if (this.screen !== "story" && this.screen !== "nights") throw new Error("No se está empezando una noche.");
    this.challenges = new ChallengeManager(this.config, c.challengeList());
    const done = c.nightOutcomes();
    if (done.length > 0) this.challenges.restore(done, done.length, 0);
    if (c.challengesDone) this.enterNightPlacement();
    else this.screen = "challenge";
  }

  /** Responde el desafío actual; en la campaña queda registrado para el panel del docente. */
  submitAnswer(answer: string[]): SubmitResult {
    const cm = this.requireChallenges();
    const challenge = cm.current;
    const result = cm.submit(answer);
    this.campaign?.recordAnswer(challenge, result.correct);
    return result;
  }

  private enterNightPlacement(): void {
    const c = this.requireCampaign();
    const available: SlotItem[] = [...c.weapons, ...c.ownedPosts];
    if (!this.placement || !isValidCarry(this.placement, available)) this.placement = carryDefault(available);
    this.screen = "placement";
  }

  /** Armas y puestos que el estudiante puede llevar a la batalla. */
  get availableItems(): SlotItem[] {
    const c = this.requireCampaign();
    return [...c.weapons, ...c.ownedPosts];
  }

  /** Pone un arma o puesto en un lugar (la campaña elige qué llevar). */
  putItem(id: SlotItem, slot: number): void {
    if (this.screen !== "placement" || !this.placement) throw new Error("No se están colocando las armas.");
    if (!this.availableItems.includes(id)) throw new Error("Eso todavía no es tuyo.");
    this.placement = putItem(this.placement, id, slot);
  }

  /** Deja un arma o puesto en reserva. */
  stashItem(id: SlotItem): void {
    if (this.screen !== "placement" || !this.placement) throw new Error("No se están colocando las armas.");
    this.placement = removeItem(this.placement, id);
  }

  /** Taller: sube un arma de nivel. */
  upgradeWeapon(id: DefenseId): void {
    this.requireCampaign().upgrade(id);
  }

  buyPost(): PostId {
    return this.requireCampaign().buyPost();
  }

  upgradePost(id: PostId): void {
    this.requireCampaign().upgradePost(id);
  }

  /** Cierra el taller: sigue la noche que corresponde (colocación si hay que repetir la batalla). */
  leaveWorkshop(): void {
    const c = this.requireCampaign();
    if (this.screen !== "workshop") throw new Error("No se está en el taller.");
    c.leaveWorkshop();
    if (c.data.stage === "placement") {
      this.challenges = new ChallengeManager(this.config, c.challengeList());
      this.challenges.restore(c.nightOutcomes(), c.nightOutcomes().length, 0);
      this.enterNightPlacement();
    } else {
      this.challenges = null;
      this.screen = "nights";
    }
  }

  /** Elige el poder de estrella para la próxima batalla. */
  choosePower(id: PowerId): void {
    this.requireCampaign().setPower(id);
  }

  /** Toca un polvo estelar del suelo: se suma al polvo de la campaña. Devuelve cuánto valía. */
  collectPickup(id: number): number {
    const c = this.campaign;
    if (!c || !this.battle) return 0;
    const value = this.battle.collectPickup(id);
    if (value > 0) {
      c.data.dust += value;
      this.nightCollected += value;
    }
    return value;
  }

  /** Mejora un arma en plena batalla con el polvo estelar de la campaña. */
  upgradeWeaponInBattle(id: DefenseId): boolean {
    const c = this.campaign;
    if (!c || !this.battle || !c.canUpgrade(id)) return false;
    c.upgrade(id);
    return this.battle.setTowerLevel(id, c.level(id));
  }

  /** Mejora un puesto de guardianes en plena batalla. */
  upgradePostInBattle(id: PostId): boolean {
    const c = this.campaign;
    if (!c || !this.battle || !c.canUpgradePost(id)) return false;
    c.upgradePost(id);
    return this.battle.setPostLevel(id, c.postLevel(id));
  }

  /** Taller: refuerza la escuela. */
  upgradeSchool(): void {
    this.requireCampaign().upgradeSchool();
  }

  /** Vuelve a convocar a una estrellita caída en plena batalla, con polvo estelar. */
  summonGuardian(postId: PostId, index: number): boolean {
    const c = this.campaign;
    if (!c || !this.battle) return false;
    const post = this.battle.posts.find((p) => p.id === postId);
    if (post?.guardians[index]?.state !== "down") return false;
    if (!c.spendSummon()) return false;
    return this.battle.summonGuardian(postId, index);
  }

  /** Datos de la campaña para guardar, o null si no hay una campaña en curso. */
  campaignSnapshot(): CampaignSave | null {
    if (!this.campaign) return null;
    this.campaign.data.usedQuestions = this.bank ? [...this.bank.used] : this.campaign.data.usedQuestions;
    return this.campaign.data;
  }

  /** Termina la batalla de la noche: aplica el resultado y muestra el resumen. */
  private finishNight(): void {
    const c = this.requireCampaign();
    const b = this.battle!;
    this.nightResult = c.finishBattle({
      victory: b.phase === "victory",
      stopped: b.totalDefeated,
      baseEnergy: b.baseHealth,
      rescuesCorrect: this.rescue?.stats.correct ?? 0,
      collected: this.nightCollected
    });
    this.screen = "night-result";
    this.paused = false;
  }

  /** Abre el taller estelar desde la lista de noches. */
  openWorkshop(): void {
    this.requireCampaign();
    if (this.screen !== "nights") throw new Error("El taller se abre desde la lista de noches.");
    this.screen = "workshop";
  }

  /** Del resumen de la noche al taller (o al final de la campaña). */
  leaveNightResult(): void {
    const c = this.requireCampaign();
    if (this.screen !== "night-result") throw new Error("No se está viendo el resumen de la noche.");
    this.battle = null;
    this.rescue = null;
    this.screen = c.isFinished ? "campaign-final" : "workshop";
  }

  /** Vuelve a la lista de noches (desde el taller no hay nada pendiente) o de estudiantes. */
  backToStudents(): void {
    this.openStudents();
  }

  /** Botón COMENZAR: siempre conduce a la elección de nivel. */
  start(): void {
    this.reset();
    this.screen = "level-select";
  }

  selectDifficulty(difficulty: Difficulty): void {
    if (this.screen !== "level-select" || this.difficulty !== null) {
      throw new Error("El nivel solo puede elegirse al comenzar o al reiniciar la partida.");
    }
    this.difficulty = difficulty;
    this.challenges = new ChallengeManager(this.config);
    this.bank = new RescueQuestionBank(this.rng);
    this.screen = "mission";
  }

  /** Pantalla de misión: anticipa el juego y sus reglas antes del primer desafío. */
  acceptMission(): void {
    if (this.screen !== "mission") throw new Error("No se está mostrando la misión.");
    this.screen = this.config.introductoryDemonstration ? "demo" : "challenge";
  }

  finishDemo(): void {
    if (this.screen !== "demo") throw new Error("No se está mostrando la demostración.");
    this.screen = "challenge";
  }

  /** Avanza al siguiente desafío o, si se resolvieron los siete, a la síntesis. */
  nextChallenge(): void {
    const cm = this.requireChallenges();
    if (cm.isComplete) {
      if (this.campaign) this.enterNightPlacement();
      else this.screen = "synthesis";
      return;
    }
    cm.next();
  }

  /** Desde la síntesis, pasa a colocar las armas ganadas en el mapa. */
  goToPlacement(): void {
    const cm = this.requireChallenges();
    if (!cm.isComplete || this.screen !== "synthesis") {
      throw new Error("Primero hay que responder los siete desafíos.");
    }
    if (!this.placement || !isValidPlacement(this.placement, cm.unlockedDefenses)) {
      this.placement = defaultPlacement(cm.unlockedDefenses);
    }
    this.screen = "placement";
  }

  /** Coloca un arma en un lugar del mapa (si estaba ocupado, intercambian lugares). */
  placeWeapon(id: DefenseId, slot: number): void {
    if (this.screen !== "placement" || !this.placement) throw new Error("No se están colocando las armas.");
    this.placement = placeWeapon(this.placement, id, slot);
  }

  /** Vuelve a la colocación recomendada: cada arma en el lugar de su desafío. */
  resetPlacement(): void {
    if (this.screen !== "placement") throw new Error("No se están colocando las armas.");
    if (this.campaign) {
      this.placement = carryDefault(this.availableItems);
      return;
    }
    this.placement = defaultPlacement(this.requireChallenges().unlockedDefenses);
  }

  private startNightBattle(): void {
    const c = this.requireCampaign();
    if (this.screen !== "placement" || !this.placement) throw new Error("Primero hay que colocar las armas.");
    const placed = Object.keys(this.placement) as SlotItem[];
    const towers = placed.filter((id): id is DefenseId => !isPostId(id));
    const posts = placed.filter(isPostId).map((id) => ({ id, level: c.postLevel(id) }));
    this.battle = new Battle(this.nightBattleConfig, {
      towers,
      placement: this.placement,
      map: MAPS[c.plan.map],
      upgrades: c.data.upgrades,
      posts,
      power: c.power,
      rng: createRng(this.seed === undefined ? Date.now() : this.seed + c.night)
    });
    this.nightCollected = 0;
    this.rescue = new RescueController(this.battle, this.bank!, this.rng);
    this.screen = "battle";
  }

  startBattle(): void {
    if (this.campaign) {
      this.startNightBattle();
      return;
    }
    const cm = this.requireChallenges();
    if (!cm.isComplete || (this.screen !== "synthesis" && this.screen !== "placement")) {
      throw new Error("La batalla comienza solo después de responder los siete desafíos.");
    }
    const towers = [...cm.unlockedDefenses];
    if (!this.placement || !isValidPlacement(this.placement, towers)) this.placement = defaultPlacement(towers);
    this.battle = new Battle(this.config, { towers, placement: this.placement });
    this.rescue = new RescueController(this.battle, this.bank!, this.rng);
    this.screen = "battle";
  }

  /** Intentar otra vez la batalla con el mismo nivel, sin repetir los desafíos. */
  retryBattle(): void {
    if (this.campaign) throw new Error("En la campaña, la noche se repite desde el taller.");
    if (this.screen !== "final" || !this.battle || this.battle.phase !== "defeat") {
      throw new Error("Solo se puede reintentar la batalla después de una derrota.");
    }
    // Se puede repensar la colocación antes de volver a intentarlo.
    this.battle = null;
    this.rescue = null;
    this.screen = "placement";
  }

  goToFinal(): void {
    if (!this.battle?.isOver) throw new Error("La batalla todavía no terminó.");
    if (this.campaign) {
      this.finishNight();
      return;
    }
    if (this.difficulty === "extreme") {
      this.extremeEase = nextEase(this.extremeEase, this.battle.phase === "victory");
      this.onExtremeEase?.(this.extremeEase);
    }
    this.screen = "final";
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
    this.battle?.pause("menu");
  }

  resume(): void {
    this.paused = false;
    this.battle?.resume("menu");
  }

  /** REINICIAR PARTIDA: vuelve a pedir el nivel. */
  restart(): void {
    this.start();
  }

  /** VOLVER AL MENÚ. */
  backToMenu(): void {
    this.reset();
    this.screen = "menu";
  }

  summary(): FinalSummary {
    const cm = this.requireChallenges();
    const battle = this.battle;
    if (!battle || !this.rescue) throw new Error("No hay una batalla para resumir.");
    return {
      difficulty: this.difficulty!,
      levelMessage: `Completaste el recorrido en nivel ${levelName(this.difficulty!)}.`,
      victory: battle.phase === "victory",
      challengesCompleted: cm.completedCount,
      correctAnswers: cm.correctCount,
      attempts: cm.totalAttempts,
      hintsUsed: cm.hintsUsed,
      zombiesStopped: battle.totalDefeated,
      baseEnergy: battle.baseHealth,
      maxBaseEnergy: battle.maxBaseHealth,
      defenses: [...cm.unlockedDefenses],
      lostDefenses: [...cm.lostDefenses],
      rescue: { ...this.rescue.stats }
    };
  }

  /** Datos para continuar la partida más tarde, o null si no hay una partida en curso. */
  snapshot(): SaveData | null {
    if (this.campaign) return null;
    if (!this.difficulty || !this.challenges || !this.bank) return null;
    const cm = this.challenges;
    let stage: SaveData["stage"];
    if (this.screen === "placement" || this.screen === "battle") stage = "placement";
    else if (this.screen === "synthesis") stage = "synthesis";
    else if (["mission", "demo", "challenge"].includes(this.screen)) stage = "challenge";
    else return null;
    return {
      version: 1,
      difficulty: this.difficulty,
      outcomes: [...cm.outcomes],
      totalAttempts: cm.totalAttempts,
      hintsUsed: cm.hintsUsed,
      usedQuestions: [...this.bank.used],
      placement: this.placement ? { ...this.placement } : null,
      stage
    };
  }

  /** Retoma una partida guardada con el mismo nivel. Una batalla en curso vuelve a empezar. */
  restore(data: SaveData): void {
    if (data.version !== 1 || data.outcomes.length > 7) throw new Error("Partida guardada no válida.");
    this.reset();
    this.difficulty = data.difficulty;
    this.challenges = new ChallengeManager(this.config);
    this.challenges.restore(data.outcomes, data.totalAttempts, data.hintsUsed);
    this.bank = new RescueQuestionBank(this.rng);
    for (const id of data.usedQuestions) this.bank.used.add(id);
    const complete = this.challenges.isComplete;
    if (!complete) {
      this.screen = "challenge";
      return;
    }
    const valid = data.placement && isValidPlacement(data.placement, this.challenges.unlockedDefenses);
    this.placement = valid ? { ...data.placement! } : defaultPlacement(this.challenges.unlockedDefenses);
    this.screen = data.stage === "placement" ? "placement" : "synthesis";
  }

  private requireChallenges(): ChallengeManager {
    if (!this.challenges) throw new Error("La partida no comenzó.");
    return this.challenges;
  }

  private reset(): void {
    this.campaign = null;
    this.nightResult = null;
    this.difficulty = null;
    this.challenges = null;
    this.battle = null;
    this.rescue = null;
    this.bank = null;
    this.placement = null;
    this.paused = false;
    this.rng = createRng(this.seed === undefined ? Date.now() : this.seed);
  }
}
