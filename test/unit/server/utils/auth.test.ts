import type { GoogleProfile } from 'better-auth/social-providers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Email } from '#server/types/email'
import { user as userTable } from '#server/db/schemas'
import { createAuth, useAuth } from '#server/utils/auth'
import {
  createInviteLink,
  inviteEmail,
  inviteToShelf,
} from '#server/utils/invites'
import { listNotifications, setEmailedKinds } from '#server/utils/notifications'
import { createShelf, listShelves } from '#server/utils/shelves'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { runtimeConfig } from '#test/support/nitro'

const current = vi.hoisted(() => ({
  db: undefined as unknown,
  sent: [] as Email[],
  oauthState: undefined as
    { additionalData?: Record<string, unknown> } | undefined,
}))

vi.mock('#server/utils/db', () => ({ useDb: () => current.db }))

vi.mock('#server/utils/email', () => ({
  sendEmail: async (email: Email) => {
    current.sent.push(email)
  },
}))

vi.mock('better-auth/api', async importOriginal => ({
  ...(await importOriginal<object>()),
  getOAuthState: async () => {
    if (!current.oauthState) throw new Error('No OAuth state outside a request')

    return current.oauthState
  },
}))

beforeEach(() => {
  current.oauthState = undefined
  current.sent = []
})

async function setup() {
  const { db } = await createTestDatabase()
  const auth = createAuth({
    db,
    secret: 'a-test-secret-that-is-long-enough-to-use',
    productionUrl: 'http://localhost:3000',
    adminEmail: 'jeremy@example.com',
    google: {
      clientId: 'google-id',
      clientSecret: 'google-secret',
      verifyIdToken: async () => true,
      getUserInfo: async ({ idToken }) => ({
        user: {
          name: 'Someone',
          email: idToken!,
          emailVerified: true,
        },
        data: { sub: `google-${idToken}` } as GoogleProfile,
      }),
    },
  })
  const context = await auth.$context

  function signUpWithGoogle(email: string) {
    return context.internalAdapter.createOAuthUser(
      { name: 'Someone', email, emailVerified: true },
      { providerId: 'google', accountId: crypto.randomUUID() },
    )
  }

  function signUpWithPassword(email: string, inviteToken?: string) {
    return auth.api.signUpEmail({
      body: { name: 'Sarah', email, password: 'a-long-password' },
      query: inviteToken ? { inviteToken } : undefined,
    })
  }

  function signInWithPassword(email: string, password = 'a-long-password') {
    return auth.api.signInEmail({ body: { email, password } })
  }

  function signInWithGoogle(email: string) {
    return auth.api.signInSocial({
      body: { provider: 'google', idToken: { token: email } },
    })
  }

  async function followLink(link: string) {
    return auth.handler(new Request(link))
  }

  return {
    auth,
    db,
    signUpWithGoogle,
    signUpWithPassword,
    signInWithPassword,
    signInWithGoogle,
    followLink,
  }
}

