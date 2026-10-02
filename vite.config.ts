import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['stalindle.online'],
  },
  preview: {
    allowedHosts: ['stalindle.online'],
  },
});
