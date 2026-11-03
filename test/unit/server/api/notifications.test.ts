import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import linkAcceptHandler from '#server/api/invites/link/[token]/accept.post'
import acceptHandler from '#server/api/me/invites/[inviteId]/accept.post'
import listHandler from '#server/api/me/notifications/index.get'
import readHandler from '#server/api/me/notifications/read.post'
import unreadHandler from '#server/api/me/notifications/unread.get'
import finishCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/finish.post'
import finishPurchaseHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/purchases/[purchaseId]/finish.post'
import buyAgainHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/purchases/index.post'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
import inviteHandler from '#server/api/shelves/[shelfId]/invites/index.post'
import leaveHandler from '#server/api/shelves/[shelfId]/leave.post'
import removeMemberHandler from '#server/api/shelves/[shelfId]/members/[userId].delete'
import type { Email } from '#server/types/email'
import { shelfMember } from '#server/db/schemas'
import { inviteToShelf } from '#server/utils/invites'
import { createShelf } from '#server/utils/shelves'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase, createTestUser } from '#test/support/database'
import type { TestAuth, TestDatabase } from '#test/support/types'

const current = vi.hoisted(() => ({
  auth: undefined as unknown,
  db: undefined as unknown,
}))

vi.mock('#server/utils/auth', async importOriginal => ({
  ...(await importOriginal<object>()),
  useAuth: () => (current.auth as TestAuth).auth,
}))

vi.mock('#server/utils/db', () => ({ useDb: () => current.db }))

vi.mock('#server/utils/email', () => ({
  sendEmail: async (_email: Email) => {},
}))

let testAuth: TestAuth
let db: TestDatabase

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
})

const coffeePath = '/api/shelves/:shelfId/coffees/:coffeeId'

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/me/notifications', listHandler)
    .get('/api/me/notifications/unread', unreadHandler)
    .post('/api/me/notifications/read', readHandler)
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .post(`${coffeePath}/finish`, finishCoffeeHandler)
    .post(`${coffeePath}/purchases`, buyAgainHandler)
    .post(`${coffeePath}/purchases/:purchaseId/finish`, finishPurchaseHandler)
    .post('/api/shelves/:shelfId/invites', inviteHandler)
    .post('/api/shelves/:shelfId/leave', leaveHandler)
    .delete('/api/shelves/:shelfId/members/:userId', removeMemberHandler)
    .post('/api/me/invites/:inviteId/accept', acceptHandler)
    .post('/api/invites/link/:token/accept', linkAcceptHandler)
  const app = createApp().use(router)

  const headers = new Headers(init.headers)
  headers.set('host', 'localhost:3000')

  return toWebHandler(app)(
    new Request(`http://localhost:3000${path}`, { ...init, headers }),
  )
}

async function person(name: string) {
  const user = await createTestUser(db, {
    name,
    email: `${name.toLowerCase()}@example.com`,
  })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')
  await createShelf(db, { name: `${name}'s shelf`, ownerId: user.id })

  return { user, headers }
}

function post(path: string, headers: Headers, body?: unknown) {
  return request(path, {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function notificationsOf(headers: Headers) {
  const response = await request('/api/me/notifications', { headers })

  return response.json()
}

const bag = {
  purchasedOn: '2026-11-01',
  roastedOn: null,
  sizeGrams: 250,
  price: 16.5,
}

async function setup() {
  const sarah = await person('Sarah')
  const tom = await person('Tom')
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.user.id })
  await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.user.id })

  async function addCoffee(headers = sarah.headers) {
    const response = await post(`/api/shelves/${home.id}/coffees`, headers, {
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
      roastLevel: 'light',
      roastedFor: 'filter',
      origins: ['ET'],
      processes: ['Washed'],
      ...bag,
    })
    const { coffee, purchase } = await response.json()

    return {
      coffeeId: coffee.id as string,
      path: `/api/shelves/${home.id}/coffees/${coffee.id}`,
      purchaseId: purchase.id as string,
    }
  }

  return { sarah, tom, home, addCoffee }
}

