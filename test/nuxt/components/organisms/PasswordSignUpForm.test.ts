import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import PasswordSignUpForm from '~/components/organisms/PasswordSignUpForm.vue'
import { byTestId, submit, type } from '../../fixtures'

const { email, signInEmail, navigate } = vi.hoisted(() => ({
  email: vi.fn(),
  signInEmail: vi.fn(),
  navigate: vi.fn(),
}))

mockNuxtImport('authClient', () => ({
  signUp: { email },
  signIn: { email: signInEmail },
}))
mockNuxtImport('navigateTo', () => navigate)

const unverified = { data: { user: { emailVerified: false } }, error: null }

async function signUp(inviteToken?: string, redirect?: string) {
  await mountSuspended(PasswordSignUpForm, {
    props: { inviteToken, redirect },
    attachTo: document.body,
  })

  await type('sign-up-name', 'Tom')
  await type('sign-up-email', 'Tom@Example.com')
  await type('sign-up-password', 'a-long-password')
  await submit('sign-up-form')
}

describe('PasswordSignUpForm', () => {
  it('creates the account and says where the confirmation went', async () => {
    email.mockResolvedValue(unverified)

    await signUp()

    await vi.waitFor(() =>
      expect(byTestId('sign-up-sent')?.textContent).toContain(
        "We've emailed a link to tom@example.com",
      ),
    )
    expect(email).toHaveBeenCalledWith({
      name: 'Tom',
      email: 'tom@example.com',
      password: 'a-long-password',
      callbackURL: '/',
      fetchOptions: { query: {} },
    })
  })

  it('carries the invite token along', async () => {
    email.mockResolvedValue(unverified)

    await signUp('the-token')

    await vi.waitFor(() =>
      expect(email).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchOptions: { query: { inviteToken: 'the-token' } },
        }),
      ),
    )
  })

  it('signs straight in when the invite link proved the email', async () => {
    email.mockResolvedValue({
      data: { user: { emailVerified: true } },
      error: null,
    })
    signInEmail.mockResolvedValue({ data: {}, error: null })

    await signUp('the-token', '/shelves/sarahs-shelf-home')

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/shelves/sarahs-shelf-home'),
    )
    expect(email).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: '/shelves/sarahs-shelf-home' }),
    )
    expect(signInEmail).toHaveBeenCalledWith({
      email: 'tom@example.com',
      password: 'a-long-password',
    })
    expect(byTestId('sign-up-sent')).toBeNull()
  })

  it('says why signing in after signing up failed', async () => {
    email.mockResolvedValue({
      data: { user: { emailVerified: true } },
      error: null,
    })
    signInEmail.mockResolvedValue({ data: null, error: { message: 'Locked' } })

    await signUp('the-token')

    await vi.waitFor(() =>
      expect(byTestId('sign-up-form-error')?.textContent).toContain('Locked'),
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('explains a short password before signing up', async () => {
    await mountSuspended(PasswordSignUpForm, { attachTo: document.body })

    await type('sign-up-name', 'Tom')
    await type('sign-up-email', 'tom@example.com')
    await type('sign-up-password', 'short')
    await submit('sign-up-form')

    await vi.waitFor(() =>
      expect(byTestId('sign-up-form')?.textContent).toContain(
        'Use at least 8 characters',
      ),
    )
    expect(email).not.toHaveBeenCalled()
  })

  it('says that Coffeee is invite-only for someone without an invite', async () => {
    email.mockResolvedValue({ data: null, error: { code: 'INVITE_REQUIRED' } })

    await signUp()

    await vi.waitFor(() =>
      expect(byTestId('sign-up-form-error')?.textContent).toContain(
        'You need an invite to join Coffeee',
      ),
    )
    expect(byTestId('sign-up-sent')).toBeNull()
  })
})
