import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "frontend/public/index.html"),
        register: resolve(__dirname, "frontend/public/register.html"),
        login: resolve(__dirname, "frontend/public/login.html"),
        // …and so on…
      },
    },
  },
});