describe('notifications about shelf events', () => {
  it('tells the other members when someone adds a coffee', async () => {
    const { sarah, tom, home, addCoffee } = await setup()

    const { coffeeId } = await addCoffee()

    expect(await notificationsOf(tom.headers)).toMatchObject([
      {
        kind: 'coffeeAdded',
        actor: 'Sarah',
        shelfId: home.id,
        shelf: 'Home',
        coffeeId,
        coffee: 'Ayele Fulasa',
        readAt: null,
      },
    ])
    expect(await notificationsOf(sarah.headers)).toEqual([])
  })

  it('tells the other members when someone adds a bag', async () => {
    const { sarah, tom, addCoffee } = await setup()
    const { path, coffeeId } = await addCoffee(tom.headers)

    await post(`${path}/purchases`, tom.headers, bag)

    expect(await notificationsOf(sarah.headers)).toMatchObject([
      { kind: 'purchaseAdded', actor: 'Tom', coffeeId },
      { kind: 'coffeeAdded', actor: 'Tom', coffeeId },
    ])
    expect(await notificationsOf(tom.headers)).toEqual([])
  })

  it('tells the other members when someone finishes a bag', async () => {
    const { sarah, tom, addCoffee } = await setup()
    const { path, coffeeId } = await addCoffee()

    await post(`${path}/finish`, sarah.headers)

    expect((await notificationsOf(tom.headers))[0]).toMatchObject({
      kind: 'bagFinished',
      actor: 'Sarah',
      coffeeId,
    })
  })

  it('tells them once when one bag is finished twice', async () => {
    const { sarah, tom, addCoffee } = await setup()
    const { path, purchaseId } = await addCoffee()

    await post(`${path}/purchases/${purchaseId}/finish`, tom.headers)
    await post(`${path}/purchases/${purchaseId}/finish`, tom.headers)

    const kinds = (await notificationsOf(sarah.headers)).map(
      (found: { kind: string }) => found.kind,
    )
    expect(kinds).toEqual(['bagFinished'])
  })

  it('tells someone with an account that they were invited', async () => {
    const { sarah, home } = await setup()
    const lisa = await person('Lisa')

    await post(`/api/shelves/${home.id}/invites`, sarah.headers, {
      email: 'lisa@example.com',
    })

    expect(await notificationsOf(lisa.headers)).toMatchObject([
      { kind: 'invited', actor: 'Sarah', shelfId: home.id, shelf: 'Home' },
    ])
  })

  it('tells the members when someone joins from an invite in the app', async () => {
    const { sarah, tom, home } = await setup()
    const lisa = await person('Lisa')
    const invited = await inviteToShelf(db, {
      shelfId: home.id,
      email: 'lisa@example.com',
      createdBy: sarah.user.id,
    })
    if (invited.outcome !== 'invited') throw new Error(invited.outcome)

    await post(`/api/me/invites/${invited.invite.id}/accept`, lisa.headers)

    for (const member of [sarah, tom]) {
      expect(await notificationsOf(member.headers)).toMatchObject([
        { kind: 'memberJoined', actor: 'Lisa', shelfId: home.id },
      ])
    }
  })

  it('tells the members when someone joins from an invite link', async () => {
    const { sarah, home } = await setup()
    const lisa = await person('Lisa')
    const invited = await inviteToShelf(db, {
      shelfId: home.id,
      email: 'lisa@example.com',
      createdBy: sarah.user.id,
    })
    if (invited.outcome !== 'invited') throw new Error(invited.outcome)

    await post(`/api/invites/link/${invited.token}/accept`, lisa.headers)

    expect(await notificationsOf(sarah.headers)).toMatchObject([
      { kind: 'memberJoined', actor: 'Lisa' },
    ])
    expect(await notificationsOf(lisa.headers)).toEqual([])
  })

  it('tells the members when someone leaves', async () => {
    const { sarah, tom, home } = await setup()

    await post(`/api/shelves/${home.id}/leave`, tom.headers)

    expect(await notificationsOf(sarah.headers)).toMatchObject([
      { kind: 'memberLeft', actor: 'Tom', shelfId: home.id },
    ])
    expect(await notificationsOf(tom.headers)).toEqual([])
  })

  it('tells the other members, not the shelf owner, when someone is removed', async () => {
    const { sarah, tom, home } = await setup()
    const lisa = await person('Lisa')
    await db
      .insert(shelfMember)
      .values({ shelfId: home.id, userId: lisa.user.id })

    await request(`/api/shelves/${home.id}/members/${tom.user.id}`, {
      method: 'DELETE',
      headers: sarah.headers,
    })

    expect(await notificationsOf(lisa.headers)).toMatchObject([
      { kind: 'memberLeft', actor: 'Tom' },
    ])
    expect(await notificationsOf(sarah.headers)).toEqual([])
    expect(await notificationsOf(tom.headers)).toEqual([])
  })
})

describe('reading notifications', () => {
  it('refuses anonymous requests', async () => {
    const responses = await Promise.all([
      request('/api/me/notifications'),
      request('/api/me/notifications/unread'),
      request('/api/me/notifications/read', { method: 'POST' }),
    ])

    expect(responses.map(response => response.status)).toEqual([401, 401, 401])
  })

  it('counts unread notifications until they are marked read', async () => {
    const { tom, addCoffee } = await setup()
    await addCoffee()
    await addCoffee()

    const before = await request('/api/me/notifications/unread', {
      headers: tom.headers,
    })
    const read = await post('/api/me/notifications/read', tom.headers)
    const after = await request('/api/me/notifications/unread', {
      headers: tom.headers,
    })

    expect(await before.json()).toEqual({ unread: 2 })
    expect(read.status).toBe(204)
    expect(await after.json()).toEqual({ unread: 0 })
  })
})
