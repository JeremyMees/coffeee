import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import roastersHandler from '#server/api/roasters.get'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
import stockHandler from '#server/api/shelves/[shelfId]/stock.get'
import { createShelf } from '#server/utils/shelves'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase, createTestUser } from '#test/support/database'

type TestAuth = Awaited<ReturnType<typeof createTestAuth>>

const current = vi.hoisted(() => ({
  auth: undefined as unknown,
  db: undefined as unknown,
}))

vi.mock('#server/utils/auth', async importOriginal => ({
  ...(await importOriginal<object>()),
  useAuth: () => (current.auth as TestAuth).auth,
}))

vi.mock('#server/utils/db', () => ({
  useDb: () => current.db,
}))

let testAuth: TestAuth
let db: Awaited<ReturnType<typeof createTestDatabase>>['db']

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
})

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/roasters', roastersHandler)
    .get('/api/shelves/:shelfId/stock', stockHandler)
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .get('/api/shelves/:shelfId/coffees/:coffeeId', showCoffeeHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

async function member() {
  const user = await createTestUser(db)
  const shelf = await createShelf(db, { name: 'Home', ownerId: user.id })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')

  return { user, shelf, headers }
}

const coffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  colour: '#e4572e',
  purchasedOn: '2026-11-01',
  roastedOn: '2026-10-28',
  sizeGrams: 250,
  price: 16.5,
}

function add(shelfId: string, headers: Headers, body: unknown = coffee) {
  return request(`/api/shelves/${shelfId}/coffees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('adding a coffee to a shelf', () => {
  it('adds it to the current stock of that shelf', async () => {
    const { shelf, headers } = await member()

    const added = await add(shelf.id, headers)
    const stock = await request(`/api/shelves/${shelf.id}/stock`, { headers })

    expect(added.status).toBe(201)
    expect(await stock.json()).toEqual([
      expect.objectContaining({
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedOn: '2026-10-28',
      }),
    ])
  })

  it('explains what is wrong in plain words', async () => {
    const { shelf, headers } = await member()

    const response = await add(shelf.id, headers, { ...coffee, name: ' ' })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.statusMessage).toBe('Give the coffee a name')
    expect(body.data).toEqual({ errors: { name: 'Give the coffee a name' } })
  })

  it('refuses anonymous requests', async () => {
    const { shelf } = await member()

    const response = await add(shelf.id, new Headers())

    expect(response.status).toBe(401)
  })
})

describe('a shelf someone is not a member of', () => {
  async function stranger() {
    const { shelf, headers: memberHeaders } = await member()
    const added = await add(shelf.id, memberHeaders)
    const { coffee: created } = await added.json()
    const outsider = await createTestUser(db)
    const headers = await testAuth.signIn(outsider.id)
    headers.set('content-type', 'application/json')

    return { shelf, coffeeId: created.id as string, headers }
  }

  it('shows them no stock', async () => {
    const { shelf, headers } = await stranger()

    const response = await request(`/api/shelves/${shelf.id}/stock`, {
      headers,
    })

    expect(response.status).toBe(404)
  })

  it('shows them none of its purchases', async () => {
    const { shelf, coffeeId, headers } = await stranger()

    const response = await request(
      `/api/shelves/${shelf.id}/coffees/${coffeeId}`,
      { headers },
    )

    expect(response.status).toBe(404)
  })

  it('does not let them add to it', async () => {
    const { shelf, headers } = await stranger()

    const response = await add(shelf.id, headers)

    expect(response.status).toBe(404)
  })
})

describe('GET /api/shelves/:shelfId/coffees/:coffeeId', () => {
  it('shows a coffee with the purchases of the shelf', async () => {
    const { shelf, headers } = await member()
    const added = await add(shelf.id, headers)
    const { coffee: created } = await added.json()

    const response = await request(
      `/api/shelves/${shelf.id}/coffees/${created.id}`,
      { headers },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      name: 'Ayele Fulasa',
      purchases: [{ purchasedOn: '2026-11-01', priceCents: 1650 }],
    })
  })

  it('says when there is no such coffee', async () => {
    const { shelf, headers } = await member()

    const response = await request(`/api/shelves/${shelf.id}/coffees/nope`, {
      headers,
    })

    expect(response.status).toBe(404)
  })
})

describe('GET /api/roasters', () => {
  it('lists the roasters for anyone signed in', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers)

    const response = await request('/api/roasters', { headers })

    expect(await response.json()).toEqual([
      { id: expect.any(String), name: 'Square Mile' },
    ])
  })

  it('refuses anonymous requests', async () => {
    const response = await request('/api/roasters')

    expect(response.status).toBe(401)
  })
})
