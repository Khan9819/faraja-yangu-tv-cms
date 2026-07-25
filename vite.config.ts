import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Farajatv CMS',
      short_name: 'Farajatv CMS',
      description: 'Farajatv CMS',
      theme_color: '#ffffff',
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  })],
  server: {
    proxy: {
      '/authentication': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/streaming': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/management': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/advertising': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/analytics': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/profile': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/media': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/media-proxy': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/website-posts': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
      '/categories-with-cover': {
        target: 'https://backend.farajayangutv.co.tz',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
