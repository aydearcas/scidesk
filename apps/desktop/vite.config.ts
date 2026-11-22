import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed port and does not want the screen cleared.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // the Rust side is not the page: watching its target/ folder (locked by cargo) made the
  // watcher miss changes of the page's own files
  server: {
    port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] },
    // the browser preview reaches Zotero's local API through the dev server (record 0052), as
    // a plain client: without the browser's own headers, and only the user's library
    proxy: {
      "/zotero-api/users/0/": {
        // changeOrigin: Zotero refuses a Host other than its own (protection against DNS rebinding)
        target: "http://127.0.0.1:23119", changeOrigin: true, rewrite: (p) => p.replace(/^\/zotero-api/, "/api"),
        configure: (proxy) => proxy.on("proxyReq", (req) => {
          for (const h of ["origin", "referer", "cookie", "user-agent", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"]) req.removeHeader(h);
        }),
      },
    },
  },
  build: { target: "es2022", sourcemap: true },
  optimizeDeps: { include: ["citeproc"] },
});
