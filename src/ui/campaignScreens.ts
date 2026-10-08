import { ENEMY_STATS } from "../core/battle/data";
import { POST_IDS, SUMMON_COST, postNumber, type PostId } from "../core/battle/guardians";
import type { Campaign, CampaignSave, NightResult } from "../core/campaign/Campaign";
import { NIGHTS, TOTAL_NIGHTS } from "../core/campaign/nights";
import { MAX_UPGRADE_LEVEL, nextUpgradeCost } from "../core/campaign/upgrades";
import { CHALLENGES } from "../core/challenges";
import { DEFENSES, type DefenseId } from "../core/defenses";
import { LEVEL_DESCRIPTIONS, levelName, type Difficulty, type EnemyKind } from "../core/difficulty";
import { guideHtml } from "./guide";
import { POST_COLOR } from "./mapPreview";
import { postIcon, weaponIcon } from "./weaponIcons";

/** Pantallas de la campaña (solo arman el HTML; los clics los atiende la aplicación). */

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const stars = (level: number): string => "★".repeat(level) + "☆".repeat(MAX_UPGRADE_LEVEL - level);

/** Resumen de una línea del avance de un estudiante. */
function progressLine(save: CampaignSave): string {
  const done = save.stage === "finished" ? TOTAL_NIGHTS : save.night - 1;
  return `${done} de ${TOTAL_NIGHTS} noches · ${save.dust} ✦ de polvo estelar`;
}

// ---------------- Estudiantes ----------------

export function studentsHtml(students: CampaignSave[], message = ""): string {
  const cards = students
    .map(
      (s) => `<li class="student-card">
        <button class="student-pick" data-action="pick-student" data-name="${esc(s.name)}">
          <span class="student-name">${esc(s.name)}</span>
          <span class="level-tag small">${levelName(s.difficulty).toUpperCase()}</span>
          <span class="student-progress">${s.stage === "finished" ? "🏅 Campaña completa · " : ""}${progressLine(s)}</span>
        </button>
        <button class="btn small ghost" data-action="save-student" data-name="${esc(s.name)}" aria-label="Guardar la campaña de ${esc(s.name)} en un archivo">💾</button>
        <button class="btn small ghost danger" data-action="delete-student" data-name="${esc(s.name)}" aria-label="Borrar a ${esc(s.name)}">🗑</button>
      </li>`
    )
    .join("");
  return `<main class="students">
    <h1>CAMPAÑA</h1>
    <p class="menu-text">${students.length ? "¿Quién juega? Toca tu nombre para seguir tu campaña." : "Cada estudiante tiene su propia campaña de cinco noches. ¡Crea la tuya!"}</p>
    ${message ? `<p class="form-error" role="alert">${esc(message)}</p>` : ""}
    <ul class="student-list">${cards}</ul>
    <div class="actions">
      <button class="btn primary big" data-action="open-new-student">＋ NUEVO ESTUDIANTE</button>
      <label class="btn big file-btn">📂 CARGAR CAMPAÑA<input type="file" accept=".json,application/json" data-action-change="load-student" hidden /></label>
      <button class="btn big" data-action="menu">VOLVER AL MENÚ</button>
    </div>
  </main>`;
}

export function newStudentHtml(level: Difficulty, error = "", name = ""): string {
  const levelButton = (d: Difficulty) => `<button class="level-btn ${d} ${level === d ? "selected" : ""}" data-action="pick-level" data-level="${d}" aria-pressed="${level === d}">
      <b>${levelName(d).toUpperCase()}</b><span>${LEVEL_DESCRIPTIONS[d]}</span></button>`;
  return `<main class="new-student">
    <h1>NUEVO ESTUDIANTE</h1>
    <label class="field">Tu nombre o apodo
      <input id="student-name" type="text" maxlength="24" autocomplete="off" value="${esc(name)}" placeholder="Por ejemplo: Ana" />
    </label>
    ${error ? `<p class="form-error" role="alert">${esc(error)}</p>` : ""}
    <p class="menu-text">Elige tu nivel. Después no se puede cambiar.</p>
    <div class="level-options">${levelButton("beginner")}${levelButton("advanced")}${levelButton("extreme")}</div>
    <div class="actions">
      <button class="btn primary big" data-action="create-student">¡EMPEZAR LA CAMPAÑA!</button>
      <button class="btn big" data-action="campaign">VOLVER</button>
    </div>
  </main>`;
}

