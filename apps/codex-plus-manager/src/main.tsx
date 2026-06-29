import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { App } from "./App";
import "./styles.css";

/* ── Bundled fonts (offline, no Google Fonts request) ──
     Fontsource packages ship woff2 files that Vite bundles into dist/.
     CSS @font-face declarations are injected at build time.              */
import "@fontsource/inter";
import "@fontsource/jetbrains-mono";

const app = document.getElementById("app");

const revealMainWindow = () => {
  if (!("__TAURI_INTERNALS__" in window)) return;
  window.requestAnimationFrame(() => {
    const currentWindow = getCurrentWindow();
    currentWindow.show()
      .then(() => currentWindow.setFocus())
      .catch(() => {});
  });
};

if (app instanceof HTMLElement) {
  createRoot(app).render(<App />);
  revealMainWindow();
}
