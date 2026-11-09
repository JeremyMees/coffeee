import { describe, expect, it, vi } from 'vitest'
import {
  acceptInvite,
  cancelShelfInvite,
  claimInvites,
  createInviteLink,
  declineInvite,
  findInviteByToken,
  inviteEmail,
  inviteToShelf,
  joinInvitedShelves,
  listInvitesFor,
  listPendingInvites,
  listShelfInvites,
  revokeInvite,
} from '#server/utils/invites'
import { shelfMember } from '#server/db/schemas'
import { listNotifications } from '#server/utils/notifications'
import { createShelf, listShelves } from '#server/utils/shelves'
import { createTestDatabase, createTestUser } from '#test/support/database'
import type { TestDatabase } from '#test/support/types'
import { testOrigin } from '#test/support/origin'

async function claimInvite(
  db: TestDatabase,
  input: { email: string; token?: string },
) {
  const { invites } = await claimInvites(db, input)

  return invites[0]
}

async function setup() {
  const { db } = await createTestDatabase()
  const admin = await createTestUser(db, { role: 'admin' })

  return { db, admin }
}

describe('invites', () => {
  it('lets an allowed email claim its invite', async () => {
    const { db, admin } = await setup()
    await inviteEmail(db, { email: 'sarah@example.com', createdBy: admin.id })

    const claimed = await claimInvite(db, { email: 'sarah@example.com' })

    expect(claimed?.email).toBe('sarah@example.com')
  })

  it('matches an allowed email regardless of case', async () => {
    const { db, admin } = await setup()
    await inviteEmail(db, { email: 'Sarah@Example.com', createdBy: admin.id })

    const claimed = await claimInvite(db, { email: 'SARAH@example.COM' })

    expect(claimed).toBeDefined()
  })

  it('lets an allowed email claim its invite only once', async () => {
    const { db, admin } = await setup()
    await inviteEmail(db, { email: 'sarah@example.com', createdBy: admin.id })
    await claimInvite(db, { email: 'sarah@example.com' })

    const second = await claimInvite(db, { email: 'sarah@example.com' })

    expect(second).toBeUndefined()
  })

  it('refuses someone who was never invited', async () => {
    const { db } = await setup()

    const claimed = await claimInvite(db, { email: 'stranger@example.com' })

    expect(claimed).toBeUndefined()
  })

  it('lets anyone with a link claim it once', async () => {
    const { db, admin } = await setup()
    const { token } = await createInviteLink(db, { createdBy: admin.id })

    const first = await claimInvite(db, { email: 'sarah@example.com', token })
    const second = await claimInvite(db, { email: 'tom@example.com', token })

    expect(first?.usedBy).toBe('sarah@example.com')
    expect(second).toBeUndefined()
  })

  it('refuses a link after seven days', async () => {
    const { db, admin } = await setup()
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-11-01T10:00:00Z'),
    })
    const { token } = await createInviteLink(db, { createdBy: admin.id })
    vi.setSystemTime(new Date('2026-11-08T10:00:01Z'))

    const claimed = await claimInvite(db, { email: 'sarah@example.com', token })

    vi.useRealTimers()
    expect(claimed).toBeUndefined()
  })

  it('refuses to invite an email that already has a pending invite', async () => {
    const { db, admin } = await setup()
    await inviteEmail(db, { email: 'sarah@example.com', createdBy: admin.id })

    const again = await inviteEmail(db, {
      email: 'Sarah@example.com',
      createdBy: admin.id,
    })

    expect(again).toBeUndefined()
  })

  it('lists only pending invites', async () => {
    const { db, admin } = await setup()
    await inviteEmail(db, { email: 'sarah@example.com', createdBy: admin.id })
    await inviteEmail(db, { email: 'tom@example.com', createdBy: admin.id })
    const { invite: link } = await createInviteLink(db, { createdBy: admin.id })
    await claimInvite(db, { email: 'tom@example.com' })

    const pending = await listPendingInvites(db)

    expect(pending.map(invite => invite.email ?? invite.id)).toEqual(
      expect.arrayContaining(['sarah@example.com', link.id]),
    )
    expect(pending).toHaveLength(2)
  })

  it('stops a revoked invite from being claimed', async () => {
    const { db, admin } = await setup()
    const invite = await inviteEmail(db, {
      email: 'sarah@example.com',
      createdBy: admin.id,
    })

    const revoked = await revokeInvite(db, invite!.id)
    const claimed = await claimInvite(db, { email: 'sarah@example.com' })

    expect(revoked).toBe(true)
    expect(claimed).toBeUndefined()
  })

  it('refuses a link with the wrong token', async () => {
    const { db, admin } = await setup()
    await createInviteLink(db, { createdBy: admin.id })

    const claimed = await claimInvite(db, {
      email: 'sarah@example.com',
      token: 'not-the-token',
    })

    expect(claimed).toBeUndefined()
  })
})

