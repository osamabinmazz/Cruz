import * as THREE from "three";
import type { DefenseId } from "../src/core/defenses";
import { defenseById } from "../src/core/defenses";
import { block } from "./blocks";

/**
 * Cada una de las diez armas con su propia forma de bloques. Apuntan hacia +z desde el agarre (z = 0),
 * miden unas 2 unidades de largo y se usan igual en la mano del estudiante y sobre las torres.
 */
const DARK = 0x2f3d73;
const STEEL = 0xc8d0e6;
const WHITE = 0xf4f6ff;
const GOLD = 0xd8a929;
const WOOD = 0x8a5a2a;
const RED = 0xe0483f;

const glow = (color: number | string) => ({ emissive: color });
const tilt = (m: THREE.Object3D, x: number, y = 0, z = 0): THREE.Object3D => {
  m.rotation.set(x, y, z);
  return m;
};

function ring(g: THREE.Group, radius: number, count: number, size: number, color: number | string, z: number, opts: { y?: number; glow?: boolean } = {}): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.add(block(size, size, size, color, Math.cos(a) * radius, (opts.y ?? 0) + Math.sin(a) * radius, z, opts.glow === false ? {} : glow(color)));
  }
}

/** Una estrella de cuatro puntas hecha de dos bloques cruzados. */
function sparkle(color: number | string, size: number): THREE.Group {
  const s = new THREE.Group();
  s.add(block(size, size * 0.34, size * 0.34, color, 0, 0, 0, glow(color)), block(size * 0.34, size, size * 0.34, color, 0, 0, 0, glow(color)));
  return s;
}

/**
 * Cada una de las diez armas con su propia forma de bloques. Apuntan hacia +z desde el agarre (z = 0) y miden
 * unas 2 unidades de largo. En la mano (`forHand`) llevan empuñadura; sobre una torre, no.
 */
