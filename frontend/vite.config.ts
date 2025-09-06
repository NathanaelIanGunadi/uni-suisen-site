// frontend/vite.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        register: resolve(__dirname, "public/register.html"),
        login: resolve(__dirname, "public/login.html"),
        dashboard: resolve(__dirname, "public/dashboard.html"),
        // submissions: resolve(__dirname, "public/submissions.html"),
        // review: resolve(__dirname, "public/review.html"),
        application: resolve(__dirname, "public/application.html"),
      },
    },
  },
});
