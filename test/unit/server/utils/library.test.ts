import { describe, expect, it } from 'vitest'
import { purchase } from '#server/db/schemas'
import { addCoffee } from '#server/utils/coffees'
import { listLibrary, listLibraryFilterOptions } from '#server/utils/library'
import { addPurchase } from '#server/utils/purchases'
import { createShelf } from '#server/utils/shelves'
import { judgeCoffee } from '#server/utils/verdicts'
import type { NewCoffee } from '#shared/types/coffee'
import type { LibrarySearch } from '#shared/types/library'
import {
  libraryFilterSearchSchema,
  librarySearchSchema,
} from '#shared/utils/schemas'
import { createTestDatabase, createTestUser } from '#test/support/database'

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: tom.id })

  return { db, sarah, tom, home, work }
}

type Setup = Awaited<ReturnType<typeof setup>>

function newCoffee(overrides: Partial<NewCoffee> = {}): NewCoffee {
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
    processes: ['Washed'],
    varietals: [],
    flavorNotes: [],
    link: null,
    altitudeFrom: null,
    altitudeTo: null,
    purchasedOn: '2026-11-01',
    roastedOn: '2026-10-28',
    sizeGrams: 250,
    price: 16.5,
    ...overrides,
  }
}

async function add(
  { db, sarah, home }: Setup,
  overrides: Partial<NewCoffee> = {},
) {
  const { coffee } = await addCoffee(db, {
    shelfId: home.id,
    userId: sarah.id,
    coffee: newCoffee(overrides),
  })

  return coffee.id
}

async function library(
  { db, sarah, home }: Setup,
  query: Record<string, string> = {},
) {
  return listLibrary(db, {
    shelfId: home.id,
    userId: sarah.id,
    search: librarySearchSchema.parse(query) as LibrarySearch,
  })
}

async function names(setup: Setup, query: Record<string, string> = {}) {
  return (await library(setup, query)).coffees.map(coffee => coffee.name)
}

async function threeCoffees(setup: Setup) {
  const ayele = await add(setup, {
    flavorNotes: ['Lime'],
    origins: ['ET', 'KE'],
    purchasedOn: '2026-11-01',
  })
  const paraiso = await add(setup, {
    name: 'El Paraiso',
    roaster: 'La Cabra',
    roastLevel: 'medium',
    flavorNotes: ['Jasmine'],
    origins: ['CO'],
    purchasedOn: '2026-10-01',
    price: 24,
  })
  await add(setup, {
    name: 'Red Brick',
    roastLevel: 'dark',
    flavorNotes: ['Lime'],
    origins: ['BR'],
    purchasedOn: '2026-09-01',
    price: null,
  })
  await judgeCoffee(setup.db, {
    userId: setup.sarah.id,
    coffeeId: ayele,
    verdict: { rating: 5, wouldBuyAgain: true },
  })
  await judgeCoffee(setup.db, {
    userId: setup.sarah.id,
    coffeeId: paraiso,
    verdict: { rating: 4, wouldBuyAgain: false },
  })
}

