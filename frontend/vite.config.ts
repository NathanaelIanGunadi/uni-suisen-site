import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        login: path.resolve(__dirname, "public", "login.html"),
        register: path.resolve(__dirname, "public", "register.html"),
        dashboard: path.resolve(__dirname, "public", "dashboard.html"),
        submissions: path.resolve(__dirname, "public", "submissions.html"),
        submission: path.resolve(__dirname, "public", "submission.html"),
        application: path.resolve(__dirname, "public", "application.html"),
      },
    },
  },
});
