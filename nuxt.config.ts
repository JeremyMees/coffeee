import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { blobHost } from './shared/utils/photos.ts'

const photoHost = blobHost(process.env)
const description = 'Your coffee shelf, and every coffee you ever bought.'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/a11y',
    '@nuxt/hints',
    '@nuxt/test-utils/module',
    '@nuxt/fonts',
    '@nuxt/image',
    '@vite-pwa/nuxt',
    'shadcn-nuxt',
    '@maizzle/nuxt',
  ],

  future: { compatibilityVersion: 5 },

  compatibilityDate: '2025-07-15',

  experimental: {
    viewTransition: true,
  },

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  alias: {
    '#test': fileURLToPath(new URL('./test', import.meta.url)),
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        '@internationalized/date',
        '@lucide/vue',
        '@tanstack/vue-query',
        '@vueuse/core',
        'better-auth/vue',
        'class-variance-authority',
        'cn',
        'reka-ui',
        'reka-ui/date',
        'vee-validate',
        'zod',
      ],
    },
  },

  $development: {
    nitro: { experimental: { tasks: true } },
  },

  nitro: {
    storage: {
      photos: { driver: 'fs', base: './.data/photos' },
    },
    typescript: {
      tsConfig: {
        include: [
          '../test/unit/server/**/*',
          '../test/unit/shared/**/*',
          '../test/support/**/*',
        ],
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
    plunkApiKey: '',
    emailFrom: '',
  },

  imports: { dirs: ['types/*.ts'] },

  typescript: {
    tsConfig: {
      include: ['../test/unit/app/**/*', '../test/fixtures/**/*'],
    },
  },

  components: [
    { path: '~/components/form', pathPrefix: false },
    '~/components',
  ],

  image: {
    provider: process.env.VERCEL ? 'vercel' : 'none',
    domains: photoHost ? [photoHost] : [],
  },

  maizzle: {
    content: ['app/emails/*.vue'],
    components: { source: ['app/emails/components'] },
    css: { base: 'app/emails' },
    static: { source: [] },
    plaintext: true,
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
      description,
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
    viewTransition: 'always',
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'Coffeee',
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'description', content: description },
        { name: 'theme-color', content: '#fffaf5' },
        { name: 'apple-mobile-web-app-title', content: 'Coffeee' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  hooks: {
    close: nuxt => {
      const analyze = nuxt.options.build.analyze
      const analyzing =
        analyze === true || (typeof analyze === 'object' && analyze.enabled)

      if (
        !nuxt.options.dev &&
        !nuxt.options.test &&
        !nuxt.options._prepare &&
        !analyzing
      ) {
        process.exit(0)
      }
    },
  },
})
