import { describe, expect, it, vi } from 'vitest'
import {
  mockNuxtImport,
  mountSuspended,
  registerEndpoint,
} from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import App from '~/app.vue'
import { byTestId, click, currentPath, submit, tid, type } from '../../fixtures'
import { testUser } from '#test/fixtures/users'

const server = vi.hoisted(() => ({
  signedIn: false,
  accepted: [] as string[],
  declined: [] as string[],
}))

const { social, signUpEmail } = vi.hoisted(() => ({
  social: vi.fn(),
  signUpEmail: vi.fn(),
}))

mockNuxtImport('authClient', () => ({
  signIn: { social },
  signUp: { email: signUpEmail },
}))

registerEndpoint('/api/me', () => {
  if (!server.signedIn) throw createError({ statusCode: 401 })

  return testUser()
})

registerEndpoint('/api/me/invites', () => [])

registerEndpoint('/api/invites/link/shelf-token', () => ({
  shelfId: 'home-2',
  shelf: 'Home',
  invitedBy: 'Sarah',
}))

registerEndpoint('/api/invites/link/admin-token', () => ({
  shelfId: null,
  shelf: null,
  invitedBy: 'Jeremy',
}))

registerEndpoint('/api/invites/link/used-token', () => {
  throw createError({ statusCode: 404 })
})

registerEndpoint('/api/invites/link/shelf-token/accept', {
  method: 'POST',
  handler: () => {
    server.accepted.push('shelf-token')

    return { id: 'home-2', name: 'Home', ownerId: 'user-2' }
  },
})

registerEndpoint('/api/invites/link/shelf-token/decline', {
  method: 'POST',
  handler: () => {
    server.declined.push('shelf-token')

    return null
  },
})

function visit(token: string, signedIn = false) {
  server.signedIn = signedIn
  useCurrentUser().value = null

  return mountSuspended(App, {
    route: `/invite/${token}`,
    attachTo: document.body,
  })
}

describe('invite page', () => {
  it('names the shelf and who sent the invite', async () => {
    const page = await visit('shelf-token')

    expect(page.get(tid('invite-description')).text()).toContain(
      'Sarah invited you to their shelf Home',
    )
  })

  it('signs up with Google carrying the invite token, landing on the shelf', async () => {
    const page = await visit('shelf-token')

    await page.get(tid('invite-google')).trigger('click')

    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        callbackURL: '/invite/shelf-token',
        newUserCallbackURL: '/shelves/home-2',
        additionalData: { inviteToken: 'shelf-token' },
      }),
    )
  })

  it('creates a password account carrying the invite token', async () => {
    signUpEmail.mockResolvedValue({
      data: { user: { emailVerified: false } },
      error: null,
    })
    await visit('shelf-token')

    await type('sign-up-name', 'Tom')
    await type('sign-up-email', 'tom@example.com')
    await type('sign-up-password', 'a-long-password')
    await submit('sign-up-form')

    await vi.waitFor(() =>
      expect(signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tom@example.com',
          callbackURL: '/shelves/home-2',
          fetchOptions: { query: { inviteToken: 'shelf-token' } },
        }),
      ),
    )
  })

  it('lets someone with an account sign in and come back to answer', async () => {
    const page = await visit('shelf-token')

    expect(page.get(tid('invite-sign-in')).attributes('href')).toBe(
      '/sign-in?redirect=/invite/shelf-token',
    )
  })

  it('lets someone signed in join the shelf', async () => {
    server.accepted = []
    await visit('shelf-token', true)

    await click('invite-accept')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/home-2'))
    expect(server.accepted).toEqual(['shelf-token'])
    expect(useCurrentUser().value?.shelves).toContainEqual(
      expect.objectContaining({ id: 'home-2' }),
    )
  })

  it('lets someone signed in decline', async () => {
    server.declined = []
    await visit('shelf-token', true)

    await click('invite-decline')

    await vi.waitFor(() =>
      expect(currentPath()).not.toBe('/invite/shelf-token'),
    )
    expect(server.declined).toEqual(['shelf-token'])
  })

  it('tells someone signed in that an admin link is not for them', async () => {
    await visit('admin-token', true)

    expect(byTestId('invite-signed-in')?.textContent).toContain(
      'You already have an account.',
    )
    expect(byTestId('invite-accept')).toBeNull()
  })

  it('explains a link that no longer works', async () => {
    const page = await visit('used-token')

    expect(page.get(tid('invite-description')).text()).toContain(
      'This invite has expired or was already used.',
    )
    expect(page.find(tid('invite-google')).exists()).toBe(false)
  })
})
