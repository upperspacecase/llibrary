import { resolve } from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        commons: resolve(__dirname, 'commons.html'),
        wiki: resolve(__dirname, 'wiki.html'),
        chat: resolve(__dirname, 'chat.html'),
        create: resolve(__dirname, 'create.html'),
        preview: resolve(__dirname, 'preview.html'),
        admin: resolve(__dirname, 'admin.html'),
        // Legacy pages
        onboard: resolve(__dirname, 'onboard.html'),
        passport: resolve(__dirname, 'passport.html'),
        directory: resolve(__dirname, 'directory.html'),
        audit: resolve(__dirname, 'landbook-audit-working.html'),
      },
    },
  },
});
