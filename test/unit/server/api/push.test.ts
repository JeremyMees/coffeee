import { createApp, createRouter, toWebHandler } from 'h3'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import deleteMeHandler from '#server/api/me.delete'
import pushesHandler from '#server/api/me/notifications/pushes/index.get'
import savePushesHandler from '#server/api/me/notifications/pushes/index.put'
import removeHandler from '#server/api/me/push/subscription.delete'
import saveHandler from '#server/api/me/push/subscription.put'
import finishCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/finish.post'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
import inviteHandler from '#server/api/shelves/[shelfId]/invites/index.post'
import leaveHandler from '#server/api/shelves/[shelfId]/leave.post'
import type { PushMessage, PushTarget } from '#server/types/push'
import { pushSubscription, shelfMember } from '#server/db/schemas'
import { createShelf } from '#server/utils/shelves'
import { shelfCoffeePath, shelfPath } from '#shared/utils/slugs'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase, createTestUser } from '#test/support/database'
import type { TestAuth, TestDatabase } from '#test/support/types'

const current = vi.hoisted(() => ({
  auth: undefined as unknown,
  db: undefined as unknown,
  pushed: [] as { endpoint: string; message: PushMessage }[],
  gone: new Set<string>(),
  failing: new Set<string>(),
}))

vi.mock('#server/utils/auth', async importOriginal => ({
  ...(await importOriginal<object>()),
  useAuth: () => (current.auth as TestAuth).auth,
}))

vi.mock('#server/utils/db', () => ({ useDb: () => current.db }))

vi.mock('#server/utils/email', async importOriginal => ({
  ...(await importOriginal<object>()),
  sendEmail: async () => {},
}))

vi.mock('#server/utils/push', () => ({
  sendPush: async (target: PushTarget, message: PushMessage) => {
    if (current.failing.has(target.endpoint)) {
      throw new Error('The push service is down')
    }
    if (current.gone.has(target.endpoint)) return 'gone'

    current.pushed.push({ endpoint: target.endpoint, message })

    return 'sent'
  },
}))

let testAuth: TestAuth
let db: TestDatabase

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
  current.pushed = []
  current.gone = new Set()
  current.failing = new Set()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const coffeePath = '/api/shelves/:shelfId/coffees/:coffeeId'
const subscriptionPath = '/api/me/push/subscription'
const pushesPath = '/api/me/notifications/pushes'

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .put(subscriptionPath, saveHandler)
    .delete(subscriptionPath, removeHandler)
    .get(pushesPath, pushesHandler)
    .put(pushesPath, savePushesHandler)
    .delete('/api/me', deleteMeHandler)
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

function send(method: string, path: string, headers: Headers, body?: unknown) {
  return request(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function device(name: string) {
  return {
    endpoint: `https://push.example.com/${name}`,
    keys: { p256dh: `${name}-p256dh`, auth: `${name}-auth` },
  }
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

function subscribe(headers: Headers, name: string) {
  return send('PUT', subscriptionPath, headers, device(name))
}

async function subscriptionsOf(userId: string) {
  const found = await db
    .select({ endpoint: pushSubscription.endpoint })
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId))

  return found.map(row => row.endpoint).sort()
}

function choosePushed(headers: Headers, pushed: string[]) {
  return send('PUT', pushesPath, headers, { pushed })
}

function pushedTo() {
  return current.pushed.map(push => push.endpoint).sort()
}

async function setup() {
  const sarah = await person('Sarah')
  const tom = await person('Tom')
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.user.id })
  await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.user.id })

  async function addCoffee(headers = sarah.headers) {
    const response = await send(
      'POST',
      `/api/shelves/${home.id}/coffees`,
      headers,
      {
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedFor: 'filter',
        origins: ['ET'],
        processes: ['Washed'],
        purchasedOn: '2026-11-01',
        roastedOn: null,
        sizeGrams: 250,
        price: 16.5,
      },
    )
    const { coffee } = await response.json()

    return { response, coffeeId: coffee.id as string }
  }

  return { sarah, tom, home, addCoffee }
}

