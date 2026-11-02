import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'

const { social } = vi.hoisted(() => ({ social: vi.fn() }))

mockNuxtImport('authClient', () => ({ signIn: { social } }))

describe('invite page', () => {
  it('signs in with Google carrying the invite token', async () => {
    const page = await mountSuspended(App, { route: '/invite/the-token' })

    await page.get('button').trigger('click')

    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        additionalData: { inviteToken: 'the-token' },
      }),
    )
  })
})
