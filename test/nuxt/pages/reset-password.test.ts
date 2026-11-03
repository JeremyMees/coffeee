import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { byTestId, currentPath, submit, type } from '../fixtures'

const { resetPassword } = vi.hoisted(() => ({ resetPassword: vi.fn() }))

mockNuxtImport('authClient', () => ({ resetPassword }))

async function pickPassword(password: string) {
  await mountSuspended(App, {
    route: '/reset-password?token=the-token',
    attachTo: document.body,
  })

  await type('reset-password', password)
  await submit('reset-form')
}

describe('reset-password page', () => {
  it('saves the new password and sends people to sign in with it', async () => {
    resetPassword.mockResolvedValue({ data: {}, error: null })

    await pickPassword('a-brand-new-password')

    await vi.waitFor(() => expect(currentPath()).toBe('/sign-in'))
    expect(byTestId('sign-in-reset')?.textContent).toContain('Password changed')
    expect(resetPassword).toHaveBeenCalledWith({
      newPassword: 'a-brand-new-password',
      token: 'the-token',
    })
  })

  it('explains a password that is too short', async () => {
    await pickPassword('short')

    await vi.waitFor(() =>
      expect(byTestId('reset-form')?.textContent).toContain(
        'Use at least 8 characters',
      ),
    )
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('says when the link has expired', async () => {
    resetPassword.mockResolvedValue({
      data: null,
      error: { code: 'INVALID_TOKEN' },
    })

    await pickPassword('a-brand-new-password')

    await vi.waitFor(() =>
      expect(byTestId('reset-form-error')?.textContent).toContain(
        'This link has expired or was already used.',
      ),
    )
  })

  it('offers a new link when it was opened without a token', async () => {
    await mountSuspended(App, {
      route: '/reset-password?error=INVALID_TOKEN',
      attachTo: document.body,
    })

    expect(byTestId('reset-expired')?.textContent).toContain(
      "This link doesn't work anymore",
    )
    expect(byTestId('reset-form')).toBeNull()
  })
})
