import * as Sentry from '@sentry/nuxt'

const { dsn, environment } = useRuntimeConfig().public.sentry
const enabled = environment !== 'development'

Sentry.init({
  dsn,
  environment,
  enabled,
  ...(enabled && { tracesSampleRate: 1.0 }),
})
