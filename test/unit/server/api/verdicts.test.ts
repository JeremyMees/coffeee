import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shelfMember } from '#server/db/schemas'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import verdictHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/verdict.patch'
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

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/shelves/:shelfId/stock', stockHandler)
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .get(coffeePath, showCoffeeHandler)
    .patch(`${coffeePath}/verdict`, verdictHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

async function signedIn(userId: string) {
  const headers = await testAuth.signIn(userId)
  headers.set('content-type', 'application/json')

  return headers
}

async function sharedShelf() {
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const shelf = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await db.insert(shelfMember).values({ shelfId: shelf.id, userId: tom.id })
  const sarahHeaders = await signedIn(sarah.id)
  const added = await request(`/api/shelves/${shelf.id}/coffees`, {
    method: 'POST',
    headers: sarahHeaders,
    body: JSON.stringify({
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
      roastLevel: 'light',
      roastedFor: 'filter',
      colour: '#e4572e',
      origins: ['ET'],
      processes: ['Washed'],
      purchasedOn: '2026-09-01',
    }),
  })
  const { coffee } = await added.json()

  return {
    shelf,
    sarah: sarahHeaders,
    tom: await signedIn(tom.id),
    path: `/api/shelves/${shelf.id}/coffees/${coffee.id}`,
  }
}

function judge(path: string, headers: Headers, verdict: unknown) {
  return request(`${path}/verdict`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(verdict),
  })
}

async function stranger() {
  return signedIn((await createTestUser(db)).id)
}

describe('PATCH /api/shelves/:shelfId/coffees/:coffeeId/verdict', () => {
  it('rates a coffee and says it would be bought again', async () => {
    const { sarah, path } = await sharedShelf()

    const response = await judge(path, sarah, {
      rating: 5,
      wouldBuyAgain: true,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ rating: 5, wouldBuyAgain: true })
  })

  it('lets every member see and change the same verdict', async () => {
    const { shelf, sarah, tom, path } = await sharedShelf()

    await judge(path, sarah, { rating: 5 })
    await judge(path, tom, { wouldBuyAgain: true })
    await judge(path, tom, { rating: 3 })

    for (const headers of [sarah, tom]) {
      const coffee = await (await request(path, { headers })).json()
      expect(coffee).toMatchObject({ rating: 3, wouldBuyAgain: true })

      const stock = await (
        await request(`/api/shelves/${shelf.id}/stock`, { headers })
      ).json()
      expect(stock[0]).toMatchObject({ rating: 3 })
    }
  })

  it('starts out not yet rated', async () => {
    const { sarah, path } = await sharedShelf()

    const coffee = await (await request(path, { headers: sarah })).json()

    expect(coffee).toMatchObject({ rating: null, wouldBuyAgain: false })
  })

  it('hides the verdict from anyone off the shelf', async () => {
    const { sarah, path } = await sharedShelf()
    await judge(path, sarah, { rating: 5 })
    const outsider = await stranger()

    const responses = await Promise.all([
      judge(path, outsider, { rating: 1 }),
      request(path, { headers: outsider }),
    ])

    expect(responses.map(response => response.status)).toEqual([404, 404])
    const coffee = await (await request(path, { headers: sarah })).json()
    expect(coffee.rating).toBe(5)
  })

  it('keeps the verdict out of the stranger’s own shelf', async () => {
    const { sarah, path } = await sharedShelf()
    await judge(path, sarah, { rating: 5, wouldBuyAgain: true })
    const outsider = await createTestUser(db)
    const own = await createShelf(db, { name: 'Mine', ownerId: outsider.id })
    const coffeeId = path.split('/').at(-1)

    const response = await request(
      `/api/shelves/${own.id}/coffees/${coffeeId}`,
      { headers: await signedIn(outsider.id) },
    )

    expect(await response.json()).toMatchObject({
      rating: null,
      wouldBuyAgain: false,
    })
  })

  it('asks to sign in first', async () => {
    const { path } = await sharedShelf()

    const response = await request(`${path}/verdict`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating: 4 }),
    })

    expect(response.status).toBe(401)
  })

  it('explains a rating outside one to five stars', async () => {
    const { sarah, path } = await sharedShelf()

    const response = await judge(path, sarah, { rating: 6 })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      rating: 'Rate it from 1 to 5 stars',
    })
  })

  it('finds no coffee that does not exist', async () => {
    const { shelf, sarah } = await sharedShelf()

    const response = await judge(
      `/api/shelves/${shelf.id}/coffees/missing`,
      sarah,
      { rating: 4 },
    )

    expect(response.status).toBe(404)
  })
})
