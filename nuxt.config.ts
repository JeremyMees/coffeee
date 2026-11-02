import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/a11y',
    '@nuxt/hints',
    '@nuxt/test-utils/module',
    '@nuxt/fonts',
    '@vite-pwa/nuxt',
    'shadcn-nuxt',
  ],

  future: { compatibilityVersion: 5 },

  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  alias: {
    '#test': fileURLToPath(new URL('./test', import.meta.url)),
  },

  vite: { plugins: [tailwindcss()] },

  nitro: {
    typescript: {
      tsConfig: {
        include: ['../test/unit/**/*', '../test/support/**/*'],
      },
    },
  },

  runtimeConfig: {
    databaseUrl: '',
    betterAuthSecret: '',
    productionUrl: '',
    adminEmail: '',
    googleClientId: '',
    googleClientSecret: '',
  },

  shadcn: {
    prefix: '',
    componentDir: '~/components/ui',
  },

  fonts: {
    defaults: { subsets: ['latin', 'latin-ext'] },
    families: [
      { name: 'Inter', weights: [400, 600, 700] },
      { name: 'Space Mono', weights: [400, 700], styles: ['normal', 'italic'] },
      { name: 'Instrument Serif', styles: ['normal', 'italic'] },
    ],
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Coffeee',
      short_name: 'Coffeee',
      description: 'Your coffee shelf, and every coffee you ever bought.',
      theme_color: '#fffaf5',
      background_color: '#fffaf5',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/monochrome-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'monochrome',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,woff2,png,svg,ico}'],
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: ({ request, url }) =>
            request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
        },
      ],
    },
  },

  app: {
    viewTransition: true,
    head: {
      title: 'Coffeee',
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'theme-color', content: '#fffaf5' },
        { name: 'apple-mobile-web-app-title', content: 'Coffeee' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },
})
