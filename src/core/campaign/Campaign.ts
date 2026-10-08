import { CHALLENGES, type Challenge } from "../challenges";
import type { ChallengeOutcome } from "../ChallengeManager";
import { DEFENSES, type DefenseId } from "../defenses";
import type { Difficulty } from "../difficulty";
import { TOTAL_NIGHTS, newChallengesOf, nightPlan, type NightPlan } from "./nights";
import { POST_IDS, SUMMON_COST, type PostId } from "../battle/guardians";
import { isPowerId, type PowerId } from "../battle/powers";
import { levelOf, nextUpgradeCost, type Upgrades } from "./upgrades";
import type { Placement } from "../placement";

/**
 * Estado de la campaña de un estudiante: en qué noche va, qué armas tiene
 * (ganadas, perdidas y mejoradas), cuánto polvo estelar ganó y el registro de
 * cada respuesta, que alimenta el panel del docente. No usa el DOM.
 */

export const DUST_CORRECT = 10;
export const DUST_REVIEW = 15;
export const DUST_NIGHT_WON = 20;
export const DUST_NIGHT_LOST = 5;
export const DUST_RESCUE = 10;
/** Parte de la energía que suma cada nivel de la escuela. */
export const SCHOOL_HEALTH_PER_LEVEL = 0.2;

/** Polvo estelar que cuesta convocar cada puesto de guardianes, en orden. */
export const POST_COSTS: readonly number[] = [25, 40, 60];

export type CampaignStage = "intro" | "challenges" | "placement" | "workshop" | "finished";

export interface AnswerEvent {
  night: number;
  challengeId: string;
  defense: DefenseId;
  correct: boolean;
  /** Repaso de un desafío fallado en una noche anterior. */
  review: boolean;
  at: number;
}

export interface NightResult {
  night: number;
  victory: boolean;
  stopped: number;
  baseEnergy: number;
  rescuesCorrect: number;
  /** Polvo estelar de la noche: premios más el que se recogió en la batalla. */
  dustEarned: number;
  /** Parte del polvo que se recogió tocándolo durante la batalla. */
  dustCollected: number;
}

export interface CampaignSave {
  version: 2;
  name: string;
  difficulty: Difficulty;
  createdAt: number;
  updatedAt: number;
  night: number;
  stage: CampaignStage;
  unlocked: DefenseId[];
  lost: DefenseId[];
  upgrades: Upgrades;
  /** Puestos de guardianes convocados y su nivel. */
  posts: Partial<Record<PostId, number>>;
  /** Nivel de la escuela (1 a 3): cada nivel suma energía. */
  school?: number;
  /** Poder de estrella elegido. */
  power?: PowerId;
  dust: number;
  placement: Placement | null;
  nightResults: NightResult[];
  log: AnswerEvent[];
  usedQuestions: string[];
}

export interface BattleReport {
  victory: boolean;
  stopped: number;
  baseEnergy: number;
  rescuesCorrect: number;
  /** Polvo estelar que ya se recogió durante la batalla (ya está sumado). */
  collected?: number;
}

export class Campaign {
  constructor(readonly data: CampaignSave) {}