export function buildWeaponModel(id: DefenseId, forHand = false): THREE.Group {
  const c = new THREE.Color(defenseById(id).color).getHex();
  const g = new THREE.Group();
  switch (id) {
    case "torre-brillo": // Cañón de estrellas: recámara, cañón con anillos dorados y boca brillante
      g.add(block(0.86, 0.86, 0.5, DARK, 0, 0, 0.1), block(0.62, 0.62, 1.3, STEEL, 0, 0, 0.95), block(0.72, 0.72, 0.1, GOLD, 0, 0, 0.55), block(0.72, 0.72, 0.1, GOLD, 0, 0, 1.15));
      g.add(block(0.92, 0.92, 0.2, DARK, 0, 0, 1.68), block(0.6, 0.6, 0.1, c, 0, 0, 1.8, glow(c)), block(0.16, 0.3, 0.3, DARK, 0, 0.55, 0.5));
      {
        const star = sparkle(c, 0.6);
        star.position.set(0, 0.95, 0.1);
        g.add(star);
      }
      break;
    case "cuarteto-luz": // Cuatro cañones sobre una placa, con un núcleo de luz en el medio
      for (const [x, y] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]] as const) g.add(block(0.34, 0.34, 1.7, STEEL, x, y, 0.9), block(0.4, 0.4, 0.14, c, x, y, 1.8, glow(c)), block(0.4, 0.4, 0.1, GOLD, x, y, 0.5));
      g.add(block(1.1, 1.1, 0.3, DARK, 0, 0, 0.2), block(1.0, 1.0, 0.12, DARK, 0, 0, 1.05), block(0.22, 0.22, 0.9, c, 0, 0, 0.9, glow(c)), block(0.2, 0.36, 0.5, DARK, 0, 0.7, 0.4));
      break;
    case "lanza-eje": // Lanza: asta de madera, guarda dorada, hoja brillante y banderín
      g.add(block(0.17, 0.17, 2.4, WOOD, 0, 0, 0.9), block(0.24, 0.24, 0.3, GOLD, 0, 0, -0.1), block(0.8, 0.12, 0.14, GOLD, 0, 0, 1.95), block(0.12, 0.8, 0.14, GOLD, 0, 0, 1.95));
      g.add(tilt(block(0.34, 0.34, 0.9, c, 0, 0, 2.5, glow(c)), 0, 0, Math.PI / 4), block(0.2, 0.2, 0.4, WHITE, 0, 0, 3.0, glow(c)), block(0.05, 0.36, 0.5, RED, 0, 0.22, 1.7));
      break;
    case "gemelas": // Dos cañones unidos: uno naranja y otro azul
      for (const [x, col] of [[-0.34, 0xffa24a], [0.34, 0x6fb6ff]] as const) g.add(block(0.4, 0.4, 1.6, STEEL, x, 0, 0.9), block(0.5, 0.5, 0.16, col, x, 0, 1.78, glow(col)), block(0.46, 0.46, 0.1, GOLD, x, 0, 1.3), block(0.46, 0.46, 0.1, GOLD, x, 0, 0.6));
      g.add(block(1.3, 0.34, 0.5, DARK, 0, 0, 0.25), block(0.3, 0.3, 1.0, GOLD, 0, 0.3, 0.9), block(0.14, 0.26, 0.26, DARK, 0, 0.6, 0.4));
      break;
    case "guia-punteada": // Varita con una corona de puntitos alrededor de una estrella
      g.add(block(0.18, 0.18, 1.7, WOOD, 0, 0, 0.7), block(0.26, 0.26, 0.2, GOLD, 0, 0, 0.1), block(0.3, 0.3, 0.2, GOLD, 0, 0, 1.45));
      ring(g, 0.5, 8, 0.15, c, 1.85);
      {
        const star = sparkle(c, 0.5);
        star.position.set(0, 0, 1.85);
        g.add(star);
      }
      break;
    case "plomada": // Mortero con borde dorado, patas y una plomada colgando de un hilo
      g.add(block(0.9, 0.9, 1.1, DARK, 0, 0, 0.5), block(0.72, 0.72, 0.9, STEEL, 0, 0, 1.45), block(1.0, 1.0, 0.14, GOLD, 0, 0, 1.95), block(0.5, 0.5, 0.08, 0x111a3a, 0, 0, 2.0));
      g.add(tilt(block(0.1, 0.9, 0.1, DARK, -0.3, -0.6, 0.5), 0, 0, 0.35), tilt(block(0.1, 0.9, 0.1, DARK, 0.3, -0.6, 0.5), 0, 0, -0.35));
      g.add(block(0.05, 0.6, 0.05, WHITE, 0, -0.75, 1.0), block(0.3, 0.3, 0.3, c, 0, -1.2, 1.0, glow(c)), block(0.16, 0.2, 0.16, c, 0, -1.45, 1.0, glow(c)));
      break;
    case "brujula-austral": { // Brújula: aro con marcas cardinales y aguja bicolor
      g.add(block(0.2, 0.2, 1.0, STEEL, 0, 0, 0.5), block(0.3, 0.3, 0.2, GOLD, 0, 0, 0.1));
      ring(g, 0.62, 16, 0.14, STEEL, 1.55, { glow: false });
      for (const [x, y, col] of [[0, 0.62, RED], [0.62, 0, WHITE], [0, -0.62, WHITE], [-0.62, 0, WHITE]] as const) g.add(block(0.2, 0.2, 0.22, col, x, y, 1.55, col === RED ? glow(RED) : {}));
      g.add(tilt(block(0.1, 0.8, 0.1, RED, 0, 0.2, 1.58, glow(RED)), 0, 0, -0.5), tilt(block(0.1, 0.7, 0.1, WHITE, 0, -0.2, 1.58), 0, 0, -0.5), block(0.2, 0.2, 0.2, c, 0, 0, 1.58, glow(c)));
      break;
    }
    case "regla-luz": // Regla emisora: losa plateada con marcas y una lente al frente
      g.add(block(0.4, 0.5, 0.7, DARK, 0, 0, 0.3), block(0.26, 0.6, 2.4, STEEL, 0, 0, 1.55), block(0.16, 0.2, 2.3, c, 0, 0.38, 1.55, glow(c)), block(0.5, 0.5, 0.2, GOLD, 0, 0, 2.85), block(0.34, 0.34, 0.1, WHITE, 0, 0, 2.97, glow(c)));
      for (let i = 0; i < 8; i++) g.add(block(0.32, i % 2 ? 0.1 : 0.18, 0.07, DARK, 0, -0.32, 0.7 + i * 0.3));
      break;
    case "faro-lactea": // Faro: torre blanca con franjas rojas, galería dorada y lámpara con aletas
      g.add(block(0.8, 0.8, 0.7, STEEL, 0, 0, 0.3));
      for (let i = 0; i < 3; i++) g.add(block(0.62 - i * 0.07, 0.62 - i * 0.07, 0.34, i % 2 ? RED : WHITE, 0, 0, 0.9 + i * 0.34));
      g.add(block(1.0, 1.0, 0.12, GOLD, 0, 0, 1.98), block(0.8, 0.8, 0.8, c, 0, 0, 2.45, glow(c)), block(0.95, 0.95, 0.1, GOLD, 0, 0, 2.9), block(0.5, 0.5, 0.3, RED, 0, 0, 3.1));
      for (const [x, y] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]] as const) g.add(block(0.1, 0.1, 0.8, WHITE, x, y, 2.45));
      break;
    default: { // Bumerán de plata: lanzador con una V curva
      g.add(block(0.5, 0.5, 1.0, DARK, 0, 0, 0.5), block(0.62, 0.62, 0.14, GOLD, 0, 0, 1.05), block(0.3, 0.3, 0.3, c, 0, 0, 1.25, glow(c)));
      for (const sgn of [-1, 1]) {
        const inner = block(0.2, 0.36, 0.9, WHITE, sgn * 0.25, 0, 1.6, glow(0x7d89b8));
        inner.rotation.y = sgn * 0.5;
        const outer = block(0.2, 0.36, 0.7, STEEL, sgn * 0.76, 0, 2.19, glow(0x7d89b8));
        outer.rotation.y = sgn * 1.0;
        g.add(inner, outer);
      }
    }
  }
  if (forHand) {
    // Empuñadura y guardamanos para sujetarla.
    g.add(block(0.26, 0.6, 0.28, WOOD, 0, -0.42, 0.05), block(0.34, 0.14, 0.5, DARK, 0, -0.7, 0.05), block(0.2, 0.2, 0.7, DARK, 0, -0.3, -0.2));
  }
  return g;
}

