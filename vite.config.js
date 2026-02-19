import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        onboard: resolve(__dirname, 'onboard.html'),
        passport: resolve(__dirname, 'passport.html'),
        directory: resolve(__dirname, 'directory.html'),
      },
    },
  },
});
