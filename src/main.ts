import "./styles.css";
import { App } from "./ui/App";

const app = new App(document.getElementById("app")!);

if (import.meta.env.DEV) {
  // Acceso para depurar desde la consola durante el desarrollo.
  (window as unknown as { cruz: App }).cruz = app;
}
