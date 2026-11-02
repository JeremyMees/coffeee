import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import finishCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/finish.post'
import deletePurchaseHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/purchases/[purchaseId].delete'
import editPurchaseHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/purchases/[purchaseId].patch'
import finishPurchaseHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/purchases/[purchaseId]/finish.post'
import buyAgainHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/purchases/index.post'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
import stockHandler from '#server/api/shelves/[shelfId]/stock.get'
import { createShelf } from '#server/utils/shelves'
import { createTestAuth } from '#test/support/auth'
import type { TestAuth, TestDatabase } from '#test/support/types'
import { createTestDatabase, createTestUser } from '#test/support/database'

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
let db: TestDatabase

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
})

const coffeePath = '/api/shelves/:shelfId/coffees/:coffeeId'
const purchasePath = `${coffeePath}/purchases/:purchaseId`

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/shelves/:shelfId/stock', stockHandler)
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .get(coffeePath, showCoffeeHandler)
    .post(`${coffeePath}/finish`, finishCoffeeHandler)
    .post(`${coffeePath}/purchases`, buyAgainHandler)
    .patch(purchasePath, editPurchaseHandler)
    .delete(purchasePath, deletePurchaseHandler)
    .post(`${purchasePath}/finish`, finishPurchaseHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

const bag = {
  purchasedOn: '2026-11-01',
  roastedOn: '2026-10-28',
  sizeGrams: 250,
  price: 16.5,
}

async function shelfWithCoffee() {
  const user = await createTestUser(db)
  const shelf = await createShelf(db, { name: 'Home', ownerId: user.id })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')
  const added = await request(`/api/shelves/${shelf.id}/coffees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
      roastLevel: 'light',
      roastedFor: 'filter',
      colour: '#e4572e',
      origins: ['ET'],
      processes: ['Washed'],
      ...bag,
      purchasedOn: '2026-09-01',
    }),
  })
  const { coffee, purchase } = await added.json()
  const path = `/api/shelves/${shelf.id}/coffees/${coffee.id}`

  return {
    shelf,
    headers,
    path,
    purchasePath: `${path}/purchases/${purchase.id}`,
  }
}

async function purchasesAt(path: string, headers: Headers) {
  const response = await request(path, { headers })

  return (await response.json()).purchases
}

async function stockOf(shelfId: string, headers: Headers) {
  const response = await request(`/api/shelves/${shelfId}/stock`, { headers })

  return response.json()
}

async function stranger() {
  const outsider = await createTestUser(db)
  const headers = await testAuth.signIn(outsider.id)
  headers.set('content-type', 'application/json')

  return headers
}

describe('POST /api/shelves/:shelfId/coffees/:coffeeId/purchases', () => {
  it('adds another purchase of the same coffee', async () => {
    const { headers, path } = await shelfWithCoffee()

    const response = await request(`${path}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bag),
    })

    expect(response.status).toBe(201)
    expect(await purchasesAt(path, headers)).toMatchObject([
      { purchasedOn: '2026-11-01', priceCents: 1650, finishedAt: null },
      { purchasedOn: '2026-09-01' },
    ])
  })

  it('explains what is wrong in plain words', async () => {
    const { headers, path } = await shelfWithCoffee()

    const response = await request(`${path}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...bag, sizeGrams: 0 }),
    })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      sizeGrams: 'The size has to be more than 0 g',
    })
  })

  it('says when there is no such coffee', async () => {
    const { shelf, headers } = await shelfWithCoffee()

    const response = await request(
      `/api/shelves/${shelf.id}/coffees/nope/purchases`,
      { method: 'POST', headers, body: JSON.stringify(bag) },
    )

    expect(response.status).toBe(404)
  })

  it('refuses someone who is not a member of the shelf', async () => {
    const { path } = await shelfWithCoffee()

    const response = await request(`${path}/purchases`, {
      method: 'POST',
      headers: await stranger(),
      body: JSON.stringify(bag),
    })

    expect(response.status).toBe(404)
  })
})

describe('POST /api/shelves/:shelfId/coffees/:coffeeId/finish', () => {
  it('finishes the oldest purchase in stock and keeps the coffee in stock while one is left', async () => {
    const { shelf, headers, path } = await shelfWithCoffee()
    await request(`${path}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bag),
    })

    const response = await request(`${path}/finish`, {
      method: 'POST',
      headers,
    })

    expect(response.status).toBe(200)
    expect(await purchasesAt(path, headers)).toMatchObject([
      { purchasedOn: '2026-11-01', finishedAt: null },
      { purchasedOn: '2026-09-01', finishedAt: expect.any(String) },
    ])
    expect(await stockOf(shelf.id, headers)).toHaveLength(1)
  })

  it('takes a coffee with nothing left in stock out of Current stock', async () => {
    const { shelf, headers, path } = await shelfWithCoffee()

    await request(`${path}/finish`, { method: 'POST', headers })

    expect(await stockOf(shelf.id, headers)).toEqual([])
  })

  it('says when nothing is in stock', async () => {
    const { headers, path } = await shelfWithCoffee()
    await request(`${path}/finish`, { method: 'POST', headers })

    const response = await request(`${path}/finish`, {
      method: 'POST',
      headers,
    })

    expect(response.status).toBe(409)
    expect((await response.json()).statusMessage).toBe(
      'Nothing of this coffee is in stock',
    )
  })

  it('refuses someone who is not a member of the shelf', async () => {
    const { path } = await shelfWithCoffee()

    const response = await request(`${path}/finish`, {
      method: 'POST',
      headers: await stranger(),
    })

    expect(response.status).toBe(404)
  })
})

