import { defineConfig } from 'vite'

export default defineConfig({
  preview: {
    port: 3000,
    host: '127.0.0.1',
    allowedHosts: ['stalindle.online', 'www.stalindle.online']
  }
})
