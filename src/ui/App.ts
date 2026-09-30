import { PROCEDURE_STEPS, type Hint } from "../core/challenges";
import { defenseById, type DefenseId } from "../core/defenses";
import { LEVEL_DESCRIPTIONS, LEVEL_INFO_TEXT, type Difficulty } from "../core/difficulty";
import { Game } from "../core/Game";
import { SYNTHESIS } from "../core/synthesis";
import { AudioManager } from "./audio";
import { BattleView } from "./BattleView";
import { challengeScene, procedureScene } from "./sky";
import { mapPreview, type SlotState } from "./mapPreview";
import { weaponIcon } from "./weaponIcons";

interface ChallengeUiState {
  selected: string[];
  assignment: Record<string, string>;
  activeSlot: string | null;
  feedback: { kind: "correct" | "wrong"; text: string; defense?: DefenseId; correctText?: string } | null;
  hint: Hint | null;
  hintTargets: Set<string>;
  flashInstruction: boolean;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function freshChallengeUi(): ChallengeUiState {
  return { selected: [], assignment: {}, activeSlot: null, feedback: null, hint: null, hintTargets: new Set(), flashInstruction: false };
}

export class App {
  readonly game = new Game();
  readonly audio = new AudioManager();
  private ui = freshChallengeUi();
  private showLevelInfo = false;
  private demoStep: 1 | 2 | 3 = 1;
  private demoTimer: number | null = null;
  private battleView: BattleView | null = null;
  private screenEl: HTMLElement;
  private overlayEl: HTMLElement;

