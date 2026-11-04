import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  coffee,
  coffeeVerdict,
  grinder,
  grinderBrand,
  grindSetting,
  purchase,
  region,
  roaster,
  shelfGrinder,
} from '#server/db/schemas'
import {
  addAdminEntry,
  deleteAdminEntry,
  listAdminEntries,
  mergeAdminEntry,
  updateAdminEntry,
} from '#server/utils/admin-lists'
import { listBrewMethods } from '#server/utils/brew-methods'
import { addCoffee, findCoffee } from '#server/utils/coffees'
import { setGrindSetting } from '#server/utils/grind-settings'
import { ownGrinder } from '#server/utils/grinders'
import { createShelf } from '#server/utils/shelves'
import { judgeCoffee } from '#server/utils/verdicts'
import type { AdminList } from '#shared/types/admin'
import type { NewCoffee } from '#shared/types/coffee'
import { adminEntrySearchSchema } from '#shared/utils/schemas'
import { createTestDatabase, createTestUser } from '#test/support/database'

const bag: NewCoffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  origins: ['ET'],
  regions: [{ origin: 'ET', name: 'Guji' }],
  farms: [],
  washingStations: [],
  producers: [],
  processes: ['Washed'],
  varietals: [],
  flavorNotes: ['Lime'],
  link: null,
  altitudeFrom: null,
  altitudeTo: null,
  purchasedOn: '2026-09-01',
  roastedOn: null,
  sizeGrams: 250,
  price: 16.5,
}

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: tom.id })
  const kept = await addCoffee(db, {
    shelfId: home.id,
    userId: sarah.id,
    coffee: bag,
  })
  const duplicate = await addCoffee(db, {
    shelfId: work.id,
    userId: tom.id,
    coffee: {
      ...bag,
      name: 'Ayele Fulasa Natural',
      flavorNotes: ['Lime', 'Limes'],
      purchasedOn: '2026-10-01',
    },
  })

  return {
    db,
    sarah,
    tom,
    home,
    work,
    keptId: kept.coffee.id,
    duplicateId: duplicate.coffee.id,
  }
}

type Setup = Awaited<ReturnType<typeof setup>>

function list(db: Setup['db'], name: AdminList, query = {}) {
  return listAdminEntries(db, {
    list: name,
    search: adminEntrySearchSchema.parse(query),
  })
}

async function idOf(db: Setup['db'], name: AdminList, entry: string) {
  const { entries } = await list(db, name, { search: entry })

  return entries.find(found => found.name === entry)!.id
}

function bagsOf(db: Setup['db'], coffeeId: string) {
  return db
    .select({ shelfId: purchase.shelfId })
    .from(purchase)
    .where(eq(purchase.coffeeId, coffeeId))
}

async function grindOn(
  db: Setup['db'],
  input: { shelfId: string; userId: string; coffeeId: string; model: string },
) {
  const owned = await ownGrinder(db, {
    shelfId: input.shelfId,
    userId: input.userId,
    grinder: { brand: 'Fellow', model: input.model },
  })
  const [espresso] = await listBrewMethods(db)

  await setGrindSetting(db, {
    shelfId: input.shelfId,
    coffeeId: input.coffeeId,
    userId: input.userId,
    change: {
      grinderId: owned.id,
      brewMethodId: espresso!.id,
      setting: '4.2',
    },
  })

  return owned.id
}