async function invite(db: Awaited<ReturnType<typeof setup>>['db']) {
  const admin = await createTestUser(db, { role: 'admin' })

  return { admin, ...(await createInviteLink(db, { createdBy: admin.id })) }
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

describe('signing up with a password', () => {
  it('lets an invited email create an account', async () => {
    const { db, signUpWithPassword } = await setup()
    const admin = await createTestUser(db, { role: 'admin' })
    await inviteEmail(db, { email: 'sarah@example.com', createdBy: admin.id })

    const { user } = await signUpWithPassword('Sarah@example.com')

    expect(user).toMatchObject({
      email: 'sarah@example.com',
      emailVerified: false,
    })
    expect(await listShelves(db, user.id)).toEqual([
      expect.objectContaining({ name: "Sarah's shelf" }),
    ])
  })

  it('lets someone in with an invite link', async () => {
    const { db, signUpWithPassword } = await setup()
    const { token } = await invite(db)

    const { user } = await signUpWithPassword('tom@example.com', token)

    expect(user).toMatchObject({ email: 'tom@example.com' })
  })

  it('refuses someone without an invite and emails nothing', async () => {
    const { db, signUpWithPassword } = await setup()

    await expect(
      signUpWithPassword('stranger@example.com'),
    ).rejects.toMatchObject({
      body: {
        code: 'INVITE_REQUIRED',
        message: 'You need an invite to join Coffeee',
      },
    })
    expect(await db.select().from(userTable)).toEqual([])
    expect(current.sent).toEqual([])
  })

  it('emails a link to confirm the address', async () => {
    const { db, signUpWithPassword } = await setup()
    const { token } = await invite(db)

    await signUpWithPassword('tom@example.com', token)

    expect(current.sent).toEqual([
      {
        to: 'tom@example.com',
        subject: 'Confirm your email for Coffeee',
        template: 'VerifyEmail',
        values: {
          name: 'Sarah',
          link: expect.stringMatching(
            /^http:\/\/localhost:3000\/api\/auth\/verify-email\?token=/,
          ),
        },
      },
    ])
  })

  it('refuses to sign in until the email is confirmed, and emails the link again', async () => {
    const { db, signUpWithPassword, signInWithPassword } = await setup()
    const { token } = await invite(db)
    await signUpWithPassword('tom@example.com', token)

    await expect(signInWithPassword('tom@example.com')).rejects.toMatchObject({
      body: { code: 'EMAIL_NOT_VERIFIED' },
    })
    expect(current.sent).toHaveLength(2)
    expect(current.sent[1]).toMatchObject({
      to: 'tom@example.com',
      template: 'VerifyEmail',
    })
  })

  it('signs in once the emailed link is followed', async () => {
    const { db, signUpWithPassword, signInWithPassword, followLink } =
      await setup()
    const { token } = await invite(db)
    await signUpWithPassword('tom@example.com', token)

    const confirmed = await followLink(current.sent[0]!.values.link)
    const { user } = await signInWithPassword('tom@example.com')

    expect(confirmed.status).toBe(302)
    expect(confirmed.headers.get('set-cookie')).toContain('session_token')
    expect(user).toMatchObject({
      email: 'tom@example.com',
      emailVerified: true,
    })
  })
})

describe('resetting a forgotten password', () => {
  async function confirmedUser() {
    const found = await setup()
    const { token } = await invite(found.db)
    await found.signUpWithPassword('tom@example.com', token)
    await found.followLink(current.sent[0]!.values.link)
    current.sent = []

    return found
  }

  it('emails a link to pick a new password', async () => {
    const { auth } = await confirmedUser()

    await auth.api.requestPasswordReset({
      body: { email: 'tom@example.com', redirectTo: '/reset-password' },
    })

    expect(current.sent).toEqual([
      {
        to: 'tom@example.com',
        subject: 'Reset your Coffeee password',
        template: 'ResetPassword',
        values: {
          name: 'Sarah',
          link: expect.stringMatching(
            /^http:\/\/localhost:3000\/api\/auth\/reset-password\/[\w-]+\?callbackURL=%2Freset-password$/,
          ),
        },
      },
    ])
  })

  it('emails nothing for an address without an account', async () => {
    const { auth } = await confirmedUser()

    await auth.api.requestPasswordReset({
      body: { email: 'nobody@example.com', redirectTo: '/reset-password' },
    })

    expect(current.sent).toEqual([])
  })

  it('signs in with the new password from the emailed link', async () => {
    const { auth, followLink, signInWithPassword } = await confirmedUser()
    await auth.api.requestPasswordReset({
      body: { email: 'tom@example.com', redirectTo: '/reset-password' },
    })

    const opened = await followLink(current.sent[0]!.values.link)
    const token = new URL(
      opened.headers.get('location')!,
      'http://x',
    ).searchParams.get('token')!
    await auth.api.resetPassword({
      body: { token, newPassword: 'a-brand-new-password' },
    })

    await expect(signInWithPassword('tom@example.com')).rejects.toMatchObject({
      body: { code: 'INVALID_EMAIL_OR_PASSWORD' },
    })
    expect(
      await signInWithPassword('tom@example.com', 'a-brand-new-password'),
    ).toMatchObject({ user: { email: 'tom@example.com' } })
  })
})

describe('signing in with Google after signing up with a password', () => {
  it('reaches the same user once the email is confirmed', async () => {
    const { db, signUpWithPassword, followLink, signInWithGoogle } =
      await setup()
    const { token } = await invite(db)
    const { user } = await signUpWithPassword('tom@example.com', token)
    await followLink(current.sent[0]!.values.link)

    const google = await signInWithGoogle('tom@example.com')

    expect(google).toMatchObject({ user: { id: user.id } })
    expect(await db.select().from(userTable)).toHaveLength(2)
  })

  it('does not take over an account whose email is not confirmed', async () => {
    const { db, signUpWithPassword, signInWithGoogle } = await setup()
    const { token } = await invite(db)
    await signUpWithPassword('tom@example.com', token)

    await expect(signInWithGoogle('tom@example.com')).rejects.toMatchObject({
      body: { message: 'account not linked' },
    })
  })

  it('confirms the email of a password account by resetting its password', async () => {
    const { db, auth, signUpWithPassword, signInWithPassword } = await setup()
    const { token: link } = await invite(db)
    await signUpWithPassword('tom@example.com', link)
    current.sent = []
    await auth.api.requestPasswordReset({
      body: { email: 'tom@example.com', redirectTo: '/reset-password' },
    })
    const token = current.sent[0]!.values.link.match(
      /reset-password\/([\w-]+)/,
    )![1]!

    await auth.api.resetPassword({
      body: { token, newPassword: 'a-brand-new-password' },
    })

    expect(
      await signInWithPassword('tom@example.com', 'a-brand-new-password'),
    ).toMatchObject({ user: { emailVerified: true } })
  })

  it('lets a Google user also sign in with a password after a reset', async () => {
    const { db, auth, signUpWithGoogle, signInWithPassword } = await setup()
    const admin = await createTestUser(db, { role: 'admin' })
    await inviteEmail(db, { email: 'sarah@example.com', createdBy: admin.id })
    const { user } = await signUpWithGoogle('sarah@example.com')
    await auth.api.requestPasswordReset({
      body: { email: 'sarah@example.com', redirectTo: '/reset-password' },
    })
    const token = current.sent[0]!.values.link.match(
      /reset-password\/([\w-]+)/,
    )![1]!

    await auth.api.resetPassword({
      body: { token, newPassword: 'a-long-password' },
    })

    expect(await signInWithPassword('sarah@example.com')).toMatchObject({
      user: { id: user.id },
    })
  })
})

describe('signing up from a shelf invite', () => {
  async function shelfInvite(db: Awaited<ReturnType<typeof setup>>['db']) {
    const sarah = await createTestUser(db, { name: 'Sarah' })
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
    const result = await inviteToShelf(db, {
      shelfId: home.id,
      email: 'tom@example.com',
      createdBy: sarah.id,
    })

    if (result.outcome !== 'invited') throw new Error(result.outcome)

    return { home, token: result.token }
  }

  it('joins the shelf with Google and gets a shelf of their own', async () => {
    const { db, signUpWithGoogle } = await setup()
    const { home, token } = await shelfInvite(db)
    current.oauthState = { additionalData: { inviteToken: token } }

    const { user } = await signUpWithGoogle('tom@example.com')

    expect(await listShelves(db, user.id)).toEqual([
      expect.objectContaining({ name: "Someone's shelf", ownerId: user.id }),
      expect.objectContaining({ id: home.id, name: 'Home' }),
    ])
  })

  it('tells the members of the shelf that they joined', async () => {
    const { db, signUpWithGoogle } = await setup()
    const { home, token } = await shelfInvite(db)
    current.oauthState = { additionalData: { inviteToken: token } }

    const { user } = await signUpWithGoogle('tom@example.com')

    expect(await listNotifications(db, home.ownerId)).toMatchObject([
      { kind: 'memberJoined', shelfId: home.id, actor: user.name },
    ])
    expect(await listNotifications(db, user.id)).toEqual([])
  })

  it('emails the members who asked for it that they joined', async () => {
    const { db, signUpWithGoogle } = await setup()
    const { home, token } = await shelfInvite(db)
    await setEmailedKinds(db, {
      userId: home.ownerId,
      emailed: ['memberJoined'],
    })
    current.oauthState = { additionalData: { inviteToken: token } }
    current.sent = []

    await signUpWithGoogle('tom@example.com')

    expect(current.sent).toMatchObject([
      {
        template: 'ShelfNotification',
        values: {
          link: `http://localhost:3000/shelves/home-${home.id}`,
          settings: 'http://localhost:3000/profile?tab=notifications',
        },
      },
    ])
  })

  it('joins the shelf with Google from the invited email, without the link', async () => {
    const { db, signUpWithGoogle } = await setup()
    const { home } = await shelfInvite(db)

    const { user } = await signUpWithGoogle('tom@example.com')

    expect(await listShelves(db, user.id)).toContainEqual(
      expect.objectContaining({ id: home.id }),
    )
  })

  it('joins with a password and signs in at once, since the link proved the email', async () => {
    const { db, signUpWithPassword, signInWithPassword } = await setup()
    const { home, token } = await shelfInvite(db)

    const { user } = await signUpWithPassword('tom@example.com', token)
    const signedIn = await signInWithPassword('tom@example.com')

    expect(user).toMatchObject({ emailVerified: true })
    expect(signedIn).toMatchObject({ user: { id: user.id } })
    expect(current.sent).toEqual([])
    expect(await listShelves(db, user.id)).toContainEqual(
      expect.objectContaining({ id: home.id }),
    )
  })

  it('still asks to confirm an email the link was not sent to', async () => {
    const { db, signUpWithPassword } = await setup()
    const { home, token } = await shelfInvite(db)

    const { user } = await signUpWithPassword('anna@example.com', token)

    expect(user).toMatchObject({ emailVerified: false })
    expect(current.sent).toEqual([
      expect.objectContaining({
        to: 'anna@example.com',
        template: 'VerifyEmail',
      }),
    ])
    expect(await listShelves(db, user.id)).toContainEqual(
      expect.objectContaining({ id: home.id }),
    )
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