describe('a purchase in the history', () => {
  it('can be changed', async () => {
    const { headers, path, purchasePath } = await shelfWithCoffee()

    const response = await request(purchasePath, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ...bag, price: null, sizeGrams: '' }),
    })

    expect(response.status).toBe(200)
    expect(await purchasesAt(path, headers)).toMatchObject([
      { purchasedOn: '2026-11-01', sizeGrams: null, priceCents: null },
    ])
  })

  it('explains a change that makes no sense', async () => {
    const { headers, purchasePath } = await shelfWithCoffee()

    const response = await request(purchasePath, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ...bag, purchasedOn: 'yesterday' }),
    })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      purchasedOn: 'Enter the date you bought it',
    })
  })

  it('can be marked finished', async () => {
    const { headers, path, purchasePath } = await shelfWithCoffee()

    const response = await request(`${purchasePath}/finish`, {
      method: 'POST',
      headers,
    })

    expect(response.status).toBe(200)
    expect(await purchasesAt(path, headers)).toMatchObject([
      { finishedAt: expect.any(String) },
    ])
  })

  it('takes the coffee off the shelf once its last purchase is deleted, but keeps it in the catalog', async () => {
    const { shelf, headers, path, purchasePath } = await shelfWithCoffee()

    const response = await request(purchasePath, {
      method: 'DELETE',
      headers,
    })

    expect(response.status).toBe(200)
    expect(await stockOf(shelf.id, headers)).toEqual([])
    expect(await purchasesAt(path, headers)).toEqual([])
    expect((await request(path, { headers })).status).toBe(200)
  })

  it('says when there is no such purchase', async () => {
    const { headers, path } = await shelfWithCoffee()
    const missing = `${path}/purchases/nope`

    const responses = await Promise.all([
      request(missing, { method: 'PATCH', headers, body: JSON.stringify(bag) }),
      request(`${missing}/finish`, { method: 'POST', headers }),
      request(missing, { method: 'DELETE', headers }),
    ])

    expect(responses.map(response => response.status)).toEqual([404, 404, 404])
  })

  it('cannot be touched by someone who is not a member of the shelf', async () => {
    const { headers, path, purchasePath } = await shelfWithCoffee()
    const outsider = await stranger()

    const responses = await Promise.all([
      request(purchasePath, {
        method: 'PATCH',
        headers: outsider,
        body: JSON.stringify(bag),
      }),
      request(`${purchasePath}/finish`, { method: 'POST', headers: outsider }),
      request(purchasePath, { method: 'DELETE', headers: outsider }),
    ])

    expect(responses.map(response => response.status)).toEqual([404, 404, 404])
    expect(await purchasesAt(path, headers)).toMatchObject([
      { purchasedOn: '2026-09-01', finishedAt: null },
    ])
  })
})
