import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [basicSsl()],
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
      },
    },
  },
});
