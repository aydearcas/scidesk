import { defineConfig } from "vite";
// Dictionaries (dicts/) and the WebAssembly build (rust-wasm/target/) are served as static files.
export default defineConfig({ server: { watch: { ignored: ["**/target/**", "**/private/**", "**/rust*/**"] } } });
