import { describe, expect, it, vi } from 'vitest'
import {
  claimInvite,
  createInviteLink,
  inviteEmail,
  listPendingInvites,
  revokeInvite,
} from '#server/utils/invites'
import { createTestDatabase, createTestUser } from '#test/support/database'

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
