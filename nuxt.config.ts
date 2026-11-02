import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/a11y',
    '@nuxt/hints',
    '@nuxt/test-utils/module',
    '@nuxtjs/color-mode',
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

  colorMode: { classSuffix: '' },

  shadcn: {
    prefix: '',
    componentDir: '~/components/ui',
  },

  app: {
    head: {
      title: 'Coffeee',
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
      ],
    },
  },
})
