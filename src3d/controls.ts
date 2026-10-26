import { ico } from "./icons";
/**
 * Controles: teclado y mouse en el computador; joystick y botones en pantallas táctiles.
 * Mover: WASD o flechas. Mirar: arrastrar con el botón derecho del mouse (o con un dedo a la derecha).
 * Disparar: clic izquierdo, Espacio o el botón. Interactuar: E o el botón.
 */
export interface InputState {
  /** Movimiento deseado: x = derecha, y = adelante (−1 a 1). */
  moveX: number;
  moveY: number;
  /** Giro de cámara acumulado desde la última lectura (radianes). */
  yaw: number;
  pitch: number;
  fire: boolean;
  /** Se ejecuta una vez por pulsación. */
  interactPressed: boolean;
  swapPressed: number;
  jumpPressed: boolean;
  /** Carrera corta que esquiva (C o Ctrl). */
  dashPressed: boolean;
}

export class Controls {
  readonly state: InputState = { moveX: 0, moveY: 0, yaw: 0, pitch: 0, fire: false, interactPressed: false, swapPressed: 0, jumpPressed: false, dashPressed: false };
  readonly isTouch: boolean;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private joyId: number | null = null;
  private lookId: number | null = null;
  private lastLook = { x: 0, y: 0 };
  private mouseLook = false;
  private enabled = true;
  private readonly root: HTMLElement;

  constructor(private readonly canvas: HTMLElement, root: HTMLElement) {
    this.root = root;
    this.isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    window.addEventListener("keydown", (e) => this.onKey(e, true));
    window.addEventListener("keyup", (e) => this.onKey(e, false));
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    window.addEventListener("pointermove", (e) => this.onPointerMove(e));
    window.addEventListener("pointerup", (e) => this.onPointerUp(e));
    window.addEventListener("blur", () => this.keys.clear());
    if (this.isTouch) this.buildTouchUi();
  }

  /** Apaga los controles mientras hay una ventana (pregunta, menú). */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.keys.clear();
      this.state.fire = false;
      this.joy = { x: 0, y: 0 };
    }
  }

  /** Lee y limpia lo que ocurrió desde la última vez. */
  poll(): InputState {
    const s = this.state;
    let x = 0;
    let y = 0;
    if (this.enabled) {
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y += 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y -= 1;
      x += this.joy.x;
      y += this.joy.y;
    }
    const len = Math.hypot(x, y);
    s.moveX = len > 1 ? x / len : x;
    s.moveY = len > 1 ? y / len : y;
    const out = { ...s };
    s.yaw = 0;
    s.pitch = 0;
    s.interactPressed = false;
    s.swapPressed = 0;
    s.jumpPressed = false;
    s.dashPressed = false;
    return out;
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (!this.enabled) return;
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    if (down) {
      if (e.code === "KeyE") this.state.interactPressed = true;
      if (e.code === "Digit1") this.state.swapPressed = 1;
      if (e.code === "Digit2") this.state.swapPressed = 2;
      if (e.code === "Digit3") this.state.swapPressed = 3;
      if (e.code === "KeyQ") this.state.swapPressed = -1;
      if (e.code === "Space" || e.code === "KeyF") this.state.fire = true;
      if (e.code === "ShiftLeft") this.state.jumpPressed = true;
      if (e.code === "KeyC" || e.code === "ControlLeft") this.state.dashPressed = true;
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      this.keys.add(e.code);
    } else {
      if (e.code === "Space" || e.code === "KeyF") this.state.fire = false;
      this.keys.delete(e.code);
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    if (e.pointerType === "mouse") {
      if (e.button === 2) {
        this.mouseLook = true;
        this.lastLook = { x: e.clientX, y: e.clientY };
        this.canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 0) this.state.fire = true;
      return;
    }
    // Táctil: un dedo en la mitad derecha mira alrededor.
    if (e.clientX > window.innerWidth * 0.45 && this.lookId === null) {
      this.lookId = e.pointerId;
      this.lastLook = { x: e.clientX, y: e.clientY };
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerType === "mouse" && this.mouseLook) {
      this.state.yaw -= (e.clientX - this.lastLook.x) * 0.006;
      this.state.pitch += (e.clientY - this.lastLook.y) * 0.004;
      this.lastLook = { x: e.clientX, y: e.clientY };
    } else if (e.pointerId === this.lookId) {
      this.state.yaw -= (e.clientX - this.lastLook.x) * 0.008;
      this.state.pitch += (e.clientY - this.lastLook.y) * 0.006;
      this.lastLook = { x: e.clientX, y: e.clientY };
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerType === "mouse") {
      if (e.button === 2) this.mouseLook = false;
      if (e.button === 0) this.state.fire = false;
    }
    if (e.pointerId === this.lookId) this.lookId = null;
  }

  private buildTouchUi(): void {
    const ui = document.createElement("div");
    ui.className = "touch-ui";
    ui.innerHTML = `
      <div class="joy-base"><div class="joy-knob"></div></div>
      <button class="t-btn t-fire" data-label="Disparar" aria-label="Disparar">${ico("fire", 34)}</button>
      <button class="t-btn t-use" data-label="Usar" aria-label="Abrir o usar">${ico("hand", 30)}</button>
      <button class="t-btn t-swap" data-label="Arma" aria-label="Cambiar de arma">${ico("swap", 26)}</button>
      <button class="t-btn t-dash" data-label="Esquivar" aria-label="Esquivar">${ico("dash", 26)}</button>`;
    this.root.appendChild(ui);
    const base = ui.querySelector<HTMLElement>(".joy-base")!;
    const knob = ui.querySelector<HTMLElement>(".joy-knob")!;
    const move = (e: PointerEvent) => {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2);
      let dy = (e.clientY - cy) / (r.height / 2);
      const l = Math.hypot(dx, dy);
      if (l > 1) {
        dx /= l;
        dy /= l;
      }
      knob.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
      this.joy = { x: dx, y: -dy };
    };
    base.addEventListener("pointerdown", (e) => {
      this.joyId = e.pointerId;
      base.setPointerCapture(e.pointerId);
      move(e);
      e.preventDefault();
    });
    base.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.joyId) move(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joy = { x: 0, y: 0 };
      knob.style.transform = "translate(0,0)";
    };
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
    const hold = (sel: string, down: () => void, up?: () => void) => {
      const b = ui.querySelector<HTMLElement>(sel)!;
      b.addEventListener("pointerdown", (e) => {
        if (!this.enabled) return;
        down();
        e.preventDefault();
        e.stopPropagation();
      });
      const release = () => up?.();
      b.addEventListener("pointerup", release);
      b.addEventListener("pointercancel", release);
      b.addEventListener("pointerleave", release);
    };
    hold(".t-fire", () => (this.state.fire = true), () => (this.state.fire = false));
    hold(".t-use", () => (this.state.interactPressed = true));
    hold(".t-swap", () => (this.state.swapPressed = -1));
    hold(".t-dash", () => (this.state.dashPressed = true));
  }
}
