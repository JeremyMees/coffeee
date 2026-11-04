import { describe, expect, it } from 'vitest'
import {
  canEditCatalogEntry,
  listCatalog,
  listCatalogFilterOptions,
} from '#server/utils/catalog'
import { addCoffee } from '#server/utils/coffees'
import { createShelf } from '#server/utils/shelves'
import { judgeCoffee } from '#server/utils/verdicts'
import type { CatalogFilterKind, CatalogSearch } from '#shared/types/catalog'
import type { NewCoffee } from '#shared/types/coffee'
import {
  catalogSearchSchema,
  libraryFilterSearchSchema,
} from '#shared/utils/schemas'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { testOrigin } from '#test/support/origin'

describe('canEditCatalogEntry', () => {
  it('lets the person who added an entry edit it', () => {
    expect(canEditCatalogEntry({ id: 'sarah', role: 'user' }, 'sarah')).toBe(
      true,
    )
  })

  it('lets an admin edit any entry', () => {
    expect(canEditCatalogEntry({ id: 'ada', role: 'admin' }, 'sarah')).toBe(
      true,
    )
    expect(canEditCatalogEntry({ id: 'ada', role: 'admin' }, null)).toBe(true)
  })

  it('refuses everyone else', () => {
    expect(canEditCatalogEntry({ id: 'tom', role: 'user' }, 'sarah')).toBe(
      false,
    )
    expect(canEditCatalogEntry({ id: 'tom' }, null)).toBe(false)
  })
})

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

async function addTo(
  { db }: Setup,
  shelf: { id: string; ownerId: string },
  overrides: Partial<NewCoffee> = {},
) {
  const { coffee } = await addCoffee(db, {
    shelfId: shelf.id,
    userId: shelf.ownerId,
    coffee: newCoffee(overrides),
    origin: testOrigin,
  })

  return coffee.id
}

async function catalog(
  { db, home }: Setup,
  query: Record<string, string> = {},
) {
  return listCatalog(db, {
    shelfId: home.id,
    search: catalogSearchSchema.parse(query) as CatalogSearch,
  })
}

async function names(setup: Setup, query: Record<string, string> = {}) {
  return (await catalog(setup, query)).coffees.map(coffee => coffee.name)
}

async function twoShelvesOfCoffee(setup: Setup) {
  await addTo(setup, setup.home, {
    flavorNotes: ['Lime'],
    origins: ['ET', 'KE'],
    regions: [{ name: 'Guji', origin: 'ET' }],
    washingStations: [{ name: 'Kochere', origin: 'ET' }],
    varietals: ['Heirloom'],
  })
  await addTo(setup, setup.work, {
    name: 'El Paraiso',
    roaster: 'La Cabra',
    roastLevel: 'medium',
    roastedFor: 'espresso',
    flavorNotes: ['Strawberry'],
    origins: ['CO'],
    producers: ['Diego Bermudez'],
    farms: [{ name: 'Finca El Paraiso', origin: 'CO' }],
    processes: ['Anaerobic'],
    varietals: ['Geisha', 'Pink Bourbon'],
    price: 24,
  })
  await addTo(setup, setup.work, {
    name: 'Red Brick',
    roastLevel: 'dark',
    roastedFor: 'espresso',
    flavorNotes: ['Milk Chocolate'],
    origins: ['BR'],
  })
}

