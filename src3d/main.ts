import "./style.css";
import { levelName, type Difficulty } from "../src/core/difficulty";
import { DEFAULT_LOOK3, newStudent, studentRow3, type Student3 } from "../src/core/students3d";
import { HAIR_COLORS, SKINS, type Accessory, type HairStyle, type LookOptions } from "./character";
import { showDiploma } from "./diploma";
import { Game3D } from "./game";
import { ico } from "./icons";
import { Preview } from "./preview";
import { findStudent3, listStudents3, saveStudent3 } from "./store";
import { openTeacherPanel } from "./teacherPanel";

/** Pantallas de inicio de la 3.0: quién juega, cómo se ve el estudiante y el panel del profesor. */
const root = document.getElementById("app3d")!;
const game = new Game3D(root);
(window as unknown as { cruz3: Game3D }).cruz3 = game;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LEVELS: { id: Difficulty; info: string }[] = [
  { id: "beginner", info: "Más tranquilo y con brújula" },
  { id: "advanced", info: "Zombis más fuertes" },
  { id: "extreme", info: "Sin brújula. Si pierdes, la siguiente noche se suaviza" }
];
const HAIRS: { id: HairStyle; name: string }[] = [{ id: "corto", name: "Corto" }, { id: "largo", name: "Largo" }, { id: "rizos", name: "Rizos" }];
const ACCS: { id: Accessory; name: string }[] = [{ id: "diadema", name: "Diadema" }, { id: "capa", name: "Capa azul" }, { id: "estrella", name: "Estrella" }];

function clear(): void {
  root.querySelectorAll(":scope > .overlay").forEach((o) => o.remove());
}

function play(s: Student3): void {
  clear();
  const night = Number(new URLSearchParams(location.search).get("noche")) || s.night;
  game.startStudent(s, night);
}

function backToMenu(): void {
  root.querySelector(".hud")?.remove();
  game.controls.setEnabled(false);
  home();
}

game.onMenu = backToMenu;
game.onDiploma = (s) => showDiploma(root, s, () => backToMenu());

function home(): void {
  clear();
  const students = listStudents3();
  if (students.length === 0) return create();
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `<div class="card">
    <h1>${ico("dust", 34, "gold")} Cruz del Sur 3.0 ${ico("dust", 34, "gold")}</h1>
    <h2>¿Quién juega?</h2>
    <div class="pick">${students
      .map((s) => {
        const r = studentRow3(s);
        return `<button class="btn" data-play="${esc(s.name)}">${esc(s.name)}<small>${r.progress} · Nivel ${levelName(s.level)} · ${r.nightsWon}/5 noches</small></button>`;
      })
      .join("")}</div>
    <div class="row"><button class="btn primary" data-new>Estudiante nuevo</button><button class="btn small" data-teacher>${ico("shield", 16)} Panel del profesor</button></div>
  </div>`;
  overlay.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const name = t.closest<HTMLElement>("[data-play]")?.dataset.play;
    if (name) {
      const s = findStudent3(name);
      if (s) play(s);
    } else if (t.closest("[data-new]")) create();
    else if (t.closest("[data-teacher]")) {
      clear();
      openTeacherPanel(root, home);
    }
  });
  root.appendChild(overlay);
}

function create(): void {
  clear();
  let look: LookOptions = { ...DEFAULT_LOOK3 };
  let level: Difficulty = "beginner";
  let name = "";
  const preview = new Preview();
  preview.setLook(look);
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const chips = <T extends string | number>(attr: string, items: { id: T; label: string; color?: string }[], current: T) =>
    items.map((i) => `<button class="chip ${i.id === current ? "on" : ""}" data-${attr}="${i.id}" ${i.color ? `style="--c:${i.color}"` : ""} aria-label="${i.label}" title="${i.label}">${i.color ? "" : i.label}</button>`).join("");
  const paint = () => {
    overlay.innerHTML = `<div class="card create">
      <h1>${ico("dust", 30, "gold")} Crea tu estudiante</h1>
      <div class="create-grid">
        <div class="create-view"></div>
        <div class="create-form">
          <label class="field">Tu nombre<br /><input id="nombre" maxlength="16" placeholder="Por ejemplo: Ana" value="${esc(name)}" autocomplete="off" /></label>
          <div class="opt"><span>Piel</span>${chips("skin", SKINS.map((c, i) => ({ id: i, label: `Piel ${i + 1}`, color: c })), look.skin)}</div>
          <div class="opt"><span>Pelo</span>${chips("hair", HAIRS.map((h) => ({ id: h.id, label: h.name })), look.hair)}</div>
          <div class="opt"><span>Color</span>${chips("hcolor", HAIR_COLORS.map((c, i) => ({ id: i, label: `Color ${i + 1}`, color: c })), look.hairColor)}</div>
          <div class="opt"><span>Extra</span>${chips("acc", ACCS.map((a) => ({ id: a.id, label: a.name })), look.accessory)}</div>
        </div>
      </div>
      <div class="levels">${LEVELS.map((l) => `<button class="level ${l.id === level ? "on" : ""}" data-level="${l.id}"><b>${levelName(l.id)}</b><small>${l.info}</small></button>`).join("")}</div>
      <p class="note">Siempre llevas la túnica blanca: ¡tú eliges cómo te ves!</p>
      <div class="row"><button class="btn primary" data-go>¡Jugar!</button>${listStudents3().length ? '<button class="btn" data-back>Volver</button>' : '<button class="btn small" data-teacher>Panel del profesor</button>'}</div>
    </div>`;
    overlay.querySelector(".create-view")!.appendChild(preview.canvas);
  };
  paint();
  overlay.addEventListener("input", (e) => {
    if ((e.target as HTMLElement).id === "nombre") name = (e.target as HTMLInputElement).value;
  });
  overlay.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const d = (sel: string) => t.closest<HTMLElement>(sel)?.dataset;
    let changed = false;
    if (d("[data-skin]")) (look = { ...look, skin: Number(d("[data-skin]")!.skin) }), (changed = true);
    else if (d("[data-hair]")) (look = { ...look, hair: d("[data-hair]")!.hair as HairStyle }), (changed = true);
    else if (d("[data-hcolor]")) (look = { ...look, hairColor: Number(d("[data-hcolor]")!.hcolor) }), (changed = true);
    else if (d("[data-acc]")) (look = { ...look, accessory: d("[data-acc]")!.acc as Accessory }), (changed = true);
    else if (d("[data-level]")) (level = d("[data-level]")!.level as Difficulty), (changed = true);
    if (changed) {
      preview.setLook(look);
      return paint();
    }
    if (t.closest("[data-back]")) {
      preview.dispose();
      return home();
    }
    if (t.closest("[data-teacher]")) {
      preview.dispose();
      clear();
      return openTeacherPanel(root, home);
    }
    if (t.closest("[data-go]")) {
      const n = name.trim() || "Estudiante";
      const old = findStudent3(n);
      // Si ya existe un estudiante con ese nombre, se continúa con su avance (con el aspecto que eligió ahora).
      const s = old ?? newStudent(n, level, look);
      if (old) {
        old.look = look;
        old.level = level;
      }
      saveStudent3(s);
      preview.dispose();
      play(s);
    }
  });
  root.appendChild(overlay);
}

home();
