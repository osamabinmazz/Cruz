import { resolve } from "node:path";
import { defineConfig } from "vite";

/** Compilación aparte de la aventura 3D (Cruz del Sur 3.0): deja una página completa en dist/3.0/. */
export default defineConfig({
  root: resolve(__dirname, "3.0"),
  base: "./",
  publicDir: false,
  build: { outDir: resolve(__dirname, "dist/3.0"), emptyOutDir: true, chunkSizeWarningLimit: 1200 }
});
