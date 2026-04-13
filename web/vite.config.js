import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "../public",
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8002",
    },
  },
});
