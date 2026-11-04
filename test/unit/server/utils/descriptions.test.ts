import { eq, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  coffee,
  farm,
  flavorNote,
  origin,
  processList,
  producer,
  purchase,
  region,
  varietal,
  washingStation,
} from '#server/db/schemas'
import { addCoffee } from '#server/utils/coffees'
import {
  cardDescriptionsOf,
  describeCoffee,
  describedWith,
  descriptionAdminLists,
  descriptionFilterOptions,
  descriptionOf,
  descriptionSearch,
  suggestDescriptions,
} from '#server/utils/descriptions'
import type { DescribedField } from '#server/utils/descriptions'
import { createShelf } from '#server/utils/shelves'
import type {
  CoffeeDescription,
  DescriptionListField,
  NewCoffee,
} from '#shared/types/coffee'
import { seededProcesses } from '#shared/utils/coffee'
import { originCodes, origins } from '#shared/utils/origins'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { testOrigin } from '#test/support/origin'

function described(
  overrides: Partial<CoffeeDescription> = {},
): CoffeeDescription {
  return {
    origins: [],
    regions: [],
    farms: [],
    washingStations: [],
    producers: [],
    processes: [],
    varietals: [],
    flavorNotes: [],
    ...overrides,
  }
}

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: tom.id })

  return { db, sarah, tom, home, work }
}

type Setup = Awaited<ReturnType<typeof setup>>

async function coffeeOn(
  { db }: Setup,
  shelf: { id: string; ownerId: string },
  name: string,
  description: Partial<CoffeeDescription> = {},
) {
  const bag: NewCoffee = {
    ...described({ origins: ['ET'], processes: ['Washed'] }),
    name,
    roaster: 'Square Mile',
    roastLevel: 'light',
    roastedFor: 'filter',
    link: null,
    altitudeFrom: null,
    altitudeTo: null,
    purchasedOn: '2026-11-01',
    roastedOn: null,
    sizeGrams: null,
    price: null,
  }
  const { coffee: added } = await addCoffee(db, {
    shelfId: shelf.id,
    userId: shelf.ownerId,
    coffee: bag,
    origin: testOrigin,
  })

  await describeCoffee(db, {
    coffeeId: added.id,
    userId: shelf.ownerId,
    description: described(description),
  })

  return added.id
}

async function describedCoffee(description: Partial<CoffeeDescription>) {
  const context = await setup()
  const coffeeId = await coffeeOn(
    context,
    context.home,
    'Huila Blend',
    description,
  )
  const redescribe = (changes: Partial<CoffeeDescription>) =>
    describeCoffee(context.db, {
      coffeeId,
      userId: context.sarah.id,
      description: described(changes),
    })
  const show = () => descriptionOf(context.db, coffeeId)

  return { ...context, coffeeId, redescribe, show }
}

async function threeCoffees(context: Setup) {
  await coffeeOn(context, context.home, 'Ayele Fulasa', {
    origins: ['ET', 'KE'],
    regions: [{ origin: 'ET', name: 'Guji' }],
    washingStations: [{ origin: 'ET', name: 'Hambela' }],
    flavorNotes: ['Lime'],
    processes: ['Washed'],
  })
  await coffeeOn(context, context.work, 'El Paraiso', {
    origins: ['CO'],
    farms: [{ origin: 'CO', name: 'Finca El Paraiso' }],
    producers: ['Diego Bermudez'],
    processes: ['Anaerobic'],
    varietals: ['Geisha'],
    flavorNotes: ['Strawberry', 'Lime'],
  })
  await coffeeOn(context, context.work, 'Red Brick', {
    origins: ['BR'],
    processes: ['Natural'],
    flavorNotes: ['Milk Chocolate'],
  })
}

async function idOf(
  db: Setup['db'],
  field: DescriptionListField,
  name: string,
) {
  const { table } = descriptionAdminLists[field]
  const [found] = await db
    .select({ id: sql<string>`${table.id}` })
    .from(table)
    .where(eq(table.name, name))

  return found!.id
}

describe('origins', () => {
  it('are seeded with every country', async () => {
    const { db } = await createTestDatabase()

    const seeded = await db.select().from(origin)

    expect(seeded).toHaveLength(originCodes.length)
    expect(seeded).toContainEqual({ code: 'CO', name: origins.CO })
  })
})