// ---------------- Noches ----------------

export function nightsHtml(c: Campaign): string {
  const rows = NIGHTS.map((n) => {
    const state = c.data.stage === "finished" || n.number < c.night ? "done" : n.number === c.night ? "current" : "locked";
    const label = state === "done" ? "✓ Ganada" : state === "current" ? "▶ Esta noche" : "🔒 Bloqueada";
    const review = state === "current" ? c.reviewChallenges().length : 0;
    const started = state === "current" && c.nightOutcomes().length > 0;
    const button =
      state === "current"
        ? `<button class="btn primary big" data-action="start-night">${started ? "CONTINUAR LA NOCHE" : "EMPEZAR LA NOCHE"} ${n.number}</button>`
        : "";
    return `<li class="night-row ${state}">
      <span class="night-num">${n.number}</span>
      <div class="night-info">
        <b>${esc(n.name)}</b>
        <small>${esc(n.focus)} · ${state === "locked" ? "…" : esc(n.story)}</small>
        ${review ? `<small class="review-note">↺ Empieza con ${review} desafío${review === 1 ? "" : "s"} de repaso</small>` : ""}
      </div>
      <span class="night-state">${label}</span>${button}
    </li>`;
  }).join("");
  return `<main class="nights">
    <h1>${esc(c.name)}: LAS CINCO NOCHES</h1>
    <ul class="night-list">${rows}</ul>
    <div class="team-summary">
      <span>✦ ${c.dust} de polvo estelar</span>
      <span>⚔ ${c.weapons.length} arma${c.weapons.length === 1 ? "" : "s"}</span>
      <span>🛡 ${c.ownedPosts.length} puesto${c.ownedPosts.length === 1 ? "" : "s"} de guardianes</span>
    </div>
    <div class="actions">
      <button class="btn big" data-action="open-workshop">✦ TALLER ESTELAR</button>
      <button class="btn big" data-action="campaign">CAMBIAR DE ESTUDIANTE</button>
    </div>
  </main>`;
}

// ---------------- Historia de la noche ----------------

const NEW_ZOMBIE: Record<number, { kind: EnemyKind; text: string }> = {
  3: { kind: "saltador", text: "Da saltos largos para adelantarse y puede pasar por encima de tus guardianes." },
  4: { kind: "doble", text: "Cuando cae, se divide en dos zombis chiquitos y rápidos. ¡Ojo con las armas que dañan en área!" },
  5: { kind: "gigante", text: "Enorme y lento, con muchísima vida. Derriba a un guardián en pocos golpes. Llega al final de la noche." }
};

export function newZombieOf(night: number): { name: string; text: string; kind: EnemyKind } | null {
  const z = NEW_ZOMBIE[night];
  return z ? { name: ENEMY_STATS[z.kind].name, text: z.text, kind: z.kind } : null;
}

export function storyHtml(c: Campaign): string {
  const plan = c.plan;
  const review = c.reviewChallenges();
  const zombie = newZombieOf(plan.number);
  return `<main class="story">
    <p class="level-tag">NOCHE ${plan.number} DE ${TOTAL_NIGHTS} · ${esc(plan.focus)}</p>
    <h1>${esc(plan.name)}</h1>
    ${guideHtml(plan.story, "happy")}
    ${
      review.length
        ? `<section class="story-card review"><h2>↺ Repaso</h2><p>Antes de los desafíos nuevos, tienes otra oportunidad para recuperar ${review.length === 1 ? "esta arma" : "estas armas"}:</p>
        <ul>${review.map((r) => `<li>${weaponIcon(r.defense, "mini-icon")} ${esc(DEFENSES.find((d) => d.id === r.defense)!.name)}</li>`).join("")}</ul></section>`
        : ""
    }
    ${
      zombie
        ? `<section class="story-card zombie-card"><h2>⚠ Zombi nuevo: ${esc(zombie.name)}</h2><canvas class="zombie-portrait" data-zombie="${zombie.kind}" width="160" height="160" aria-hidden="true"></canvas><p>${esc(zombie.text)}</p></section>`
        : ""
    }
    <div class="actions">
      <button class="btn primary huge" data-action="begin-challenges">${plan.challengeIndexes.length + review.length ? "¡A LOS DESAFÍOS!" : "¡A COLOCAR LAS ARMAS!"}</button>
    </div>
  </main>`;
}