describe('saving the subscription of a device', () => {
  it('refuses anonymous requests', async () => {
    const headers = new Headers({ 'content-type': 'application/json' })

    const saved = await send('PUT', subscriptionPath, headers, device('phone'))
    const removed = await send('DELETE', subscriptionPath, headers, {
      endpoint: device('phone').endpoint,
    })

    expect([saved.status, removed.status]).toEqual([401, 401])
  })

  it('stores one subscription per device', async () => {
    const { user, headers } = await person('Sarah')

    const response = await subscribe(headers, 'phone')
    await subscribe(headers, 'phone')
    await subscribe(headers, 'laptop')

    expect(response.status).toBe(204)
    expect(await subscriptionsOf(user.id)).toEqual([
      'https://push.example.com/laptop',
      'https://push.example.com/phone',
    ])
  })

  it('moves a device to whoever signed in on it last', async () => {
    const sarah = await person('Sarah')
    const tom = await person('Tom')
    await subscribe(sarah.headers, 'phone')

    await subscribe(tom.headers, 'phone')

    expect(await subscriptionsOf(sarah.user.id)).toEqual([])
    expect(await subscriptionsOf(tom.user.id)).toEqual([
      'https://push.example.com/phone',
    ])
  })

  it('refuses something that is no push subscription', async () => {
    const { headers } = await person('Sarah')

    const responses = await Promise.all([
      send('PUT', subscriptionPath, headers, { endpoint: 'not a link' }),
      send('PUT', subscriptionPath, headers, {
        endpoint: 'http://push.example.com/phone',
        keys: { p256dh: 'key', auth: 'auth' },
      }),
      send('PUT', subscriptionPath, headers, {
        endpoint: device('phone').endpoint,
        keys: { p256dh: '', auth: 'auth' },
      }),
    ])

    expect(responses.map(response => response.status)).toEqual([400, 400, 400])
  })

  it('removes only the device of whoever asks', async () => {
    const sarah = await person('Sarah')
    const tom = await person('Tom')
    await subscribe(sarah.headers, 'phone')
    await subscribe(sarah.headers, 'laptop')
    await subscribe(tom.headers, 'tablet')

    const response = await send('DELETE', subscriptionPath, sarah.headers, {
      endpoint: device('phone').endpoint,
    })
    await send('DELETE', subscriptionPath, sarah.headers, {
      endpoint: device('tablet').endpoint,
    })

    expect(response.status).toBe(204)
    expect(await subscriptionsOf(sarah.user.id)).toEqual([
      'https://push.example.com/laptop',
    ])
    expect(await subscriptionsOf(tom.user.id)).toEqual([
      'https://push.example.com/tablet',
    ])
  })

  it('removes every device with the account', async () => {
    await createTestUser(db, { name: 'Jeremy', role: 'admin' })
    const { user, headers } = await person('Sarah')
    await subscribe(headers, 'phone')
    await subscribe(headers, 'laptop')

    const response = await send('DELETE', '/api/me', headers, { heirs: {} })

    expect(response.status).toBe(204)
    expect(await subscriptionsOf(user.id)).toEqual([])
  })
})

describe('pushing notifications', () => {
  it('pushes to every device of the others on the shelf, never the actor', async () => {
    const { sarah, tom, addCoffee } = await setup()
    await subscribe(sarah.headers, 'sarah-phone')
    await subscribe(tom.headers, 'tom-phone')
    await subscribe(tom.headers, 'tom-laptop')

    await addCoffee()

    expect(pushedTo()).toEqual([
      'https://push.example.com/tom-laptop',
      'https://push.example.com/tom-phone',
    ])
  })

  it('shows the shelf as title and opens the coffee', async () => {
    const { tom, home, addCoffee } = await setup()
    await subscribe(tom.headers, 'tom-phone')

    const { coffeeId } = await addCoffee()

    expect(current.pushed[0]!.message).toEqual({
      title: 'Home',
      body: 'Sarah added Ayele Fulasa to Home',
      path: shelfCoffeePath(
        { id: home.id, name: 'Home' },
        { id: coffeeId, name: 'Ayele Fulasa' },
      ),
    })
  })

  it('pushes a finished bag', async () => {
    const { sarah, tom, home, addCoffee } = await setup()
    const { coffeeId } = await addCoffee()
    await subscribe(sarah.headers, 'sarah-phone')

    await send(
      'POST',
      `/api/shelves/${home.id}/coffees/${coffeeId}/finish`,
      tom.headers,
    )

    expect(current.pushed.map(push => push.message.body)).toEqual([
      'Tom finished a bag of Ayele Fulasa on Home',
    ])
  })

  it('opens the shelf when someone leaves it', async () => {
    const { sarah, tom, home } = await setup()
    await subscribe(sarah.headers, 'sarah-phone')

    await send('POST', `/api/shelves/${home.id}/leave`, tom.headers)

    expect(current.pushed.map(push => push.message)).toEqual([
      {
        title: 'Home',
        body: 'Tom left Home',
        path: shelfPath({ id: home.id, name: 'Home' }),
      },
    ])
  })

  it('pushes an invite to someone who already has an account', async () => {
    const { sarah, home } = await setup()
    const lisa = await person('Lisa')
    await subscribe(lisa.headers, 'lisa-phone')

    await send('POST', `/api/shelves/${home.id}/invites`, sarah.headers, {
      email: 'lisa@example.com',
    })

    expect(current.pushed).toEqual([
      {
        endpoint: 'https://push.example.com/lisa-phone',
        message: {
          title: 'Home',
          body: 'Sarah invited you to Home',
          path: '/notifications',
        },
      },
    ])
  })

  it('forgets a device the push service no longer knows', async () => {
    const { tom, addCoffee } = await setup()
    await subscribe(tom.headers, 'tom-phone')
    await subscribe(tom.headers, 'tom-old-phone')
    current.gone.add('https://push.example.com/tom-old-phone')

    await addCoffee()

    expect(pushedTo()).toEqual(['https://push.example.com/tom-phone'])
    expect(await subscriptionsOf(tom.user.id)).toEqual([
      'https://push.example.com/tom-phone',
    ])
  })

  it('still makes the change when a push fails', async () => {
    const { tom, addCoffee } = await setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await subscribe(tom.headers, 'tom-phone')
    await subscribe(tom.headers, 'tom-laptop')
    current.failing.add('https://push.example.com/tom-phone')

    const { response } = await addCoffee()

    expect(response.status).toBe(201)
    expect(pushedTo()).toEqual(['https://push.example.com/tom-laptop'])
    expect(await subscriptionsOf(tom.user.id)).toHaveLength(2)
    expect(console.error).toHaveBeenCalledWith(
      'Could not send a push',
      expect.any(Error),
    )
  })
})

