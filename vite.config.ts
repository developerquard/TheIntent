import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 5173,
    allowedHosts: true,
  },

  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
  ],
});
