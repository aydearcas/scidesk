import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed port and does not want the screen cleared.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // the Rust side is not the page: watching its target/ folder (locked by cargo) made the
  // watcher miss changes of the page's own files
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  build: { target: "es2022", sourcemap: true },
  optimizeDeps: { include: ["citeproc"] },
});