// ---------------- Resumen de la noche ----------------

export function nightResultHtml(result: NightResult, c: Campaign): string {
  const win = result.victory;
  const finalNight = result.night >= TOTAL_NIGHTS;
  return `<main class="night-result ${win ? "win" : "lose"}">
    <h1>${win ? (finalNight ? "¡LA NOCHE FINAL ES TUYA!" : "¡NOCHE GANADA!") : "LA ESCUELA CAYÓ"}</h1>
    ${guideHtml(win ? "¡Qué noche! Las estrellas brillan gracias a vos." : "No pasa nada: repasa tus armas en el taller y vuelve a intentarlo.", win ? "happy" : "comfort")}
    <div class="stats">
      <div class="stat"><b>${result.stopped}</b><span>zombis detenidos</span></div>
      <div class="stat"><b>${result.baseEnergy}</b><span>energía que quedó</span></div>
      <div class="stat"><b>${result.rescuesCorrect}</b><span>rescates acertados</span></div>
      <div class="stat gold"><b>+${result.dustEarned} ✦</b><span>polvo estelar ganado (tienes ${c.dust})</span></div>
    </div>
    <div class="actions"><button class="btn primary huge" data-action="leave-result">${c.isFinished ? "VER MI CAMPAÑA" : "AL TALLER ESTELAR"}</button></div>
  </main>`;
}

// ---------------- Taller estelar ----------------

function upgradeButton(level: number, dust: number, action: string, id: string): string {
  const cost = nextUpgradeCost(level);
  if (cost === null) return `<span class="maxed">★ NIVEL MÁXIMO</span>`;
  return `<button class="btn primary small" data-action="${action}" data-id="${id}" ${dust < cost ? "disabled" : ""}>MEJORAR · ${cost} ✦</button>`;
}

function schoolCard(c: Campaign): string {
  const level = c.schoolLevel;
  return `<li class="wk-card" style="--c:#e8b04a">🏫
    <div><b>La escuela</b><span class="stars" aria-label="Nivel ${level}">${stars(level)}</span>
    <small>Un edificio más fuerte aguanta más golpes de zombis (energía x${c.schoolHealthFactor.toFixed(1)}).</small>
    ${level < MAX_UPGRADE_LEVEL ? `<small class="gain">Nivel ${level + 1}: más energía</small>` : ""}</div>
    ${upgradeButton(level, c.dust, "upgrade-school", "school")}</li>`;
}