describe('listing a shared list', () => {
  it('shows each entry with what it belongs to and how often it is used', async () => {
    const { db } = await setup()

    expect((await list(db, 'coffees')).entries).toEqual([
      {
        id: expect.any(String),
        name: 'Ayele Fulasa',
        detail: 'Square Mile',
        detailId: expect.any(String),
        uses: 1,
      },
      {
        id: expect.any(String),
        name: 'Ayele Fulasa Natural',
        detail: 'Square Mile',
        detailId: expect.any(String),
        uses: 1,
      },
    ])
    expect((await list(db, 'regions')).entries).toEqual([
      {
        id: expect.any(String),
        name: 'Guji',
        detail: 'Ethiopia',
        detailId: 'ET',
        uses: 2,
      },
    ])
    expect(
      (await list(db, 'flavorNotes')).entries.map(e => [e.name, e.uses]),
    ).toEqual([
      ['Lime', 2],
      ['Limes', 1],
    ])
  })

  it('searches by name and pages through the entries', async () => {
    const { db } = await setup()

    const found = await list(db, 'flavorNotes', { search: 'limes' })
    const paged = await list(db, 'flavorNotes', { pageSize: '1', page: '1' })

    expect(found.entries.map(entry => entry.name)).toEqual(['Limes'])
    expect(paged).toEqual({
      total: 2,
      entries: [expect.objectContaining({ name: 'Limes' })],
    })
  })

  it('offers only entries of the same country to merge a region into', async () => {
    const { db, sarah, home } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: {
        ...bag,
        name: 'El Paraiso',
        origins: ['CO', 'ET'],
        regions: [
          { origin: 'CO', name: 'Cauca' },
          { origin: 'ET', name: 'Sidamo' },
        ],
      },
    })
    const guji = await idOf(db, 'regions', 'Guji')

    const targets = await list(db, 'regions', { except: guji })

    expect(targets.entries.map(entry => entry.name)).toEqual(['Sidamo'])
  })
})

