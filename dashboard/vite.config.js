import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    // Allow Railway's generated *.up.railway.app domain (and any other host)
    // to hit the `vite preview` server used to serve the production build.
    allowedHosts: true,
  },
});
