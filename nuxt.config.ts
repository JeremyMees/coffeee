export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/a11y',
    '@nuxt/hints',
    '@nuxt/test-utils/module',
  ],

  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },
})
