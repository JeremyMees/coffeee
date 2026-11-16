import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser, useRouter } from '#imports'

beforeEach(() => {
  useCurrentUser().value = null
})

describe('signed-out visitors', () => {
  it('are sent to sign in and brought back to the page they asked for', async () => {
    await mountSuspended(App, { route: '/admin/invites' })

    expect(useRouter().currentRoute.value.fullPath).toBe(
      '/sign-in?redirect=/admin/invites',
    )
  })

  it.each(['/?add=coffee', '/notifications'])(
    'are brought back to the %s shortcut after signing in',
    async route => {
      await mountSuspended(App, { route })

      const current = useRouter().currentRoute.value

      expect(current.path).toBe('/sign-in')
      expect(current.query.redirect).toBe(route)
    },
  )

  it.each(['/sign-up', '/forgot-password', '/reset-password?token=t'])(
    'can open %s without signing in',
    async route => {
      await mountSuspended(App, { route })

      expect(useRouter().currentRoute.value.fullPath).toBe(route)
    },
  )
})
