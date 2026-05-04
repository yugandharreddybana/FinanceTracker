import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env from project root (two levels up from packages/frontend)
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');

  // M7: Warn during production builds if middleware URL is not configured
  if (mode === 'production' && !env.VITE_MIDDLEWARE_URL) {
    console.warn('[vite] WARNING: VITE_MIDDLEWARE_URL is not set. API calls will fail in production.');
  }

  return {
    envDir: path.resolve(__dirname, '../..'),
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Yugi Finance Tracker',
          short_name: 'Yugi',
          description: 'Advanced AI Financial Intelligence Platform',
          theme_color: '#050508',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/backend/**', '**/node_modules/**', '**/server/**'],
      },
    },
  };
});
