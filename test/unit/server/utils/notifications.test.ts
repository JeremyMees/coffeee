import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import type { Email } from '#server/types/email'
import { invite, shelfMember, user } from '#server/db/schemas'
import { addCoffee } from '#server/utils/coffees'
import { inviteToShelf } from '#server/utils/invites'
import {
  countUnreadNotifications,
  listEmailedKinds,
  listNotifications,
  markNotificationsRead,
  notifyInvited,
  notifyShelf,
  setEmailedKinds,
} from '#server/utils/notifications'
import { createShelf } from '#server/utils/shelves'
import type { NewCoffee } from '#shared/types/coffee'
import { createTestDatabase, createTestUser } from '#test/support/database'

const sending = vi.hoisted(() => ({
  sent: [] as Email[],
  failFor: '',
}))

vi.mock('#server/utils/email', () => ({
  sendEmail: async (email: Email) => {
    if (email.to === sending.failFor) throw new Error('Plunk is down')

    sending.sent.push(email)
  },
}))

const origin = 'https://coffeee.example'

const firstBag: NewCoffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  origins: ['ET'],
  regions: [],
  farms: [],
  washingStations: [],
  producers: [],
  processes: [],
  varietals: [],
  flavorNotes: [],
  link: null,
  altitudeFrom: null,
  altitudeTo: null,
  purchasedOn: '2026-09-01',
  roastedOn: null,
  sizeGrams: 250,
  price: 16.5,
}

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const lisa = await createTestUser(db, { name: 'Lisa' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await db.insert(shelfMember).values([
    { shelfId: home.id, userId: tom.id },
    { shelfId: home.id, userId: lisa.id },
  ])

  return { db, sarah, tom, lisa, home }
}

beforeEach(() => {
  sending.sent = []
  sending.failFor = ''
})

afterEach(() => {
  vi.useRealTimers()
})

describe('notifyShelf', () => {
  it('tells every other member, not the one who did it', async () => {
    const { db, sarah, tom, lisa, home } = await setup()
    const { coffee } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: firstBag,
    })

    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'coffeeAdded',
      coffeeId: coffee.id,
      origin,
    })

    expect(await listNotifications(db, sarah.id)).toEqual([])
    for (const member of [tom, lisa]) {
      expect(await listNotifications(db, member.id)).toEqual([
        {
          id: expect.any(String),
          kind: 'coffeeAdded',
          actor: 'Sarah',
          shelfId: home.id,
          shelf: 'Home',
          coffeeId: coffee.id,
          coffee: 'Ayele Fulasa',
          inviteId: null,
          inviteStatus: null,
          createdAt: expect.any(Date),
          readAt: null,
        },
      ])
    }
  })

  it('leaves out someone else it is told to skip', async () => {
    const { db, sarah, tom, lisa, home } = await setup()

    await notifyShelf(db, {
      shelfId: home.id,
      actorId: tom.id,
      kind: 'memberLeft',
      skip: sarah.id,
      origin,
    })

    expect(await listNotifications(db, sarah.id)).toEqual([])
    expect(await listNotifications(db, lisa.id)).toMatchObject([
      { kind: 'memberLeft', actor: 'Tom' },
    ])
  })

  it('tells nobody on a shelf with one member', async () => {
    const { db, sarah } = await setup()
    const solo = await createShelf(db, { name: 'Solo', ownerId: sarah.id })

    await notifyShelf(db, {
      shelfId: solo.id,
      actorId: sarah.id,
      kind: 'memberJoined',
      origin,
    })

    expect(await listNotifications(db, sarah.id)).toEqual([])
  })
})

describe('emailing shelf notifications', () => {
  it('emails nobody until they switch it on', async () => {
    const { db, sarah, home } = await setup()

    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'memberJoined',
      origin,
    })

    expect(sending.sent).toEqual([])
  })

  it('emails the members who switched it on for that kind, linking to the coffee', async () => {
    const { db, sarah, tom, lisa, home } = await setup()
    await setEmailedKinds(db, { userId: tom.id, emailed: ['coffeeAdded'] })
    await setEmailedKinds(db, { userId: lisa.id, emailed: ['bagFinished'] })
    const { coffee } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: firstBag,
    })

    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'coffeeAdded',
      coffeeId: coffee.id,
      origin,
    })

    expect(sending.sent).toEqual([
      {
        to: tom.email,
        subject: 'Sarah added Ayele Fulasa to Home',
        template: 'ShelfNotification',
        values: {
          text: 'Sarah added Ayele Fulasa to Home',
          link: `${origin}/shelves/${home.id}/coffees/${coffee.id}`,
          settings: `${origin}/profile?tab=notifications`,
        },
      },
    ])
  })

  it('links to the shelf when no coffee is involved', async () => {
    const { db, sarah, tom, home } = await setup()
    await setEmailedKinds(db, { userId: tom.id, emailed: ['memberLeft'] })

    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'memberLeft',
      origin,
    })

    expect(sending.sent).toMatchObject([
      {
        subject: 'Sarah left Home',
        values: { link: `${origin}/shelves/${home.id}` },
      },
    ])
  })

  it('never emails the one who did it or someone it skips', async () => {
    const { db, sarah, tom, lisa, home } = await setup()
    for (const member of [sarah, tom, lisa]) {
      await setEmailedKinds(db, { userId: member.id, emailed: ['memberLeft'] })
    }

    await notifyShelf(db, {
      shelfId: home.id,
      actorId: tom.id,
      kind: 'memberLeft',
      skip: sarah.id,
      origin,
    })

    expect(sending.sent.map(email => email.to)).toEqual([lisa.email])
  })

  it('still notifies in the app and emails the others when one email fails', async () => {
    const { db, sarah, tom, lisa, home } = await setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    for (const member of [tom, lisa]) {
      await setEmailedKinds(db, {
        userId: member.id,
        emailed: ['memberJoined'],
      })
    }
    sending.failFor = tom.email

    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'memberJoined',
      origin,
    })

    expect(sending.sent.map(email => email.to)).toEqual([lisa.email])
    expect(await listNotifications(db, tom.id)).toHaveLength(1)
    expect(console.error).toHaveBeenCalledWith(
      'Could not send a notification email',
      expect.any(Error),
    )
  })
})

