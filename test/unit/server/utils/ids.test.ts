import { beforeEach, describe, expect, it, vi } from 'vitest'
import { coffee, roaster, shelf } from '#server/db/schemas'
import { addAdminEntry } from '#server/utils/admin-lists'
import {
  addCatalogCoffee,
  findOrCreateRoaster,
} from '#server/utils/catalog-entries'
import { withFreshId } from '#server/utils/ids'
import { createShelf } from '#server/utils/shelves'
import { createTestDatabase, createTestUser } from '#test/support/database'

const codes = vi.hoisted(() => ({ next: [] as string[] }))

vi.mock('#shared/utils/slugs', async importOriginal => {
  const original = await importOriginal<typeof import('#shared/utils/slugs')>()

  return {
    ...original,
    newCode: () => codes.next.shift() ?? original.newCode(),
  }
})

beforeEach(() => {
  codes.next = []
})

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const taken = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const [mok] = await db
    .insert(roaster)
    .values({ id: 'takenrst', name: 'Mok', nameKey: 'mok' })
    .returning()
  await db.insert(coffee).values({
    id: 'takencof',
    roasterId: mok!.id,
    name: 'Finca Gascon',
    nameKey: 'finca gascon',
    roastLevel: 'light',
    roastedFor: 'filter',
  })

  return { db, sarah, taken, mok: mok! }
}

describe('withFreshId', () => {
  it('tries a new id when the first one is taken', async () => {
    const { db, sarah, taken } = await setup()
    codes.next = [taken.id, 'fresh123']

    const [created] = await withFreshId(db, (db, id) =>
      db
        .insert(shelf)
        .values({ id, name: 'Work', ownerId: sarah.id })
        .returning(),
    )

    expect(created!.id).toBe('fresh123')
  })

  it('gives up after a few taken ids', async () => {
    const { db, sarah, taken } = await setup()
    codes.next = Array(5).fill(taken.id)

    await expect(
      withFreshId(db, (db, id) =>
        db.insert(shelf).values({ id, name: 'Work', ownerId: sarah.id }),
      ),
    ).rejects.toThrow()
  })

  it('does not retry other failures', async () => {
    const { db } = await setup()
    const insert = vi.fn((db, id: string) =>
      db.insert(shelf).values({ id, name: 'Orphan', ownerId: 'nobody' }),
    )

    await expect(withFreshId(db, insert)).rejects.toThrow()
    expect(insert).toHaveBeenCalledTimes(1)
  })
})

describe('creating with a taken id', () => {
  it('still creates the shelf', async () => {
    const { db, sarah, taken } = await setup()
    codes.next = [taken.id, 'shelf123']

    const created = await createShelf(db, { name: 'Work', ownerId: sarah.id })

    expect(created).toMatchObject({ id: 'shelf123', name: 'Work' })
  })

  it('still creates the coffee', async () => {
    const { db, sarah, mok } = await setup()
    codes.next = ['rst12345', 'takencof', 'cof12345']

    const { coffee: created, created: isNew } = await addCatalogCoffee(db, {
      userId: sarah.id,
      details: {
        roaster: mok.name,
        name: 'Las Lajas',
        roastLevel: 'light',
        roastedFor: 'filter',
        origins: [],
        regions: [],
        farms: [],
        washingStations: [],
        producers: [],
        processes: [],
        varietals: [],
        flavorNotes: [],
        link: null,
      },
      whenFound: 'keep',
    })

    expect(isNew).toBe(true)
    expect(created).toMatchObject({ id: 'cof12345', name: 'Las Lajas' })
  })

  it('still creates the roaster when adding a coffee', async () => {
    const { db, sarah } = await setup()
    codes.next = ['takenrst', 'rst12345']

    const { roaster: created } = await findOrCreateRoaster(db, {
      name: 'La Cabra',
      createdBy: sarah.id,
    })

    expect(created.id).toBe('rst12345')
  })

  it('still adds the roaster from the admin lists, not calling it taken', async () => {
    const { db, sarah } = await setup()
    codes.next = ['takenrst', 'rst67890']

    const added = await addAdminEntry(db, {
      list: 'roasters',
      body: { name: 'La Cabra' },
      createdBy: sarah.id,
    })

    expect(added).toEqual({
      outcome: 'added',
      entry: { id: 'rst67890', name: 'La Cabra' },
    })
  })
})