describe('the catalog', () => {
  it('lists every coffee anyone added, newest first, marking the shelf’s own', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)

    const { total, coffees } = await catalog(context)

    expect(total).toBe(3)
    expect(coffees.map(coffee => [coffee.name, coffee.onShelf])).toEqual([
      ['Red Brick', false],
      ['El Paraiso', false],
      ['Ayele Fulasa', true],
    ])
  })

  it('never shows the purchases or prices of other shelves', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)

    const { coffees } = await catalog(context)
    const paraiso = coffees.find(coffee => coffee.name === 'El Paraiso')!
    const ayele = coffees.find(coffee => coffee.name === 'Ayele Fulasa')!

    expect(paraiso).toEqual({
      id: expect.any(String),
      name: 'El Paraiso',
      roaster: 'La Cabra',
      roasterId: expect.any(String),
      roastLevel: 'medium',
      roastedFor: 'espresso',
      photoUrl: null,
      roastedOn: null,
      communityRating: { average: null, raters: 0 },
      onShelf: false,
      flavorNotes: [{ id: expect.any(String), name: 'Strawberry' }],
      origins: [{ code: 'CO', name: 'Colombia' }],
      matches: [],
    })
    expect(ayele.roastedOn).toBe('2026-10-28')
  })

  it('shows the community rating, not the viewer’s own', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)
    const [paraiso] = (await catalog(context, { search: 'paraiso' })).coffees
    for (const [userId, rating] of [
      [context.sarah.id, 5],
      [context.tom.id, 2],
    ] as const) {
      await judgeCoffee(context.db, {
        userId,
        coffeeId: paraiso!.id,
        verdict: { rating },
      })
    }

    const [rated] = (await catalog(context, { search: 'paraiso' })).coffees

    expect(rated).toMatchObject({
      communityRating: { average: 3.5, raters: 2 },
    })
    expect(rated).not.toHaveProperty('rating')
  })

  it('sorts by community rating, with unrated coffees last', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)
    const { coffees } = await catalog(context)
    const byName = Object.fromEntries(
      coffees.map(coffee => [coffee.name, coffee.id]),
    )
    const judge = (userId: string, name: string, rating: number) =>
      judgeCoffee(context.db, {
        userId,
        coffeeId: byName[name]!,
        verdict: { rating },
      })
    await judge(context.sarah.id, 'Ayele Fulasa', 4)
    await judge(context.sarah.id, 'El Paraiso', 4)
    await judge(context.tom.id, 'El Paraiso', 5)

    expect(await names(context, { sort: 'communityRating' })).toEqual([
      'El Paraiso',
      'Ayele Fulasa',
      'Red Brick',
    ])
    expect(await names(context)).toEqual([
      'Red Brick',
      'El Paraiso',
      'Ayele Fulasa',
    ])
  })

  it('keeps only the shelf’s own coffees with Mine', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)

    expect(await names(context, { mine: 'true' })).toEqual(['Ayele Fulasa'])
  })

  it.each([
    ['name', 'brick', 'Red Brick', { field: 'name', name: 'Red Brick' }],
    ['roaster', 'cabra', 'El Paraiso', { field: 'roaster', name: 'La Cabra' }],
    [
      'flavor note',
      'strawb',
      'El Paraiso',
      { field: 'flavorNotes', name: 'Strawberry' },
    ],
    [
      'varietal',
      'geisha',
      'El Paraiso',
      { field: 'varietals', name: 'Geisha' },
    ],
    [
      'washing station',
      'koche',
      'Ayele Fulasa',
      { field: 'washingStations', name: 'Kochere' },
    ],
  ])(
    'finds a coffee by its %s and says what matched',
    async (_, search, name, match) => {
      const context = await setup()
      await twoShelvesOfCoffee(context)

      const { coffees } = await catalog(context, { search })

      expect(coffees.map(coffee => coffee.name)).toEqual([name])
      expect(coffees[0]!.matches).toContainEqual(match)
    },
  )

  it('lists every match of a coffee', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)

    const [paraiso] = (await catalog(context, { search: 'paraiso' })).coffees

    expect(paraiso!.matches).toEqual([
      { field: 'name', name: 'El Paraiso' },
      { field: 'farms', name: 'Finca El Paraiso' },
    ])
  })

  it('filters by flavor note, origin, roaster, process, varietal, roast level and roasted for, and combines them', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)
    const options = async (kind: CatalogFilterKind) =>
      (
        await listCatalogFilterOptions(context.db, {
          kind,
          search: libraryFilterSearchSchema.parse({}),
        })
      ).options
    const squareMile = (await options('roasters')).find(
      option => option.label === 'Square Mile',
    )!
    const lime = (await options('flavor-notes')).find(
      option => option.label === 'Lime',
    )!
    const anaerobic = (await options('processes')).find(
      option => option.label === 'Anaerobic',
    )!
    const geisha = (await options('varietals')).find(
      option => option.label === 'Geisha',
    )!

    expect(await names(context, { roasterId: squareMile.value })).toEqual([
      'Red Brick',
      'Ayele Fulasa',
    ])
    expect(await names(context, { flavorNoteId: lime.value })).toEqual([
      'Ayele Fulasa',
    ])
    expect(await names(context, { processId: anaerobic.value })).toEqual([
      'El Paraiso',
    ])
    expect(await names(context, { varietalId: geisha.value })).toEqual([
      'El Paraiso',
    ])
    expect(
      await names(context, { varietalId: geisha.value, search: 'cabra' }),
    ).toEqual(['El Paraiso'])
    expect(
      await names(context, { varietalId: geisha.value, search: 'lime' }),
    ).toEqual([])
    expect(await names(context, { originCode: 'BR' })).toEqual(['Red Brick'])
    expect(await names(context, { roastLevel: 'medium' })).toEqual([
      'El Paraiso',
    ])
    expect(await names(context, { roastedFor: 'espresso' })).toEqual([
      'Red Brick',
      'El Paraiso',
    ])
    expect(
      await names(context, {
        roastedFor: 'espresso',
        roasterId: squareMile.value,
      }),
    ).toEqual(['Red Brick'])
    expect(
      await names(context, { roastedFor: 'espresso', mine: 'true' }),
    ).toEqual([])
  })

  it('pages through the coffees and counts them all', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)

    const second = await catalog(context, { page: '1', pageSize: '2' })

    expect(second.total).toBe(3)
    expect(second.coffees.map(coffee => coffee.name)).toEqual(['Ayele Fulasa'])
  })
})