describe('shelf invites', () => {
  async function shelfSetup() {
    const { db, admin } = await setup()
    const sarah = await createTestUser(db, {
      name: 'Sarah',
      email: 'sarah@example.com',
    })
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })

    async function invite(email = 'tom@example.com') {
      const result = await inviteToShelf(db, {
        shelfId: home.id,
        email,
        createdBy: sarah.id,
      })

      if (result.outcome !== 'invited') throw new Error(result.outcome)

      return result
    }

    return { db, admin, sarah, home, invite }
  }

  it('invites an email to a shelf with a link that expires in a week', async () => {
    const { db, home, invite } = await shelfSetup()

    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-11-01T10:00:00Z'),
    })
    const { invite: created, token } = await invite('Tom@Example.com')

    expect(created).toMatchObject({
      email: 'tom@example.com',
      expiresAt: new Date('2026-11-08T10:00:00Z'),
    })
    expect(await findInviteByToken(db, token)).toEqual({
      shelfId: home.id,
      shelf: 'Home',
      invitedBy: 'Sarah',
    })
    expect(await listShelfInvites(db, home.id)).toEqual([
      expect.objectContaining({ email: 'tom@example.com', invitedBy: 'Sarah' }),
    ])
    vi.useRealTimers()
  })

  it('refuses someone who is already a member', async () => {
    const { db, sarah, home } = await shelfSetup()

    const result = await inviteToShelf(db, {
      shelfId: home.id,
      email: 'SARAH@example.com',
      createdBy: sarah.id,
    })

    expect(result).toEqual({ outcome: 'member' })
  })

  it('refuses an email with a pending invite to the same shelf', async () => {
    const { db, sarah, home, invite } = await shelfSetup()
    await invite()

    const again = await inviteToShelf(db, {
      shelfId: home.id,
      email: 'tom@example.com',
      createdBy: sarah.id,
    })

    expect(again).toEqual({ outcome: 'pending' })
  })

  it('invites the same email to another shelf or after an admin allowed it', async () => {
    const { db, admin, sarah, invite } = await shelfSetup()
    await inviteEmail(db, { email: 'tom@example.com', createdBy: admin.id })
    const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })
    await invite()

    const other = await inviteToShelf(db, {
      shelfId: work.id,
      email: 'tom@example.com',
      createdBy: sarah.id,
    })

    expect(other.outcome).toBe('invited')
  })

  it('invites again once the earlier invite expired', async () => {
    const { db, sarah, home, invite } = await shelfSetup()
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-11-01T10:00:00Z'),
    })
    await invite()
    vi.setSystemTime(new Date('2026-11-08T10:00:01Z'))

    const again = await inviteToShelf(db, {
      shelfId: home.id,
      email: 'tom@example.com',
      createdBy: sarah.id,
    })

    vi.useRealTimers()
    expect(again.outcome).toBe('invited')
  })

  it('keeps shelf invites out of the admin list', async () => {
    const { db, invite } = await shelfSetup()
    const { invite: created } = await invite()

    expect(await listPendingInvites(db)).toEqual([])
    expect(await revokeInvite(db, created.id)).toBe(false)
  })

  it('lets a member cancel a pending invite, on that shelf only', async () => {
    const { db, sarah, home, invite } = await shelfSetup()
    const { invite: created, token } = await invite()
    const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })

    expect(
      await cancelShelfInvite(db, { shelfId: work.id, inviteId: created.id }),
    ).toBe(false)
    expect(
      await cancelShelfInvite(db, { shelfId: home.id, inviteId: created.id }),
    ).toBe(true)
    expect(await findInviteByToken(db, token)).toBeUndefined()
  })

  it('shows someone the invites sent to their email', async () => {
    const { db, invite } = await shelfSetup()
    await invite()

    expect(await listInvitesFor(db, 'Tom@example.com')).toEqual([
      {
        id: expect.any(String),
        shelf: 'Home',
        invitedBy: 'Sarah',
        expiresAt: expect.any(Date),
      },
    ])
  })

  it('lets someone with an account accept an invite to their email', async () => {
    const { db, home, invite } = await shelfSetup()
    const tom = await createTestUser(db, { email: 'tom@example.com' })
    const { invite: created } = await invite()

    const joined = await acceptInvite(db, {
      userId: tom.id,
      email: tom.email,
      match: { inviteId: created.id, email: tom.email },
      origin: testOrigin,
    })

    expect(joined).toEqual({ id: home.id, name: 'Home', ownerId: home.ownerId })
    expect(await listShelves(db, tom.id)).toEqual([joined])
    expect(await listInvitesFor(db, tom.email)).toEqual([])
  })

  it('tells the members when someone joins, not the one who joined', async () => {
    const { db, sarah, home, invite } = await shelfSetup()
    const tom = await createTestUser(db, { name: 'Tom' })
    const { token } = await invite()

    await acceptInvite(db, {
      userId: tom.id,
      email: tom.email,
      match: { token },
      origin: testOrigin,
    })

    expect(await listNotifications(db, sarah.id)).toMatchObject([
      { kind: 'memberJoined', actor: 'Tom', shelfId: home.id },
    ])
    expect(await listNotifications(db, tom.id)).toEqual([])
  })

  it('tells nobody when someone already on the shelf accepts an invite', async () => {
    const { db, sarah, home, invite } = await shelfSetup()
    const tom = await createTestUser(db, { name: 'Tom' })
    await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.id })
    const { token } = await invite('anna@example.com')

    const joined = await acceptInvite(db, {
      userId: tom.id,
      email: tom.email,
      match: { token },
      origin: testOrigin,
    })

    expect(joined?.id).toBe(home.id)
    expect(await listNotifications(db, sarah.id)).toEqual([])
  })

  it('does not let someone accept an invite sent to another email', async () => {
    const { db, invite } = await shelfSetup()
    const eve = await createTestUser(db, { email: 'eve@example.com' })
    const { invite: created } = await invite()

    const joined = await acceptInvite(db, {
      userId: eve.id,
      email: eve.email,
      match: { inviteId: created.id, email: eve.email },
      origin: testOrigin,
    })

    expect(joined).toBeUndefined()
    expect(await listShelves(db, eve.id)).toEqual([])
  })

  it('lets whoever has the link accept it, once', async () => {
    const { db, invite } = await shelfSetup()
    const tom = await createTestUser(db)
    const eve = await createTestUser(db)
    const { token } = await invite()

    const first = await acceptInvite(db, {
      userId: tom.id,
      email: tom.email,
      match: { token },
      origin: testOrigin,
    })
    const second = await acceptInvite(db, {
      userId: eve.id,
      email: eve.email,
      match: { token },
      origin: testOrigin,
    })

    expect(first?.name).toBe('Home')
    expect(second).toBeUndefined()
  })

  it('lets someone decline an invite so it is gone', async () => {
    const { db, home, invite } = await shelfSetup()
    const { invite: created } = await invite()

    expect(
      await declineInvite(db, {
        inviteId: created.id,
        email: 'eve@example.com',
      }),
    ).toBe(false)
    expect(
      await declineInvite(db, {
        inviteId: created.id,
        email: 'tom@example.com',
      }),
    ).toBe(true)
    expect(await listShelfInvites(db, home.id)).toEqual([])
  })

  it('declines by link', async () => {
    const { db, invite } = await shelfSetup()
    const { token } = await invite()

    expect(await declineInvite(db, { token })).toBe(true)
    expect(await declineInvite(db, { token })).toBe(false)
  })

  it('says a link proves the email only when it was sent to that email', async () => {
    const { db, invite } = await shelfSetup()
    const { token: tomsToken } = await invite('tom@example.com')
    const { token: annasToken } = await invite('anna@example.com')

    const tom = await claimInvites(db, {
      email: 'Tom@example.com',
      token: tomsToken,
    })
    const eve = await claimInvites(db, {
      email: 'eve@example.com',
      token: annasToken,
    })

    expect(tom.provesEmail).toBe(true)
    expect(eve).toMatchObject({
      provesEmail: false,
      invites: [expect.anything()],
    })
  })

  it('joins the shelves whose invites an email claimed', async () => {
    const { db, home, invite } = await shelfSetup()
    const { token } = await invite()
    await claimInvites(db, { email: 'tom@example.com', token })
    const tom = await createTestUser(db, { email: 'tom@example.com' })

    await joinInvitedShelves(db, {
      userId: tom.id,
      email: tom.email,
      origin: testOrigin,
    })
    await joinInvitedShelves(db, {
      userId: tom.id,
      email: tom.email,
      origin: testOrigin,
    })

    expect(await listShelves(db, tom.id)).toEqual([
      expect.objectContaining({ id: home.id }),
    ])
  })

  it('tells the members of a shelf joined from a claimed invite, once', async () => {
    const { db, sarah, home, invite } = await shelfSetup()
    const { token } = await invite()
    await claimInvites(db, { email: 'tom@example.com', token })
    const tom = await createTestUser(db, {
      name: 'Tom',
      email: 'tom@example.com',
    })

    await joinInvitedShelves(db, {
      userId: tom.id,
      email: tom.email,
      origin: testOrigin,
    })
    await joinInvitedShelves(db, {
      userId: tom.id,
      email: tom.email,
      origin: testOrigin,
    })

    expect(await listNotifications(db, sarah.id)).toMatchObject([
      { kind: 'memberJoined', actor: 'Tom', shelfId: home.id },
    ])
  })

  it('joins nothing without claimed shelf invites', async () => {
    const { db } = await shelfSetup()
    const tom = await createTestUser(db)

    await joinInvitedShelves(db, {
      userId: tom.id,
      email: tom.email,
      origin: testOrigin,
    })

    expect(await listShelves(db, tom.id)).toEqual([])
  })
})