describe('merging entries', () => {
  it('moves every bag, rating and grind setting of a coffee onto the kept one', async () => {
    const { db, sarah, tom, home, work, keptId, duplicateId } = await setup()
    await judgeCoffee(db, {
      userId: tom.id,
      coffeeId: duplicateId,
      verdict: { rating: 4 },
    })
    await grindOn(db, {
      shelfId: work.id,
      userId: tom.id,
      coffeeId: duplicateId,
      model: 'Opus',
    })

    const merged = await mergeAdminEntry(db, {
      list: 'coffees',
      entryId: duplicateId,
      intoId: keptId,
    })

    expect(merged).toEqual({
      outcome: 'merged',
      entry: { id: keptId, name: 'Ayele Fulasa' },
    })
    expect((await bagsOf(db, keptId)).map(bag => bag.shelfId).sort()).toEqual(
      [home.id, work.id].sort(),
    )
    expect(
      await db.select().from(coffee).where(eq(coffee.id, duplicateId)),
    ).toEqual([])
    expect(
      await db
        .select({ userId: coffeeVerdict.userId, rating: coffeeVerdict.rating })
        .from(coffeeVerdict)
        .where(eq(coffeeVerdict.coffeeId, keptId)),
    ).toEqual([{ userId: tom.id, rating: 4 }])
    expect(
      await db
        .select({ setting: grindSetting.setting })
        .from(grindSetting)
        .where(eq(grindSetting.coffeeId, keptId)),
    ).toEqual([{ setting: '4.2' }])
    expect(
      (await findCoffee(db, { coffeeId: keptId, viewer: sarah }))?.name,
    ).toBe('Ayele Fulasa')
  })

  it('keeps the rating on the kept coffee when someone rated both', async () => {
    const { db, sarah, keptId, duplicateId } = await setup()
    await judgeCoffee(db, {
      userId: sarah.id,
      coffeeId: keptId,
      verdict: { rating: 5 },
    })
    await judgeCoffee(db, {
      userId: sarah.id,
      coffeeId: duplicateId,
      verdict: { rating: 2 },
    })

    await mergeAdminEntry(db, {
      list: 'coffees',
      entryId: duplicateId,
      intoId: keptId,
    })

    expect(
      await db.select({ rating: coffeeVerdict.rating }).from(coffeeVerdict),
    ).toEqual([{ rating: 5 }])
  })

  it('moves the coffees of a roaster and merges the ones with the same name', async () => {
    const { db, tom, home, work, keptId } = await setup()
    await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: { ...bag, roaster: 'Square Mile Coffee', name: 'Ayele Fulasa' },
    })
    await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: { ...bag, roaster: 'Square Mile Coffee', name: 'Red Brick' },
    })
    const squareMile = await idOf(db, 'roasters', 'Square Mile')
    const duplicate = await idOf(db, 'roasters', 'Square Mile Coffee')
    await db
      .update(roaster)
      .set({ city: 'London' })
      .where(eq(roaster.id, duplicate))

    await mergeAdminEntry(db, {
      list: 'roasters',
      entryId: duplicate,
      intoId: squareMile,
    })

    expect(
      (
        await db
          .select({ name: coffee.name })
          .from(coffee)
          .where(eq(coffee.roasterId, squareMile))
      )
        .map(found => found.name)
        .sort(),
    ).toEqual(['Ayele Fulasa', 'Ayele Fulasa Natural', 'Red Brick'])
    expect((await bagsOf(db, keptId)).map(bag => bag.shelfId).sort()).toEqual(
      [home.id, work.id].sort(),
    )
    expect(
      await db.select({ name: roaster.name, city: roaster.city }).from(roaster),
    ).toEqual([{ name: 'Square Mile', city: 'London' }])
  })

  it('refuses to merge a region into one in another country', async () => {
    const { db, sarah, home } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: {
        ...bag,
        name: 'El Paraiso',
        origins: ['CO'],
        regions: [{ origin: 'CO', name: 'Cauca' }],
      },
    })
    const guji = await idOf(db, 'regions', 'Guji')
    const cauca = await idOf(db, 'regions', 'Cauca')

    expect(
      await mergeAdminEntry(db, {
        list: 'regions',
        entryId: cauca,
        intoId: guji,
      }),
    ).toEqual({ outcome: 'otherScope' })
    expect(await db.select().from(region)).toHaveLength(2)
  })

  it('merges the grinders of a brand and keeps every shelf grinder and grind setting', async () => {
    const { db, sarah, tom, home, work, keptId, duplicateId } = await setup()
    await grindOn(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffeeId: keptId,
      model: 'Opus',
    })
    const fellow = await idOf(db, 'grinderBrands', 'Fellow')
    const owned = await ownGrinder(db, {
      shelfId: work.id,
      userId: tom.id,
      grinder: { brand: 'Felow', model: 'Opus' },
    })
    const [espresso] = await listBrewMethods(db)
    await setGrindSetting(db, {
      shelfId: work.id,
      coffeeId: duplicateId,
      userId: tom.id,
      change: { grinderId: owned.id, brewMethodId: espresso!.id, setting: '9' },
    })
    const felow = await idOf(db, 'grinderBrands', 'Felow')

    await mergeAdminEntry(db, {
      list: 'grinderBrands',
      entryId: felow,
      intoId: fellow,
    })

    const grinders = await db.select({ id: grinder.id }).from(grinder)
    expect(grinders).toHaveLength(1)
    expect(await db.select().from(grinderBrand)).toHaveLength(1)
    expect(
      (await db.select({ shelfId: shelfGrinder.shelfId }).from(shelfGrinder))
        .map(owner => owner.shelfId)
        .sort(),
    ).toEqual([home.id, work.id].sort())
    expect(
      (
        await db
          .select({
            grinderId: grindSetting.grinderId,
            setting: grindSetting.setting,
          })
          .from(grindSetting)
      )
        .map(found => [found.grinderId, found.setting])
        .sort(),
    ).toEqual([
      [grinders[0]!.id, '4.2'],
      [grinders[0]!.id, '9'],
    ])
  })

  it('refuses to merge an entry into itself or one that does not exist', async () => {
    const { db, keptId } = await setup()

    expect(
      await mergeAdminEntry(db, {
        list: 'coffees',
        entryId: keptId,
        intoId: keptId,
      }),
    ).toEqual({ outcome: 'same' })
    expect(
      await mergeAdminEntry(db, {
        list: 'coffees',
        entryId: keptId,
        intoId: 'nope',
      }),
    ).toEqual({ outcome: 'notFound' })
  })
})

