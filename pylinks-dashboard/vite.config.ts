import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    // ✅ Correct fallback setup for React Router
    fs: {
      strict: false,
    },
    middlewareMode: false, // Ensure SPA fallback works in dev
  },
  // ✅ For build-time fallback (useful for Vercel/Netlify)
  build: {
    outDir: "dist",
  },
  // ✅ Vite automatically supports SPA fallback for dev server,
  // but if deploying manually, create a `_redirects` or `vercel.json`.
});