  static create(name: string, difficulty: Difficulty, now = Date.now()): Campaign {
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!clean) throw new Error("Escribe un nombre o apodo.");
    return new Campaign({
      version: 2,
      name: clean,
      difficulty,
      createdAt: now,
      updatedAt: now,
      night: 1,
      stage: "intro",
      unlocked: [],
      lost: [],
      upgrades: {},
      posts: {},
      dust: 0,
      placement: null,
      nightResults: [],
      log: [],
      usedQuestions: []
    });
  }

  static fromSave(save: CampaignSave): Campaign {
    if (save?.version !== 2 || !save.name || save.night < 1 || save.night > TOTAL_NIGHTS) {
      throw new Error("Campaña guardada no válida.");
    }
    save.posts ??= {};
    if (save.power !== undefined && !isPowerId(save.power)) delete save.power;
    return new Campaign(save);
  }

  get name(): string {
    return this.data.name;
  }

  get night(): number {
    return this.data.night;
  }

  get plan(): NightPlan {
    return nightPlan(this.data.night);
  }

  get isFinished(): boolean {
    return this.data.stage === "finished";
  }

  get dust(): number {
    return this.data.dust;
  }

  /**
   * Armas que se habían perdido al empezar la noche. Se reconstruye con el
   * registro para que la lista de desafíos no cambie mientras se responde.
   */
  private lostAtNightStart(): Set<DefenseId> {
    const set = new Set(this.data.lost);
    for (const e of this.data.log) {
      if (e.night !== this.data.night) continue;
      if (!e.review && !e.correct) set.delete(e.defense);
      if (e.review && e.correct) set.add(e.defense);
    }
    return set;
  }

  /** Desafíos de repaso: uno por cada arma perdida en noches anteriores, en el orden original. */
  reviewChallenges(): Challenge[] {
    const lost = this.lostAtNightStart();
    return CHALLENGES.filter((c) => lost.has(c.defense) && !newChallengesOf(this.data.night).includes(c));
  }

  /** Lista completa de la noche: primero los repasos y luego los desafíos nuevos. */
  challengeList(): Challenge[] {
    return [...this.reviewChallenges(), ...newChallengesOf(this.data.night)];
  }

  /** Resultado de cada desafío de la noche ya respondido, en el orden de `challengeList()`. */
  nightOutcomes(): ChallengeOutcome[] {
    const outcomes: ChallengeOutcome[] = [];
    for (const c of this.challengeList()) {
      const event = this.data.log.find((e) => e.night === this.data.night && e.challengeId === c.id);
      if (!event) break;
      outcomes.push(event.correct ? "won" : "lost");
    }
    return outcomes;
  }

  /** Ya se respondieron todos los desafíos de la noche. */
  get challengesDone(): boolean {
    return this.nightOutcomes().length === this.challengeList().length;
  }

  /** Esta noche empieza con desafíos de repaso. */
  isReview(challenge: Challenge): boolean {
    return this.reviewChallenges().includes(challenge);
  }

  /** Registra la respuesta a un desafío (un solo intento). */
  recordAnswer(challenge: Challenge, correct: boolean, now = Date.now()): void {
    const review = this.isReview(challenge);
    const d = this.data;
    if (d.log.some((e) => e.night === d.night && e.challengeId === challenge.id)) {
      throw new Error("Ese desafío ya se respondió esta noche.");
    }
    d.log.push({ night: d.night, challengeId: challenge.id, defense: challenge.defense, correct, review, at: now });
    if (correct) {
      if (!d.unlocked.includes(challenge.defense)) d.unlocked.push(challenge.defense);
      d.lost = d.lost.filter((id) => id !== challenge.defense);
      d.dust += review ? DUST_REVIEW : DUST_CORRECT;
    } else if (!d.unlocked.includes(challenge.defense) && !d.lost.includes(challenge.defense)) {
      d.lost.push(challenge.defense);
    }
    d.updatedAt = now;
  }

  /** Armas que se pueden colocar esta noche, en el orden de los desafíos. */
  get weapons(): DefenseId[] {
    return DEFENSES.map((x) => x.id).filter((id) => this.data.unlocked.includes(id));
  }

  /** Aplica el resultado de la batalla: polvo estelar y avance de noche. Devuelve el polvo ganado. */
  finishBattle(report: BattleReport, now = Date.now()): NightResult {
    const d = this.data;
    // El polvo de los zombis ya se sumó al recogerlo en la batalla; aquí van los premios de la noche.
    const bonus = (report.victory ? DUST_NIGHT_WON : DUST_NIGHT_LOST) + report.rescuesCorrect * DUST_RESCUE;
    const collected = report.collected ?? 0;
    const result: NightResult = { night: d.night, victory: report.victory, dustEarned: bonus + collected, dustCollected: collected, ...pick(report) };
    d.nightResults.push(result);
    d.dust += bonus;
    d.updatedAt = now;
    if (report.victory) {
      if (d.night >= TOTAL_NIGHTS) d.stage = "finished";
      else {
        d.night++;
        d.stage = "workshop";
        d.placement = null;
      }
    } else {
      d.stage = "workshop";
    }
    return result;
  }

  level(id: DefenseId): number {
    return levelOf(this.data.upgrades, id);
  }

  canUpgrade(id: DefenseId): boolean {
    const cost = nextUpgradeCost(this.level(id));
    return this.data.unlocked.includes(id) && cost !== null && this.data.dust >= cost;
  }

  /** Sube un arma de nivel gastando polvo estelar. */
  upgrade(id: DefenseId): void {
    if (!this.data.unlocked.includes(id)) throw new Error("Esa arma todavía no es tuya.");
    const level = this.level(id);
    const cost = nextUpgradeCost(level);
    if (cost === null) throw new Error("Esa arma ya está al máximo.");
    if (this.data.dust < cost) throw new Error("No alcanza el polvo estelar.");
    this.data.dust -= cost;
    this.data.upgrades[id] = level + 1;
  }

  // ---------- Escuela y poder ----------

  get schoolLevel(): number {
    return this.data.school ?? 1;
  }

  /** Cuánto se multiplica la energía de la escuela por sus mejoras. */
  get schoolHealthFactor(): number {
    return 1 + SCHOOL_HEALTH_PER_LEVEL * (this.schoolLevel - 1);
  }

  nextSchoolCost(): number | null {
    return nextUpgradeCost(this.schoolLevel);
  }

  canUpgradeSchool(): boolean {
    const cost = this.nextSchoolCost();
    return cost !== null && this.data.dust >= cost;
  }

  /** Refuerza la escuela (más energía) gastando polvo estelar. */
  upgradeSchool(): void {
    const cost = this.nextSchoolCost();
    if (cost === null) throw new Error("La escuela ya está al máximo.");
    if (this.data.dust < cost) throw new Error("No alcanza el polvo estelar.");
    this.data.dust -= cost;
    this.data.school = this.schoolLevel + 1;
  }

  /** Poder de estrella elegido para las batallas (por defecto, el Rayo de Acrux). */
  get power(): PowerId {
    return this.data.power ?? "rayo";
  }

  setPower(id: PowerId): void {
    this.data.power = id;
  }

  // ---------- Guardianes ----------

  /** Puestos de guardianes convocados, en orden. */
  get ownedPosts(): PostId[] {
    return POST_IDS.filter((id) => this.data.posts[id] !== undefined);
  }

  postLevel(id: PostId): number {
    return this.data.posts[id] ?? 0;
  }

  /** Costo del próximo puesto, o null si ya tiene los tres. */
  nextPostCost(): number | null {
    return POST_COSTS[this.ownedPosts.length] ?? null;
  }

  canBuyPost(): boolean {
    const cost = this.nextPostCost();
    return cost !== null && this.data.dust >= cost;
  }

  /** Convoca el siguiente puesto de guardianes gastando polvo estelar. */
  buyPost(): PostId {
    const cost = this.nextPostCost();
    if (cost === null) throw new Error("Ya tienes los tres puestos.");
    if (this.data.dust < cost) throw new Error("No alcanza el polvo estelar.");
    const id = POST_IDS[this.ownedPosts.length];
    this.data.dust -= cost;
    this.data.posts[id] = 1;
    return id;
  }

  canUpgradePost(id: PostId): boolean {
    const level = this.postLevel(id);
    const cost = level > 0 ? nextUpgradeCost(level) : null;
    return cost !== null && this.data.dust >= cost;
  }

  upgradePost(id: PostId): void {
    const level = this.postLevel(id);
    if (level === 0) throw new Error("Ese puesto todavía no está convocado.");
    const cost = nextUpgradeCost(level);
    if (cost === null) throw new Error("Ese puesto ya está al máximo.");
    if (this.data.dust < cost) throw new Error("No alcanza el polvo estelar.");
    this.data.dust -= cost;
    this.data.posts[id] = level + 1;
  }

  /** Gasta polvo estelar en plena batalla para volver a convocar a una estrellita. Devuelve si alcanzó. */
  spendSummon(): boolean {
    if (this.data.dust < SUMMON_COST) return false;
    this.data.dust -= SUMMON_COST;
    return true;
  }

  /** Cierra el taller y sigue con la noche que corresponde. */
  leaveWorkshop(): void {
    // Si se perdió la batalla, se repite la misma noche con la colocación; si no, sigue la lista de noches.
    const last = this.data.nightResults[this.data.nightResults.length - 1];
    this.data.stage = last && !last.victory && this.challengesDone ? "placement" : "intro";
  }
}

function pick(r: BattleReport): Pick<NightResult, "stopped" | "baseEnergy" | "rescuesCorrect"> {
  return { stopped: r.stopped, baseEnergy: r.baseEnergy, rescuesCorrect: r.rescuesCorrect };
}