export function workshopHtml(c: Campaign): string {
  const defs = DEFENSES.map((d) => {
    const owned = c.data.unlocked.includes(d.id);
    const lost = c.data.lost.includes(d.id);
    const challenge = CHALLENGES.find((ch) => ch.defense === d.id)!;
    const night = NIGHTS.find((n) => n.challengeIndexes.includes(challenge.number - 1))!.number;
    if (owned) {
      const level = c.level(d.id as DefenseId);
      return `<li class="wk-card" style="--c:${d.color}">${weaponIcon(d.id)}
        <div><b>${esc(d.name)}</b><span class="stars" aria-label="Nivel ${level}">${stars(level)}</span>
        <small>${esc(d.description)}</small>
        ${level < MAX_UPGRADE_LEVEL ? `<small class="gain">Nivel ${level + 1}: más daño, alcance y rapidez</small>` : ""}</div>
        ${upgradeButton(level, c.dust, "upgrade-weapon", d.id)}</li>`;
    }
    return `<li class="wk-card off" style="--c:#6b7390">${weaponIcon(d.id)}
      <div><b>${esc(d.name)}</b><small>${lost ? "Se recupera en un repaso: la próxima noche vuelve el desafío." : `Se gana en la noche ${night}.`}</small></div></li>`;
  }).join("");

  const posts = POST_IDS.map((id: PostId) => {
    const level = c.postLevel(id);
    const n = postNumber(id);
    if (level > 0) {
      return `<li class="wk-card post" style="--c:${POST_COLOR}">${postIcon("weapon-icon", POST_COLOR)}
        <div><b>Puesto de guardianes ${n}</b><span class="stars" aria-label="Nivel ${level}">${stars(level)}</span>
        <small>Dos estrellitas frenan y pelean con los zombis.</small>
        ${level < MAX_UPGRADE_LEVEL ? `<small class="gain">Nivel ${level + 1}: más vida y más daño</small>` : ""}</div>
        ${upgradeButton(level, c.dust, "upgrade-post", id)}</li>`;
    }
    return "";
  }).join("");
  const nextCost = c.nextPostCost();
  const buy =
    nextCost === null
      ? ""
      : `<li class="wk-card post off" style="--c:${POST_COLOR}">${postIcon("weapon-icon", "#6b7390")}
        <div><b>Convocar un puesto de guardianes</b><small>Dos estrellitas con escudo y espada de luz. Si una cae, volver a convocarla cuesta ${SUMMON_COST} ✦.</small></div>
        <button class="btn primary small" data-action="buy-post" ${c.canBuyPost() ? "" : "disabled"}>CONVOCAR · ${nextCost} ✦</button></li>`;
  return `<main class="workshop">
    <h1>TALLER ESTELAR</h1>
    <p class="dust-total">✦ ${c.dust} de polvo estelar</p>
    ${guideHtml("Gasta tu polvo estelar con cuidado: las mejoras son definitivas. Los guardianes ocupan los mismos lugares que las armas.")}
    <h2>La escuela</h2>
    <ul class="wk-cards">${schoolCard(c)}</ul>
    <h2>Armas</h2>
    <ul class="wk-cards">${defs}</ul>
    <h2>Guardianes</h2>
    <ul class="wk-cards">${posts}${buy}</ul>
    <div class="actions"><button class="btn primary huge" data-action="leave-workshop">SEGUIR</button></div>
  </main>`;
}

// ---------------- Cierre de la campaña ----------------

export function campaignFinalHtml(c: Campaign): string {
  const correct = c.data.log.filter((e) => e.correct).length;
  const first = c.data.log.filter((e) => e.correct && !e.review).length;
  const won = c.data.nightResults.filter((r) => r.victory).length;
  const stopped = c.data.nightResults.reduce((n, r) => n + r.stopped, 0);
  return `<main class="campaign-final">
    <div class="final-scene-slot"></div>
    <h1>¡${esc(c.name.toUpperCase())}, COMPLETASTE LA CAMPAÑA!</h1>
    <p class="subtitle">Ya sabes encontrar el Sur con la Cruz del Sur.</p>
    <div class="stats">
      <div class="stat"><b>${won}</b><span>noches ganadas</span></div>
      <div class="stat"><b>${first} de 7</b><span>desafíos acertados al primer intento</span></div>
      <div class="stat"><b>${correct}</b><span>respuestas correctas en total</span></div>
      <div class="stat"><b>${stopped}</b><span>zombis detenidos</span></div>
      <div class="stat"><b>${c.weapons.length}</b><span>armas</span></div>
      <div class="stat"><b>${c.dust} ✦</b><span>polvo estelar</span></div>
    </div>
    <div class="actions">
      <button class="btn primary big" data-action="diploma" data-name="${esc(c.name)}" data-back="final">🎓 MI DIPLOMA</button>
      <button class="btn big" data-action="campaign">VOLVER A ESTUDIANTES</button>
      <button class="btn big" data-action="menu">VOLVER AL MENÚ</button>
    </div>
  </main>`;
}
