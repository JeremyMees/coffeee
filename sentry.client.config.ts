import * as Sentry from '@sentry/nuxt'

const { dsn, environment } = useRuntimeConfig().public.sentry

Sentry.init({
  dsn,
  environment,
  enabled: environment !== 'development',
  tracesSampleRate: 1.0,
})