describe('describing a coffee', () => {
  it('keeps its origins and every list in the order they were picked', async () => {
    const { show } = await describedCoffee({
      origins: ['CO', 'ET'],
      regions: [
        { origin: 'CO', name: 'Huila' },
        { origin: 'ET', name: 'Guji' },
      ],
      farms: [
        { origin: 'ET', name: 'Buku Abel' },
        { origin: 'CO', name: 'La Palma' },
      ],
      washingStations: [{ origin: 'ET', name: 'Hambela' }],
      producers: ['Nestor Lasso', 'Diego Bermudez'],
      processes: ['Washed', 'Thermal shock'],
      varietals: ['Pink Bourbon', 'Geisha'],
      flavorNotes: ['Lime', 'Milk chocolate'],
    })

    const entry = (name: string) => ({ id: expect.any(String), name })
    const grownIn = (origin: string, name: string) => ({
      ...entry(name),
      origin,
    })
    expect(await show()).toEqual({
      origins: [
        { code: 'CO', name: 'Colombia' },
        { code: 'ET', name: 'Ethiopia' },
      ],
      regions: [grownIn('CO', 'Huila'), grownIn('ET', 'Guji')],
      farms: [grownIn('ET', 'Buku Abel'), grownIn('CO', 'La Palma')],
      washingStations: [grownIn('ET', 'Hambela')],
      producers: [entry('Nestor Lasso'), entry('Diego Bermudez')],
      processes: [entry('Washed'), entry('Thermal shock')],
      varietals: [entry('Pink Bourbon'), entry('Geisha')],
      flavorNotes: [entry('Lime'), entry('Milk chocolate')],
    })
  })

  it('reuses an entry whose name only differs in case or accents, whoever added it', async () => {
    const context = await setup()
    await coffeeOn(context, context.home, 'Huila Blend', {
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Huila' }],
      farms: [{ origin: 'CO', name: 'La Palma' }],
      producers: ['Néstor Lasso'],
      flavorNotes: ['Lime'],
    })

    const anotherId = await coffeeOn(context, context.work, 'Another', {
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'HUÍLA' }],
      farms: [{ origin: 'CO', name: 'la palma' }],
      producers: ['NESTOR LASSO'],
      flavorNotes: ['LIME'],
    })

    expect(await descriptionOf(context.db, anotherId)).toMatchObject({
      regions: [{ name: 'Huila' }],
      farms: [{ name: 'La Palma' }],
      producers: [{ name: 'Néstor Lasso' }],
      flavorNotes: [{ name: 'Lime' }],
    })
    for (const list of [region, farm, producer, flavorNote]) {
      expect(await context.db.select().from(list)).toHaveLength(1)
    }
  })

  it('reuses a seeded process and keeps new ones', async () => {
    const { db, show } = await describedCoffee({
      processes: ['washed', 'Thermal shock'],
    })

    expect((await show()).processes.map(entry => entry.name)).toEqual([
      'Washed',
      'Thermal shock',
    ])
    expect(await db.select().from(processList)).toHaveLength(
      seededProcesses.length + 1,
    )
  })

  it('keeps regions, farms and washing stations of the same name in their own lists', async () => {
    const { db } = await describedCoffee({
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Santa Rosa' }],
      farms: [{ origin: 'CO', name: 'Santa Rosa' }],
      washingStations: [{ origin: 'CO', name: 'Santa Rosa' }],
    })

    for (const list of [region, farm, washingStation]) {
      expect(
        (await db.select().from(list)).map(({ name, originCode }) => ({
          name,
          originCode,
        })),
      ).toEqual([{ name: 'Santa Rosa', originCode: 'CO' }])
    }
  })

  it('keeps regions of the same name apart per country', async () => {
    const { db } = await describedCoffee({
      origins: ['CO', 'ET'],
      regions: [
        { origin: 'CO', name: 'Santa Rosa' },
        { origin: 'ET', name: 'Santa Rosa' },
      ],
    })

    expect(
      (await db.select().from(region)).map(({ originCode }) => originCode),
    ).toEqual(['CO', 'ET'])
  })

  it('links an entry picked twice only once', async () => {
    const { show } = await describedCoffee({
      origins: ['CO'],
      regions: [
        { origin: 'CO', name: 'Huila' },
        { origin: 'CO', name: 'huila' },
      ],
      varietals: ['Geisha', 'GEISHA'],
    })

    expect(await show()).toMatchObject({
      regions: [{ name: 'Huila' }],
      varietals: [{ name: 'Geisha' }],
    })
  })

  it('replaces everything when the coffee is described again', async () => {
    const { redescribe, show } = await describedCoffee({
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Huila' }],
      producers: ['Nestor Lasso'],
      varietals: ['Geisha'],
      flavorNotes: ['Lime'],
    })

    await redescribe({
      origins: ['KE'],
      regions: [{ origin: 'KE', name: 'Nyeri' }],
      farms: [{ origin: 'KE', name: 'Gatomboya' }],
      producers: ['Diego Bermudez'],
      processes: ['Natural', 'Anaerobic'],
    })

    expect(await show()).toMatchObject({
      origins: [{ code: 'KE', name: 'Kenya' }],
      regions: [{ name: 'Nyeri', origin: 'KE' }],
      farms: [{ name: 'Gatomboya', origin: 'KE' }],
      washingStations: [],
      producers: [{ name: 'Diego Bermudez' }],
      processes: [{ name: 'Natural' }, { name: 'Anaerobic' }],
      varietals: [],
      flavorNotes: [],
    })
  })

  it('can all be removed', async () => {
    const { redescribe, show } = await describedCoffee({
      origins: ['CO'],
      producers: ['Nestor Lasso'],
      flavorNotes: ['Lime'],
    })

    await redescribe({})

    expect(await show()).toEqual(described())
  })
})

