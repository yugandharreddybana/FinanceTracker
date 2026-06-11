import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env from project root (two levels up from packages/frontend)
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), 'VITE_');
  return {
    envDir: path.resolve(__dirname, '../..'),
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React runtime
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Animation library
            'vendor-motion': ['motion/react'],
            // Charts
            'vendor-charts': ['recharts'],
            // AI / markdown
            'vendor-ai': ['react-markdown'],
            // Icons
            'vendor-icons': ['lucide-react'],
          },
        },
      },
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
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5
                },
                cacheableResponse: {
                  statuses: [200]
                }
              }
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
      port: 5174,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/backend/**', '**/node_modules/**', '**/server/**'],
      },
    },
  };
});
