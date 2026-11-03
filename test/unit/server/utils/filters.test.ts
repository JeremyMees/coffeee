import { describe, expect, it } from 'vitest'
import { flavorNote, processList, roaster } from '#server/db/schemas'
import { addCoffee } from '#server/utils/coffees'
import { findFilterLabels } from '#server/utils/filters'
import { createShelf } from '#server/utils/shelves'
import { filterLabelsSchema } from '#shared/utils/schemas'
import { createTestDatabase, createTestUser } from '#test/support/database'

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })

  await addCoffee(db, {
    shelfId: home.id,
    userId: sarah.id,
    coffee: {
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
      flavorNotes: ['Lime'],
      link: null,
      altitudeFrom: null,
      altitudeTo: null,
      purchasedOn: '2026-11-01',
      roastedOn: '2026-10-28',
      sizeGrams: 250,
      price: 16.5,
    },
  })

  const [squareMile] = await db.select().from(roaster)
  const [lime] = await db.select().from(flavorNote)
  const [washed] = await db.select().from(processList)

  return { db, squareMile: squareMile!, lime: lime!, washed: washed! }
}

describe('findFilterLabels', () => {
  it('names every picked filter', async () => {
    const { db, squareMile, lime, washed } = await setup()

    const labels = await findFilterLabels(
      db,
      filterLabelsSchema.parse({
        roasterId: squareMile.id,
        flavorNoteId: lime.id,
        originCode: 'ET',
        processId: washed.id,
      }),
    )

    expect(labels).toEqual({
      roasterId: 'Square Mile',
      flavorNoteId: 'Lime',
      originCode: 'Ethiopia',
      processId: 'Washed',
    })
  })

  it('leaves out filters that are not picked or do not exist', async () => {
    const { db, squareMile } = await setup()

    const labels = await findFilterLabels(
      db,
      filterLabelsSchema.parse({ roasterId: squareMile.id, processId: 'gone' }),
    )

    expect(labels).toEqual({ roasterId: 'Square Mile' })
  })

  it('has nothing to name without filters', async () => {
    const { db } = await setup()

    expect(await findFilterLabels(db, filterLabelsSchema.parse({}))).toEqual({})
  })
})
