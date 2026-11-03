import { describe, expect, it } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import App from '~/app.vue'

registerEndpoint('/api/me', () => {
  throw createError({ statusCode: 401, statusMessage: 'Sign in first' })
})

describe('signed-out visitors', () => {
  it('are sent to sign in and brought back to the page they asked for', async () => {
    await mountSuspended(App, { route: '/admin/invites' })

    expect(useRouter().currentRoute.value.fullPath).toBe(
      '/sign-in?redirect=/admin/invites',
    )
  })
  it.each(['/sign-up', '/forgot-password', '/reset-password?token=t'])(
    'can open %s without signing in',
    async route => {
      await mountSuspended(App, { route })

      expect(useRouter().currentRoute.value.fullPath).toBe(route)
    },
  )
})
