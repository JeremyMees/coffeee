import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import PasswordSignUpForm from '~/components/PasswordSignUpForm.vue'
import { byTestId, submit, type } from '../fixtures'

const { email } = vi.hoisted(() => ({ email: vi.fn() }))

mockNuxtImport('authClient', () => ({ signUp: { email } }))

async function signUp(inviteToken?: string) {
  await mountSuspended(PasswordSignUpForm, {
    props: { inviteToken },
    attachTo: document.body,
  })

  await type('sign-up-name', 'Tom')
  await type('sign-up-email', 'Tom@Example.com')
  await type('sign-up-password', 'a-long-password')
  await submit('sign-up-form')
}

describe('PasswordSignUpForm', () => {
  it('creates the account and says where the confirmation went', async () => {
    email.mockResolvedValue({ data: {}, error: null })

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
    email.mockResolvedValue({ data: {}, error: null })

    await signUp('the-token')

    await vi.waitFor(() =>
      expect(email).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchOptions: { query: { inviteToken: 'the-token' } },
        }),
      ),
    )
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
