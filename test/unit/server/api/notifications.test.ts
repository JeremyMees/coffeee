import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import emailsHandler from '#server/api/me/notifications/emails/index.get'
import saveEmailsHandler from '#server/api/me/notifications/emails/index.put'
import listHandler from '#server/api/me/notifications/index.get'
import readHandler from '#server/api/me/notifications/read.post'
import unreadHandler from '#server/api/me/notifications/unread.get'
import finishCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/finish.post'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
import inviteHandler from '#server/api/shelves/[shelfId]/invites/index.post'
import leaveHandler from '#server/api/shelves/[shelfId]/leave.post'
import type { Email } from '#server/types/email'
import { shelfMember } from '#server/db/schemas'
import { createShelf } from '#server/utils/shelves'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase, createTestUser } from '#test/support/database'
import type { TestAuth, TestDatabase } from '#test/support/types'

const current = vi.hoisted(() => ({
  auth: undefined as unknown,
  db: undefined as unknown,
  sent: [] as Email[],
}))

vi.mock('#server/utils/auth', async importOriginal => ({
  ...(await importOriginal<object>()),
  useAuth: () => (current.auth as TestAuth).auth,
}))

vi.mock('#server/utils/db', () => ({ useDb: () => current.db }))

vi.mock('#server/utils/email', () => ({
  sendEmail: async (email: Email) => {
    current.sent.push(email)
  },
}))

let testAuth: TestAuth
let db: TestDatabase

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
  current.sent = []
})

const coffeePath = '/api/shelves/:shelfId/coffees/:coffeeId'

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/me/notifications', listHandler)
    .get('/api/me/notifications/unread', unreadHandler)
    .post('/api/me/notifications/read', readHandler)
    .get('/api/me/notifications/emails', emailsHandler)
    .put('/api/me/notifications/emails', saveEmailsHandler)
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .post(`${coffeePath}/finish`, finishCoffeeHandler)
    .post('/api/shelves/:shelfId/invites', inviteHandler)
    .post('/api/shelves/:shelfId/leave', leaveHandler)
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
    const { coffee } = await response.json()

    return {
      coffeeId: coffee.id as string,
      path: `/api/shelves/${home.id}/coffees/${coffee.id}`,
    }
  }

  return { sarah, tom, home, addCoffee }
}

describe('notifications about invites', () => {
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

describe('choosing which notifications are emailed', () => {
  function save(headers: Headers, emailed: unknown) {
    return request('/api/me/notifications/emails', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ emailed }),
    })
  }

  async function emailedOf(headers: Headers) {
    const response = await request('/api/me/notifications/emails', {
      headers,
    })

    return response.json()
  }

  it('refuses anonymous requests', async () => {
    const responses = await Promise.all([
      request('/api/me/notifications/emails'),
      request('/api/me/notifications/emails', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emailed: [] }),
      }),
    ])

    expect(responses.map(response => response.status)).toEqual([401, 401])
  })

  it('has email off for everything to begin with', async () => {
    const { tom } = await setup()

    expect(await emailedOf(tom.headers)).toEqual({ emailed: [] })
  })

  it('saves the kinds someone switches on', async () => {
    const { tom } = await setup()

    const response = await save(tom.headers, ['bagFinished'])

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ emailed: ['bagFinished'] })
    expect(await emailedOf(tom.headers)).toEqual({ emailed: ['bagFinished'] })
  })

  it('will not save invites, which are always emailed', async () => {
    const { tom } = await setup()

    const response = await save(tom.headers, ['invited'])

    expect(response.status).toBe(400)
    expect(await emailedOf(tom.headers)).toEqual({ emailed: [] })
  })

  it('emails what happened on the shelf once switched on', async () => {
    const { tom, home, addCoffee } = await setup()
    await save(tom.headers, ['coffeeAdded', 'bagFinished'])

    const { path, coffeeId } = await addCoffee()
    await post(`/api/shelves/${home.id}/leave`, tom.headers)
    await post(`${path}/finish`, tom.headers)

    expect(current.sent).toEqual([
      {
        to: 'tom@example.com',
        subject: 'Sarah added Ayele Fulasa to Home',
        template: 'ShelfNotification',
        values: {
          text: 'Sarah added Ayele Fulasa to Home',
          link: `http://localhost:3000/shelves/home-${home.id}/coffees/ayele-fulasa-${coffeeId}`,
          settings: 'http://localhost:3000/profile?tab=notifications',
        },
      },
    ])
  })

  it('stops emailing once switched off again', async () => {
    const { tom, addCoffee } = await setup()
    await save(tom.headers, ['coffeeAdded'])
    await save(tom.headers, [])

    await addCoffee()

    expect(current.sent).toEqual([])
    expect(await notificationsOf(tom.headers)).toHaveLength(1)
  })
})
