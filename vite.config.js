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
        region: resolve(__dirname, 'region.html'),
        chat: resolve(__dirname, 'chat.html'),
        create: resolve(__dirname, 'create.html'),
        preview: resolve(__dirname, 'preview.html'),
        admin: resolve(__dirname, 'admin.html'),
        audit: resolve(__dirname, 'landbook-audit-working.html'),
      },
    },
  },
});
