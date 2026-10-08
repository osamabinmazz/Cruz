import { POWERS, type PowerId } from "../core/battle/powers";
import { PROCEDURE_STEPS, type Hint } from "../core/challenges";
import { defenseById, type DefenseId } from "../core/defenses";
import { MIN_TRACE_LENGTH, pointAnswer, traceAnswer } from "../core/freeform";
import { SKY, type Point } from "../core/geometry";
import { EXTREME_STARS, MAX_EASE } from "../core/extreme";
import { loadExtremeEase, saveExtremeEase } from "./saveStore";
import { LEVEL_DESCRIPTIONS, LEVEL_INFO_TEXT, type Difficulty, type EnemyKind } from "../core/difficulty";
import { Campaign } from "../core/campaign/Campaign";
import type { PostId } from "../core/battle/guardians";
import { Game } from "../core/Game";
import { SYNTHESIS } from "../core/synthesis";
import { medalsFor } from "../core/medals";
import { AudioManager } from "./audio";
import { BattleView } from "./BattleView";
import { challengeScene, procedureScene, type SceneState } from "./sky";
import { GUIDE_LINES, cheerFor, comfortFor, guideHtml, introFor } from "./guide";
import { itemInfo, mapPreview, placementMap, type SlotState } from "./mapPreview";
import { isPostId } from "../core/battle/guardians";
import { MAPS } from "../core/battle/maps";
import { NIGHTS } from "../core/campaign/nights";
import { SLOTS, weaponAt, type SlotItem } from "../core/placement";
import { diplomaHtml, teacherLoginHtml, teacherPanelHtml, type TeacherTab, type View } from "./teacherScreens";
import { checkPin, checkRecovery, createPin, getDriveClientId, getTeams, hasPin, isValidPin, setDriveClientId, setTeams } from "./teacherStore";
import { uploadCsvToDrive } from "./drive";
import { toCsv } from "../core/teacher";
import { campaignFinalHtml, esc as escHtml, newStudentHtml, newZombieOf, nightResultHtml, nightsHtml, storyHtml, studentsHtml, workshopHtml } from "./campaignScreens";
import { deleteStudent, exportStudent, findStudent, importStudent, listStudents, saveStudent, studentKey } from "./campaignStore";
import { drawZombie } from "./zombiesCanvas";
import { clearSave, describeSave, loadSave, writeSave } from "./saveStore";
import { Starfield } from "./starfield";
import { FinalScene } from "./finalScene";
import { TitleScene } from "./titleScene";
import { WeaponCard } from "./weaponCard";
import { weaponIcon } from "./weaponIcons";

interface ChallengeUiState {
  selected: string[];
  assignment: Record<string, string>;
  activeSlot: string | null;
  feedback: { kind: "correct" | "wrong"; text: string; defense?: DefenseId; correctText?: string } | null;
  hint: Hint | null;
  hintTargets: Set<string>;
  flashInstruction: boolean;
  trace: [Point, Point] | null;
  pointX: number | null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function freshChallengeUi(): ChallengeUiState {
  return { selected: [], assignment: {}, activeSlot: null, feedback: null, hint: null, hintTargets: new Set(), flashInstruction: false, trace: null, pointX: null };
}

export class App {
  readonly game = new Game();
  readonly audio = new AudioManager();
  private ui = freshChallengeUi();
  /** Arma elegida en la pantalla de colocación, esperando un lugar. */
  private selectedWeapon: SlotItem | null = null;
  /** Formulario de nuevo estudiante. */
  private newLevel: Difficulty = "beginner";
  private newName = "";
  private studentMessage = "";
  private newStudentError = "";
  private showLevelInfo = false;
  private demoStep: 1 | 2 | 3 = 1;
  private demoTimer: number | null = null;
  private battleView: BattleView | null = null;
  private titleScene: TitleScene | null = null;
  /** Pantalla mostrada en el último render (para animar solo los cambios de pantalla). */
  private lastScreen: string | null = null;
  /** Lluvia de estrellas pendiente tras una respuesta correcta. */
  private pendingCelebrate = false;
  private weaponCard: WeaponCard | null = null;
  private finalScene: FinalScene | null = null;
  private screenEl: HTMLElement;
  private overlayEl: HTMLElement;

