import * as Sentry from '@sentry/nuxt'

const environment = process.env.VERCEL_ENV ?? 'development'

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment,
  enabled: environment !== 'development',
  tracesSampleRate: 1.0,
})