/** Disparo con la forma de su arma: una bola, un rayo largo, una estrella o un bumerán. */
export function buildProjectile(id: DefenseId, size: number): THREE.Group {
  const c = new THREE.Color(defenseById(id).color);
  const g = new THREE.Group();
  const basic = (color: THREE.ColorRepresentation, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const core = (geo: THREE.BufferGeometry) => new THREE.Mesh(geo, basic(c));
  const halo = (r: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), basic(c, 0.28));
  switch (id) {
    case "lanza-eje":
    case "regla-luz": {
      const beam = core(new THREE.BoxGeometry(size * 0.6, size * 0.6, size * (id === "regla-luz" ? 8 : 4)));
      g.add(beam, new THREE.Mesh(new THREE.BoxGeometry(size * 1.3, size * 1.3, size * (id === "regla-luz" ? 8 : 4)), basic(c, 0.22)));
      break;
    }
    case "bumeran-plata": {
      for (const s of [-1, 1]) {
        const arm = core(new THREE.BoxGeometry(size * 0.5, size * 0.3, size * 2.2));
        arm.position.x = s * size * 0.55;
        arm.rotation.y = -s * 0.6;
        g.add(arm);
      }
      break;
    }
    case "brujula-austral":
    case "guia-punteada":
      g.add(core(new THREE.OctahedronGeometry(size * 0.85)), halo(size * 1.3));
      break;
    case "plomada":
    case "faro-lactea":
      g.add(core(new THREE.SphereGeometry(size * 0.8, 8, 6)), halo(size * 1.25));
      break;
    default:
      g.add(core(new THREE.BoxGeometry(size, size, size * 1.8)), halo(size * 1.1));
  }
  return g;
}