describe('updating entries', () => {
  function update(
    db: Setup['db'],
    userId: string,
    input: {
      list: AdminList
      entryId: string
      changes: { name: string; originCode?: string; brand?: string }
    },
  ) {
    return updateAdminEntry(db, { ...input, userId })
  }

  it('renames an entry', async () => {
    const { db, sarah } = await setup()
    const limes = await idOf(db, 'flavorNotes', 'Limes')

    expect(
      await update(db, sarah.id, {
        list: 'flavorNotes',
        entryId: limes,
        changes: { name: 'Key lime' },
      }),
    ).toEqual({ outcome: 'updated', entry: { id: limes, name: 'Key lime' } })
    expect(await idOf(db, 'flavorNotes', 'Key lime')).toBe(limes)
  })

  it('refuses a name that is already taken in the same place', async () => {
    const { db, sarah, keptId, duplicateId } = await setup()

    expect(
      await update(db, sarah.id, {
        list: 'coffees',
        entryId: duplicateId,
        changes: { name: 'ayele fulasa' },
      }),
    ).toEqual({ outcome: 'taken', taken: { name: 'Ayele Fulasa' } })
    expect(
      await update(db, sarah.id, {
        list: 'coffees',
        entryId: keptId,
        changes: { name: 'Ayele  fulasa' },
      }),
    ).toMatchObject({ outcome: 'updated' })
  })

  it('moves an unused region to another country', async () => {
    const { db, sarah } = await setup()
    const added = await addAdminEntry(db, {
      list: 'regions',
      body: { name: 'Cauca', originCode: 'ET' },
      createdBy: sarah.id,
    })
    const cauca = (added as { entry: { id: string } }).entry.id

    expect(
      await update(db, sarah.id, {
        list: 'regions',
        entryId: cauca,
        changes: { name: 'Cauca', originCode: 'CO' },
      }),
    ).toMatchObject({ outcome: 'updated' })
    expect(
      (await list(db, 'regions', { search: 'cauca' })).entries[0],
    ).toMatchObject({ detail: 'Colombia', detailId: 'CO' })
  })

  it('keeps a region coffees use in its country', async () => {
    const { db, sarah } = await setup()
    const guji = await idOf(db, 'regions', 'Guji')

    expect(
      await update(db, sarah.id, {
        list: 'regions',
        entryId: guji,
        changes: { name: 'Guji', originCode: 'CO' },
      }),
    ).toEqual({ outcome: 'inUse' })
    expect(
      await update(db, sarah.id, {
        list: 'regions',
        entryId: guji,
        changes: { name: 'Guji Zone', originCode: 'ET' },
      }),
    ).toMatchObject({ outcome: 'updated' })
  })

  it('moves a grinder to another brand, adding the brand when it is new', async () => {
    const { db, sarah, home, keptId } = await setup()
    const opus = await grindOn(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffeeId: keptId,
      model: 'Opus',
    })

    expect(
      await update(db, sarah.id, {
        list: 'grinders',
        entryId: opus,
        changes: { name: 'Opus Gen 2', brand: 'Fellow Products' },
      }),
    ).toMatchObject({ outcome: 'updated' })
    expect((await list(db, 'grinders')).entries).toEqual([
      expect.objectContaining({
        name: 'Opus Gen 2',
        detail: 'Fellow Products',
        uses: 1,
      }),
    ])
  })

  it('finds no entry that does not exist', async () => {
    const { db, sarah } = await setup()

    expect(
      await update(db, sarah.id, {
        list: 'producers',
        entryId: 'nope',
        changes: { name: 'Nestor Lasso' },
      }),
    ).toEqual({ outcome: 'notFound' })
  })
})

