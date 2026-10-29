/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// BASE_PATH is set by the GitHub Pages workflow to "/<repo>/".
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
