// Developed By DeveloperQuard
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(({ mode }) => ({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },

  resolve: {
    tsconfigPaths: true,
  },

  build: {
    outDir: ".output",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'tanstack-vendor';
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'radix-vendor';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          if (id.includes('node_modules/three/')) {
            return 'three-vendor';
          }
          if (id.includes('node_modules/clsx/') || id.includes('node_modules/tailwind-merge/') || id.includes('node_modules/class-variance-authority/')) {
            return 'utils-vendor';
          }
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-router'],
  },

  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
  ],
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
}));
