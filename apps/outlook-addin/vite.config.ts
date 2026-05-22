import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// DEFLUFF_ADDIN_BASE_PATH lets CI build with a subpath prefix for GitHub Pages
// (e.g. /defluff/). Local dev leaves it unset so assets resolve at /.
const basePath = process.env.DEFLUFF_ADDIN_BASE_PATH ?? '/';

export default defineConfig(({ command }) => ({
  base: basePath,
  plugins: command === 'serve' ? [basicSsl()] : [],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, 'src/taskpane/index.html'),
        commands: resolve(__dirname, 'src/commands/commands.html'),
        playground: resolve(__dirname, 'playground/index.html'),
      },
    },
  },
}));
