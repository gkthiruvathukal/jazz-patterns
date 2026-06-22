import { defineConfig } from "vite";

// base: "./" keeps asset URLs relative so the static build works from any path
// (e.g. a future GitHub Pages subdirectory).
export default defineConfig({
  base: "./",
});
