import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Trailing slash so /api.js (client module) is NOT proxied to the backend
      "/api/": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
