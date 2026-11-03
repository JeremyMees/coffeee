import { describe, expect, it } from 'vitest'
import { addCoffee } from '#server/utils/coffees'
import { createShelf } from '#server/utils/shelves'
import { profileStatsOf } from '#server/utils/stats'
import { judgeCoffee } from '#server/utils/verdicts'
import type { NewCoffee } from '#shared/types/coffee'
import { createTestDatabase, createTestUser } from '#test/support/database'

function bag(overrides: Partial<NewCoffee> = {}): NewCoffee {
  return {
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
    ...overrides,
  }
}

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })

  return { db, sarah, tom, home, work }
}

describe('profileStatsOf', () => {
  it('starts at zero for someone who bought and rated nothing', async () => {
    const { db, sarah } = await setup()

    expect(await profileStatsOf(db, sarah.id)).toEqual({
      bags: 0,
      grams: 0,
      spentCents: 0,
      rated: 0,
      averageRating: null,
      wouldBuyAgain: 0,
      topRoaster: null,
    })
  })

  it('sums up the bags they added and the coffees they rated, on every shelf', async () => {
    const { db, sarah, tom, home, work } = await setup()
    const ayele = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: bag(),
    })
    const kiamaina = await addCoffee(db, {
      shelfId: work.id,
      userId: sarah.id,
      coffee: bag({ name: 'Kiamaina', sizeGrams: 1000, price: 40 }),
    })
    await addCoffee(db, {
      shelfId: work.id,
      userId: sarah.id,
      coffee: bag({
        name: 'La Palma',
        roaster: 'Onyx',
        sizeGrams: null,
        price: null,
      }),
    })
    await addCoffee(db, {
      shelfId: home.id,
      userId: tom.id,
      coffee: bag({ name: 'Tom only', roaster: 'Onyx' }),
    })
    await judgeCoffee(db, {
      userId: sarah.id,
      coffeeId: ayele.coffee.id,
      verdict: { rating: 5, wouldBuyAgain: true },
    })
    await judgeCoffee(db, {
      userId: sarah.id,
      coffeeId: kiamaina.coffee.id,
      verdict: { rating: 2 },
    })
    await judgeCoffee(db, {
      userId: tom.id,
      coffeeId: ayele.coffee.id,
      verdict: { rating: 1, wouldBuyAgain: true },
    })

    expect(await profileStatsOf(db, sarah.id)).toEqual({
      bags: 3,
      grams: 1250,
      spentCents: 5650,
      rated: 2,
      averageRating: 3.5,
      wouldBuyAgain: 1,
      topRoaster: 'Square Mile',
    })
  })
})