describe('deleting entries', () => {
  it('refuses to delete a roaster that still has coffees', async () => {
    const { db } = await setup()
    const squareMile = await idOf(db, 'roasters', 'Square Mile')

    expect(
      await deleteAdminEntry(db, { list: 'roasters', entryId: squareMile }),
    ).toEqual({
      outcome: 'inUse',
    })
  })

  it('deletes a roaster without coffees', async () => {
    const { db } = await setup()
    const [empty] = await db
      .insert(roaster)
      .values({ name: 'Nobody', nameKey: 'nobody' })
      .returning({ id: roaster.id })

    expect(
      await deleteAdminEntry(db, { list: 'roasters', entryId: empty!.id }),
    ).toEqual({
      outcome: 'deleted',
    })
  })

  it('refuses to delete a grinder a shelf owns', async () => {
    const { db, sarah, home, keptId } = await setup()
    const opus = await grindOn(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffeeId: keptId,
      model: 'Opus',
    })
    const fellow = await idOf(db, 'grinderBrands', 'Fellow')

    expect(
      await deleteAdminEntry(db, { list: 'grinders', entryId: opus }),
    ).toEqual({ outcome: 'inUse' })
    expect(
      await deleteAdminEntry(db, { list: 'grinderBrands', entryId: fellow }),
    ).toEqual({
      outcome: 'inUse',
    })
  })

  it('deletes a coffee with all its bags', async () => {
    const { db, keptId } = await setup()

    expect(
      await deleteAdminEntry(db, { list: 'coffees', entryId: keptId }),
    ).toEqual({
      outcome: 'deleted',
    })
    expect(await bagsOf(db, keptId)).toEqual([])
  })

  it('finds no entry that does not exist', async () => {
    const { db } = await setup()

    expect(
      await deleteAdminEntry(db, { list: 'varietals', entryId: 'nope' }),
    ).toEqual({
      outcome: 'notFound',
    })
  })
})

