import { describe, expect, it } from 'vitest'
import { origin, region } from '#server/db/schemas'
import { addCoffee, editCoffee, findShelfCoffee } from '#server/utils/coffees'
import { findSimilarRegions } from '#server/utils/origins'
import { createShelf } from '#server/utils/shelves'
import { originCodes, origins } from '#shared/utils/origins'
import type { NewCoffee } from '#shared/utils/schemas'
import { createTestDatabase, createTestUser } from '#test/support/database'

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })

  return { db, sarah, home }
}

function newCoffee(overrides: Partial<NewCoffee> = {}): NewCoffee {
  return {
    name: 'Huila Blend',
    roaster: 'Square Mile',
    roastLevel: 'light',
    roastedFor: 'filter',
    colour: '#e4572e',
    origins: ['CO', 'ET'],
    regions: [
      { origin: 'CO', name: 'Huila' },
      { origin: 'ET', name: 'Guji' },
    ],
    altitudeFrom: 1700,
    altitudeTo: 2100,
    purchasedOn: '2026-11-01',
    roastedOn: null,
    sizeGrams: null,
    price: null,
    ...overrides,
  }
}

async function added(overrides: Partial<NewCoffee> = {}) {
  const context = await setup()
  const result = await addCoffee(context.db, {
    shelfId: context.home.id,
    userId: context.sarah.id,
    coffee: newCoffee(overrides),
  })

  const show = () =>
    findShelfCoffee(context.db, {
      shelfId: context.home.id,
      coffeeId: result.coffee.id,
      viewer: context.sarah,
    })

  return { ...context, coffeeId: result.coffee.id, show }
}

describe('origins', () => {
  it('are seeded with every country', async () => {
    const { db } = await createTestDatabase()

    const seeded = await db.select().from(origin)

    expect(seeded).toHaveLength(originCodes.length)
    expect(seeded).toContainEqual({ code: 'CO', name: origins.CO })
  })
})

describe('describing where a coffee was grown', () => {
  it('keeps its origins, regions and altitude in the order they were picked', async () => {
    const { show } = await added()

    expect(await show()).toMatchObject({
      origins: [
        { code: 'CO', name: 'Colombia' },
        { code: 'ET', name: 'Ethiopia' },
      ],
      regions: [
        { id: expect.any(String), name: 'Huila', origin: 'CO' },
        { id: expect.any(String), name: 'Guji', origin: 'ET' },
      ],
      altitudeFrom: 1700,
      altitudeTo: 2100,
    })
  })

  it('reuses a region whose name only differs in case or accents', async () => {
    const { db, sarah, home, show } = await added()

    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({
        name: 'Another',
        origins: ['CO'],
        regions: [{ origin: 'CO', name: 'HUÍLA' }],
      }),
    })

    expect(await db.select().from(region)).toHaveLength(2)
    expect((await show())!.regions[0]!.name).toBe('Huila')
  })

  it('keeps regions of the same name apart per country', async () => {
    const { db } = await added({
      regions: [
        { origin: 'CO', name: 'Santa Rosa' },
        { origin: 'ET', name: 'Santa Rosa' },
      ],
    })

    expect(
      (await db.select().from(region)).map(({ originCode }) => originCode),
    ).toEqual(['CO', 'ET'])
  })

  it('links a region picked twice only once', async () => {
    const { show } = await added({
      origins: ['CO'],
      regions: [
        { origin: 'CO', name: 'Huila' },
        { origin: 'CO', name: 'huila' },
      ],
    })

    expect((await show())!.regions).toHaveLength(1)
  })

  it('allows a coffee without regions or altitude', async () => {
    const { show } = await added({
      regions: [],
      altitudeFrom: null,
      altitudeTo: null,
    })

    expect(await show()).toMatchObject({
      regions: [],
      altitudeFrom: null,
      altitudeTo: null,
    })
  })

  it('leaves an existing coffee as it was when it is bought again', async () => {
    const { db, sarah, home, show } = await added()

    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ origins: ['KE'], regions: [], altitudeFrom: 1 }),
    })

    expect(await show()).toMatchObject({
      origins: [{ code: 'CO' }, { code: 'ET' }],
      altitudeFrom: 1700,
    })
  })

  it('replaces them all when the coffee is edited', async () => {
    const { db, sarah, coffeeId, show } = await added()

    await editCoffee(db, {
      coffeeId,
      editor: sarah,
      details: {
        ...newCoffee(),
        origins: ['KE'],
        regions: [{ origin: 'KE', name: 'Nyeri' }],
        altitudeFrom: 1800,
        altitudeTo: 1800,
      },
    })

    expect(await show()).toMatchObject({
      origins: [{ code: 'KE', name: 'Kenya' }],
      regions: [{ name: 'Nyeri', origin: 'KE' }],
      altitudeFrom: 1800,
      altitudeTo: 1800,
    })
  })
})

describe('finding similar regions', () => {
  it('only suggests regions of the countries picked', async () => {
    const { db } = await added()

    const found = await findSimilarRegions(db, {
      origins: ['CO'],
      search: '',
    })

    expect(found).toEqual([
      { id: expect.any(String), name: 'Huila', origin: 'CO' },
    ])
  })

  it('suggests a region spelled differently', async () => {
    const { db } = await added()

    const found = await findSimilarRegions(db, {
      origins: ['CO', 'ET'],
      search: 'Gujji',
    })

    expect(found.map(({ name }) => name)).toEqual(['Guji'])
  })

  it('suggests nothing without origins', async () => {
    const { db } = await added()

    expect(await findSimilarRegions(db, { origins: [], search: '' })).toEqual(
      [],
    )
  })
})