describe('coffee cards', () => {
  it('show the origins and flavor notes of each coffee', async () => {
    const context = await setup()
    const ayele = await coffeeOn(context, context.home, 'Ayele Fulasa', {
      origins: ['ET', 'KE'],
      flavorNotes: ['Lime', 'Jasmine'],
    })
    const plain = await coffeeOn(context, context.home, 'Plain', {})

    const cards = await cardDescriptionsOf(context.db, [ayele, plain])

    expect(cards.get(ayele)).toEqual({
      origins: [
        { code: 'ET', name: 'Ethiopia' },
        { code: 'KE', name: 'Kenya' },
      ],
      flavorNotes: [
        { id: expect.any(String), name: 'Lime' },
        { id: expect.any(String), name: 'Jasmine' },
      ],
    })
    expect(cards.get(plain)).toEqual({ origins: [], flavorNotes: [] })
  })
})

describe('searching', () => {
  async function searched(db: Setup['db'], text: string) {
    const found = await descriptionSearch(db, text)
    const coffees = await db
      .select({ id: coffee.id, name: coffee.name })
      .from(coffee)
      .where(found.where)
      .orderBy(coffee.name)
    const matches = await found.matchesOf(coffees.map(row => row.id))

    return coffees.map(row => ({
      name: row.name,
      matches: matches.get(row.id) ?? [],
    }))
  }

  it.each([
    ['origin', 'kenya', 'Ayele Fulasa', { field: 'origins', name: 'Kenya' }],
    ['region', 'guji', 'Ayele Fulasa', { field: 'regions', name: 'Guji' }],
    [
      'producer',
      'bermúdez',
      'El Paraiso',
      { field: 'producers', name: 'Diego Bermudez' },
    ],
    [
      'farm',
      'finca',
      'El Paraiso',
      { field: 'farms', name: 'Finca El Paraiso' },
    ],
    [
      'process',
      'anaerob',
      'El Paraiso',
      { field: 'processes', name: 'Anaerobic' },
    ],
    [
      'flavor note',
      'strawb',
      'El Paraiso',
      { field: 'flavorNotes', name: 'Strawberry' },
    ],
    ['varietal', 'geish', 'El Paraiso', { field: 'varietals', name: 'Geisha' }],
    [
      'washing station',
      'hambela',
      'Ayele Fulasa',
      { field: 'washingStations', name: 'Hambela' },
    ],
  ])(
    'finds a coffee by its %s and says what matched',
    async (_, text, name, match) => {
      const context = await setup()
      await threeCoffees(context)

      expect(await searched(context.db, text)).toEqual([
        { name, matches: [match] },
      ])
    },
  )

  it('lists every match of a coffee, origins first', async () => {
    const context = await setup()
    await threeCoffees(context)
    await coffeeOn(context, context.home, 'Kenyan Lime', {
      origins: ['KE'],
      flavorNotes: ['Kenya Lime'],
    })

    expect(await searched(context.db, 'kenya')).toEqual([
      { name: 'Ayele Fulasa', matches: [{ field: 'origins', name: 'Kenya' }] },
      {
        name: 'Kenyan Lime',
        matches: [
          { field: 'origins', name: 'Kenya' },
          { field: 'flavorNotes', name: 'Kenya Lime' },
        ],
      },
    ])
  })

  it('narrows nothing without a search', async () => {
    const context = await setup()
    await threeCoffees(context)

    const found = await descriptionSearch(context.db, '  ')

    expect(found.where).toBeUndefined()
    expect(await found.matchesOf([])).toEqual(new Map())
  })
})

