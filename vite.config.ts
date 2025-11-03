import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        // Target older syntax so Apps Script's sandboxed runtime can execute it safely.
        target: 'es2017',
        // Produce a single JS bundle so the postbuild inliner can embed everything for GAS.
        cssCodeSplit: false,
        assetsInlineLimit: 100000000, // inline small assets into the bundle
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            manualChunks: undefined,
            format: 'iife',
            entryFileNames: 'assets/index-[hash].js',
            name: 'AppBundle'
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
