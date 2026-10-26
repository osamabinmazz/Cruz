import * as THREE from "three";

/** Clima de cada noche: despejada, con niebla, tormenta, luna roja y la gran noche del gigante. */
export type WeatherKind = "clear" | "fog" | "storm" | "redmoon" | "giant";

export const NIGHT_WEATHER: WeatherKind[] = ["clear", "fog", "storm", "redmoon", "giant"];

export const WEATHER_INFO: Record<WeatherKind, { title: string; tip: string }> = {
  clear: { title: "Noche despejada", tip: "Se ven todas las estrellas: busca la Cruz del Sur." },
  fog: { title: "Noche de niebla", tip: "Se ve poco. Usa la brújula del cofre más cercano para orientarte." },
  storm: { title: "Noche de tormenta", tip: "Llueve y caen rayos. Los cofres siguen brillando." },
  redmoon: { title: "Noche de luna roja", tip: "Los zombis se sienten más fuertes. ¡Cuida la escuela!" },
  giant: { title: "La gran noche", tip: "Tormenta, luna roja y el gigante al final. ¡Tú puedes!" }
};

const RAIN = 520;

export class Weather {
  readonly group = new THREE.Group();
  /** 0 a 1: cuánto se nota ahora un relámpago. */
  flash = 0;
  private rain: THREE.LineSegments | null = null;
  private rainPos: Float32Array | null = null;
  private nextBolt = 6;
  onThunder: () => void = () => undefined;

  constructor(readonly kind: WeatherKind) {
    if (kind === "storm" || kind === "giant") {
      const pos = new Float32Array(RAIN * 6);
      for (let i = 0; i < RAIN; i++) {
        const x = (Math.random() - 0.5) * 60;
        const y = Math.random() * 30;
        const z = (Math.random() - 0.5) * 60;
        pos.set([x, y, z, x - 0.25, y - 1.1, z], i * 6);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaecbff, transparent: true, opacity: 0.55 }));
      this.rain.frustumCulled = false;
      this.rainPos = pos;
      this.group.add(this.rain);
    }
  }

  get stormy(): boolean {
    return this.kind === "storm" || this.kind === "giant";
  }

  /** Cuánto se acerca la niebla: (cerca, lejos). */
  fogRange(): [number, number] {
    if (this.kind === "fog") return [14, 70];
    if (this.stormy) return [30, 120];
    return [70, 200];
  }

  /** Tinte del cielo nocturno (rojizo en luna roja). */
  tint(): THREE.Color | null {
    return this.kind === "redmoon" || this.kind === "giant" ? new THREE.Color(0x4a1020) : null;
  }

  update(dt: number, center: THREE.Vector3, reduced: boolean): void {
    this.flash = Math.max(0, this.flash - dt * 2.6);
    if (this.stormy) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 7 + Math.random() * 9;
        if (!reduced) this.flash = 1;
        window.setTimeout(() => this.onThunder(), 250 + Math.random() * 700);
      }
    }
    if (this.rain && this.rainPos) {
      this.rain.position.set(center.x, 0, center.z);
      const p = this.rainPos;
      for (let i = 0; i < RAIN; i++) {
        const k = i * 6;
        p[k + 1] -= 34 * dt;
        p[k + 4] -= 34 * dt;
        if (p[k + 1] < 0) {
          const x = (Math.random() - 0.5) * 60;
          const z = (Math.random() - 0.5) * 60;
          p[k] = x;
          p[k + 1] = 28 + Math.random() * 4;
          p[k + 2] = z;
          p[k + 3] = x - 0.25;
          p[k + 4] = p[k + 1] - 1.1;
          p[k + 5] = z;
        }
      }
      (this.rain.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose(): void {
    if (this.rain) {
      this.rain.geometry.dispose();
      (this.rain.material as THREE.Material).dispose();
    }
  }
}
