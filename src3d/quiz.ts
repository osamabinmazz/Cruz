import { ico } from "./icons";
import { chestCorrectText, type ChestQuestion, type ChestTopic } from "../src/core/chests/questions";
import { pointAnswer } from "../src/core/freeform";
import { SKY } from "../src/core/geometry";
import type { Rng } from "../src/core/rng";
import { shuffle } from "../src/core/rng";
import { rescueHorizonPick, rescueStarPick, rescueVisual } from "../src/ui/sky";

const TOPIC: Record<ChestTopic, { icon: string; name: string }> = {
  cruz: { icon: ico("dust", 15), name: "CRUZ DEL SUR" },
  sol: { icon: ico("sun", 15), name: "EL SOL" },
  cardinales: { icon: ico("compass", 15), name: "PUNTOS CARDINALES" }
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface QuizResult {
  /** Respuesta del estudiante en el formato de `isChestCorrect`; null si cerró sin responder. */
  answer: string | null;
  usedHint: boolean;
}

/** Ventana de pregunta de un cofre. Las de «mirar hacia…» no tapan el mundo: se responden girando la cámara. */
export class QuizUi {
  private el: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement, private readonly rng: Rng, private readonly hintsEnabled: boolean) {}

  get isOpen(): boolean {
    return this.el !== null;
  }

  close(): void {
    this.el?.remove();
    this.el = null;
  }

  ask(q: ChestQuestion, getHeading: () => number): Promise<QuizResult> {
    this.close();
    return new Promise((resolve) => {
      const topic = TOPIC[q.topic];
      const format = q.format ?? "choice";
      const el = document.createElement("div");
      el.className = format === "face" ? "quiz-banner" : "overlay";
      this.el = el;
      let selected: string | null = null;
      let usedHint = false;
      const removed = new Set<string>();
      const options = shuffle(q.options, this.rng);
      const finish = (answer: string | null) => {
        this.close();
        resolve({ answer, usedHint });
      };

      const render = () => {
        const head = `<div class="quiz-topic">${topic.icon} ${topic.name}</div><h2 class="quiz-q">${esc(q.prompt)}</h2>`;
        let body = "";
        let ready = false;
        if (format === "face") {
          body = `<div class="quiz-heading">Miras hacia: <b id="qh">${Math.round(getHeading())}°</b></div>`;
          ready = true;
        } else if (format === "star") {
          body = `<div class="quiz-visual quiz-pick">${rescueStarPick(selected)}</div>`;
          ready = selected !== null;
        } else if (format === "horizon") {
          const x = selected ? Number(selected.split(":")[1]) : null;
          body = `<div class="quiz-visual quiz-pick" data-horizon>${rescueHorizonPick(x)}</div>`;
          ready = selected !== null;
        } else if (format === "order") {
          const chosen = selected ? selected.split(",") : [];
          body = `<div class="quiz-opts">${options
            .map((o) => {
              const n = chosen.indexOf(o.id);
              return `<button class="qopt ${n >= 0 ? "on" : ""}" data-order="${o.id}"><span class="qn">${n >= 0 ? n + 1 : "·"}</span>${esc(o.text)}</button>`;
            })
            .join("")}</div><button class="btn small" data-reset ${chosen.length ? "" : "disabled"}>Empezar de nuevo</button>`;
          ready = chosen.length === options.length;
        } else {
          body = `${q.visual ? `<div class="quiz-visual">${rescueVisual(q.visual)}</div>` : ""}<div class="quiz-opts ${options.some((o) => o.visual) ? "visual" : ""}">${options
            .map((o, i) => {
              const gone = removed.has(o.id);
              return `<button class="qopt ${selected === o.id ? "on" : ""} ${gone ? "gone" : ""}" data-opt="${o.id}" ${gone ? "disabled" : ""}><span class="qn">${"ABCD"[i]}</span>${o.visual ? `<span class="qv">${rescueVisual(o.visual)}</span>` : ""}${esc(o.text)}</button>`;
            })
            .join("")}</div>`;
          ready = selected !== null;
        }
        const hint = this.hintsEnabled && format === "choice" && !usedHint ? `<button class="btn small" data-hint>${ico("bulb", 16)} Pista</button>` : "";
        el.innerHTML = `<div class="card quiz">${head}${body}<div class="row">${hint}<button class="btn small" data-close>Cerrar</button><button class="btn primary" data-confirm ${ready ? "" : "disabled"}>Confirmar</button></div><p class="note">Sin apuro: si fallas, el cofre se cierra con candado un rato y puedes volver a intentarlo.</p></div>`;
      };

      el.addEventListener("click", (e) => {
        const t = e.target as HTMLElement;
        const opt = t.closest<HTMLElement>("[data-opt]");
        const ord = t.closest<HTMLElement>("[data-order]");
        const star = t.closest<HTMLElement>("[data-rescue=star]");
        if (t.closest("[data-close]")) return finish(null);
        if (t.closest("[data-reset]")) {
          selected = null;
          return render();
        }
        if (t.closest("[data-hint]")) {
          const wrong = options.filter((o) => o.id !== q.correctId && !removed.has(o.id));
          if (wrong.length > 1) removed.add(wrong[Math.floor(this.rng() * wrong.length)].id);
          usedHint = true;
          if (selected && removed.has(selected)) selected = null;
          return render();
        }
        if (t.closest("[data-confirm]")) {
          if (format === "face") return finish(`face:${getHeading().toFixed(1)}`);
          return finish(selected);
        }
        if (opt) {
          selected = opt.dataset.opt!;
          return render();
        }
        if (ord) {
          const id = ord.dataset.order!;
          const chosen = selected ? selected.split(",") : [];
          if (!chosen.includes(id)) selected = [...chosen, id].join(",");
          return render();
        }
        if (star) {
          selected = star.dataset.id!;
          render();
        }
      });
      el.addEventListener("pointerdown", (e) => {
        if (format !== "horizon") return;
        const svg = (e.target as Element).closest<SVGSVGElement>("[data-horizon] svg");
        const ctm = svg?.getScreenCTM();
        if (!svg || !ctm) return;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        selected = pointAnswer(Math.max(0, Math.min(SKY.width, p.x)));
        render();
      });
      render();
      this.root.appendChild(el);
      if (format === "face") {
        // El rumbo se actualiza mientras se gira la cámara.
        const tick = () => {
          if (this.el !== el) return;
          const h = el.querySelector("#qh");
          if (h) h.textContent = `${Math.round(getHeading())}°`;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    });
  }

  /** Resultado de la respuesta con su explicación. */
  feedback(q: ChestQuestion, correct: boolean, lockSeconds: number): Promise<void> {
    this.close();
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "overlay";
      el.innerHTML = `<div class="card quiz">
        <h1>${correct ? ico("check", 34) + " ¡Correcto!" : "Esta vez no"}</h1>
        ${correct ? "" : `<p>Respuesta correcta: <b>${esc(chestCorrectText(q))}</b></p>`}
        <p class="expl">${esc(q.explanation)}</p>
        ${correct ? "" : `<p class="note">El cofre se cerró con candado ${lockSeconds} segundos. ¡Después puedes intentarlo otra vez!</p>`}
        <div class="row"><button class="btn primary" data-ok>${correct ? "Abrir el cofre" : "Entendido"}</button></div></div>`;
      el.addEventListener("click", (e) => {
        if (!(e.target as HTMLElement).closest("[data-ok]")) return;
        el.remove();
        this.el = null;
        resolve();
      });
      this.el = el;
      this.root.appendChild(el);
    });
  }
}
