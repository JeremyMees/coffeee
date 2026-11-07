import { afterAll, afterEach, beforeEach, vi } from 'vitest'
import { config, enableAutoUnmount } from '@vue/test-utils'
import { useQueryClient } from '@tanstack/vue-query'
import type { Email } from '#server/types/email'
import { useNuxtApp } from '#imports'

vi.mock('nitropack/runtime', () => import('#test/support/nitro'))

const waitFor = vi.waitFor

vi.waitFor = (callback, options) =>
  waitFor(callback, {
    timeout: 5000,
    ...(typeof options === 'number' ? { timeout: options } : options),
  })

vi.mock('#server/utils/db', async () => {
  const { server } = await import('#test/nuxt/server-state')

  return { useDb: () => server.db }
})

vi.mock('#server/utils/auth', async importOriginal => {
  const { server } = await import('#test/nuxt/server-state')

  return {
    ...(await importOriginal<object>()),
    useAuth: () => server.auth!.auth,
  }
})

vi.mock('#server/utils/email', async importOriginal => {
  const { server } = await import('#test/nuxt/server-state')

  return {
    ...(await importOriginal<object>()),
    sendEmail: async (email: Email) => {
      server.outbox.push(email)
    },
  }
})

afterEach(async () => {
  const { releaseHeldRequests, settleRequests } =
    await import('#test/nuxt/server')
  releaseHeldRequests()
  await settleRequests()
})

enableAutoUnmount(afterEach)

config.global.stubs = {
  ...config.global.stubs,
  ConsentRoot: true,
  ConsentDialogLink: true,
}

beforeEach(async () => {
  const { resetServer } = await import('#test/nuxt/server')
  await resetServer()
  useNuxtApp().vueApp.runWithContext(() => useQueryClient().clear())
})

afterAll(async () => {
  const { settleRequests } = await import('#test/nuxt/server')
  const { closeTestDatabase } = await import('#test/support/database')
  await settleRequests()
  await closeTestDatabase()
})
