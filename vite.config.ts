import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // APIキーはサーバー側（Code.gs）で管理されるため、環境変数の定義は不要
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
});
