import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("lucide") || id.includes("recharts") || id.includes("d3") || id.includes("framer-motion")) {
                return "vendor-heavy";
              }
              return "vendor";
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR ? false : { port: 24678, strictPort: false },
      watch: process.env.DISABLE_HMR ? null : {
        ignored: ['**/dist/**', '**/.system_generated/**'],
      },
    },
  };
});
