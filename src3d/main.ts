import "./style.css";
import { ico } from "./icons";
import type { Difficulty } from "../src/core/difficulty";
import { DEFAULT_LOOK } from "./character";
import { Game3D, type Profile } from "./game";

/** Pantalla de inicio de la 3.0 y arranque del juego. */
const root = document.getElementById("app3d")!;
const game = new Game3D(root);
(window as unknown as { cruz3: Game3D }).cruz3 = game;

function menu(): void {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("cruz3-perfil") ?? "null") as Profile | null;
    } catch {
      return null;
    }
  })();
  let level: Difficulty = saved?.level ?? "beginner";
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `<div class="card">
    <h1>${ico("dust", 34, "gold")} Cruz del Sur 3.0 ${ico("dust", 34, "gold")}</h1>
    <h2>La Isla de las Noches</h2>
    <p>Eres un estudiante de túnica blanca. De día prepara tus torres y busca cofres; de noche defiende la escuela de los zombis. Responde preguntas sobre la Cruz del Sur, el Sol y los puntos cardinales para mejorar tus armas.</p>
    <label class="field">Escribe tu nombre<br /><input id="nombre" maxlength="16" placeholder="Por ejemplo: Ana" value="${saved?.name ?? ""}" /></label>
    <div class="levels">
      <button class="level" data-level="beginner"><b>Principiante</b><small>Más tranquilo y con brújula</small></button>
      <button class="level" data-level="advanced"><b>Avanzado</b><small>Zombis más fuertes</small></button>
      <button class="level" data-level="extreme"><b>Extremo</b><small>Sin brújula. Un gran reto</small></button>
    </div>
    <div class="row"><button class="btn primary" id="jugar">¡Jugar!</button></div>
  </div>`;
  const paint = () => overlay.querySelectorAll<HTMLElement>(".level").forEach((b) => b.classList.toggle("on", b.dataset.level === level));
  paint();
  overlay.addEventListener("click", (e) => {
    const lv = (e.target as HTMLElement).closest<HTMLElement>(".level")?.dataset.level as Difficulty | undefined;
    if (lv) {
      level = lv;
      paint();
    }
  });
  overlay.querySelector("#jugar")!.addEventListener("click", () => {
    const name = (overlay.querySelector("#nombre") as HTMLInputElement).value.trim() || "Estudiante";
    const profile: Profile = { name, level, look: saved?.look ?? DEFAULT_LOOK };
    try {
      localStorage.setItem("cruz3-perfil", JSON.stringify(profile));
    } catch {
      /* sin almacenamiento */
    }
    overlay.remove();
    const night = Number(new URLSearchParams(location.search).get("noche")) || 1;
    game.startNight(night, profile);
  });
  root.appendChild(overlay);
}

menu();
