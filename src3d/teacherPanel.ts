import { TOPIC_NAMES, rank3, toCsv3, topicStats, type Student3 } from "../src/core/students3d";
import { checkPin, checkRecovery, createPin, hasPin, isValidPin } from "../src/ui/teacherStore";
import { downloadBlob } from "../src/ui/pdf";
import { saveDiploma } from "./diploma";
import { ico } from "./icons";
import { deleteStudent3, exportStudent3, findStudent3, importStudent3, listStudents3 } from "./store";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Panel del profesor de la 3.0: usa el mismo PIN que el de la 2.0 (se crea una sola vez en este aparato). */
export function openTeacherPanel(root: HTMLElement, onExit: () => void): void {
  const el = document.createElement("div");
  el.className = "overlay";
  root.appendChild(el);
  const close = () => {
    el.remove();
    onExit();
  };
  let msg = "";

  const gate = (mode: "create" | "login" | "recover", note = "") => {
    const title = mode === "create" ? "Crea tu PIN de profesor" : mode === "recover" ? "Recuperar el PIN" : "Panel del profesor";
    const help =
      mode === "create"
        ? "Elige un PIN de 4 a 8 números. Solo evita que un estudiante entre por curiosidad; sirve también para la versión 2.0."
        : mode === "recover"
          ? "Escribe el código de recuperación que te dimos al crear el PIN y elige un PIN nuevo."
          : "Escribe tu PIN para ver el avance de tus estudiantes.";
    el.innerHTML = `<div class="card">
      <h1>${ico("shield", 32)} ${title}</h1><p>${help}</p>${note ? `<p class="note">${esc(note)}</p>` : ""}
      ${mode === "recover" ? '<label class="field">Código de recuperación<br /><input id="rec" autocomplete="off" /></label>' : ""}
      <label class="field">${mode === "login" ? "PIN" : "PIN nuevo"}<br /><input id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" /></label>
      <div class="row"><button class="btn primary" data-ok>${mode === "login" ? "Entrar" : "Guardar PIN"}</button>${mode === "login" ? '<button class="btn small" data-rec>Olvidé mi PIN</button>' : ""}<button class="btn" data-exit>Volver</button></div></div>`;
  };

  const panel = () => {
    const students = listStudents3();
    const rows = rank3(students);
    const topics = (["cruz", "sol", "cardinales"] as const).map((t) => {
      const all = students.flatMap((s) => s.answers.filter((a) => a.topic === t));
      const ok = all.filter((a) => a.correct).length;
      return { name: TOPIC_NAMES[t], pct: all.length ? Math.round((ok / all.length) * 100) : 0, total: all.length };
    });
    el.innerHTML = `<div class="card wide">
      <h1>${ico("shield", 32)} Panel del profesor</h1>
      ${msg ? `<p class="note" role="status">${esc(msg)}</p>` : ""}
      <h2>Cómo va la clase</h2>
      <div class="stats">${topics.map((t) => `<div class="stat"><b>${t.total ? t.pct + "%" : "—"}</b>${t.name}<small>${t.total} respuestas</small></div>`).join("")}<div class="stat"><b>${students.length}</b>estudiantes</div></div>
      ${
        rows.length
          ? `<div class="tscroll"><table class="ttable"><thead><tr><th>Estudiante</th><th>Nivel</th><th>Avance</th><th>Noches</th><th>Acierto</th><th>Reforzar</th><th>Puntos</th><th></th></tr></thead><tbody>${rows
              .map(
                (r) => `<tr><td>${esc(r.name)}</td><td>${r.level}</td><td>${r.progress}</td><td>${r.nightsWon}/5</td><td>${r.correct + r.incorrect ? r.accuracy + "%" : "—"}</td><td>${r.weakest ?? "—"}</td><td>${r.score}</td>
                <td class="acts"><button class="btn small" data-diploma="${esc(r.name)}">Diploma</button><button class="btn small" data-code="${esc(r.name)}">Código</button><button class="btn small" data-del="${esc(r.name)}">Borrar</button></td></tr>`
              )
              .join("")}</tbody></table></div>`
          : "<p>Todavía no hay estudiantes en este aparato. Cuando jueguen, su avance aparecerá aquí.</p>"
      }
      <h2>Pasar un estudiante a otro aparato</h2>
      <p class="note">Con «Código» copias el avance de un estudiante; pégalo aquí en el otro aparato para traerlo.</p>
      <textarea id="imp" rows="2" placeholder="Pega aquí el código de un estudiante"></textarea>
      <div class="row"><button class="btn small" data-import>Importar estudiante</button><button class="btn small" data-csv ${rows.length ? "" : "disabled"}>Descargar hoja de cálculo (CSV)</button><button class="btn primary" data-exit>Salir</button></div></div>`;
  };

  if (hasPin()) gate("login");
  else gate("create");
  let mode: "create" | "login" | "recover" | "panel" = hasPin() ? "login" : "create";

  el.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-exit]")) return close();
    if (mode !== "panel") {
      if (t.closest("[data-rec]")) {
        mode = "recover";
        return gate("recover");
      }
      if (!t.closest("[data-ok]")) return;
      const pin = (el.querySelector("#pin") as HTMLInputElement).value.trim();
      if (mode === "login") {
        if (checkPin(pin)) {
          mode = "panel";
          msg = "";
          return panel();
        }
        return gate("login", "Ese PIN no es correcto.");
      }
      if (!isValidPin(pin)) return gate(mode, "El PIN debe tener de 4 a 8 números.");
      if (mode === "recover" && !checkRecovery((el.querySelector("#rec") as HTMLInputElement).value)) return gate("recover", "Ese código no es correcto.");
      const code = createPin(pin);
      if (!code) return gate(mode, "No se pudo guardar el PIN en este navegador.");
      mode = "panel";
      msg = `PIN guardado. Tu código de recuperación es ${code}: anótalo, no se vuelve a mostrar.`;
      return panel();
    }
    const name = (sel: string) => t.closest<HTMLElement>(sel)?.dataset[sel.slice(6, -1)];
    const dip = name("[data-diploma]");
    const code = name("[data-code]");
    const del = name("[data-del]");
    if (dip) {
      const s = findStudent3(dip);
      if (s) saveDiploma(s as Student3);
    } else if (code) {
      const text = exportStudent3(code);
      if (text) {
        void navigator.clipboard?.writeText(text).catch(() => undefined);
        (el.querySelector("#imp") as HTMLTextAreaElement).value = text;
        msg = `Código de ${code} copiado (también quedó en el cuadro de abajo).`;
        panel();
        (el.querySelector("#imp") as HTMLTextAreaElement).value = text;
      }
    } else if (del) {
      if (confirm(`¿Borrar a ${del} y todo su avance? No se puede deshacer.`)) {
        deleteStudent3(del);
        msg = `${del} fue borrado.`;
        panel();
      }
    } else if (t.closest("[data-import]")) {
      try {
        const n = importStudent3((el.querySelector("#imp") as HTMLTextAreaElement).value.trim());
        msg = `Se importó a ${n}.`;
      } catch (err) {
        msg = (err as Error).message;
      }
      panel();
    } else if (t.closest("[data-csv]")) {
      downloadBlob(new Blob([toCsv3(listStudents3())], { type: "text/csv;charset=utf-8" }), "cruz-del-sur-3.0-clase.csv");
    }
    void topicStats;
  });
}
