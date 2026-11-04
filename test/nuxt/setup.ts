import { afterAll, afterEach, beforeEach, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { useQueryClient } from '@tanstack/vue-query'
import type { Email } from '#server/types/email'
import { useNuxtApp } from '#imports'

vi.mock('nitropack/runtime', () => import('#test/support/nitro'))

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

enableAutoUnmount(afterEach)

beforeEach(async () => {
  const { resetServer } = await import('#test/nuxt/server')
  await resetServer()
  useNuxtApp().vueApp.runWithContext(() => useQueryClient().clear())
})

afterAll(async () => {
  const { closeTestDatabase } = await import('#test/support/database')
  await closeTestDatabase()
})
