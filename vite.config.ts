/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'widget-template.html'],
      manifest: {
        name: 'Where Weather',
        short_name: 'WhereWeather',
        description: 'Weather verdicts for where you are.',
        theme_color: '#1e40af',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        lang: 'en',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: '내 위치 날씨',
            short_name: '내 위치',
            description: '현재 위치의 날씨를 확인합니다',
            url: '/?action=my-location',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
        widgets: [
          {
            name: 'Where Weather',
            short_name: '날씨',
            description: '현재 날씨 한눈에 보기',
            tag: 'weather-current',
            template: '/widget-template.html',
            data: '/widget-data.json',
            type: 'application/json',
            screenshots: [],
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            auth: false,
            update: 3600,
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
