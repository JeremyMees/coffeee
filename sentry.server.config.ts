import * as Sentry from '@sentry/nuxt'

const environment = process.env.VERCEL_ENV ?? 'development'
const untracedRate = 0.1

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment,
  enabled: environment !== 'development',
  tracesSampler: ({ name, normalizedRequest, inheritOrSampleWith }) => {
    const url = normalizedRequest?.url ?? name

    if (url.includes('/_vercel/ping')) return 0

    return inheritOrSampleWith(untracedRate)
  },
})
