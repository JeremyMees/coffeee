import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { submit, tid, type } from '../../fixtures'

const { social, signUpEmail } = vi.hoisted(() => ({
  social: vi.fn(),
  signUpEmail: vi.fn(),
}))

mockNuxtImport('authClient', () => ({
  signIn: { social },
  signUp: { email: signUpEmail },
}))

describe('invite page', () => {
  it('signs in with Google carrying the invite token', async () => {
    const page = await mountSuspended(App, { route: '/invite/the-token' })

    await page.get(tid('invite-google')).trigger('click')

    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        additionalData: { inviteToken: 'the-token' },
      }),
    )
  })
  it('creates a password account carrying the invite token', async () => {
    signUpEmail.mockResolvedValue({ data: {}, error: null })
    await mountSuspended(App, {
      route: '/invite/the-token',
      attachTo: document.body,
    })

    await type('sign-up-name', 'Tom')
    await type('sign-up-email', 'tom@example.com')
    await type('sign-up-password', 'a-long-password')
    await submit('sign-up-form')

    await vi.waitFor(() =>
      expect(signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tom@example.com',
          fetchOptions: { query: { inviteToken: 'the-token' } },
        }),
      ),
    )
  })
})
