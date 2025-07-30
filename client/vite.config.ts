import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // The config file already lives under /client so set root to current dir.
  root: resolve(__dirname, "."),
  publicDir: "public",
  resolve: {
    alias: {
      "@client": resolve(__dirname, "src"),
      "@server": resolve(__dirname, "../server/src"),
      "@shared": resolve(__dirname, "../shared"),
    },
  },
  build: {
    outDir: "../dist",
  },
  assetsInclude: ["**/*.png"],
});
