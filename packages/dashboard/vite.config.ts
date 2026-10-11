import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@zetasdk/sdk/dashboard": fileURLToPath(new URL("../sdk/src/dashboard.ts", import.meta.url)),
    },
  },
  build: {
    // One 950 kB chunk meant a judge waited through the whole app before the
    // landing page painted. Split the heavy vendors so the first route only
    // pulls what it needs.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          solana: ["@solana/web3.js"],
          fluent: ["@fluentui/react-components", "@fluentui/react-icons"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 4173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
