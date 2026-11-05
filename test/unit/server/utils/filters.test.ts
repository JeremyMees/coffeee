import { describe, expect, it } from 'vitest'
import { flavorNote, processList, roaster, varietal } from '#server/db/schemas'
import { addCoffee } from '#server/utils/coffees'
import { findFilterLabels } from '#server/utils/filters'
import { createShelf } from '#server/utils/shelves'
import { filterLabelsSchema } from '#shared/utils/schemas'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { testOrigin } from '#test/support/origin'

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
      varietals: ['Geisha'],
      flavorNotes: ['Lime', 'Jasmine'],
      link: null,
      altitudeFrom: null,
      altitudeTo: null,
      purchasedOn: '2026-11-01',
      roastedOn: '2026-10-28',
      sizeGrams: 250,
      price: 16.5,
    },
    origin: testOrigin,
  })

  const [squareMile] = await db.select().from(roaster)
  const notes = await db.select().from(flavorNote)
  const lime = notes.find(note => note.name === 'Lime')
  const jasmine = notes.find(note => note.name === 'Jasmine')
  const [washed] = await db.select().from(processList)
  const [geisha] = await db.select().from(varietal)

  return {
    db,
    squareMile: squareMile!,
    lime: lime!,
    jasmine: jasmine!,
    washed: washed!,
    geisha: geisha!,
  }
}

describe('findFilterLabels', () => {
  it('names every picked filter', async () => {
    const { db, squareMile, lime, washed, geisha } = await setup()

    const labels = await findFilterLabels(
      db,
      filterLabelsSchema.parse({
        roasterId: squareMile.id,
        flavorNoteId: lime.id,
        originCode: 'ET',
        processId: washed.id,
        varietalId: geisha.id,
      }),
    )

    expect(labels).toEqual({
      roasterId: { [squareMile.id]: 'Square Mile' },
      flavorNoteId: { [lime.id]: 'Lime' },
      originCode: { ET: 'Ethiopia' },
      processId: { [washed.id]: 'Washed' },
      varietalId: { [geisha.id]: 'Geisha' },
    })
  })

  it('names every value of a filter with several picked', async () => {
    const { db, lime, jasmine } = await setup()

    const labels = await findFilterLabels(
      db,
      filterLabelsSchema.parse({
        flavorNoteId: [lime.id, jasmine.id],
        originCode: ['ET', 'CO'],
      }),
    )

    expect(labels).toEqual({
      flavorNoteId: { [lime.id]: 'Lime', [jasmine.id]: 'Jasmine' },
      originCode: { ET: 'Ethiopia', CO: 'Colombia' },
    })
  })

  it('leaves out filters that are not picked or do not exist', async () => {
    const { db, squareMile } = await setup()

    const labels = await findFilterLabels(
      db,
      filterLabelsSchema.parse({
        roasterId: [squareMile.id, 'gone'],
        processId: 'gone',
      }),
    )

    expect(labels).toEqual({ roasterId: { [squareMile.id]: 'Square Mile' } })
  })

  it('has nothing to name without filters', async () => {
    const { db } = await setup()

    expect(await findFilterLabels(db, filterLabelsSchema.parse({}))).toEqual({})
  })
})
