import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * VOID TYPER — Vite configuration.
 *
 * `base: './'` emits RELATIVE asset paths, so the production build works:
 *   • on GitHub Pages project sites  (https://USERNAME.github.io/REPO-NAME/)
 *   • on user sites                  (https://USERNAME.github.io/)
 *   • on any sub-path or local static server — no config edits needed.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