  constructor(root: HTMLElement) {
    root.innerHTML = `<div class="screen"></div><div class="overlay hidden"></div>`;
    this.screenEl = root.querySelector(".screen")!;
    this.overlayEl = root.querySelector(".overlay")!;
    this.game.extremeEase = loadExtremeEase();
    this.game.onExtremeEase = saveExtremeEase;
    root.addEventListener("click", (e) => this.onClick(e));
    root.addEventListener("pointerdown", (e) => this.onPointerDown(e as PointerEvent));
    root.addEventListener("pointermove", (e) => this.onPointerMove(e as PointerEvent));
    root.addEventListener("pointerup", () => this.onPointerUp());
    root.addEventListener("pointercancel", () => this.onPointerUp());
    root.addEventListener("change", (e) => this.onChange(e));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.weaponCard) {
        this.weaponCard.close();
        return;
      }
      if (e.key === "Escape" && this.canPause()) this.game.paused ? this.resume() : this.pause();
    });
    document.addEventListener("fullscreenchange", () => this.render());
    new Starfield(document.body).start();
    this.render();
  }

  // ---------------- Acciones ----------------

  private onClick(e: Event): void {
    const el = (e.target as Element).closest<HTMLElement>("[data-action]");
    if (!el || (el as HTMLButtonElement).disabled) return;
    const action = el.dataset.action!;
    const g = this.game;
    switch (action) {
      case "extreme":
        this.audio.click();
        g.start();
        g.selectDifficulty("extreme");
        this.ui = freshChallengeUi();
        break;
      case "start":
        this.audio.click();
        g.start();
        this.showLevelInfo = false;
        break;
      case "continue": {
        const data = loadSave();
        if (!data) break;
        this.audio.click();
        try {
          g.restore(data);
        } catch {
          clearSave();
          break;
        }
        this.ui = freshChallengeUi();
        this.selectedWeapon = null;
        break;
      }
      case "level":
        this.audio.click();
        g.selectDifficulty(el.dataset.level as Difficulty);
        this.ui = freshChallengeUi();
        break;
      case "accept-mission":
        this.audio.click();
        g.acceptMission();
        if (g.screen === "demo") this.startDemo();
        break;
      case "level-info":
        this.showLevelInfo = !this.showLevelInfo;
        break;
      case "demo-replay":
        this.startDemo();
        break;
      case "demo-done":
        this.stopDemo();
        g.finishDemo();
        break;
      case "teacher":
        this.audio.click();
        this.view = { kind: "teacher-login", mode: hasPin() ? "enter" : "create" };
        break;
      case "teacher-create": {
        const pin = this.field("pin");
        if (!isValidPin(pin)) this.view = { kind: "teacher-login", mode: "create", error: "El PIN debe tener de 4 a 8 números." };
        else if (pin !== this.field("pin2")) this.view = { kind: "teacher-login", mode: "create", error: "Los dos PIN no coinciden." };
        else {
          const code = createPin(pin);
          this.view = code ? { kind: "teacher-login", mode: "enter", code } : { kind: "teacher-login", mode: "create", error: "No se pudo guardar el PIN en este navegador." };
        }
        break;
      }
      case "teacher-enter":
        this.view = checkPin(this.field("pin")) ? { kind: "teacher", tab: "students" } : { kind: "teacher-login", mode: "enter", error: "PIN incorrecto." };
        break;
      case "teacher-open-panel":
        this.view = { kind: "teacher", tab: "students" };
        break;
      case "teacher-recover-open":
        this.view = { kind: "teacher-login", mode: "recover" };
        break;
      case "teacher-recover": {
        const pin = this.field("pin");
        if (!checkRecovery(this.field("rec"))) this.view = { kind: "teacher-login", mode: "recover", error: "Ese código de recuperación no es correcto." };
        else if (!isValidPin(pin)) this.view = { kind: "teacher-login", mode: "recover", error: "El PIN nuevo debe tener de 4 a 8 números." };
        else {
          const code = createPin(pin);
          this.view = code ? { kind: "teacher-login", mode: "enter", code } : { kind: "teacher-login", mode: "recover", error: "No se pudo guardar el PIN." };
        }
        break;
      }
      case "teacher-tab":
        this.view = { kind: "teacher", tab: el.dataset.tab as TeacherTab };
        break;
      case "teacher-exit":
        this.view = null;
        break;
      case "teacher-projector":
        if (this.view?.kind === "teacher") this.view = { ...this.view, tab: "teams", projector: !this.view.projector };
        break;
      case "teacher-csv":
        this.downloadCsv();
        this.teacherMsg("Reporte descargado.");
        break;
      case "teacher-drive":
        void this.uploadDrive();
        return;
      case "teacher-print":
        window.print();
        return;
      case "teacher-delete":
        if (confirm(`¿Borrar la campaña de ${el.dataset.name}? No se puede deshacer.`)) {
          deleteStudent(el.dataset.name!);
          this.teacherMsg("Estudiante borrado.");
        }
        break;
      case "teacher-team-add": {
        const name = this.field("team-name").trim();
        const teams = getTeams();
        if (name && !teams[name]) setTeams({ ...teams, [name]: [] });
        break;
      }
      case "teacher-team-del": {
        const teams = { ...getTeams() };
        delete teams[el.dataset.team!];
        setTeams(teams);
        break;
      }
      case "teacher-change-pin": {
        const pin = this.field("new-pin");
        if (!isValidPin(pin)) this.teacherMsg("El PIN debe tener de 4 a 8 números.");
        else {
          const code = createPin(pin);
          this.view = code ? { kind: "teacher-login", mode: "enter", code } : this.view;
        }
        break;
      }
      case "teacher-save-client":
        setDriveClientId(this.field("client-id"));
        this.teacherMsg("Client ID guardado.");
        break;
      case "diploma":
        this.view = { kind: "diploma", name: el.dataset.name!, back: (el.dataset.back as "teacher" | "final") ?? "final" };
        break;
      case "diploma-back":
        this.view = el.dataset.back === "teacher" ? { kind: "teacher", tab: "students" } : null;
        break;
      case "print":
        window.print();
        return;
      case "clear-draw":
        this.ui.trace = null;
        this.ui.pointX = null;
        this.redrawScene();
        break;
      case "select-option":
        this.selectOption(el.dataset.id!);
        break;
      case "assign-slot":
        this.ui.activeSlot = el.dataset.slot!;
        break;
      case "assign-pos":
        this.assign(el.dataset.slot!, el.dataset.id!);
        break;
      case "check":
        this.check();
        break;
      case "hint":
        this.hint();
        break;
      case "repeat":
        this.repeatInstruction();
        break;
      case "next-challenge":
        this.audio.click();
        g.nextChallenge();
        this.ui = freshChallengeUi();
        break;
      case "to-battle":
        this.audio.click();
        g.goToPlacement();
        this.selectedWeapon = null;
        break;
      case "pick-weapon": {
        const id = el.dataset.id as SlotItem;
        this.audio.click();
        this.selectedWeapon = this.selectedWeapon === id ? null : id;
        break;
      }
      case "place-slot": {
        const slot = Number(el.dataset.slot);
        const occupant = weaponAt(g.placement!, slot);
        if (g.campaign) {
          if (this.selectedWeapon) {
            g.putItem(this.selectedWeapon, slot);
            this.audio.unlock();
            this.selectedWeapon = null;
          } else if (occupant) {
            this.audio.click();
            this.selectedWeapon = occupant;
          }
          break;
        }
        if (this.selectedWeapon) {
          g.placeWeapon(this.selectedWeapon as DefenseId, slot);
          this.audio.unlock();
          this.selectedWeapon = null;
        } else if (occupant && !isPostId(occupant)) {
          this.audio.click();
          this.selectedWeapon = occupant;
        }
        break;
      }
      case "reset-placement":
        this.audio.click();
        g.resetPlacement();
        this.selectedWeapon = null;
        break;
      case "start-battle":
        this.audio.click();
        g.startBattle();
        break;
      case "retry-battle":
        this.audio.click();
        g.retryBattle();
        break;
      case "campaign":
        this.audio.click();
        this.leaveGame();
        this.studentMessage = "";
        g.openStudents();
        break;
      case "open-new-student":
        this.audio.click();
        this.newLevel = "beginner";
        this.newName = "";
        this.newStudentError = "";
        g.openNewStudent();
        break;
      case "pick-level":
        this.audio.click();
        this.newName = this.readNameInput();
        this.newLevel = el.dataset.level as Difficulty;
        break;
      case "create-student": {
        const name = this.readNameInput();
        this.newName = name;
        if (!name.trim()) {
          this.newStudentError = "Escribe un nombre o apodo para empezar.";
          break;
        }
        if (findStudent(name)) {
          this.newStudentError = "Ya hay un estudiante con ese nombre. Elige otro, o vuelve y toca su nombre para seguir.";
          break;
        }
        this.audio.click();
        const c = g.createStudent(name, this.newLevel);
        saveStudent(g.campaignSnapshot() ?? c.data);
        this.newStudentError = "";
        break;
      }
      case "pick-student": {
        const save = findStudent(el.dataset.name!);
        if (!save) break;
        this.audio.click();
        try {
          g.enterCampaign(Campaign.fromSave(save));
        } catch {
          this.studentMessage = "Esa campaña está dañada y no se pudo abrir.";
        }
        break;
      }
      case "delete-student": {
        const name = el.dataset.name!;
        if (!window.confirm(`¿Borrar la campaña de ${name}? No se puede deshacer.`)) return;
        deleteStudent(name);
        this.studentMessage = "";
        break;
      }
      case "save-student":
        this.downloadStudent(el.dataset.name!);
        return;
      case "start-night":
        this.audio.click();
        g.startNight();
        this.ui = freshChallengeUi();
        break;
      case "begin-challenges":
        this.audio.click();
        g.beginNightChallenges();
        this.ui = freshChallengeUi();
        this.selectedWeapon = null;
        break;
      case "leave-result":
        this.audio.click();
        g.leaveNightResult();
        break;
      case "open-workshop":
        this.audio.click();
        g.openWorkshop();
        break;
      case "upgrade-school":
        this.audio.unlock();
        g.upgradeSchool();
        break;
      case "pick-power":
        g.choosePower(el.dataset.id as PowerId);
        break;
      case "upgrade-weapon":
        this.audio.unlock();
        g.upgradeWeapon(el.dataset.id as DefenseId);
        break;
      case "buy-post":
        this.audio.unlock();
        g.buyPost();
        break;
      case "upgrade-post":
        this.audio.unlock();
        g.upgradePost(el.dataset.id as PostId);
        break;
      case "leave-workshop":
        this.audio.click();
        g.leaveWorkshop();
        this.selectedWeapon = null;
        break;
      case "stash-item":
        if (this.selectedWeapon && g.placement?.[this.selectedWeapon] !== undefined) {
          this.audio.click();
          g.stashItem(this.selectedWeapon);
          this.selectedWeapon = null;
        }
        break;
      case "to-nights": {
        const c = g.campaign;
        if (!c) break;
        this.leaveGame();
        g.enterCampaign(c);
        break;
      }
      case "pause":
        this.pause();
        return;
      case "resume":
        this.resume();
        return;
      case "restart":
        this.leaveGame();
        g.restart();
        this.showLevelInfo = false;
        break;
      case "menu":
        this.view = null;
        this.leaveGame();
        g.backToMenu();
        break;
      case "sound":
        this.audio.toggle();
        break;
      case "fullscreen":
        this.toggleFullscreen();
        return;
      default:
        return;
    }
    this.render();
  }

  private field(id: string): string {
    return this.screenEl.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "";
  }

  private teacherMsg(msg: string): void {
    if (this.view?.kind === "teacher") this.view = { ...this.view, msg };
  }

  private downloadCsv(): void {
    const teams = getTeams();
    const teamOf = (name: string) => Object.entries(teams).find(([, keys]) => keys.includes(studentKey(name)))?.[0] ?? "";
    const csv = toCsv(listStudents(), teamOf);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cruz-del-sur-reporte-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async uploadDrive(): Promise<void> {
    const id = getDriveClientId();
    if (!id) {
      this.teacherMsg("Falta el Client ID de Google (Ajustes). Mira docs/DRIVE.md.");
      this.render();
      return;
    }
    const teams = getTeams();
    const teamOf = (name: string) => Object.entries(teams).find(([, keys]) => keys.includes(studentKey(name)))?.[0] ?? "";
    try {
      this.teacherMsg("Conectando con Google…");
      this.render();
      const link = await uploadCsvToDrive(id, `cruz-del-sur-reporte-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(listStudents(), teamOf));
      this.teacherMsg(link ? `Subido a tu Drive: ${link}` : "Subido a tu Drive.");
    } catch (err) {
      this.teacherMsg(err instanceof Error ? err.message : "No se pudo subir a Drive.");
    }
    this.render();
  }

  private renderView(v: View): void {
    if (v.kind === "teacher-login") this.screenEl.innerHTML = teacherLoginHtml(v);
    else if (v.kind === "teacher") this.screenEl.innerHTML = teacherPanelHtml(v, listStudents(), getTeams(), getDriveClientId());
    else {
      const save = findStudent(v.name);
      if (!save) {
        this.view = null;
        this.render();
        return;
      }
      this.screenEl.innerHTML = diplomaHtml(save, v.back);
    }
  }

  private readNameInput(): string {
    const input = this.screenEl.querySelector<HTMLInputElement>("#student-name");
    return input ? input.value : this.newName;
  }

  /** Baja la campaña de un estudiante como archivo, para llevarla a otro equipo. */
  private downloadStudent(name: string): void {
    const text = exportStudent(name);
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cruz-del-sur-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "campana"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Carga una campaña desde un archivo llevado de otro equipo. */
  private onChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.dataset.actionChange === "assign-team") {
      const key = input.dataset.key!;
      const teams = Object.fromEntries(Object.entries(getTeams()).map(([t, keys]) => [t, keys.filter((k) => k !== key)]));
      if (input.value && teams[input.value]) teams[input.value].push(key);
      setTeams(teams);
      this.render();
      return;
    }
    if (input.dataset.actionChange !== "load-student" || !input.files?.[0]) return;
    const file = input.files[0];
    void file.text().then((text) => {
      try {
        const name = importStudent(text);
        this.studentMessage = `Listo: se cargó la campaña de ${name}.`;
      } catch (err) {
        this.studentMessage = err instanceof Error ? err.message : "No se pudo cargar el archivo.";
      }
      this.render();
    });
  }

  private canPause(): boolean {
    return ["demo", "challenge", "synthesis", "battle"].includes(this.game.screen);
  }

  private pause(): void {
    this.game.pause();
    this.renderOverlay();
  }

  private resume(): void {
    this.game.resume();
    this.renderOverlay();
  }

  private leaveGame(): void {
    this.stopDemo();
    this.battleView?.destroy();
    this.battleView = null;
    this.game.resume();
    this.ui = freshChallengeUi();
  }

  private toggleFullscreen(): void {
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      else void document.documentElement.requestFullscreen().catch(() => {});
    } catch {
      /* pantalla completa no disponible */
    }
  }

  private startDemo(): void {
    this.stopDemo();
    this.demoStep = 1;
    this.demoTimer = window.setInterval(() => {
      if (this.game.paused) return;
      if (this.demoStep < 3) {
        this.demoStep = (this.demoStep + 1) as 2 | 3;
        this.render();
      } else this.stopDemo();
    }, 3200);
  }

  private stopDemo(): void {
    if (this.demoTimer !== null) window.clearInterval(this.demoTimer);
    this.demoTimer = null;
  }

  private selectOption(id: string): void {
    const cm = this.game.challenges!;
    if (cm.solved) return;
    const ch = cm.current;
    this.audio.click();
    if (ch.mode === "assign") {
      const slot = this.ui.activeSlot ?? ch.slots!.find((s) => !this.ui.assignment[s.id])?.id ?? ch.slots![0].id;
      this.assign(slot, id);
      return;
    }
    if (ch.mode === "single") this.ui.selected = [id];
    else this.ui.selected = this.ui.selected.includes(id) ? this.ui.selected.filter((x) => x !== id) : [...this.ui.selected, id];
  }

  private assign(slot: string, posId: string): void {
    const cm = this.game.challenges!;
    if (cm.solved) return;
    for (const [s, p] of Object.entries(this.ui.assignment)) if (p === posId && s !== slot) delete this.ui.assignment[s];
    this.ui.assignment[slot] = posId;
    const nextEmpty = cm.current.slots!.find((s) => !this.ui.assignment[s.id]);
    this.ui.activeSlot = nextEmpty ? nextEmpty.id : slot;
  }

  private currentAnswer(): string[] {
    const ch = this.game.challenges!.current;
    if (ch.interaction === "trace") return this.ui.trace ? [traceAnswer(this.ui.trace[0], this.ui.trace[1])] : [];
    if (ch.interaction === "point") return this.ui.pointX !== null ? [pointAnswer(this.ui.pointX)] : [];
    if (ch.mode === "assign") return ch.slots!.map((s) => this.ui.assignment[s.id] ?? "");
    return this.ui.selected;
  }

  private answerReady(): boolean {
    const ch = this.game.challenges!.current;
    if (ch.interaction === "trace") return this.ui.trace !== null;
    if (ch.interaction === "point") return this.ui.pointX !== null;
    if (ch.mode === "assign") return ch.slots!.every((s) => this.ui.assignment[s.id]);
    return this.ui.selected.length > 0;
  }

  private check(): void {
    const cm = this.game.challenges!;
    if (!this.answerReady() || cm.solved) return;
    const result = this.game.submitAnswer(this.currentAnswer());
    if (result.correct) {
      this.audio.correct();
      this.pendingCelebrate = true;
      if (result.unlockedDefense) {
        const id = result.unlockedDefense;
        const slot = this.game.campaign ? 0 : cm.challenges.findIndex((c) => c.defense === id) + 1;
        window.setTimeout(() => {
          if (this.game.screen !== "challenge" || this.weaponCard) return;
          this.weaponCard = new WeaponCard(id, slot, () => {
            this.weaponCard = null;
            (this.screenEl.querySelector("[data-action=next-challenge]") as HTMLElement | null)?.focus();
          });
          this.weaponCard.open(document.body);
        }, 900);
      }
      window.setTimeout(() => this.audio.unlock(), 450);
      this.ui.feedback = { kind: "correct", text: result.feedback, defense: result.unlockedDefense };
      this.ui.hint = null;
      this.ui.hintTargets.clear();
    } else {
      this.audio.wrong();
      const ch = cm.current;
      const label = (id: string) => ch.options.find((o) => o.id === id)?.label ?? id;
      const correctText =
        result.correctText ??
        (ch.mode === "assign"
          ? ch.slots!.map((slot, i) => `${slot.label} → ${label(ch.correct[i])}`).join(", ")
          : ch.correct.map(label).join(", "));
      this.ui.feedback = { kind: "wrong", text: result.feedback, defense: result.lostDefense, correctText };
      // En la escena se muestra la ubicación correcta de los nombres.
      if (ch.mode === "assign") ch.slots!.forEach((slot, i) => (this.ui.assignment[slot.id] = ch.correct[i]));
      this.ui.hint = null;
      this.ui.hintTargets.clear();
    }
  }

  private hint(): void {
    const h = this.game.challenges!.useHint();
    if (!h) return;
    this.audio.click();
    this.ui.hint = h;
    if (h.target) this.ui.hintTargets.add(h.target);
  }

  private repeatInstruction(): void {
    const ch = this.game.challenges!.current;
    this.audio.speak(ch.instruction);
    this.ui.flashInstruction = true;
    this.render();
    this.ui.flashInstruction = false;
  }

  // ---------------- Pantallas ----------------

  render(): void {
    const g = this.game;
    if (g.screen !== "battle" && this.battleView) {
      this.battleView.destroy();
      this.battleView = null;
    }
    if (g.screen !== "menu" && this.titleScene) {
      this.titleScene.destroy();
      this.titleScene = null;
    }
    if (g.screen !== "final" && g.screen !== "campaign-final" && this.finalScene) {
      this.finalScene.destroy();
      this.finalScene = null;
    }
    if (this.view) {
      this.renderView(this.view);
      return;
    }
    switch (g.screen) {
      case "menu":
        this.screenEl.innerHTML = this.menuHtml();
        this.mountTitleScene();
        break;
      case "level-select":
        this.screenEl.innerHTML = this.levelSelectHtml();
        break;
      case "mission":
        this.screenEl.innerHTML = this.missionHtml();
        break;
      case "demo":
        this.screenEl.innerHTML = this.topBar() + this.demoHtml();
        break;
      case "challenge":
        this.screenEl.innerHTML = this.topBar() + this.challengeHtml();
        break;
      case "synthesis":
        this.screenEl.innerHTML = this.topBar() + this.synthesisHtml();
        break;
      case "placement":
        this.screenEl.innerHTML = this.topBar() + this.placementHtml();
        break;
      case "battle":
        this.renderBattle();
        break;
      case "students":
        this.screenEl.innerHTML = studentsHtml(listStudents(), this.studentMessage);
        break;
      case "new-student":
        this.screenEl.innerHTML = newStudentHtml(this.newLevel, this.newStudentError, this.newName);
        this.screenEl.querySelector<HTMLInputElement>("#student-name")?.focus();
        break;
      case "nights":
        this.screenEl.innerHTML = this.topBar() + nightsHtml(g.campaign!);
        break;
      case "story":
        this.screenEl.innerHTML = this.topBar() + storyHtml(g.campaign!);
        this.drawZombiePortraits();
        break;
      case "night-result":
        this.screenEl.innerHTML = this.topBar() + nightResultHtml(g.nightResult!, g.campaign!);
        break;
      case "workshop":
        this.screenEl.innerHTML = this.topBar() + workshopHtml(g.campaign!);
        break;
      case "campaign-final":
        this.screenEl.innerHTML = campaignFinalHtml(g.campaign!);
        if (!this.finalScene) {
          this.finalScene = new FinalScene(true);
          this.finalScene.start();
        }
        this.screenEl.querySelector(".final-scene-slot")?.appendChild(this.finalScene.canvas);
        break;
      case "final":
        this.screenEl.innerHTML = this.finalHtml();
        if (!this.finalScene) {
          this.finalScene = new FinalScene(g.summary().victory);
          this.finalScene.start();
        }
        this.screenEl.querySelector(".final-scene-slot")?.appendChild(this.finalScene.canvas);
        break;
    }
    if (g.screen !== this.lastScreen) {
      // Animación de entrada solo al cambiar de pantalla.
      this.screenEl.classList.remove("screen-enter");
      void this.screenEl.offsetWidth;
      this.screenEl.classList.add("screen-enter");
      this.lastScreen = g.screen;
    }
    // Guarda el progreso para poder continuar la partida más tarde.
    const snap = g.snapshot();
    if (snap) writeSave(snap);
    else if (g.screen === "final") clearSave();
    // Campaña: se guarda a cada paso, en el aparato del estudiante.
    const campaignSave = g.campaignSnapshot();
    if (campaignSave && g.screen !== "students") saveStudent(campaignSave);
    if (this.pendingCelebrate && g.screen === "challenge") this.celebrate();
    this.pendingCelebrate = false;
    this.renderOverlay();
  }

  /** Retrato de cada zombi nuevo en la tarjeta de la historia. */
  private drawZombiePortraits(): void {
    for (const canvas of this.screenEl.querySelectorAll<HTMLCanvasElement>("canvas[data-zombie]")) {
      const ctx = canvas.getContext("2d");
      const kind = canvas.dataset.zombie as EnemyKind;
      if (!ctx || !newZombieOf(this.game.campaign!.night)) continue;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = kind === "gigante" ? 0.62 : 1.5;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height - 14);
      ctx.scale(scale, scale);
      drawZombie(ctx, kind, 0, 0, { walk: 1.2, health: 1, facing: "down" });
      ctx.restore();
    }
  }

  private mountTitleScene(): void {
    const slot = this.screenEl.querySelector(".title-scene-slot");
    if (!slot) return;
    if (!this.titleScene) {
      this.titleScene = new TitleScene();
      this.titleScene.start();
    }
    slot.appendChild(this.titleScene.canvas);
  }

  /** Lluvia de estrellas sobre la escena después de una respuesta correcta. */
  private celebrate(): void {
    const wrap = this.screenEl.querySelector(".scene-wrap");
    if (!wrap) return;
    const burst = document.createElement("div");
    burst.className = "celebrate";
    burst.setAttribute("aria-hidden", "true");
    const colors = ["#ffd54a", "#9be7ff", "#7cf5c4", "#ff8fab", "#ffffff"];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("span");
      const a = (i / 22) * Math.PI * 2;
      const d = 90 + Math.random() * 140;
      s.textContent = "★";
      s.style.setProperty("--dx", `${Math.cos(a) * d}px`);
      s.style.setProperty("--dy", `${Math.sin(a) * d - 40}px`);
      s.style.setProperty("--c", colors[i % colors.length]);
      s.style.animationDelay = `${Math.random() * 0.15}s`;
      s.style.fontSize = `${14 + Math.random() * 16}px`;
      burst.appendChild(s);
    }
    wrap.appendChild(burst);
    window.setTimeout(() => burst.remove(), 1600);
  }

  private renderBattle(): void {
    const g = this.game;
    if (this.battleView) {
      const bar = this.screenEl.querySelector(".top-bar");
      if (bar) bar.outerHTML = this.topBar();
      return;
    }
    this.screenEl.innerHTML = this.topBar();
    this.battleView = new BattleView(g, g.battle!, g.rescue!, this.audio, () => {
      g.goToFinal();
      this.render();
    });
    this.screenEl.appendChild(this.battleView.root);
    this.battleView.start();
  }

  private renderOverlay(): void {
    if (!this.game.paused) {
      this.overlayEl.classList.add("hidden");
      this.overlayEl.innerHTML = "";
      return;
    }
    this.overlayEl.classList.remove("hidden");
    this.overlayEl.innerHTML = `<div class="pause-menu" role="dialog" aria-modal="true">
      <h2>PAUSA</h2>
      <p class="level-tag">NIVEL: ${this.game.config.label}</p>
      <button class="btn primary big" data-action="resume">CONTINUAR</button>
      ${
        this.game.campaign
          ? `<button class="btn big" data-action="to-nights">SALIR A LAS NOCHES</button>
      <button class="btn big" data-action="menu">VOLVER AL MENÚ</button>
      <p class="note">Tu campaña se guarda sola. Si sales en medio de una noche, retomas donde ibas (la batalla vuelve a empezar).</p>`
          : `<button class="btn big" data-action="restart">REINICIAR PARTIDA</button>
      <button class="btn big" data-action="menu">VOLVER AL MENÚ</button>
      <p class="note">El nivel no se puede cambiar durante la partida. Para elegir otro nivel, reinicia la partida o vuelve al menú.</p>`
      }
    </div>`;
  }

  private settingsButtons(): string {
    return `<button class="icon-btn" data-action="sound" aria-label="Sonido">${this.audio.enabled ? "🔊" : "🔇"}<span>SONIDO</span></button>
      ${
        // Algunos navegadores (como el del iPhone) no permiten pantalla completa.
        document.fullscreenEnabled
          ? `<button class="icon-btn" data-action="fullscreen" aria-label="Pantalla completa">⛶<span>${document.fullscreenElement ? "SALIR" : "PANTALLA"}</span></button>`
          : ""
      }`;
  }

  private topBar(): string {
    const g = this.game;
    const camp = g.campaign;
    if (camp) {
      const dots = NIGHTS.map((n) => {
        const done = camp.isFinished || n.number < camp.night;
        const current = !camp.isFinished && n.number === camp.night;
        return `<li class="${done ? "done" : ""} ${current ? "current" : ""}" title="Noche ${n.number}: ${n.name}">${done ? "✓" : n.number}</li>`;
      }).join("");
      return `<header class="top-bar">
      <span class="level-tag">${escHtml(camp.name)} · NIVEL: ${g.config.label}</span>
      <ol class="progress" aria-label="Noche ${camp.night} de ${NIGHTS.length}">${dots}</ol>
      <div class="top-actions">${this.settingsButtons()}
        <button class="icon-btn" data-action="pause" aria-label="Pausa">⏸<span>PAUSA</span></button></div>
    </header>`;
    }
    const cm = g.challenges!;
    const inChallenges = g.screen === "challenge" || g.screen === "demo";
    const progress = cm.challenges
      .map((c, i) => {
        const outcome = cm.outcomes[i];
        const current = inChallenges && i === cm.index && !outcome;
        const cls = outcome === "won" ? "done" : outcome === "lost" ? "lost" : "";
        const mark = outcome === "won" ? "✓" : outcome === "lost" ? "✕" : c.number;
        return `<li class="${cls} ${current ? "current" : ""}" title="Desafío ${c.number}">${mark}</li>`;
      })
      .join("");
    return `<header class="top-bar">
      <span class="level-tag">NIVEL: ${g.config.label}</span>
      <ol class="progress" aria-label="Progreso: ${cm.completedCount} de 7 desafíos">${progress}</ol>
      <div class="top-actions">${this.settingsButtons()}
        <button class="icon-btn" data-action="pause" aria-label="Pausa">⏸<span>PAUSA</span></button></div>
    </header>`;
  }

  private menuHtml(): string {
    return `<main class="menu">
      <div class="title-wrap">
        <div class="title-scene-slot"></div>
        <div class="logo">
          <h1><span class="logo-star">✦</span> CRUZ DEL SUR <span class="logo-star">✦</span></h1>
          <p class="subtitle">Defensa de la escuela</p>
        </div>
      </div>
      <p class="menu-text">Aprende a encontrar el Sur aproximado con la Cruz del Sur, desbloquea siete defensas estelares y protege la escuela.</p>
      <div class="menu-buttons">
        <button class="btn primary huge" data-action="campaign">CAMPAÑA<small>Cinco noches con tu propio equipo</small></button>
      </div>
      ${this.extremeHtml()}
      ${this.continueHtml()}
      <div class="menu-settings">${this.settingsButtons()}<button class="icon-btn" data-action="teacher" aria-label="Panel del docente">👩‍🏫<span>DOCENTE</span></button></div>
      ${
        // En la versión publicada se ofrece el .zip para jugar sin internet.
        location.protocol.startsWith("http") && !import.meta.env.DEV
          ? `<a class="download-link" href="cruz-del-sur.zip" download>⬇ Descargar para jugar sin internet</a>
             <a class="download-link" href="1.0/">Jugar la versión 1.0</a>`
          : ""
      }
    </main>`;
  }

  private extremeHtml(): string {
    const ease = this.game.extremeEase;
    const note = ease > 0 ? `Perdiste antes: esta vez es un poco más fácil (${ease} de ${MAX_EASE})` : "Difícil, pero se puede ganar";
    return `<div class="menu-buttons">
      <button class="btn big extreme-btn" data-action="extreme">MODO EXTREMO<span class="extreme-stars" aria-label="10 estrellas">${"★".repeat(EXTREME_STARS)}</span><small>${note}</small></button>
    </div>`;
  }

  private continueHtml(): string {
    const save = loadSave();
    if (!save) return `<button class="btn big" data-action="start">PARTIDA RÁPIDA</button>`;
    return `<div class="menu-buttons">
      <button class="btn big" data-action="continue">CONTINUAR PARTIDA RÁPIDA<small>${describeSave(save)}</small></button>
      <button class="btn big" data-action="start">NUEVA PARTIDA RÁPIDA</button>
    </div>`;
  }

  private levelSelectHtml(): string {
    return `<main class="level-select">
      <h1>ELIGE TU NIVEL</h1>
      <div class="level-options">
        <button class="level-btn beginner" data-action="level" data-level="beginner">
          <span class="level-stars" aria-hidden="true">★</span>
          <span class="level-name">PRINCIPIANTE</span>
          <span class="level-desc">${LEVEL_DESCRIPTIONS.beginner}</span>
        </button>
        <button class="level-btn advanced" data-action="level" data-level="advanced">
          <span class="level-stars" aria-hidden="true">★★★</span>
          <span class="level-name">AVANZADO</span>
          <span class="level-desc">${LEVEL_DESCRIPTIONS.advanced}</span>
        </button>
      </div>
      <button class="btn info-btn" data-action="level-info" aria-expanded="${this.showLevelInfo}">ⓘ INFORMACIÓN</button>
      ${this.showLevelInfo ? `<p class="level-info" role="note">${LEVEL_INFO_TEXT}</p>` : ""}
      <p class="note">El nivel elegido se mantiene durante toda la partida.</p>
      <button class="btn" data-action="menu">VOLVER AL MENÚ</button>
    </main>`;
  }

  private procedureBar(active?: string): string {
    return `<ol class="procedure">${PROCEDURE_STEPS.map(
      (s, i) => `<li class="${s === active ? "active" : ""}"><b>${i + 1}.</b> ${s}.</li>`
    ).join("")}</ol>`;
  }

  private demoHtml(): string {
    const texts = [
      "ENCONTRAR: buscamos la Cruz del Sur y su eje mayor, el palo largo que va de Gacrux a Acrux.",
      "SEGUIR: desde Acrux seguimos la prolongación del eje mayor, la línea-guía punteada, hasta un punto del cielo.",
      "BAJAR: desde ese punto bajamos en línea recta hasta el horizonte. Allí está el Sur aproximado."
    ];
    return `<main class="demo">
      ${this.procedureBar(PROCEDURE_STEPS[this.demoStep - 1])}
      <h2>Demostración</h2>
      <div class="scene-wrap">${procedureScene(this.demoStep, true, true)}</div>
      <p class="demo-text">${texts[this.demoStep - 1]}</p>
      <div class="actions">
        <button class="btn" data-action="demo-replay">VER DE NUEVO</button>
        <button class="btn primary big" data-action="demo-done">EMPEZAR LOS DESAFÍOS</button>
      </div>
    </main>`;
  }

  private sceneState(highlights: Set<string>, removed: Set<string>): SceneState {
    const cm = this.game.challenges!;
    const ch = cm.current;
    const ui = this.ui;
    return {
      selected: ch.mode === "assign" ? Object.values(ui.assignment) : ui.selected,
      assignment: ui.assignment,
      highlights,
      removed,
      intenseGuide: cm.config.intenseGuideLine,
      axisReminder: cm.config.axisReminderAnimation,
      solved: cm.solved,
      trace: ui.trace,
      pointX: ui.pointX,
      wrong: ui.feedback?.kind === "wrong"
    };
  }

  private redrawScene(): void {
    const cm = this.game.challenges;
    const wrap = this.screenEl.querySelector(".scene-wrap");
    if (!cm || !wrap) return;
    const highlights = new Set<string>([...cm.guidedHighlights(), ...this.ui.hintTargets]);
    wrap.innerHTML = challengeScene(cm.current, this.sceneState(highlights, new Set()));
    this.syncDrawControls();
  }

  /** Activa COMPROBAR cuando ya hay un trazo o un toque, sin volver a dibujar toda la pantalla. */
  private syncDrawControls(): void {
    const btn = this.screenEl.querySelector<HTMLButtonElement>("[data-action=check]");
    if (btn) btn.disabled = !this.answerReady();
  }

  // ---------- Respuesta libre: trazar el eje mayor y tocar el horizonte ----------

  private drawStart: Point | null = null;
  /** Pantallas del docente y del diploma (fuera de la máquina de pantallas del juego). */
  private view: View | null = null;

  private svgPoint(e: PointerEvent): Point | null {
    const svg = (e.target as Element | null)?.closest?.(".scene-wrap svg") as SVGSVGElement | null;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: Math.max(0, Math.min(SKY.width, p.x)), y: Math.max(0, Math.min(SKY.height, p.y)) };
  }

  private onPointerDown(e: PointerEvent): void {
    const cm = this.game.challenges;
    if (this.game.screen !== "challenge" || !cm || cm.solved || !cm.current.interaction) return;
    const p = this.svgPoint(e);
    if (!p) return;
    e.preventDefault();
    if (cm.current.interaction === "point") {
      this.ui.pointX = p.x;
      this.audio.click();
      this.redrawScene();
      return;
    }
    this.drawStart = p;
    this.ui.trace = [p, p];
    this.redrawScene();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drawStart) return;
    const p = this.svgPoint(e);
    if (!p) return;
    this.ui.trace = [this.drawStart, p];
    this.redrawScene();
  }

  private onPointerUp(): void {
    if (!this.drawStart) return;
    const t = this.ui.trace;
    this.drawStart = null;
    if (t && Math.hypot(t[1].x - t[0].x, t[1].y - t[0].y) < MIN_TRACE_LENGTH) this.ui.trace = null;
    else this.audio.click();
    this.redrawScene();
  }

  private challengeHtml(): string {
    const cm = this.game.challenges!;
    const cfg = cm.config;
    const ch = cm.current;
    const ui = this.ui;
    const highlights = new Set<string>([...cm.guidedHighlights(), ...ui.hintTargets]);
    const removed = new Set<string>();
    const scene = challengeScene(ch, this.sceneState(highlights, removed));

    let controls = "";
    if (ch.interaction) {
      const how =
        ch.interaction === "trace"
          ? "✍️ Pon el dedo sobre una estrella, arrastra hasta la otra y suelta."
          : "👆 Toca el horizonte en el punto que marca el Sur.";
      controls = `<p class="draw-help">${how}</p>
        ${cm.solved ? "" : `<button class="btn small" data-action="clear-draw">↺ BORRAR Y REPETIR</button>`}`;
    } else if (ch.mode === "assign") {
      controls = ch
        .slots!.map((slot) => {
          const buttons = ch.options
            .map((o) => {
              const isRemoved = removed.has(o.id);
              const on = ui.assignment[slot.id] === o.id;
              return `<button class="chip ${on ? "on" : ""} ${isRemoved ? "removed" : ""}" data-action="assign-pos" data-slot="${slot.id}" data-id="${o.id}" ${isRemoved || cm.solved ? "disabled" : ""}>${o.label}</button>`;
            })
            .join("");
          return `<div class="assign-row ${ui.activeSlot === slot.id ? "active" : ""}">
            <button class="slot-name" data-action="assign-slot" data-slot="${slot.id}">${slot.label}</button>
            <span class="assign-arrow">→ posición:</span>${buttons}</div>`;
        })
        .join("");
    } else {
      controls = `<div class="chips">${cm.current.options
        .map((o) => {
          const isRemoved = removed.has(o.id);
          const on = ui.selected.includes(o.id);
          return `<button class="chip ${on ? "on" : ""} ${isRemoved ? "removed" : ""}" data-action="select-option" data-id="${o.id}" ${isRemoved || cm.solved ? "disabled" : ""}>${o.label}</button>`;
        })
        .join("")}</div>`;
      if (ch.mode === "multi") controls += `<p class="note">Seleccionadas: ${ui.selected.length} de 4</p>`;
    }

    const hintAvailable = cm.isHintAvailable();
    const hintLabel = hintAvailable ? "💡 PISTA" : `💡 PISTA <small>(no disponible en nivel ${cfg.label.toLowerCase()})</small>`;

    let feedback = "";
    if (ui.feedback) {
      const d = ui.feedback.defense ? defenseById(ui.feedback.defense) : null;
      const won = ui.feedback.kind === "correct";
      feedback = `<div class="feedback ${ui.feedback.kind}" role="status">
        ${won ? "" : `<p class="feedback-title">Respuesta incorrecta</p>`}
        <p>${esc(ui.feedback.text)}</p>
        ${ui.feedback.correctText ? `<p class="correct-was">Respuesta correcta: <b>${esc(ui.feedback.correctText)}</b></p>` : ""}
        ${d && won ? `<div class="unlock" style="--c:${d.color}">${weaponIcon(d.id, "weapon-icon big")}<div><b>¡Arma desbloqueada: ${d.name}!</b><br><small>${d.description}</small></div></div>` : ""}
        ${d && !won ? `<div class="unlock lost" style="--c:${d.color}">${weaponIcon(d.id, "weapon-icon big")}<div><b>Perdiste el arma ${d.name}.</b><br><small>${this.game.campaign ? "Esta noche no la tendrás: el desafío vuelve como repaso en la noche siguiente." : "Su lugar quedará vacío en el mapa durante la batalla."}</small></div></div>` : ""}
      </div>`;
    }

    const camp = this.game.campaign;
    const nextLabel = cm.isComplete ? (camp ? "COLOCAR MIS ARMAS" : "VER LA SÍNTESIS") : "SIGUIENTE DESAFÍO";
    const oneTry = cm.solved
      ? ""
      : `<p class="one-try-note">⚠️ Un solo intento: si te equivocas, no tendrás esta arma esta noche${camp ? " (volverá como repaso)" : ""}.</p>`;
    const heading = camp
      ? `Noche ${camp.night} · ${camp.isReview(ch) ? "↺ Repaso: " : ""}Desafío ${ch.number} de 7: ${ch.title}`
      : `Desafío ${ch.number} de 7: ${ch.title}`;
    return `<main class="challenge">
      ${cfg.showProcedureSteps ? this.procedureBar(ch.step) : ""}
      <h2>${heading}</h2>
      ${this.challengeGuide()}
      <div class="instruction ${ui.flashInstruction ? "flash" : ""}">
        <p>${ch.instruction}</p>
        <button class="btn small" data-action="repeat">🔁 REPETIR CONSIGNA</button>
      </div>
      <div class="challenge-body">
        <div class="scene-wrap">${scene}</div>
        <div class="side">
          ${controls}
          ${ui.hint ? `<div class="hint-box" role="status">💡 ${esc(ui.hint.text)}</div>` : ""}
          ${feedback}
          <div class="actions">
            ${cm.solved
              ? `<button class="btn primary big" data-action="next-challenge">${nextLabel}</button>`
              : `<button class="btn hint" data-action="hint" ${hintAvailable ? "" : "disabled"}>${hintLabel}</button>
                 <button class="btn primary big" data-action="check" ${this.answerReady() ? "" : "disabled"}>COMPROBAR</button>`}
          </div>
          ${oneTry}
        </div>
      </div>
    </main>`;
  }

  /** Lo que dice Acrux en el desafío actual: presentación, festejo o consuelo. */
  private challengeGuide(): string {
    const ch = this.game.challenges!.current;
    const fb = this.ui.feedback;
    if (!fb) return guideHtml(introFor(ch.number));
    if (fb.kind === "correct") return guideHtml(cheerFor(ch.number, defenseById(ch.defense).name), "happy");
    return guideHtml(comfortFor(ch.number), "comfort");
  }

  private defensesListHtml(ids: DefenseId[], lost: DefenseId[] = []): string {
    const items = ids.map((id) => {
      const d = defenseById(id);
      return `<li style="--c:${d.color}">${weaponIcon(d.id)}<div><b>${d.name}</b><small>${d.description}</small></div></li>`;
    });
    const empty = lost.map((id) => {
      const d = defenseById(id);
      return `<li class="lost" style="--c:#6b7390">${weaponIcon(d.id)}<div><b>${d.name}</b><small>Lugar vacío: la respuesta fue incorrecta.</small></div></li>`;
    });
    return `<ul class="defense-list">${[...items, ...empty].join("")}</ul>`;
  }

  /** Estado de cada lugar del mapa según las respuestas dadas. */
  private slotStates(): Partial<Record<DefenseId, SlotState>> {
    const cm = this.game.challenges!;
    const states: Partial<Record<DefenseId, SlotState>> = {};
    cm.challenges.forEach((ch, i) => {
      const o = cm.outcomes[i];
      states[ch.defense] = o === "won" ? "won" : o === "lost" ? "lost" : "pending";
    });
    return states;
  }

  /** Colocación de la campaña: se elige qué armas y puestos llevar a los siete lugares del mapa. */
  private campaignPlacementHtml(): string {
    const g = this.game;
    const camp = g.campaign!;
    const placement = g.placement!;
    const items = g.availableItems;
    const map = MAPS[camp.plan.map];
    const card = (id: SlotItem) => {
      const info = itemInfo(id);
      const slot = placement[id];
      const sel = this.selectedWeapon === id;
      const level = isPostId(id) ? camp.postLevel(id) : camp.level(id as DefenseId);
      const where = slot === undefined ? "en reserva" : `lugar ${slot + 1}`;
      return `<button class="weapon-pick ${sel ? "selected" : ""} ${slot === undefined ? "reserve" : ""}" style="--c:${info.color}" data-action="pick-weapon" data-id="${id}" aria-pressed="${sel}">
        ${info.icon()}<span><b>${info.name}</b><small>${"★".repeat(level)} · ${where}</small></span></button>`;
    };
    const placed = Object.keys(placement).length;
    const guide = this.selectedWeapon
      ? `Ahora toca un lugar del mapa para <b>${itemInfo(this.selectedWeapon).name}</b>. Si el lugar está ocupado, el otro pasa a la reserva (o cambian de lugar si los dos ya estaban en el mapa).`
      : items.length === 0
        ? GUIDE_LINES.placementEmpty
        : `Hay ${SLOTS.length} lugares en ${map.name.toLowerCase()}. Elige qué llevar: armas y guardianes comparten los lugares.`;
    return `<main class="placement">
      <h2>Noche ${camp.night} · ${escHtml(map.name)}: elige qué llevar</h2>
      ${guideHtml(guide, items.length === 0 ? "comfort" : "neutral")}
      <div class="placement-body">
        <div class="map-wrap">${placementMap(placement, this.selectedWeapon, map)}</div>
        <div class="side">
          <div class="weapon-palette">${items.map(card).join("")}</div>
          <h3 class="power-title">Poder de estrella para esta noche</h3>
          <div class="power-picker">${POWERS.map((p) => `<button class="power-pick ${camp.power === p.id ? "selected" : ""}" style="--c:${p.color}" data-action="pick-power" data-id="${p.id}" aria-pressed="${camp.power === p.id}"><b>${p.name}</b><small>${p.description}</small></button>`).join("")}</div>
          <p class="note">${placed} de ${SLOTS.length} lugares ocupados${items.length > placed ? ` · ${items.length - placed} en reserva` : ""}.</p>
          ${
            items.length === 0
              ? `<p class="note">Esta vez no tienes armas. La escuela dependerá de las <b>preguntas de emergencia</b>.</p>`
              : ""
          }
          <div class="actions">
            ${this.selectedWeapon && placement[this.selectedWeapon] !== undefined ? `<button class="btn" data-action="stash-item">GUARDAR EN RESERVA</button>` : ""}
            ${items.length > 0 ? `<button class="btn" data-action="reset-placement">COLOCACIÓN RECOMENDADA</button>` : ""}
            <button class="btn primary big" data-action="start-battle">¡COMENZAR LA BATALLA!</button>
          </div>
        </div>
      </div>
    </main>`;
  }

  private placementHtml(): string {
    if (this.game.campaign) return this.campaignPlacementHtml();
    const g = this.game;
    const cm = g.challenges!;
    const placement = g.placement!;
    const won = cm.unlockedDefenses;
    const reach = (r: number) => (r >= 200 ? "largo" : r >= 150 ? "medio" : "corto");
    const palette = won
      .map((id) => {
        const d = defenseById(id);
        const sel = this.selectedWeapon === id;
        return `<button class="weapon-pick ${sel ? "selected" : ""}" style="--c:${d.color}" data-action="pick-weapon" data-id="${id}" aria-pressed="${sel}">
          ${weaponIcon(id)}<span><b>${d.name}</b><small>Lugar ${placement[id]! + 1} · alcance ${reach(d.range)}</small></span></button>`;
      })
      .join("");
    const empty = SLOTS.length - won.length;
    return `<main class="placement">
      <h2>Coloca tus armas</h2>
      ${guideHtml(
        this.selectedWeapon
          ? `Ahora toca un lugar del mapa para <b>${defenseById(this.selectedWeapon as DefenseId).name}</b>. Si está ocupado, las dos armas cambian de lugar.`
          : won.length === 0
            ? GUIDE_LINES.placementEmpty
            : GUIDE_LINES.placement,
        won.length === 0 ? "comfort" : "neutral"
      )}
      <div class="placement-body">
        <div class="map-wrap">${placementMap(placement, this.selectedWeapon)}</div>
        <div class="side">
          <div class="weapon-palette">${palette}</div>
          ${
            won.length === 0
              ? `<p class="note">Esta vez no ganaste armas. La escuela dependerá de las <b>preguntas de emergencia</b>.</p>`
              : empty > 0
                ? `<p class="note">${empty === 1 ? "Un lugar quedará vacío" : `${empty} lugares quedarán vacíos`}: piensa dónde conviene cada arma.</p>`
                : ""
          }
          <div class="actions">
            ${won.length > 0 ? `<button class="btn" data-action="reset-placement">COLOCACIÓN RECOMENDADA</button>` : ""}
            <button class="btn primary big" data-action="start-battle">¡COMENZAR LA BATALLA!</button>
          </div>
        </div>
      </div>
    </main>`;
  }

  private missionHtml(): string {
    const cfg = this.game.config;
    const hints = cfg.hintsAvailableFromStart
      ? "Puedes pedir <b>PISTAS</b> antes de responder: no cuentan como error."
      : "En este nivel no hay pistas: confía en lo que aprendiste.";
    return `<main class="mission">
      <p class="level-tag">NIVEL: ${cfg.label}</p>
      <h1>TU MISIÓN</h1>
      ${guideHtml(GUIDE_LINES.mission, "happy")}
      <p class="mission-story">Esta noche, un grupo de zombis viene hacia la escuela. Para defenderla necesitas
        <b>siete armas estelares</b>, y cada una se gana aprendiendo a encontrar el Sur con la Cruz del Sur.</p>
      <div class="mission-body">
        <div class="map-wrap">${mapPreview({})}<p class="note">Los siete lugares del mapa esperan su arma.</p></div>
        <ol class="mission-rules">
          <li><span>🧭</span><div>Resolverás <b>7 desafíos</b> sobre la Cruz del Sur, siempre en el mismo orden.</div></li>
          <li><span>☝️</span><div>Cada desafío tiene <b>un solo intento</b>. Piensa bien antes de presionar COMPROBAR.</div></li>
          <li><span>✅</span><div>Si respondes <b>correctamente</b>, desbloqueas un arma y se coloca en su lugar del mapa.</div></li>
          <li><span>❌</span><div>Si te <b>equivocas</b>, verás la respuesta correcta, pero <b>ese lugar del mapa quedará vacío</b> durante la batalla.</div></li>
          <li><span>🧟</span><div>Después llegarán <b>3 oleadas de zombis</b>. Si uno llega a la escuela, podrás intentar detenerlo con una <b>pregunta de emergencia</b>.</div></li>
          <li><span>💡</span><div>${hints}</div></li>
        </ol>
      </div>
      <div class="actions"><button class="btn primary huge" data-action="accept-mission">¡ACEPTO LA MISIÓN!</button></div>
    </main>`;
  }

  private synthesisHtml(): string {
    const cm = this.game.challenges!;
    return `<main class="synthesis">
      <h2>Síntesis: ${SYNTHESIS.title}</h2>
      ${guideHtml(this.game.challenges!.correctCount === 7 ? GUIDE_LINES.synthesis : GUIDE_LINES.synthesisWithErrors, "happy")}
      <div class="synthesis-body">
        <div class="scene-wrap">${procedureScene(3, this.game.config.intenseGuideLine, false)}</div>
        <div>
          <ol class="synthesis-steps">${SYNTHESIS.steps.map((s) => `<li><b>${s.step}.</b> ${s.text}</li>`).join("")}</ol>
          <p class="closing">${SYNTHESIS.closing}</p>
        </div>
      </div>
      <h3>Tu mapa de defensas: ${cm.unlockedDefenses.length} de 7 armas</h3>
      ${cm.lostDefenses.length ? `<p class="note">${cm.lostDefenses.length === 1 ? "Un lugar quedó vacío" : `${cm.lostDefenses.length} lugares quedaron vacíos`} por respuestas incorrectas.</p>` : ""}
      <div class="map-wrap wide">${mapPreview(this.slotStates())}</div>
      ${this.defensesListHtml(cm.unlockedDefenses, cm.lostDefenses)}
      <div class="actions"><button class="btn primary huge" data-action="to-battle">COLOCAR MIS ARMAS</button></div>
    </main>`;
  }

  private finalHtml(): string {
    const s = this.game.summary();
    const r = s.rescue;
    const medals = medalsFor(s);
    const earned = medals.filter((m) => m.earned).length;
    return `<main class="final">
      <p class="level-tag">NIVEL: ${this.game.config.label}</p>
      <div class="final-scene-slot"></div>
      <h1>${s.victory ? "¡La escuela está a salvo!" : "La escuela se quedó sin energía"}</h1>
      <p class="level-message">${s.levelMessage}</p>
      ${this.game.difficulty === "extreme" ? (s.victory ? `<p class="note">¡Ganaste el modo extremo! La próxima vez volverá a la dificultad completa.</p>` : `<p class="note">La próxima partida extrema será un poco más fácil.</p>`) : ""}
      ${s.victory ? "" : `<p class="note">¡Las estrellas de la cruz te esperan para intentarlo otra vez!</p>`}
      <h3>Tus medallas (${earned} de ${medals.length})</h3>
      <ul class="medals">${medals
        .map(
          (m, i) => `<li class="medal ${m.earned ? "earned" : "locked"}" style="animation-delay:${0.15 * i}s">
            <span class="medal-icon" aria-hidden="true">${m.earned ? m.icon : "🔒"}</span>
            <b>${m.name}</b><small>${m.description}</small></li>`
        )
        .join("")}</ul>
      <div class="stats">
        <div class="stat"><b>${s.challengesCompleted}</b><span>desafíos completados</span></div>
        <div class="stat"><b>${s.correctAnswers} / 7</b><span>respuestas correctas</span></div>
        <div class="stat"><b>${s.attempts}</b><span>intentos realizados</span></div>
        <div class="stat"><b>${s.hintsUsed}</b><span>pistas utilizadas</span></div>
        <div class="stat"><b>${s.zombiesStopped}</b><span>zombis detenidos</span></div>
        <div class="stat"><b>${s.baseEnergy} / ${s.maxBaseEnergy}</b><span>energía restante de la escuela</span></div>
      </div>
      <h3>Preguntas de emergencia</h3>
      <div class="stats small">
        <div class="stat"><b>${r.triggered}</b><span>rescates activados</span></div>
        <div class="stat"><b>${r.bombsChosen}</b><span>bombas elegidas</span></div>
        <div class="stat"><b>${r.heroesChosen}</b><span>héroes elegidos</span></div>
        <div class="stat"><b>${r.correct}</b><span>respuestas correctas</span></div>
        <div class="stat"><b>${r.incorrect}</b><span>respuestas incorrectas</span></div>
        <div class="stat"><b>${r.defeatedByBomb}</b><span>zombis eliminados por bombas</span></div>
        <div class="stat"><b>${r.defeatedByHero}</b><span>zombis derrotados por héroes${r.heroesCalled.length ? ` (${r.heroesCalled.join(", ")})` : ""}</span></div>
        <div class="stat"><b>${r.damagePrevented}</b><span>daño evitado con rescates</span></div>
      </div>
      <h3>Defensas obtenidas: ${s.defenses.length} de 7</h3>
      ${this.defensesListHtml(s.defenses, s.lostDefenses)}
      <div class="synthesis-reminder"><b>Recuerda:</b> ${SYNTHESIS.steps.map((x) => x.step).join(" → ")}. ${SYNTHESIS.closing}</div>
      <div class="actions">
        ${s.victory ? "" : `<button class="btn primary big" data-action="retry-battle">REINTENTAR LA BATALLA</button>`}
        <button class="btn big" data-action="restart">JUGAR DE NUEVO</button>
        <button class="btn big" data-action="menu">VOLVER AL MENÚ</button>
      </div>
    </main>`;
  }
}
