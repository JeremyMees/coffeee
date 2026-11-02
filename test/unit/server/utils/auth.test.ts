import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuth, useAuth } from '#server/utils/auth'
import { createInviteLink, inviteEmail } from '#server/utils/invites'
import { listShelves } from '#server/utils/shelves'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { runtimeConfig } from '#test/support/nitro'

const current = vi.hoisted(() => ({
  db: undefined as unknown,
  oauthState: undefined as
    { additionalData?: Record<string, unknown> } | undefined,
}))

vi.mock('#server/utils/db', () => ({ useDb: () => current.db }))

vi.mock('better-auth/api', async importOriginal => ({
  ...(await importOriginal<object>()),
  getOAuthState: async () => {
    if (!current.oauthState) throw new Error('No OAuth state outside a request')

    return current.oauthState
  },
}))

beforeEach(() => {
  current.oauthState = undefined
})

async function setup() {
  const { db } = await createTestDatabase()
  const auth = createAuth({
    db,
    secret: 'a-test-secret-that-is-long-enough-to-use',
    productionUrl: 'http://localhost:3000',
    adminEmail: 'jeremy@example.com',
    google: { clientId: 'google-id', clientSecret: 'google-secret' },
  })
  const context = await auth.$context

  function signUpWithGoogle(email: string) {
    return context.internalAdapter.createOAuthUser(
      { name: 'Someone', email, emailVerified: true },
      { providerId: 'google', accountId: crypto.randomUUID() },
    )
  }

  return { db, signUpWithGoogle }
}

describe('signing up', () => {
  it('refuses someone without an invite', async () => {
    const { signUpWithGoogle } = await setup()

    await expect(signUpWithGoogle('stranger@example.com')).rejects.toThrow(
      'You need an invite to join Coffeee',
    )
  })

  it('lets an invited email in as a regular user', async () => {
    const { db, signUpWithGoogle } = await setup()
    const admin = await createTestUser(db, { role: 'admin' })
    await inviteEmail(db, { email: 'sarah@example.com', createdBy: admin.id })

    const { user } = await signUpWithGoogle('Sarah@example.com')

    expect(user).toMatchObject({ email: 'sarah@example.com', role: 'user' })
  })

  it('lets someone in with an invite link', async () => {
    const { db, signUpWithGoogle } = await setup()
    const admin = await createTestUser(db, { role: 'admin' })
    const { token } = await createInviteLink(db, { createdBy: admin.id })
    current.oauthState = { additionalData: { inviteToken: token } }

    const { user } = await signUpWithGoogle('tom@example.com')

    expect(user).toMatchObject({ email: 'tom@example.com', role: 'user' })
  })

  it('ignores an invite token that is not text', async () => {
    const { signUpWithGoogle } = await setup()
    current.oauthState = { additionalData: { inviteToken: 42 } }

    await expect(signUpWithGoogle('tom@example.com')).rejects.toThrow(
      'You need an invite to join Coffeee',
    )
  })

  it('gives a new user a shelf of their own', async () => {
    const { db, signUpWithGoogle } = await setup()

    const { user } = await signUpWithGoogle('jeremy@example.com')

    expect(await listShelves(db, user.id)).toEqual([
      { id: expect.any(String), name: "Someone's shelf", ownerId: user.id },
    ])
  })

  it('lets the admin email in without an invite, as an admin', async () => {
    const { signUpWithGoogle } = await setup()

    const { user } = await signUpWithGoogle('Jeremy@example.com')

    expect(user).toMatchObject({ email: 'jeremy@example.com', role: 'admin' })
  })
})

describe('the app auth instance', () => {
  it('uses the runtime config and is created once', async () => {
    current.db = (await createTestDatabase()).db
    Object.assign(runtimeConfig, {
      betterAuthSecret: 'a-test-secret-that-is-long-enough-to-use',
      productionUrl: 'http://localhost:3000',
      adminEmail: 'owner@example.com',
      googleClientId: 'google-id',
      googleClientSecret: 'google-secret',
    })

    const auth = useAuth()
    const context = await auth.$context
    const { user } = await context.internalAdapter.createOAuthUser(
      { name: 'Owner', email: 'owner@example.com', emailVerified: true },
      { providerId: 'google', accountId: crypto.randomUUID() },
    )

    expect(user).toMatchObject({ role: 'admin' })
    expect(useAuth()).toBe(auth)
  })
})
