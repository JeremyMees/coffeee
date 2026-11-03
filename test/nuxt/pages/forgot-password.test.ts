import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { byTestId, submit, type } from '../fixtures'

const { requestPasswordReset } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}))

mockNuxtImport('authClient', () => ({ requestPasswordReset }))

async function askForLink(email: string) {
  await mountSuspended(App, {
    route: '/forgot-password',
    attachTo: document.body,
  })

  await type('forgot-email', email)
  await submit('forgot-form')
}

describe('forgot-password page', () => {
  it('emails a link back to the reset page', async () => {
    requestPasswordReset.mockResolvedValue({ data: {}, error: null })

    await askForLink('Tom@Example.com')

    await vi.waitFor(() =>
      expect(byTestId('forgot-sent')?.textContent).toContain(
        'If tom@example.com has a Coffeee account',
      ),
    )
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: 'tom@example.com',
      redirectTo: '/reset-password',
    })
  })

  it('explains an email that is not an email', async () => {
    await askForLink('nope')

    await vi.waitFor(() =>
      expect(byTestId('forgot-form')?.textContent).toContain(
        'Enter a valid email',
      ),
    )
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('shows why the link could not be sent', async () => {
    requestPasswordReset.mockResolvedValue({
      data: null,
      error: { message: 'Too many requests' },
    })

    await askForLink('tom@example.com')

    await vi.waitFor(() =>
      expect(byTestId('forgot-form-error')?.textContent).toContain(
        'Too many requests',
      ),
    )
  })
})
