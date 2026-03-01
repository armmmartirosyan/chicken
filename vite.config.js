import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(), // This handles the inlining of JS and CSS
  ],
  build: {
    // Force all assets (images, fonts, etc.) to be inlined as base64
    // regardless of their file size.
    assetsInlineLimit: 100000000, // 100MB limit
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true, // Disables code splitting
      },
    },
  },
});
