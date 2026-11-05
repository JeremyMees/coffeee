import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { coffee, roaster } from '#server/db/schemas'
import type { CatalogCoffee } from '#server/types/catalog-entries'
import {
  addCatalogCoffee,
  changeCatalog,
  findOrCreateRoaster,
  findTakenName,
} from '#server/utils/catalog-entries'
import { descriptionOf } from '#server/utils/descriptions'
import { storages } from '#test/support/nitro'
import { createTestDatabase, createTestUser } from '#test/support/database'

const ayele: CatalogCoffee = {
  roaster: 'Square Mile',
  name: 'Ayele Fulasa',
  roastLevel: 'light',
  roastedFor: 'filter',
  origins: ['ET'],
  regions: [],
  farms: [],
  washingStations: [],
  producers: [],
  processes: ['Washed'],
  varietals: [],
  flavorNotes: ['Lime'],
  link: null,
  altitudeFrom: 1900,
  altitudeTo: 2100,
}

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })

  return { db, sarah }
}

beforeEach(() => {
  storages.clear()
})

describe('changeCatalog', () => {
  it('deletes dropped photos once the change has committed', async () => {
    const { db } = await setup()
    const photos = new Map<string, unknown>([['coffees/old.webp', 'old']])
    storages.set('photos', photos)

    const changed = await changeCatalog(db, async (_tx, dropPhoto) => {
      dropPhoto('/api/photos/coffees/old.webp')
      dropPhoto(null)
      expect(photos.has('coffees/old.webp')).toBe(true)

      return 'changed'
    })

    expect(changed).toBe('changed')
    expect(photos.has('coffees/old.webp')).toBe(false)
  })

  it('keeps dropped photos when the change fails', async () => {
    const { db } = await setup()
    const photos = new Map<string, unknown>([['coffees/old.webp', 'old']])
    storages.set('photos', photos)

    await expect(
      changeCatalog(db, async (_tx, dropPhoto) => {
        dropPhoto('/api/photos/coffees/old.webp')
        throw new Error('Nope')
      }),
    ).rejects.toThrow('Nope')

    expect(photos.has('coffees/old.webp')).toBe(true)
  })
})

describe('findOrCreateRoaster', () => {
  it('creates a roaster the first time', async () => {
    const { db, sarah } = await setup()

    const added = await findOrCreateRoaster(db, {
      name: 'La Cabra',
      createdBy: sarah.id,
      city: 'Aarhus',
    })

    expect(added).toEqual({
      roaster: { id: expect.any(String), name: 'La Cabra' },
      created: true,
    })
    const [stored] = await db.select().from(roaster)
    expect(stored!.city).toBe('Aarhus')
  })

  it('finds the roaster whatever the spelling of its name', async () => {
    const { db, sarah } = await setup()
    const first = await findOrCreateRoaster(db, {
      name: 'La Cabra',
      createdBy: sarah.id,
    })

    expect(
      await findOrCreateRoaster(db, { name: 'la cabra ', createdBy: sarah.id }),
    ).toEqual({ roaster: first.roaster, created: false })
  })
})

describe('findTakenName', () => {
  it('finds another entry with the same name', async () => {
    const { db, sarah } = await setup()
    const { roaster: cabra } = await findOrCreateRoaster(db, {
      name: 'La Cabra',
      createdBy: sarah.id,
    })
    const { roaster: mok } = await findOrCreateRoaster(db, {
      name: 'Mok',
      createdBy: sarah.id,
    })

    expect(
      await findTakenName(db, roaster, { name: 'LA CABRA', except: mok.id }),
    ).toEqual({ name: 'La Cabra' })
    expect(
      await findTakenName(db, roaster, { name: 'La Cabra', except: cabra.id }),
    ).toBeUndefined()
  })

  it('only looks within the scope', async () => {
    const { db, sarah } = await setup()
    const { coffee: added } = await addCatalogCoffee(db, {
      userId: sarah.id,
      details: ayele,
      whenFound: 'keep',
    })
    const { roaster: mok } = await findOrCreateRoaster(db, {
      name: 'Mok',
      createdBy: sarah.id,
    })
    const [stored] = await db
      .select({ roasterId: coffee.roasterId })
      .from(coffee)
      .where(eq(coffee.id, added.id))

    expect(
      await findTakenName(db, coffee, {
        name: 'Ayele Fulasa',
        except: 'other',
        scope: { column: coffee.roasterId, value: stored!.roasterId },
      }),
    ).toEqual({ name: 'Ayele Fulasa' })
    expect(
      await findTakenName(db, coffee, {
        name: 'Ayele Fulasa',
        except: 'other',
        scope: { column: coffee.roasterId, value: mok.id },
      }),
    ).toBeUndefined()
  })
})

describe('addCatalogCoffee', () => {
  it('adds the coffee, its roaster and its description', async () => {
    const { db, sarah } = await setup()

    const added = await addCatalogCoffee(db, {
      userId: sarah.id,
      details: ayele,
      whenFound: 'keep',
    })

    expect(added).toMatchObject({
      created: true,
      coffee: { name: 'Ayele Fulasa', roaster: 'Square Mile' },
    })
    const described = await descriptionOf(db, added.coffee.id)
    expect(described.origins).toEqual([{ code: 'ET', name: 'Ethiopia' }])
    expect(described.flavorNotes.map(note => note.name)).toEqual(['Lime'])
  })

  it('keeps a coffee that is already in the catalog as it is', async () => {
    const { db, sarah } = await setup()
    const first = await addCatalogCoffee(db, {
      userId: sarah.id,
      details: ayele,
      whenFound: 'keep',
    })

    const again = await addCatalogCoffee(db, {
      userId: sarah.id,
      details: { ...ayele, roastLevel: 'dark', flavorNotes: ['Cocoa'] },
      whenFound: 'keep',
    })

    expect(again).toEqual({ coffee: first.coffee, created: false })
    const described = await descriptionOf(db, first.coffee.id)
    expect(described.flavorNotes.map(note => note.name)).toEqual(['Lime'])
  })

  it('updates a coffee that is already in the catalog, keeping what it was not given', async () => {
    const { db, sarah } = await setup()
    const first = await addCatalogCoffee(db, {
      userId: sarah.id,
      details: ayele,
      whenFound: 'keep',
    })
    const { altitudeFrom: _from, altitudeTo: _to, ...withoutAltitude } = ayele

    const again = await addCatalogCoffee(db, {
      userId: sarah.id,
      details: {
        ...withoutAltitude,
        roastLevel: 'dark',
        flavorNotes: ['Cocoa'],
      },
      whenFound: 'update',
    })

    expect(again.created).toBe(false)
    const [stored] = await db
      .select()
      .from(coffee)
      .where(eq(coffee.id, first.coffee.id))
    expect(stored).toMatchObject({
      roastLevel: 'dark',
      altitudeFrom: 1900,
      altitudeTo: 2100,
    })
    const described = await descriptionOf(db, first.coffee.id)
    expect(described.flavorNotes.map(note => note.name)).toEqual(['Cocoa'])
  })
})
