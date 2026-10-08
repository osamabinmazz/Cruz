import type { CampaignSave } from "../core/campaign/Campaign";
import { NIGHTS } from "../core/campaign/nights";
import { levelName } from "../core/difficulty";
import { challengeStats, rankStudents, rankTeams, studentRow, type Teams } from "../core/teacher";
import { esc } from "./campaignScreens";
import { studentKey } from "./campaignStore";

export type TeacherTab = "students" | "challenges" | "teams" | "settings";

export type View =
  | { kind: "teacher-login"; mode: "create" | "enter" | "recover"; error?: string; code?: string }
  | { kind: "teacher"; tab: TeacherTab; msg?: string; projector?: boolean }
  | { kind: "diploma"; name: string; back: "teacher" | "final" };

const fmtDate = (t: number) => new Date(t).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });

export function teacherLoginHtml(v: Extract<View, { kind: "teacher-login" }>): string {
  const err = v.error ? `<p class="form-error" role="alert">${esc(v.error)}</p>` : "";
  if (v.code) {
    return `<main class="teacher-login">
      <h1>👩‍🏫 PANEL DEL DOCENTE</h1>
      <p class="menu-text">Tu PIN quedó guardado en este aparato. Anota este <b>código de recuperación</b>: si olvidas el PIN, es la única forma de cambiarlo.</p>
      <p class="recovery-code" aria-label="Código de recuperación">${esc(v.code)}</p>
      <p class="note">No se vuelve a mostrar. Guárdalo en un lugar seguro.</p>
      <div class="actions"><button class="btn primary big" data-action="teacher-open-panel">YA LO ANOTÉ, ENTRAR</button></div>
    </main>`;
  }
  if (v.mode === "create") {
    return `<main class="teacher-login">
      <h1>👩‍🏫 PANEL DEL DOCENTE</h1>
      <p class="menu-text">Crea un PIN de 4 a 8 números. Con él entrarás a los resultados de tu clase.</p>
      ${err}
      <label class="field">PIN <input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" /></label>
      <label class="field">Repite el PIN <input id="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="8" /></label>
      <div class="actions"><button class="btn primary big" data-action="teacher-create">CREAR PIN</button><button class="btn big" data-action="menu">VOLVER</button></div>
    </main>`;
  }
  if (v.mode === "recover") {
    return `<main class="teacher-login">
      <h1>RECUPERAR EL PIN</h1>
      <p class="menu-text">Escribe tu código de recuperación y elige un PIN nuevo.</p>
      ${err}
      <label class="field">Código de recuperación <input id="rec" type="text" autocomplete="off" maxlength="12" /></label>
      <label class="field">PIN nuevo <input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" /></label>
      <div class="actions"><button class="btn primary big" data-action="teacher-recover">CAMBIAR PIN</button><button class="btn big" data-action="teacher">VOLVER</button></div>
    </main>`;
  }
  return `<main class="teacher-login">
    <h1>👩‍🏫 PANEL DEL DOCENTE</h1>
    <p class="menu-text">Escribe tu PIN.</p>
    ${err}
    <label class="field">PIN <input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" /></label>
    <div class="actions"><button class="btn primary big" data-action="teacher-enter">ENTRAR</button><button class="btn big" data-action="menu">VOLVER</button></div>
    <button class="btn small link" data-action="teacher-recover-open">Olvidé mi PIN</button>
  </main>`;
}

function tabs(tab: TeacherTab): string {
  const t = (id: TeacherTab, label: string) => `<button class="tab ${tab === id ? "on" : ""}" data-action="teacher-tab" data-tab="${id}">${label}</button>`;
  return `<nav class="teacher-tabs">${t("students", "Estudiantes")}${t("challenges", "Desafíos")}${t("teams", "Equipos y ranking")}${t("settings", "Ajustes")}</nav>`;
}