describe('the catalog filter options', () => {
  async function options(
    { db }: Setup,
    kind: CatalogFilterKind,
    query: Record<string, string> = {},
  ) {
    return listCatalogFilterOptions(db, {
      kind,
      search: libraryFilterSearchSchema.parse(query),
    })
  }

  function labels(found: { options: { label: string }[] }) {
    return found.options.map(option => option.label)
  }

  it('offers what any coffee uses, each once and by name', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)

    expect(labels(await options(context, 'roasters'))).toEqual([
      'La Cabra',
      'Square Mile',
    ])
    expect(labels(await options(context, 'flavor-notes'))).toEqual([
      'Lime',
      'Milk Chocolate',
      'Strawberry',
    ])
    expect(labels(await options(context, 'origins'))).toEqual([
      'Brazil',
      'Colombia',
      'Ethiopia',
      'Kenya',
    ])
    expect(labels(await options(context, 'processes'))).toEqual([
      'Anaerobic',
      'Washed',
    ])
    expect(labels(await options(context, 'varietals'))).toEqual([
      'Geisha',
      'Heirloom',
      'Pink Bourbon',
    ])
  })

  it('offers every roast level and brew style', async () => {
    const context = await setup()

    expect(labels(await options(context, 'roast-levels'))).toEqual([
      'Light',
      'Medium',
      'Medium-Dark',
      'Dark',
    ])
    expect(await options(context, 'roasted-for')).toEqual({
      options: [
        { value: 'espresso', label: 'Espresso' },
        { value: 'filter', label: 'Filter' },
        { value: 'omni', label: 'Omni' },
      ],
      hasMore: false,
    })
  })

  it('narrows the options to what was typed and pages through them', async () => {
    const context = await setup()
    await twoShelvesOfCoffee(context)

    expect(
      labels(await options(context, 'roast-levels', { search: 'dark' })),
    ).toEqual(['Medium-Dark', 'Dark'])
    expect(
      labels(await options(context, 'flavor-notes', { search: 'li' })),
    ).toEqual(['Lime'])
    expect(
      await options(context, 'roast-levels', { page: '1', pageSize: '3' }),
    ).toEqual({ options: [{ value: 'dark', label: 'Dark' }], hasMore: false })
    expect(
      await options(context, 'origins', { page: '0', pageSize: '3' }),
    ).toMatchObject({ hasMore: true })
  })
})
