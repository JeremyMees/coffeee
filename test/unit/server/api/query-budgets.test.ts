import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import meHandler from '#server/api/me.get'
import coffeeHandler from '#server/api/coffees/[coffeeId].get'
import catalogHandler from '#server/api/shelves/[shelfId]/catalog/index.get'
import shelfCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import libraryHandler from '#server/api/shelves/[shelfId]/library/index.get'
import roastersHandler from '#server/api/shelves/[shelfId]/roasters/index.get'
import stockHandler from '#server/api/shelves/[shelfId]/stock.get'
import { newTally, tallyQueries } from '#server/utils/query-tally'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase } from '#test/support/database'
import { createScenario } from '#test/support/scenarios'
import type { TestAuth, TestDatabase } from '#test/support/types'

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

const scenario = createScenario(async () => db)

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
})

const router = createRouter()
  .get('/api/me', meHandler)
  .get('/api/coffees/:coffeeId', coffeeHandler)
  .get('/api/shelves/:shelfId/catalog', catalogHandler)
  .get('/api/shelves/:shelfId/coffees/:coffeeId', shelfCoffeeHandler)
  .get('/api/shelves/:shelfId/library', libraryHandler)
  .get('/api/shelves/:shelfId/roasters', roastersHandler)
  .get('/api/shelves/:shelfId/stock', stockHandler)
const handle = toWebHandler(createApp().use(router))

async function shelfWithCoffees() {
  const sarah = await scenario.member('Sarah')
  const tom = await scenario.member('Tom')
  await scenario.joinShelf(tom, sarah.shelf)

  const ayele = await scenario.coffee(sarah.shelf)
  const kamwangi = await scenario.coffee(sarah.shelf, {
    name: 'Kamwangi',
    roaster: 'Origin',
    origins: ['KE'],
    processes: ['Natural'],
  })
  await scenario.coffee(
    sarah.shelf,
    { name: 'La Palma', roaster: 'Coffee Collective', origins: ['CO'] },
    tom,
  )
  await scenario.coffee(tom.shelf, { name: 'Gesha Village' })
  await scenario.bag(sarah.shelf, ayele.id)
  await scenario.verdict(sarah, ayele.id, { rating: 4, wouldBuyAgain: true })
  await scenario.verdict(tom, ayele.id, { rating: 5, wouldBuyAgain: true })
  await scenario.verdict(tom, kamwangi.id, { rating: 3, wouldBuyAgain: false })

  const headers = await testAuth.signIn(sarah.id)

  return { sarah, ayele, headers }
}

type Setup = Awaited<ReturnType<typeof shelfWithCoffees>>

const budgets: {
  route: string
  budget: number
  path: (setup: Setup) => string
}[] = [
  {
    route: 'the library',
    budget: 6,
    path: ({ sarah }) => `/api/shelves/${sarah.shelf.id}/library`,
  },
  {
    route: 'a library search',
    budget: 15,
    path: ({ sarah }) => `/api/shelves/${sarah.shelf.id}/library?search=ayele`,
  },
  {
    route: 'the catalog',
    budget: 6,
    path: ({ sarah }) => `/api/shelves/${sarah.shelf.id}/catalog`,
  },
  {
    route: 'a catalog search',
    budget: 15,
    path: ({ sarah }) => `/api/shelves/${sarah.shelf.id}/catalog?search=ayele`,
  },
  {
    route: 'the current stock',
    budget: 6,
    path: ({ sarah }) => `/api/shelves/${sarah.shelf.id}/stock`,
  },
  {
    route: 'the catalog coffee detail',
    budget: 13,
    path: ({ ayele }) => `/api/coffees/${ayele.id}`,
  },
  {
    route: 'the shelf coffee detail',
    budget: 14,
    path: ({ sarah, ayele }) =>
      `/api/shelves/${sarah.shelf.id}/coffees/${ayele.id}`,
  },
  {
    route: "the shelf's roasters",
    budget: 4,
    path: ({ sarah }) => `/api/shelves/${sarah.shelf.id}/roasters`,
  },
  {
    route: '/api/me',
    budget: 3,
    path: () => '/api/me',
  },
]

describe('query budgets', () => {
  it.each(budgets)(
    'keeps $route within $budget queries',
    async ({ route, budget, path }) => {
      const setup = await shelfWithCoffees()
      const tally = newTally()
      const response = await tallyQueries(tally, () =>
        handle(
          new Request(`http://localhost:3000${path(setup)}`, {
            headers: setup.headers,
          }),
        ),
      )

      expect(response.status, `${route} answered ${response.status}`).toBe(200)
      expect(
        tally.queries,
        `${route} made ${tally.queries} queries, over its budget of ${budget}`,
      ).toBeLessThanOrEqual(budget)
    },
  )
})