describe('the library', () => {
  it('lists every coffee the shelf ever bought, finished or not', async () => {
    const context = await setup()
    await add(context, { flavorNotes: ['Lime'], origins: ['ET', 'KE'] })
    await addCoffee(context.db, {
      shelfId: context.work.id,
      userId: context.tom.id,
      coffee: newCoffee({ name: 'Red Brick' }),
    })
    await context.db.update(purchase).set({ finishedAt: new Date() })

    expect(await library(context)).toEqual({
      total: 1,
      coffees: [
        {
          id: expect.any(String),
          name: 'Ayele Fulasa',
          roaster: 'Square Mile',
          roasterId: expect.any(String),
          roastLevel: 'light',
          roastedFor: 'filter',
          photoUrl: null,
          roastedOn: '2026-10-28',
          lastBought: '2026-11-01',
          rating: null,
          wouldBuyAgain: false,
          latestPriceCents: 1650,
          flavorNotes: [{ id: expect.any(String), name: 'Lime' }],
          origins: [
            { code: 'ET', name: 'Ethiopia' },
            { code: 'KE', name: 'Kenya' },
          ],
        },
      ],
    })
  })

  it('puts the coffee bought last first', async () => {
    const context = await setup()
    const older = await add(context, {
      name: 'Older',
      purchasedOn: '2026-09-01',
    })
    await add(context, { name: 'Newer', purchasedOn: '2026-10-01' })
    await addPurchase(context.db, {
      shelfId: context.home.id,
      coffeeId: older,
      userId: context.sarah.id,
      purchase: {
        purchasedOn: '2026-11-01',
        roastedOn: null,
        sizeGrams: null,
        price: null,
      },
    })

    expect(await names(context)).toEqual(['Older', 'Newer'])
  })

  it('shows the price of the newest bag that has one', async () => {
    const context = await setup()
    const added = await add(context, { purchasedOn: '2026-09-01', price: 14 })
    for (const [purchasedOn, price] of [
      ['2026-10-01', 18],
      ['2026-11-01', null],
    ] as const) {
      await addPurchase(context.db, {
        shelfId: context.home.id,
        coffeeId: added,
        userId: context.sarah.id,
        purchase: { purchasedOn, roastedOn: null, sizeGrams: 250, price },
      })
    }

    const { coffees } = await library(context)

    expect(coffees[0]!.latestPriceCents).toBe(1800)
  })

  it("shows the viewer's own verdict, not another member's", async () => {
    const context = await setup()
    const added = await add(context)
    await judgeCoffee(context.db, {
      userId: context.tom.id,
      coffeeId: added,
      verdict: { rating: 2, wouldBuyAgain: true },
    })

    const { coffees } = await library(context)

    expect(coffees[0]).toMatchObject({ rating: null, wouldBuyAgain: false })
  })

  it('keeps only the favourites of the viewer', async () => {
    const context = await setup()
    await threeCoffees(context)

    expect(await names(context, { favourites: 'true' })).toEqual([
      'Ayele Fulasa',
    ])
  })

  it('filters by roaster, flavor note and origin, and combines them', async () => {
    const context = await setup()
    await threeCoffees(context)
    const { coffees } = await library(context)
    const ayele = coffees[0]!
    const lime = ayele.flavorNotes[0]!.id

    expect(await names(context, { roasterId: ayele.roasterId })).toEqual([
      'Ayele Fulasa',
      'Red Brick',
    ])
    expect(await names(context, { flavorNoteId: lime })).toEqual([
      'Ayele Fulasa',
      'Red Brick',
    ])
    expect(await names(context, { originCode: 'CO' })).toEqual(['El Paraiso'])
    expect(
      await names(context, { flavorNoteId: lime, originCode: 'KE' }),
    ).toEqual(['Ayele Fulasa'])
    expect(
      await names(context, { favourites: 'true', originCode: 'CO' }),
    ).toEqual([])
  })

  it('sorts by each column, with what is unknown last', async () => {
    const context = await setup()
    await threeCoffees(context)
    const sorted = (sort: string, direction: string) =>
      names(context, { sort, direction })

    expect(await sorted('rating', 'descending')).toEqual([
      'Ayele Fulasa',
      'El Paraiso',
      'Red Brick',
    ])
    expect(await sorted('rating', 'ascending')).toEqual([
      'El Paraiso',
      'Ayele Fulasa',
      'Red Brick',
    ])
    expect(await sorted('roaster', 'ascending')).toEqual([
      'El Paraiso',
      'Ayele Fulasa',
      'Red Brick',
    ])
    expect(await sorted('origin', 'descending')).toEqual([
      'Ayele Fulasa',
      'El Paraiso',
      'Red Brick',
    ])
    expect(await sorted('roastLevel', 'descending')).toEqual([
      'Red Brick',
      'El Paraiso',
      'Ayele Fulasa',
    ])
    expect(await sorted('latestPrice', 'descending')).toEqual([
      'El Paraiso',
      'Ayele Fulasa',
      'Red Brick',
    ])
    expect(await sorted('lastBought', 'ascending')).toEqual([
      'Red Brick',
      'El Paraiso',
      'Ayele Fulasa',
    ])
  })

  it('pages through the coffees and counts them all', async () => {
    const context = await setup()
    await threeCoffees(context)

    const first = await library(context, { pageSize: '2' })
    const second = await library(context, { pageSize: '2', page: '1' })

    expect(first.total).toBe(3)
    expect(first.coffees.map(coffee => coffee.name)).toEqual([
      'Ayele Fulasa',
      'El Paraiso',
    ])
    expect(second.coffees.map(coffee => coffee.name)).toEqual(['Red Brick'])
  })
})

describe('the library filter options', () => {
  async function options(
    context: Setup,
    kind: 'roasters' | 'flavor-notes' | 'origins',
    query: Record<string, string> = {},
  ) {
    return listLibraryFilterOptions(context.db, {
      shelfId: context.home.id,
      kind,
      search: libraryFilterSearchSchema.parse(query),
    })
  }

  function labels(found: { options: { label: string }[] }) {
    return found.options.map(option => option.label)
  }

  it('offers what the shelf bought, each once and by name', async () => {
    const context = await setup()
    await threeCoffees(context)
    await addCoffee(context.db, {
      shelfId: context.work.id,
      userId: context.tom.id,
      coffee: newCoffee({ roaster: 'Tim Wendelboe', origins: ['RW'] }),
    })

    expect(labels(await options(context, 'roasters'))).toEqual([
      'La Cabra',
      'Square Mile',
    ])
    expect(labels(await options(context, 'flavor-notes'))).toEqual([
      'Jasmine',
      'Lime',
    ])
    expect(await options(context, 'origins')).toEqual({
      options: [
        { value: 'BR', label: 'Brazil' },
        { value: 'CO', label: 'Colombia' },
        { value: 'ET', label: 'Ethiopia' },
        { value: 'KE', label: 'Kenya' },
      ],
      hasMore: false,
    })
  })

  it('narrows the options to what was typed', async () => {
    const context = await setup()
    await threeCoffees(context)

    expect(
      labels(await options(context, 'roasters', { search: 'squ' })),
    ).toEqual(['Square Mile'])
    expect(
      labels(await options(context, 'flavor-notes', { search: 'JAS' })),
    ).toEqual(['Jasmine'])
    expect(
      labels(await options(context, 'origins', { search: 'ken' })),
    ).toEqual(['Kenya'])
  })

  it('pages through the options', async () => {
    const context = await setup()
    await threeCoffees(context)

    const first = await options(context, 'origins', { pageSize: '2' })
    const second = await options(context, 'origins', {
      pageSize: '2',
      page: '1',
    })

    expect(first).toMatchObject({ hasMore: true })
    expect(labels(first)).toEqual(['Brazil', 'Colombia'])
    expect(second).toEqual({
      options: [
        { value: 'ET', label: 'Ethiopia' },
        { value: 'KE', label: 'Kenya' },
      ],
      hasMore: false,
    })
  })
})
