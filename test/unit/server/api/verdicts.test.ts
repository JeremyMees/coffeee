import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shelfMember } from '#server/db/schemas'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import sharedCoffeeHandler from '#server/api/coffees/[coffeeId].get'
import verdictHandler from '#server/api/coffees/[coffeeId]/verdict.patch'
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
    .get('/api/coffees/:coffeeId', sharedCoffeeHandler)
    .patch('/api/coffees/:coffeeId/verdict', verdictHandler)
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
      origins: ['ET'],
      processes: ['Washed'],
      purchasedOn: '2026-09-01',
    }),
  })
  const { coffee } = await added.json()

  return {
    shelf,
    coffeeId: coffee.id as string,
    tomId: tom.id,
    sarah: sarahHeaders,
    tom: await signedIn(tom.id),
    path: `/api/shelves/${shelf.id}/coffees/${coffee.id}`,
  }
}

function judge(coffeeId: string, headers: Headers, verdict: unknown) {
  return request(`/api/coffees/${coffeeId}/verdict`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(verdict),
  })
}

async function stranger() {
  return signedIn((await createTestUser(db)).id)
}

describe('PATCH /api/coffees/:coffeeId/verdict', () => {
  it('rates a coffee and says it would be bought again', async () => {
    const { sarah, coffeeId } = await sharedShelf()

    const response = await judge(coffeeId, sarah, {
      rating: 5,
      wouldBuyAgain: true,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ rating: 5, wouldBuyAgain: true })
  })

  it('keeps each member’s own verdict', async () => {
    const { shelf, coffeeId, tomId, sarah, tom, path } = await sharedShelf()

    await judge(coffeeId, sarah, { rating: 5, wouldBuyAgain: true })
    await judge(coffeeId, tom, { rating: 2 })

    const asSarah = await (await request(path, { headers: sarah })).json()
    const asTom = await (await request(path, { headers: tom })).json()
    const tomStock = await (
      await request(`/api/shelves/${shelf.id}/stock`, { headers: tom })
    ).json()

    expect(asSarah).toMatchObject({
      rating: 5,
      wouldBuyAgain: true,
      communityRating: { average: 3.5, raters: 2, wouldBuyAgain: 1 },
    })
    expect(asSarah.reviews).toHaveLength(2)
    expect(asSarah.reviews[1]).toMatchObject({
      userId: tomId,
      name: 'Tom',
      rating: 2,
      wouldBuyAgain: false,
      mine: false,
    })
    expect(asTom).toMatchObject({ rating: 2, wouldBuyAgain: false })
    expect(asTom.reviews[0]).toMatchObject({ name: 'Tom', mine: true })
    expect(tomStock[0]).toMatchObject({ rating: 2 })
    expect(tomStock[0]).not.toHaveProperty('communityRating')
  })

  it('never changes another member’s verdict', async () => {
    const { coffeeId, sarah, tom, path } = await sharedShelf()

    await judge(coffeeId, sarah, { rating: 4, wouldBuyAgain: true })
    await judge(coffeeId, tom, { rating: 1 })
    await judge(coffeeId, tom, { wouldBuyAgain: false })
    await judge(coffeeId, tom, { rating: null })

    const asSarah = await (await request(path, { headers: sarah })).json()

    expect(asSarah).toMatchObject({ rating: 4, wouldBuyAgain: true })
  })

  it('starts out not yet rated', async () => {
    const { sarah, path } = await sharedShelf()

    const coffee = await (await request(path, { headers: sarah })).json()

    expect(coffee).toMatchObject({
      rating: null,
      wouldBuyAgain: false,
      communityRating: { average: null, raters: 0, wouldBuyAgain: 0 },
      reviews: [],
    })
  })

  it('lets someone off the shelf review the coffee without touching the shelf’s verdicts', async () => {
    const { coffeeId, sarah, path } = await sharedShelf()
    const outsider = await stranger()

    const judged = await judge(coffeeId, outsider, { rating: 1 })
    const coffee = await (await request(path, { headers: sarah })).json()

    expect(judged.status).toBe(200)
    expect(coffee).toMatchObject({
      rating: null,
      communityRating: { average: 1, raters: 1 },
      reviews: [{ rating: 1, mine: false }],
    })
    expect((await request(path, { headers: outsider })).status).toBe(404)
  })

  it('shows reviews to everyone but keeps purchases and prices on the shelf', async () => {
    const { coffeeId, sarah, tom } = await sharedShelf()
    const outsider = await stranger()

    await judge(coffeeId, sarah, { rating: 5, wouldBuyAgain: true })
    await judge(coffeeId, tom, { rating: 3 })

    const response = await request(`/api/coffees/${coffeeId}`, {
      headers: outsider,
    })
    const coffee = await response.json()

    expect(response.status).toBe(200)
    expect(coffee).toMatchObject({
      rating: null,
      communityRating: { average: 4, raters: 2, wouldBuyAgain: 1 },
      shelves: [],
    })
    expect(
      coffee.reviews.map((review: { name: string }) => review.name).sort(),
    ).toEqual(['Sarah', 'Tom'])
    expect(coffee).not.toHaveProperty('purchases')
    expect(JSON.stringify(coffee)).not.toContain('priceCents')
  })

  it('asks to sign in first', async () => {
    const { coffeeId } = await sharedShelf()

    const response = await request(`/api/coffees/${coffeeId}/verdict`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating: 4 }),
    })

    expect(response.status).toBe(401)
  })

  it('explains a rating outside one to five stars', async () => {
    const { coffeeId, sarah } = await sharedShelf()

    const response = await judge(coffeeId, sarah, { rating: 6 })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      rating: 'Rate it from 1 to 5 stars',
    })
  })

  it('finds no coffee that does not exist', async () => {
    const { sarah } = await sharedShelf()

    const response = await judge('missing', sarah, { rating: 4 })

    expect(response.status).toBe(404)
  })
})
