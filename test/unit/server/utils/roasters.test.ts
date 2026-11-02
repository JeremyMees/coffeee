import { describe, expect, it } from 'vitest'
import { roaster } from '#server/db/schemas'
import { addCoffee } from '#server/utils/coffees'
import {
  editRoaster,
  findEditableRoaster,
  findRoaster,
  replaceRoasterLogo,
} from '#server/utils/roasters'
import { createShelf } from '#server/utils/shelves'
import type { NewCoffee } from '#shared/types/coffee'
import type { RoasterDetails } from '#shared/types/roasters'
import { storages } from '#test/support/nitro'
import { createTestDatabase, createTestUser } from '#test/support/database'

const firstBag: NewCoffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  colour: '#e4572e',
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
  purchasedOn: '2026-09-01',
  roastedOn: null,
  sizeGrams: 250,
  price: 16.5,
}

const details: RoasterDetails = {
  name: 'Square Mile',
  website: 'https://squaremilecoffee.com',
  countryCode: 'GB',
  city: 'London',
}

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const admin = await createTestUser(db, { name: 'Ada', role: 'admin' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await addCoffee(db, { shelfId: home.id, userId: sarah.id, coffee: firstBag })
  const [{ id: roasterId }] = (await db
    .select({ id: roaster.id })
    .from(roaster)) as [{ id: string }]

  return { db, sarah, tom, admin, roasterId }
}

describe('finding a roaster', () => {
  it('lets the person who added it and admins edit it', async () => {
    const { db, sarah, tom, admin, roasterId } = await setup()

    const seenBy = async (viewer: typeof sarah) =>
      (await findRoaster(db, { roasterId, viewer }))?.canEdit

    expect(await seenBy(sarah)).toBe(true)
    expect(await seenBy(admin)).toBe(true)
    expect(await seenBy(tom)).toBe(false)
  })

  it('finds no roaster that does not exist', async () => {
    const { db, sarah } = await setup()

    expect(
      await findRoaster(db, { roasterId: 'nope', viewer: sarah }),
    ).toBeUndefined()
    expect(
      await findEditableRoaster(db, { roasterId: 'nope', editor: sarah }),
    ).toEqual({ outcome: 'notFound' })
  })
})

describe('editing a roaster', () => {
  it('fills in its website, country and city', async () => {
    const { db, sarah, roasterId } = await setup()

    const result = await editRoaster(db, { roasterId, editor: sarah, details })

    expect(result).toEqual({
      outcome: 'edited',
      roaster: { id: roasterId, ...details, logoUrl: null },
    })
  })

  it('keeps its own name in another spelling', async () => {
    const { db, sarah, roasterId } = await setup()

    const result = await editRoaster(db, {
      roasterId,
      editor: sarah,
      details: { ...details, name: 'square-mile' },
    })

    expect(result.outcome).toBe('edited')
  })

  it('refuses someone who did not add it', async () => {
    const { db, tom, roasterId } = await setup()

    expect(await editRoaster(db, { roasterId, editor: tom, details })).toEqual({
      outcome: 'forbidden',
    })
  })

  it('refuses a name another roaster has', async () => {
    const { db, sarah, roasterId } = await setup()
    await db
      .insert(roaster)
      .values({ name: 'La Cabra', nameKey: 'la cabra', createdBy: sarah.id })

    expect(
      await editRoaster(db, {
        roasterId,
        editor: sarah,
        details: { ...details, name: 'La  Cabra' },
      }),
    ).toEqual({ outcome: 'taken', taken: { name: 'La Cabra' } })
  })

  it('replaces the logo and deletes the old one', async () => {
    const { db, roasterId } = await setup()
    const photos = new Map<string, unknown>([['roasters/old.webp', 'old']])
    storages.set('photos', photos)

    expect(
      await replaceRoasterLogo(
        db,
        { roasterId, logoUrl: '/api/photos/roasters/old.webp' },
        '/api/photos/roasters/new.webp',
      ),
    ).toEqual({ logoUrl: '/api/photos/roasters/new.webp' })

    const [stored] = await db.select().from(roaster)
    expect(stored!.logoUrl).toBe('/api/photos/roasters/new.webp')
    expect(photos.has('roasters/old.webp')).toBe(false)
  })
})
