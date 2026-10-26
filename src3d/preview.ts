import * as THREE from "three";
import { buildStudent, type LookOptions } from "./character";

/** Vista previa del estudiante que da vueltas, para elegir cómo se ve. Tiene su propio lienzo pequeño. */
export class Preview {
  readonly canvas = document.createElement("canvas");
  private readonly renderer: THREE.WebGLRenderer | null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 0.8, 0.1, 50);
  private model: THREE.Object3D | null = null;
  private raf = 0;
  private yaw = 0.5;

  constructor() {
    this.canvas.className = "preview";
    this.canvas.width = 240;
    this.canvas.height = 300;
    let r: THREE.WebGLRenderer | null = null;
    try {
      r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      r.setSize(240, 300, false);
    } catch {
      r = null;
    }
    this.renderer = r;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8896c8, 1.5), new THREE.DirectionalLight(0xffffff, 1.4));
    this.camera.position.set(0, 3.0, 8.2);
    this.camera.lookAt(0, 1.7, 0);
    const loop = () => {
      this.yaw += 0.012;
      if (this.model) this.model.rotation.y = this.yaw;
      this.renderer?.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  setLook(look: LookOptions): void {
    if (this.model) this.scene.remove(this.model);
    const rig = buildStudent(look);
    this.model = rig.group;
    this.scene.add(rig.group);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.renderer?.dispose();
  }
}
