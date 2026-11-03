import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import PasswordSignInForm from '~/components/PasswordSignInForm.vue'
import { byTestId, submit, type } from '../fixtures'

const { email, navigate } = vi.hoisted(() => ({
  email: vi.fn(),
  navigate: vi.fn(),
}))

mockNuxtImport('authClient', () => ({ signIn: { email } }))
mockNuxtImport('navigateTo', () => navigate)

async function signIn(password = 'a-long-password') {
  await mountSuspended(PasswordSignInForm, {
    props: { redirect: '/admin/invites' },
    attachTo: document.body,
  })

  await type('sign-in-email', 'Tom@Example.com')
  await type('sign-in-password', password)
  await submit('sign-in-form')
}

describe('PasswordSignInForm', () => {
  it('signs in and goes to the page that was asked for', async () => {
    email.mockResolvedValue({ data: {}, error: null })

    await signIn()

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/admin/invites'),
    )
    expect(email).toHaveBeenCalledWith({
      email: 'tom@example.com',
      password: 'a-long-password',
      callbackURL: '/admin/invites',
    })
  })

  it('asks for a password before signing in', async () => {
    await signIn('')

    await vi.waitFor(() =>
      expect(byTestId('sign-in-form')?.textContent).toContain(
        'Enter your password',
      ),
    )
    expect(email).not.toHaveBeenCalled()
  })

  it('says when the email and password do not match', async () => {
    email.mockResolvedValue({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD' },
    })

    await signIn()

    await vi.waitFor(() =>
      expect(byTestId('sign-in-form-error')?.textContent).toContain(
        "That email and password don't match.",
      ),
    )
  })

  it('asks to confirm the email when it was not confirmed yet', async () => {
    email.mockResolvedValue({
      data: null,
      error: { code: 'EMAIL_NOT_VERIFIED' },
    })

    await signIn()

    await vi.waitFor(() =>
      expect(byTestId('sign-in-unverified')?.textContent).toContain(
        'Confirm your email first',
      ),
    )
    expect(byTestId('sign-in-form-error')).toBeNull()
  })
})