  constructor(root: HTMLElement) {
    root.innerHTML = `<div class="screen"></div><div class="overlay hidden"></div>`;
    this.screenEl = root.querySelector(".screen")!;
    this.overlayEl = root.querySelector(".overlay")!;
    root.addEventListener("click", (e) => this.onClick(e));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.canPause()) this.game.paused ? this.resume() : this.pause();
    });
    document.addEventListener("fullscreenchange", () => this.render());
    this.render();
  }

  // ---------------- Acciones ----------------

  private onClick(e: Event): void {
    const el = (e.target as Element).closest<HTMLElement>("[data-action]");
    if (!el || (el as HTMLButtonElement).disabled) return;
    const action = el.dataset.action!;
    const g = this.game;
    switch (action) {
      case "start":
        this.audio.click();
        g.start();
        this.showLevelInfo = false;
        break;
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
        g.startBattle();
        break;
      case "retry-battle":
        this.audio.click();
        g.retryBattle();
        break;
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
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
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
    if (ch.mode === "assign") return ch.slots!.map((s) => this.ui.assignment[s.id] ?? "");
    return this.ui.selected;
  }

  private answerReady(): boolean {
    const ch = this.game.challenges!.current;
    if (ch.mode === "assign") return ch.slots!.every((s) => this.ui.assignment[s.id]);
    return this.ui.selected.length > 0;
  }

  private check(): void {
    const cm = this.game.challenges!;
    if (!this.answerReady() || cm.solved) return;
    const result = cm.submit(this.currentAnswer());
    if (result.correct) {
      this.audio.correct();
      window.setTimeout(() => this.audio.unlock(), 450);
      this.ui.feedback = { kind: "correct", text: result.feedback, defense: result.unlockedDefense };
      this.ui.hint = null;
      this.ui.hintTargets.clear();
    } else {
      this.audio.wrong();
      const ch = cm.current;
      const label = (id: string) => ch.options.find((o) => o.id === id)?.label ?? id;
      const correctText =
        ch.mode === "assign"
          ? ch.slots!.map((slot, i) => `${slot.label} → ${label(ch.correct[i])}`).join(", ")
          : ch.correct.map(label).join(", ");
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
    switch (g.screen) {
      case "menu":
        this.screenEl.innerHTML = this.menuHtml();
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
      case "battle":
        this.renderBattle();
        break;
      case "final":
        this.screenEl.innerHTML = this.finalHtml();
        break;
    }
    this.renderOverlay();
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
      <button class="btn big" data-action="restart">REINICIAR PARTIDA</button>
      <button class="btn big" data-action="menu">VOLVER AL MENÚ</button>
      <p class="note">El nivel no se puede cambiar durante la partida. Para elegir otro nivel, reinicia la partida o vuelve al menú.</p>
    </div>`;
  }

  private settingsButtons(): string {
    return `<button class="icon-btn" data-action="sound" aria-label="Sonido">${this.audio.enabled ? "🔊" : "🔇"}<span>SONIDO</span></button>
      <button class="icon-btn" data-action="fullscreen" aria-label="Pantalla completa">⛶<span>${document.fullscreenElement ? "SALIR" : "PANTALLA"}</span></button>`;
  }

  private topBar(): string {
    const g = this.game;
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
      <div class="menu-sky">${procedureScene(1, false, false)}</div>
      <h1>CRUZ DEL SUR</h1>
      <p class="subtitle">Defensa del campamento</p>
      <p class="menu-text">Aprende a encontrar el Sur aproximado con la Cruz del Sur, desbloquea siete defensas estelares y protege el campamento.</p>
      <button class="btn primary huge" data-action="start">COMENZAR</button>
      <div class="menu-settings">${this.settingsButtons()}</div>
    </main>`;
  }

  private levelSelectHtml(): string {
    return `<main class="level-select">
      <h1>ELIGE TU NIVEL</h1>
      <div class="level-options">
        <button class="level-btn beginner" data-action="level" data-level="beginner">
          <span class="level-name">PRINCIPIANTE</span>
          <span class="level-desc">${LEVEL_DESCRIPTIONS.beginner}</span>
        </button>
        <button class="level-btn advanced" data-action="level" data-level="advanced">
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

  private challengeHtml(): string {
    const cm = this.game.challenges!;
    const cfg = cm.config;
    const ch = cm.current;
    const ui = this.ui;
    const highlights = new Set<string>([...cm.guidedHighlights(), ...ui.hintTargets]);
    const removed = new Set<string>();
    const scene = challengeScene(ch, {
      selected: ch.mode === "assign" ? Object.values(ui.assignment) : ui.selected,
      assignment: ui.assignment,
      highlights,
      removed,
      intenseGuide: cfg.intenseGuideLine,
      axisReminder: cfg.axisReminderAnimation,
      solved: cm.solved
    });

    let controls = "";
    if (ch.mode === "assign") {
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
        ${d && !won ? `<div class="unlock lost" style="--c:${d.color}">${weaponIcon(d.id, "weapon-icon big")}<div><b>Perdiste el arma ${d.name}.</b><br><small>Su lugar quedará vacío en el mapa durante la batalla.</small></div></div>` : ""}
      </div>`;
    }

    const nextLabel = cm.isComplete ? "VER LA SÍNTESIS" : "SIGUIENTE DESAFÍO";
    const oneTry = cm.solved ? "" : `<p class="one-try-note">⚠️ Un solo intento: si te equivocas, el lugar de esta arma quedará vacío.</p>`;
    return `<main class="challenge">
      ${cfg.showProcedureSteps ? this.procedureBar(ch.step) : ""}
      <h2>Desafío ${ch.number} de 7: ${ch.title}</h2>
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

  private missionHtml(): string {
    const cfg = this.game.config;
    const hints = cfg.hintsAvailableFromStart
      ? "Puedes pedir <b>PISTAS</b> antes de responder: no cuentan como error."
      : "En este nivel no hay pistas: confía en lo que aprendiste.";
    return `<main class="mission">
      <p class="level-tag">NIVEL: ${cfg.label}</p>
      <h1>TU MISIÓN</h1>
      <p class="mission-story">Esta noche, un grupo de zombis viene hacia el campamento. Para defenderlo necesitas
        <b>siete armas estelares</b>, y cada una se gana aprendiendo a encontrar el Sur con la Cruz del Sur.</p>
      <div class="mission-body">
        <div class="map-wrap">${mapPreview({})}<p class="note">Los siete lugares del mapa esperan su arma.</p></div>
        <ol class="mission-rules">
          <li><span>🧭</span><div>Resolverás <b>7 desafíos</b> sobre la Cruz del Sur, siempre en el mismo orden.</div></li>
          <li><span>☝️</span><div>Cada desafío tiene <b>un solo intento</b>. Piensa bien antes de presionar COMPROBAR.</div></li>
          <li><span>✅</span><div>Si respondes <b>correctamente</b>, desbloqueas un arma y se coloca en su lugar del mapa.</div></li>
          <li><span>❌</span><div>Si te <b>equivocas</b>, verás la respuesta correcta, pero <b>ese lugar del mapa quedará vacío</b> durante la batalla.</div></li>
          <li><span>🧟</span><div>Después llegarán <b>3 oleadas de zombis</b>. Si uno llega al campamento, podrás intentar detenerlo con una <b>pregunta de emergencia</b>.</div></li>
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
      <div class="actions"><button class="btn primary huge" data-action="to-battle">¡A DEFENDER EL CAMPAMENTO!</button></div>
    </main>`;
  }

  private finalHtml(): string {
    const s = this.game.summary();
    const r = s.rescue;
    return `<main class="final">
      <p class="level-tag">NIVEL: ${this.game.config.label}</p>
      <h1>${s.victory ? "¡El campamento está a salvo!" : "El campamento se quedó sin energía"}</h1>
      <p class="level-message">${s.levelMessage}</p>
      <div class="stats">
        <div class="stat"><b>${s.challengesCompleted}</b><span>desafíos completados</span></div>
        <div class="stat"><b>${s.correctAnswers} / 7</b><span>respuestas correctas</span></div>
        <div class="stat"><b>${s.attempts}</b><span>intentos realizados</span></div>
        <div class="stat"><b>${s.hintsUsed}</b><span>pistas utilizadas</span></div>
        <div class="stat"><b>${s.zombiesStopped}</b><span>zombis detenidos</span></div>
        <div class="stat"><b>${s.baseEnergy} / ${s.maxBaseEnergy}</b><span>energía restante del campamento</span></div>
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