function studentsTab(saves: CampaignSave[], teamOf: (name: string) => string): string {
  if (saves.length === 0) return `<p class="note">Todavía no hay estudiantes en este aparato. Cuando jueguen la campaña aparecerán aquí.</p>`;
  const rows = saves
    .map((s) => {
      const r = studentRow(s);
      const team = teamOf(s.name);
      return `<tr>
        <td><b>${esc(r.name)}</b>${team ? `<br><small>${esc(team)}</small>` : ""}</td>
        <td>${r.level}</td><td>${r.progress}</td><td>${r.nightsWon}/${NIGHTS.length}</td>
        <td>${r.correct}<small> ✓</small> ${r.incorrect}<small> ✗</small> (${r.accuracy}%)</td>
        <td>${r.struggled.length ? r.struggled.map((n) => `D${n}`).join(", ") : "—"}</td>
        <td>${fmtDate(r.lastPlayed)}</td>
        <td class="row-actions"><button class="btn small" data-action="diploma" data-name="${esc(r.name)}" data-back="teacher">Diploma</button>
          <button class="btn small danger" data-action="teacher-delete" data-name="${esc(r.name)}">Borrar</button></td></tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table class="teacher-table">
    <thead><tr><th>Estudiante</th><th>Nivel</th><th>Avance</th><th>Noches</th><th>Respuestas</th><th>Le costó</th><th>Última vez</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <div class="actions">
      <button class="btn primary" data-action="teacher-csv">⬇ Descargar reporte (CSV)</button>
      <button class="btn" data-action="teacher-drive">☁ Subir a Drive</button>
      <button class="btn" data-action="teacher-pdf">💾 Guardar PDF</button>
    </div>`;
}

function challengesTab(saves: CampaignSave[]): string {
  const stats = challengeStats(saves);
  const rows = stats
    .map((c) => {
      const pct = c.accuracy;
      const bar = pct === null ? "" : `<span class="bar"><i style="width:${pct}%"></i></span>`;
      return `<tr><td>D${c.number}</td><td>${esc(c.title)}</td><td>${c.answers}</td><td>${pct === null ? "—" : `${pct}%`} ${bar}</td></tr>`;
    })
    .join("");
  const answered = stats.filter((c) => c.accuracy !== null);
  const weakest = answered.length ? [...answered].sort((a, b) => a.accuracy! - b.accuracy!)[0] : null;
  return `${weakest ? `<p class="note">El desafío que más les costó: <b>D${weakest.number} · ${esc(weakest.title)}</b> (${weakest.accuracy}% de acierto). Conviene repasarlo en clase.</p>` : `<p class="note">Todavía no hay respuestas.</p>`}
    <div class="table-wrap"><table class="teacher-table"><thead><tr><th></th><th>Desafío</th><th>Respuestas</th><th>Acierto</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function teamsTab(saves: CampaignSave[], teams: Teams, projector: boolean): string {
  const teamRank = rankTeams(saves, teams, studentKey);
  const medal = (i: number) => ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
  const teamList = teamRank.length
    ? `<ol class="rank">${teamRank
        .map((t, i) => `<li><span class="pos">${medal(i)}</span><b>${esc(t.team)}</b><span class="pts">${t.score} pts</span><small>${t.members.map((m) => esc(m.name)).join(", ") || "sin integrantes"}</small></li>`)
        .join("")}</ol>`
    : `<p class="note">Aún no hay equipos.</p>`;
  const people = rankStudents(saves);
  const peopleList = people.length
    ? `<ol class="rank">${people.map((s, i) => `<li><span class="pos">${medal(i)}</span><b>${esc(s.name)}</b><span class="pts">${s.score} pts</span></li>`).join("")}</ol>`
    : `<p class="note">Aún no hay estudiantes.</p>`;
  const how = `<p class="note small">Puntaje: 10 por respuesta correcta + 50 por noche ganada + 2 por zombi detenido.</p>`;
  if (projector) {
    return `<div class="projector"><h2>🏆 Equipos</h2>${teamList}<h2>⭐ Estudiantes</h2>${peopleList}${how}
      <div class="actions"><button class="btn" data-action="teacher-projector">Salir de pantalla grande</button></div></div>`;
  }
  const assign = saves
    .map((s) => {
      const key = studentKey(s.name);
      const cur = Object.entries(teams).find(([, keys]) => keys.includes(key))?.[0] ?? "";
      return `<label class="assign">${esc(s.name)}
        <select data-action-change="assign-team" data-key="${esc(key)}"><option value="">Sin equipo</option>${Object.keys(teams)
          .map((t) => `<option value="${esc(t)}" ${t === cur ? "selected" : ""}>${esc(t)}</option>`)
          .join("")}</select></label>`;
    })
    .join("");
  return `<div class="teams-edit">
      <div class="team-add"><input id="team-name" type="text" maxlength="20" placeholder="Nombre del equipo" />
        <button class="btn" data-action="teacher-team-add">+ Agregar equipo</button></div>
      <div class="team-chips">${Object.keys(teams).map((t) => `<span class="chip">${esc(t)} <button class="x" data-action="teacher-team-del" data-team="${esc(t)}" aria-label="Quitar ${esc(t)}">✕</button></span>`).join("")}</div>
      ${saves.length ? `<div class="assign-list">${assign}</div>` : ""}
    </div>
    <h3>🏆 Ranking de equipos</h3>${teamList}
    <h3>⭐ Ranking de estudiantes</h3>${peopleList}${how}
    <div class="actions"><button class="btn" data-action="teacher-projector">📽 Mostrar en pantalla grande</button></div>`;
}

function settingsTab(clientId: string): string {
  return `<section class="settings-block"><h3>Cambiar el PIN</h3>
      <label class="field">PIN nuevo <input id="new-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" /></label>
      <button class="btn" data-action="teacher-change-pin">Guardar PIN nuevo</button></section>
    <section class="settings-block"><h3>Google Drive (opcional)</h3>
      <p class="note">Para subir el reporte a tu Drive necesitas un Client ID de Google. Los pasos están en <code>docs/DRIVE.md</code>. Sin esto, puedes descargar el CSV.</p>
      <label class="field">Client ID <input id="client-id" type="text" autocomplete="off" value="${esc(clientId)}" placeholder="xxxx.apps.googleusercontent.com" /></label>
      <button class="btn" data-action="teacher-save-client">Guardar Client ID</button></section>`;
}

export function teacherPanelHtml(v: Extract<View, { kind: "teacher" }>, saves: CampaignSave[], teams: Teams, clientId: string): string {
  const teamOf = (name: string) => {
    const key = studentKey(name);
    return Object.entries(teams).find(([, keys]) => keys.includes(key))?.[0] ?? "";
  };
  if (v.projector) return `<main class="teacher projector-mode">${teamsTab(saves, teams, true)}</main>`;
  const body = v.tab === "students" ? studentsTab(saves, teamOf) : v.tab === "challenges" ? challengesTab(saves) : v.tab === "teams" ? teamsTab(saves, teams, false) : settingsTab(clientId);
  return `<main class="teacher">
    <header class="teacher-head"><h1>👩‍🏫 Panel del docente</h1><button class="btn small" data-action="teacher-exit">Salir</button></header>
    ${tabs(v.tab)}
    ${v.msg ? `<p class="teacher-msg" role="status">${esc(v.msg)}</p>` : ""}
    ${body}
  </main>`;
}

export function diplomaHtml(save: CampaignSave, back: "teacher" | "final"): string {
  const r = studentRow(save);
  const done = save.stage === "finished";
  return `<main class="diploma-screen">
    <section class="diploma" aria-label="Diploma">
      <div class="diploma-star">✦</div>
      <p class="diploma-kicker">CRUZ DEL SUR · LA CAMPAÑA DE LAS NOCHES</p>
      <h1>${done ? "DIPLOMA" : "RECONOCIMIENTO"}</h1>
      <p class="diploma-text">${done ? "Se otorga a" : "Se reconoce a"}</p>
      <p class="diploma-name">${esc(save.name)}</p>
      <p class="diploma-text">${done ? "por completar las cinco noches y aprender a encontrar el <b>Sur aproximado</b> con la Cruz del Sur: encontrar la cruz, seguir su eje mayor y bajar hasta el horizonte." : `por su avance en la campaña (${esc(r.progress)}) aprendiendo a encontrar el <b>Sur aproximado</b> con la Cruz del Sur.`}</p>
      <div class="diploma-stats">
        <span><b>${r.nightsWon}</b> noches ganadas</span><span><b>${r.accuracy}%</b> de acierto</span><span><b>${r.stopped}</b> zombis detenidos</span><span>Nivel <b>${levelName(save.difficulty)}</b></span>
      </div>
      <p class="diploma-date">${fmtDate(Date.now())}</p>
      <div class="diploma-sign"><span>Docente</span></div>
    </section>
    <div class="actions no-print"><button class="btn primary big" data-action="save-diploma" data-name="${esc(save.name)}">💾 GUARDAR PDF</button><button class="btn big" data-action="diploma-back" data-back="${back}">VOLVER</button></div>
  </main>`;
}