describe('adding entries', () => {
  it('adds a named entry once', async () => {
    const { db, sarah } = await setup()

    const added = await addAdminEntry(db, {
      list: 'varietals',
      body: { name: 'Geisha' },
      createdBy: sarah.id,
    })
    const again = await addAdminEntry(db, {
      list: 'varietals',
      body: { name: 'geisha' },
      createdBy: sarah.id,
    })

    expect(added).toEqual({
      outcome: 'added',
      entry: { id: expect.any(String), name: 'Geisha' },
    })
    expect(again).toEqual({
      outcome: 'taken',
      field: 'name',
      message: 'geisha is already on the list',
    })
  })

  it('adds a region to a country, even when another country has one by that name', async () => {
    const { db, sarah } = await setup()

    const added = await addAdminEntry(db, {
      list: 'regions',
      body: { name: 'Guji', originCode: 'CO' },
      createdBy: sarah.id,
    })

    expect(added).toMatchObject({ outcome: 'added' })
    expect(
      (await list(db, 'regions')).entries.map(entry => entry.detail).sort(),
    ).toEqual(['Colombia', 'Ethiopia'])
  })

  it('adds a grinder to its brand, adding the brand when it is new', async () => {
    const { db, sarah } = await setup()
    const grinder = { brand: 'Comandante', model: 'C40' }

    const added = await addAdminEntry(db, {
      list: 'grinders',
      body: grinder,
      createdBy: sarah.id,
    })
    const again = await addAdminEntry(db, {
      list: 'grinders',
      body: grinder,
      createdBy: sarah.id,
    })

    expect(added).toMatchObject({ outcome: 'added', entry: { name: 'C40' } })
    expect(again).toMatchObject({ outcome: 'taken', field: 'model' })
    expect((await list(db, 'grinders')).entries).toEqual([
      {
        id: expect.any(String),
        name: 'C40',
        detail: 'Comandante',
        detailId: expect.any(String),
        uses: 0,
      },
    ])
  })

  it('adds a coffee to the catalog without a bag on any shelf', async () => {
    const { db, sarah } = await setup()
    const { purchasedOn, roastedOn, sizeGrams, price, ...details } = bag

    const added = await addAdminEntry(db, {
      list: 'coffees',
      body: { ...details, name: 'Red Brick' },
      createdBy: sarah.id,
    })
    const again = await addAdminEntry(db, {
      list: 'coffees',
      body: details,
      createdBy: sarah.id,
    })

    expect(added).toMatchObject({ outcome: 'added' })
    const found = await findCoffee(db, {
      coffeeId: (added as { entry: { id: string } }).entry.id,
      viewer: sarah,
    })
    expect(found?.flavorNotes.map(note => note.name)).toEqual(['Lime'])
    expect(found?.shelves.every(shelf => shelf.bags === 0)).toBe(true)
    expect(again).toMatchObject({
      outcome: 'taken',
      message: 'Square Mile Ayele Fulasa is already on the list',
    })
  })

  it('adds a roaster with its details', async () => {
    const { db, sarah } = await setup()
    const details = {
      name: 'La Cabra',
      website: 'https://lacabra.dk',
      countryCode: 'DK',
      city: 'Aarhus',
    }

    const added = await addAdminEntry(db, {
      list: 'roasters',
      body: details,
      createdBy: sarah.id,
    })

    expect(added).toMatchObject({
      outcome: 'added',
      entry: { name: 'La Cabra' },
    })
    expect(
      await db
        .select({
          website: roaster.website,
          countryCode: roaster.countryCode,
          city: roaster.city,
        })
        .from(roaster)
        .where(eq(roaster.name, 'La Cabra')),
    ).toEqual([
      { website: 'https://lacabra.dk', countryCode: 'DK', city: 'Aarhus' },
    ])
  })

  it('adds a brew method at the end of the list', async () => {
    const { db, sarah } = await setup()

    const added = await addAdminEntry(db, {
      list: 'brewMethods',
      body: { name: 'Siphon' },
      createdBy: sarah.id,
    })
    const again = await addAdminEntry(db, {
      list: 'brewMethods',
      body: { name: 'espresso' },
      createdBy: sarah.id,
    })

    expect(added).toMatchObject({ outcome: 'added', entry: { name: 'Siphon' } })
    expect((await listBrewMethods(db)).at(-1)?.name).toBe('Siphon')
    expect(again).toMatchObject({ outcome: 'taken' })
  })
})

describe('brew methods', () => {
  it('merges a brew method and keeps its grind settings', async () => {
    const { db, sarah, home, keptId } = await setup()
    await grindOn(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffeeId: keptId,
      model: 'Opus',
    })
    const espresso = await idOf(db, 'brewMethods', 'Espresso')
    const pourOver = await idOf(db, 'brewMethods', 'Pour over')

    await mergeAdminEntry(db, {
      list: 'brewMethods',
      entryId: espresso,
      intoId: pourOver,
    })

    expect(
      await db
        .select({ brewMethodId: grindSetting.brewMethodId })
        .from(grindSetting),
    ).toEqual([{ brewMethodId: pourOver }])
    expect(
      (await listBrewMethods(db)).map(method => method.name),
    ).not.toContain('Espresso')
  })

  it('deletes a brew method only while nobody has a grind setting for it', async () => {
    const { db, sarah, home, keptId } = await setup()
    await grindOn(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffeeId: keptId,
      model: 'Opus',
    })
    const espresso = await idOf(db, 'brewMethods', 'Espresso')
    const moka = await idOf(db, 'brewMethods', 'Moka pot')

    expect(
      await deleteAdminEntry(db, { list: 'brewMethods', entryId: espresso }),
    ).toEqual({ outcome: 'inUse' })
    expect(
      await deleteAdminEntry(db, { list: 'brewMethods', entryId: moka }),
    ).toEqual({ outcome: 'deleted' })
  })
})