describe('filtering', () => {
  async function filtered(
    db: Setup['db'],
    field: DescribedField,
    value: string,
  ) {
    const rows = await db
      .select({ name: coffee.name })
      .from(coffee)
      .where(describedWith(field, value))
      .orderBy(coffee.name)

    return rows.map(row => row.name)
  }

  it('keeps the coffees described with an entry', async () => {
    const context = await setup()
    await threeCoffees(context)
    const { db } = context

    expect(await filtered(db, 'origins', 'BR')).toEqual(['Red Brick'])
    expect(
      await filtered(db, 'flavorNotes', await idOf(db, 'flavorNotes', 'Lime')),
    ).toEqual(['Ayele Fulasa', 'El Paraiso'])
    expect(
      await filtered(db, 'processes', await idOf(db, 'processes', 'Natural')),
    ).toEqual(['Red Brick'])
    expect(
      await filtered(db, 'varietals', await idOf(db, 'varietals', 'Geisha')),
    ).toEqual(['El Paraiso'])
  })
})

describe('filter options', () => {
  async function labels(
    db: Setup['db'],
    field: DescribedField,
    input: { search?: string; limit?: number; offset?: number; among?: never },
  ) {
    const options = await descriptionFilterOptions(db, field, {
      search: '',
      limit: 10,
      offset: 0,
      ...input,
    })

    return options.map(option => option.label)
  }

  it('offers what any coffee uses, each once and by name', async () => {
    const context = await setup()
    await threeCoffees(context)

    expect(await labels(context.db, 'flavorNotes', {})).toEqual([
      'Lime',
      'Milk Chocolate',
      'Strawberry',
    ])
    expect(await labels(context.db, 'origins', {})).toEqual([
      'Brazil',
      'Colombia',
      'Ethiopia',
      'Kenya',
    ])
    expect(await labels(context.db, 'processes', {})).toEqual([
      'Anaerobic',
      'Natural',
      'Washed',
    ])
    expect(await labels(context.db, 'varietals', {})).toEqual(['Geisha'])
  })

  it('narrows the options to what was typed and pages through them', async () => {
    const context = await setup()
    await threeCoffees(context)

    expect(await labels(context.db, 'flavorNotes', { search: 'LI' })).toEqual([
      'Lime',
    ])
    expect(await labels(context.db, 'origins', { search: 'ia' })).toEqual([
      'Colombia',
      'Ethiopia',
    ])
    expect(
      await labels(context.db, 'origins', { limit: 2, offset: 1 }),
    ).toEqual(['Colombia', 'Ethiopia'])
  })

  it('offers only what some coffees use', async () => {
    const context = await setup()
    await threeCoffees(context)
    const among = context.db
      .select({ coffeeId: purchase.coffeeId })
      .from(purchase)
      .where(eq(purchase.shelfId, context.home.id))

    const offered = async (field: DescribedField) =>
      (
        await descriptionFilterOptions(context.db, field, {
          search: '',
          limit: 10,
          offset: 0,
          among,
        })
      ).map(option => option.label)

    expect(await offered('flavorNotes')).toEqual(['Lime'])
    expect(await offered('origins')).toEqual(['Ethiopia', 'Kenya'])
  })
})

