import * as THREE from "three";
import type { DefenseId } from "../src/core/defenses";
import { defenseById } from "../src/core/defenses";
import { block } from "./blocks";

/**
 * Cada una de las diez armas con su propia forma de bloques. Apuntan hacia +z desde el agarre (z = 0),
 * miden unas 2 unidades de largo y se usan igual en la mano del estudiante y sobre las torres.
 */
const DARK = 0x4a5fa8;
const STEEL = 0x8c93ad;
const WOOD = 0x6b4a2b;

const glow = (color: number | string) => ({ emissive: color });

function ring(g: THREE.Group, radius: number, count: number, size: number, color: number | string, z: number, y = 0): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.add(block(size, size, size, color, Math.cos(a) * radius, y + Math.sin(a) * radius, z, glow(color)));
  }
}

export function buildWeaponModel(id: DefenseId): THREE.Group {
  const c = new THREE.Color(defenseById(id).color).getHex();
  const g = new THREE.Group();
  switch (id) {
    case "torre-brillo": // Cañón de estrellas
      g.add(block(0.5, 0.5, 1.5, DARK, 0, 0, 0.75), block(0.72, 0.72, 0.28, STEEL, 0, 0, 1.55), block(0.55, 0.55, 0.12, c, 0, 0, 1.75, glow(c)), block(0.3, 0.5, 0.5, STEEL, 0, -0.35, 0.2));
      break;
    case "cuarteto-luz": // Cuatro cañones juntos
      for (const [x, y] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]] as const) g.add(block(0.3, 0.3, 1.6, DARK, x, y, 0.8), block(0.34, 0.34, 0.14, c, x, y, 1.65, glow(c)));
      g.add(block(0.95, 0.95, 0.24, STEEL, 0, 0, 0.5));
      break;
    case "lanza-eje": // Lanza larga con punta brillante
      g.add(block(0.18, 0.18, 2.5, WOOD, 0, 0, 1.0), block(0.4, 0.14, 0.5, STEEL, 0, 0, 2.3), block(0.2, 0.2, 0.5, c, 0, 0, 2.7, glow(c)), block(0.5, 0.1, 0.12, c, 0, 0, 0.5, glow(c)), block(0.1, 0.5, 0.12, c, 0, 0, 0.5, glow(c)));
      break;
    case "gemelas": // Dos cañones con dos luces
      g.add(block(0.36, 0.36, 1.6, DARK, -0.28, 0, 0.8), block(0.36, 0.36, 1.6, DARK, 0.28, 0, 0.8), block(0.3, 0.3, 0.3, 0xffc58a, -0.28, 0, 1.7, glow(0xffa24a)), block(0.3, 0.3, 0.3, 0xcfe9ff, 0.28, 0, 1.7, glow(0x6fb6ff)), block(1.0, 0.3, 0.3, STEEL, 0, 0, 0.35));
      break;
    case "guia-punteada": // Varita con anillo de puntitos
      g.add(block(0.16, 0.16, 1.7, WOOD, 0, 0, 0.7));
      ring(g, 0.45, 8, 0.14, c, 1.65);
      g.add(block(0.3, 0.3, 0.3, c, 0, 0, 1.65, glow(c)));
      break;
    case "plomada": // Mortero con plomada colgando
      g.add(block(0.8, 0.8, 1.0, 0x6b5a3a, 0, 0, 0.5), block(0.55, 0.55, 1.0, DARK, 0, 0.1, 1.3), block(0.8, 0.14, 0.8, STEEL, 0, 0.1, 1.85), block(0.1, 0.5, 0.1, STEEL, 0, -0.45, 0.2), block(0.34, 0.34, 0.34, c, 0, -0.85, 0.2, glow(c)));
      break;
    case "brujula-austral": { // Aro con aguja
      g.add(block(0.3, 0.3, 1.2, DARK, 0, 0, 0.6));
      ring(g, 0.55, 10, 0.16, STEEL, 1.4);
      const needle = block(0.12, 0.8, 0.12, 0xff5a5a, 0, 0.2, 1.4, glow(0xff3030));
      needle.rotation.z = 0.5;
      g.add(needle, block(0.12, 0.6, 0.12, 0xf4f6ff, 0, -0.2, 1.4));
      g.add(block(0.28, 0.28, 0.28, c, 0, 0, 1.4, glow(c)));
      break;
    }
    case "regla-luz": // Regla emisora con marcas
      g.add(block(0.4, 0.4, 0.6, DARK, 0, 0, 0.3), block(0.22, 0.5, 2.3, STEEL, 0, 0, 1.6), block(0.14, 0.2, 2.2, c, 0, 0.3, 1.6, glow(c)));
      for (let i = 0; i < 6; i++) g.add(block(0.3, 0.1, 0.08, 0x1d2b55, 0, 0.3, 0.7 + i * 0.35));
      break;
    case "faro-lactea": // Faro: columna, cabina y luz grande
      g.add(block(0.6, 0.5, 0.6, STEEL, 0, 0, 0.3), block(0.5, 0.5, 0.8, 0xf4f6ff, 0, 0, 0.9), block(0.5, 0.2, 0.8, 0xff6b6b, 0, 0, 0.9), block(0.9, 0.9, 0.9, c, 0, 0, 1.6, glow(c)), block(1.1, 0.12, 1.1, STEEL, 0, 0.5, 1.6), block(1.1, 0.12, 1.1, STEEL, 0, -0.5, 1.6));
      break;
    default: { // bumerán de plata: lanzador con una V plateada
      g.add(block(0.4, 0.4, 1.0, DARK, 0, 0, 0.5));
      const a = block(0.18, 0.34, 1.3, 0xdfe6ff, -0.4, 0, 1.4, glow(0x7d89b8));
      const b = block(0.18, 0.34, 1.3, 0xdfe6ff, 0.4, 0, 1.4, glow(0x7d89b8));
      a.rotation.y = 0.55;
      b.rotation.y = -0.55;
      g.add(a, b, block(0.3, 0.3, 0.3, c, 0, 0, 1.0, glow(c)));
    }
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