describe('emailed notification kinds', () => {
  it('has none switched on to begin with', async () => {
    const { db, tom } = await setup()

    expect(await listEmailedKinds(db, tom.id)).toEqual([])
  })

  it('replaces what was switched on, for one user only', async () => {
    const { db, tom, lisa } = await setup()
    await setEmailedKinds(db, { userId: lisa.id, emailed: ['memberLeft'] })
    await setEmailedKinds(db, {
      userId: tom.id,
      emailed: ['coffeeAdded', 'bagFinished'],
    })

    await setEmailedKinds(db, {
      userId: tom.id,
      emailed: ['bagFinished', 'memberJoined', 'memberJoined'],
    })

    expect((await listEmailedKinds(db, tom.id)).sort()).toEqual([
      'bagFinished',
      'memberJoined',
    ])
    expect(await listEmailedKinds(db, lisa.id)).toEqual(['memberLeft'])
  })

  it('switches everything off', async () => {
    const { db, tom } = await setup()
    await setEmailedKinds(db, { userId: tom.id, emailed: ['coffeeAdded'] })

    await setEmailedKinds(db, { userId: tom.id, emailed: [] })

    expect(await listEmailedKinds(db, tom.id)).toEqual([])
  })
})

describe('notifyInvited', () => {
  async function inviteToWork(email: string) {
    const { db } = await createTestDatabase()
    const sarah = await createTestUser(db, { name: 'Sarah' })
    const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })
    const result = await inviteToShelf(db, {
      shelfId: work.id,
      email,
      createdBy: sarah.id,
    })

    if (result.outcome !== 'invited') throw new Error(result.outcome)

    return {
      db,
      inviteId: result.invite.id,
      notify: () =>
        notifyInvited(db, {
          email,
          actorId: sarah.id,
          shelfId: work.id,
          inviteId: result.invite.id,
        }),
    }
  }

  it('tells someone who already has an account', async () => {
    const { db, notify } = await inviteToWork('anna@example.com')
    const anna = await createTestUser(db, { email: 'anna@example.com' })

    await notify()

    expect(await listNotifications(db, anna.id)).toMatchObject([
      { kind: 'invited', actor: 'Sarah', shelf: 'Work', coffee: null },
    ])
  })

  it('says whether the invite is still open, accepted or expired', async () => {
    const { db, notify, inviteId } = await inviteToWork('anna@example.com')
    const anna = await createTestUser(db, { email: 'anna@example.com' })
    await notify()
    const statusOf = async () =>
      (await listNotifications(db, anna.id)).map(found => [
        found.inviteId,
        found.inviteStatus,
      ])

    expect(await statusOf()).toEqual([[inviteId, 'pending']])

    await db
      .update(invite)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invite.id, inviteId))
    expect(await statusOf()).toEqual([[inviteId, 'expired']])

    await db
      .update(invite)
      .set({ usedAt: new Date() })
      .where(eq(invite.id, inviteId))
    expect(await statusOf()).toEqual([[inviteId, 'accepted']])
  })

  it('tells nobody when the email has no account yet', async () => {
    const { db, notify } = await inviteToWork('new@example.com')

    await notify()

    expect(await db.query.notification.findMany()).toEqual([])
  })

  it('forgets the notification when the invite is cancelled', async () => {
    const { db, notify, inviteId } = await inviteToWork('anna@example.com')
    const anna = await createTestUser(db, { email: 'anna@example.com' })
    await notify()

    await db.delete(invite).where(eq(invite.id, inviteId))

    expect(await listNotifications(db, anna.id)).toEqual([])
  })
})

describe('listNotifications', () => {
  it('lists the newest first', async () => {
    const { db, sarah, tom, home } = await setup()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-01T10:00:00Z'))
    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'memberJoined',
      origin,
    })
    vi.setSystemTime(new Date('2026-11-02T10:00:00Z'))
    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'memberLeft',
      origin,
    })

    const kinds = (await listNotifications(db, tom.id)).map(found => found.kind)

    expect(kinds).toEqual(['memberLeft', 'memberJoined'])
  })

  it('keeps a notification from someone who deleted their account, without their name', async () => {
    const { db, sarah, tom, home } = await setup()
    await notifyShelf(db, {
      shelfId: home.id,
      actorId: tom.id,
      kind: 'memberJoined',
      origin,
    })

    await db.delete(user).where(eq(user.id, tom.id))

    expect(await listNotifications(db, sarah.id)).toMatchObject([
      { kind: 'memberJoined', actor: null },
    ])
  })
})

describe('unread notifications', () => {
  it('counts and marks them read for one user only', async () => {
    const { db, sarah, tom, lisa, home } = await setup()
    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'memberJoined',
      origin,
    })
    await notifyShelf(db, {
      shelfId: home.id,
      actorId: sarah.id,
      kind: 'memberLeft',
      origin,
    })

    expect(await countUnreadNotifications(db, tom.id)).toBe(2)

    await markNotificationsRead(db, tom.id)

    expect(await countUnreadNotifications(db, tom.id)).toBe(0)
    expect(await countUnreadNotifications(db, lisa.id)).toBe(2)
    expect((await listNotifications(db, tom.id))[0]?.readAt).toBeInstanceOf(
      Date,
    )
  })
})
