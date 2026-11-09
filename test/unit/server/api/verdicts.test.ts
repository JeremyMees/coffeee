import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shelfMember } from '#server/db/schemas'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import sharedCoffeeHandler from '#server/api/coffees/[coffeeId].get'
import reviewsHandler from '#server/api/coffees/[coffeeId]/reviews.get'
import shelvesHandler from '#server/api/coffees/[coffeeId]/shelves.get'
import getVerdictHandler from '#server/api/coffees/[coffeeId]/verdict.get'
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
    .get('/api/coffees/:coffeeId/verdict', getVerdictHandler)
    .get('/api/coffees/:coffeeId/reviews', reviewsHandler)
    .get('/api/coffees/:coffeeId/shelves', shelvesHandler)
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

async function verdictOf(coffeeId: string, headers: Headers) {
  const response = await request(`/api/coffees/${coffeeId}/verdict`, {
    headers,
  })

  return response.json()
}

async function reviewsOf(coffeeId: string, headers: Headers) {
  const response = await request(`/api/coffees/${coffeeId}/reviews`, {
    headers,
  })

  return response.json()
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
    const { shelf, coffeeId, tomId, sarah, tom } = await sharedShelf()

    await judge(coffeeId, sarah, { rating: 5, wouldBuyAgain: true })
    await judge(coffeeId, tom, { rating: 2 })

    const verdictSarah = await verdictOf(coffeeId, sarah)
    const verdictTom = await verdictOf(coffeeId, tom)
    const asSarah = await reviewsOf(coffeeId, sarah)
    const asTom = await reviewsOf(coffeeId, tom)
    const tomStock = await (
      await request(`/api/shelves/${shelf.id}/stock`, { headers: tom })
    ).json()

    expect(verdictSarah).toEqual({ rating: 5, wouldBuyAgain: true })
    expect(asSarah).toMatchObject({
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
    expect(verdictTom).toEqual({ rating: 2, wouldBuyAgain: false })
    expect(asTom.reviews[0]).toMatchObject({ name: 'Tom', mine: true })
    expect(tomStock[0]).toMatchObject({ rating: 2 })
    expect(tomStock[0]).not.toHaveProperty('communityRating')
  })

  it('never changes another member’s verdict', async () => {
    const { coffeeId, sarah, tom } = await sharedShelf()

    await judge(coffeeId, sarah, { rating: 4, wouldBuyAgain: true })
    await judge(coffeeId, tom, { rating: 1 })
    await judge(coffeeId, tom, { wouldBuyAgain: false })
    await judge(coffeeId, tom, { rating: null })

    expect(await verdictOf(coffeeId, sarah)).toEqual({
      rating: 4,
      wouldBuyAgain: true,
    })
  })

  it('starts out not yet rated', async () => {
    const { sarah, coffeeId } = await sharedShelf()

    expect(await verdictOf(coffeeId, sarah)).toEqual({
      rating: null,
      wouldBuyAgain: false,
    })
    expect(await reviewsOf(coffeeId, sarah)).toEqual({
      communityRating: { average: null, raters: 0, wouldBuyAgain: 0 },
      reviews: [],
    })
  })

  it('lets someone off the shelf review the coffee without touching the shelf’s verdicts', async () => {
    const { coffeeId, sarah, path } = await sharedShelf()
    const outsider = await stranger()

    const judged = await judge(coffeeId, outsider, { rating: 1 })

    expect(judged.status).toBe(200)
    expect(await verdictOf(coffeeId, sarah)).toMatchObject({ rating: null })
    expect(await reviewsOf(coffeeId, sarah)).toMatchObject({
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

    const parts = await Promise.all(
      ['', '/verdict', '/reviews', '/shelves'].map(async part => {
        const response = await request(`/api/coffees/${coffeeId}${part}`, {
          headers: outsider,
        })

        expect(response.status).toBe(200)

        return response.json()
      }),
    )
    const [coffee, verdict, reviews, shelves] = parts

    expect(verdict).toMatchObject({ rating: null })
    expect(reviews).toMatchObject({
      communityRating: { average: 4, raters: 2, wouldBuyAgain: 1 },
    })
    expect(
      reviews.reviews.map((review: { name: string }) => review.name).sort(),
    ).toEqual(['Sarah', 'Tom'])
    expect(shelves).toEqual([])
    expect(coffee).not.toHaveProperty('purchases')
    expect(JSON.stringify(parts)).not.toContain('priceCents')
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