describe('suggestions', () => {
  it('suggest entries by name, spelled differently or not', async () => {
    const context = await setup()
    await threeCoffees(context)

    expect(
      await suggestDescriptions(context.db, 'producers', {
        search: 'bermudes',
      }),
    ).toEqual([{ id: expect.any(String), name: 'Diego Bermudez' }])
    expect(
      await suggestDescriptions(context.db, 'varietals', { search: '' }),
    ).toEqual([{ id: expect.any(String), name: 'Geisha' }])
  })

  it('only suggest regions, farms and washing stations of the countries picked', async () => {
    const { db } = await describedCoffee({
      origins: ['CO', 'ET'],
      regions: [
        { origin: 'CO', name: 'Huila' },
        { origin: 'ET', name: 'Guji' },
      ],
      farms: [{ origin: 'CO', name: 'La Palma' }],
      washingStations: [{ origin: 'ET', name: 'Hambela' }],
    })

    expect(
      await suggestDescriptions(db, 'regions', { origins: ['CO'], search: '' }),
    ).toEqual([{ id: expect.any(String), name: 'Huila', origin: 'CO' }])
    expect(
      await suggestDescriptions(db, 'regions', {
        origins: ['CO', 'ET'],
        search: 'Gujji',
      }),
    ).toEqual([{ id: expect.any(String), name: 'Guji', origin: 'ET' }])
    expect(
      await suggestDescriptions(db, 'farms', { origins: ['CO'], search: '' }),
    ).toEqual([{ id: expect.any(String), name: 'La Palma', origin: 'CO' }])
    expect(
      await suggestDescriptions(db, 'washingStations', {
        origins: ['CO', 'ET'],
        search: 'hambla',
      }),
    ).toEqual([{ id: expect.any(String), name: 'Hambela', origin: 'ET' }])
  })

  it('suggest nothing scoped to a country without origins', async () => {
    const { db } = await describedCoffee({
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Huila' }],
    })

    expect(
      await suggestDescriptions(db, 'regions', { origins: [], search: '' }),
    ).toEqual([])
  })
})

describe('the admin lists', () => {
  it('count how many coffees use each entry and say which country it is in', async () => {
    const context = await setup()
    await threeCoffees(context)

    const usesOf = async (field: DescriptionListField) => {
      const { table, uses, detail } = descriptionAdminLists[field]

      return context.db
        .select({ name: sql<string>`${table.name}`, uses, detail })
        .from(table)
        .orderBy(table.nameKey)
    }

    expect(await usesOf('flavorNotes')).toEqual([
      { name: 'Lime', uses: 2, detail: null },
      { name: 'Milk Chocolate', uses: 1, detail: null },
      { name: 'Strawberry', uses: 1, detail: null },
    ])
    expect(await usesOf('regions')).toEqual([
      { name: 'Guji', uses: 1, detail: 'Ethiopia' },
    ])
  })

  it('merge an entry onto the kept one without listing it twice', async () => {
    const context = await setup()
    const ayele = await coffeeOn(context, context.home, 'Ayele Fulasa', {
      flavorNotes: ['Lime'],
    })
    const natural = await coffeeOn(context, context.work, 'Natural', {
      flavorNotes: ['Lime', 'Limes'],
    })
    const { db } = context

    await descriptionAdminLists.flavorNotes.merge(db, {
      from: await idOf(db, 'flavorNotes', 'Limes'),
      to: await idOf(db, 'flavorNotes', 'Lime'),
    })

    const notesOf = async (coffeeId: string) =>
      (await descriptionOf(db, coffeeId)).flavorNotes.map(note => note.name)
    expect(await notesOf(ayele)).toEqual(['Lime'])
    expect(await notesOf(natural)).toEqual(['Lime'])
    expect(await db.select({ name: flavorNote.name }).from(flavorNote)).toEqual(
      [{ name: 'Lime' }],
    )
  })

  it('take a deleted entry off every coffee', async () => {
    const context = await setup()
    const ayele = await coffeeOn(context, context.home, 'Ayele Fulasa', {
      varietals: ['Geisha', 'Bourbon'],
    })

    expect(
      await descriptionAdminLists.varietals.remove(
        context.db,
        await idOf(context.db, 'varietals', 'Geisha'),
      ),
    ).toEqual({ outcome: 'deleted', photoUrl: null })
    expect((await descriptionOf(context.db, ayele)).varietals).toEqual([
      { id: expect.any(String), name: 'Bourbon' },
    ])
    expect(await context.db.select().from(varietal)).toHaveLength(1)
  })
})
