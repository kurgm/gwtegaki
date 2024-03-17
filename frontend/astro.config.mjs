import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://astro.build/config
export default defineConfig({
  site: "https://kurgm.github.io",
  base: "/gwtegaki/",
  vite: {
    plugins: [wasm(), topLevelAwait()],
  },
  integrations: [react()],
});
