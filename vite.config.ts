import { defineConfig } from "vite";

// Relative base keeps this working whether it's served from
// dakerboul.github.io/nbody-webgpu/ or a custom domain at the root.
export default defineConfig({
  base: "./",
  build: {
    target: "esnext",
  },
});
