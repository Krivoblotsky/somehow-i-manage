import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, type Plugin } from 'vitest/config';

// GitHub Pages serves project sites under /<repo>/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

/**
 * Static pages under public/<name>/index.html are reachable as /<name>/ in production (GitHub
 * Pages, `vite preview`); the dev server would hand those URLs to the app instead. Match it.
 */
function staticPages(names: string[]): Plugin {
  return {
    name: 'static-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        for (const name of names) {
          if (path === `${base}${name}` || path === `${base}${name}/`) {
            req.url = `${base}${name}/index.html`;
            break;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    staticPages(['privacy']),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Somehow I Manage',
        short_name: 'Somehow',
        description: 'Work with people, not tasks. A people-first task manager for managers.',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#1c1c1e',
        theme_color: '#1c1c1e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        // static pages next to the app (public/privacy) are real documents, not app routes
        navigateFallbackDenylist: [/^\/privacy/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Tests run local-only whatever a developer's .env.local says; sync is tested with fakes.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/test/**', 'src/**/*.test.*', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
