import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ffmpeg.wasm requires SharedArrayBuffer, which needs cross-origin isolation headers
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  build: {
    target: "esnext",
  },
});