describe('choosing which kinds are pushed', () => {
  const everyKind = [
    'invited',
    'coffeeAdded',
    'purchaseAdded',
    'bagFinished',
    'memberJoined',
    'memberLeft',
  ]

  it('refuses anonymous requests', async () => {
    const response = await request(pushesPath)

    expect(response.status).toBe(401)
  })

  it('pushes every kind until something is switched off', async () => {
    const { headers } = await person('Sarah')

    const response = await send('GET', pushesPath, headers)

    expect(await response.json()).toEqual({ pushed: everyKind })
  })

  it('remembers the kinds switched off', async () => {
    const { headers } = await person('Sarah')

    const saved = await choosePushed(headers, ['invited', 'bagFinished'])
    const read = await send('GET', pushesPath, headers)

    expect(await saved.json()).toEqual({ pushed: ['invited', 'bagFinished'] })
    expect(await read.json()).toEqual({ pushed: ['invited', 'bagFinished'] })
  })

  it('switches a kind on again', async () => {
    const { headers } = await person('Sarah')
    await choosePushed(headers, [])

    const response = await choosePushed(headers, everyKind)

    expect(await response.json()).toEqual({ pushed: everyKind })
  })

  it('keeps the choices of everyone else', async () => {
    const sarah = await person('Sarah')
    const tom = await person('Tom')
    await choosePushed(tom.headers, ['invited'])

    await choosePushed(sarah.headers, [])
    const response = await send('GET', pushesPath, tom.headers)

    expect(await response.json()).toEqual({ pushed: ['invited'] })
  })

  it('refuses a kind that does not exist', async () => {
    const { headers } = await person('Sarah')

    const response = await choosePushed(headers, ['coffeeBrewed'])

    expect(response.status).toBe(400)
  })

  it('stops pushing a switched-off kind to every device', async () => {
    const { sarah, tom, home, addCoffee } = await setup()
    await subscribe(tom.headers, 'tom-phone')
    await subscribe(tom.headers, 'tom-laptop')
    await subscribe(sarah.headers, 'sarah-phone')
    await choosePushed(tom.headers, ['bagFinished'])

    const { coffeeId } = await addCoffee()
    await send(
      'POST',
      `/api/shelves/${home.id}/coffees/${coffeeId}/finish`,
      sarah.headers,
    )

    expect(pushedTo()).toEqual([
      'https://push.example.com/tom-laptop',
      'https://push.example.com/tom-phone',
    ])
    expect(current.pushed.map(push => push.message.body)).toEqual([
      'Sarah finished a bag of Ayele Fulasa on Home',
      'Sarah finished a bag of Ayele Fulasa on Home',
    ])
  })

  it('still pushes the kind to others on the shelf', async () => {
    const { sarah, tom, home, addCoffee } = await setup()
    const lisa = await person('Lisa')
    await db
      .insert(shelfMember)
      .values({ shelfId: home.id, userId: lisa.user.id })
    await subscribe(tom.headers, 'tom-phone')
    await subscribe(lisa.headers, 'lisa-phone')
    await choosePushed(tom.headers, [])

    await addCoffee(sarah.headers)

    expect(pushedTo()).toEqual(['https://push.example.com/lisa-phone'])
  })

  it('keeps a kind off on a device added later', async () => {
    const { tom, addCoffee } = await setup()
    await choosePushed(tom.headers, ['invited'])
    const again = await testAuth.signIn(tom.user.id)
    again.set('content-type', 'application/json')

    await subscribe(again, 'tom-new-phone')
    await addCoffee()

    expect(current.pushed).toEqual([])
  })

  it('stops pushing invites once they are switched off', async () => {
    const { sarah, home } = await setup()
    const lisa = await person('Lisa')
    await subscribe(lisa.headers, 'lisa-phone')
    await choosePushed(lisa.headers, ['coffeeAdded'])

    const response = await send(
      'POST',
      `/api/shelves/${home.id}/invites`,
      sarah.headers,
      { email: 'lisa@example.com' },
    )

    expect(response.status).toBe(201)
    expect(current.pushed).toEqual([])
  })
})
