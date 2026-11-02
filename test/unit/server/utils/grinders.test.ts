import { describe, expect, it } from 'vitest'
import { grinder, grinderBrand } from '#server/db/schemas'
import {
  disownGrinder,
  findGrinderModels,
  listShelfGrinders,
  ownGrinder,
} from '#server/utils/grinders'
import { createShelf } from '#server/utils/shelves'
import { createTestDatabase, createTestUser } from '#test/support/database'

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })

  function own(shelfId: string, brand: string, model: string) {
    return ownGrinder(db, {
      shelfId,
      userId: sarah.id,
      grinder: { brand, model },
    })
  }

  return { db, sarah, home, work, own }
}

describe('owning grinders', () => {
  it('adds a new brand and model to the catalog and the shelf', async () => {
    const { db, home, own } = await setup()

    const owned = await own(home.id, 'Fellow', 'Opus Gen 2')

    expect(owned).toEqual({
      id: expect.any(String),
      brand: 'Fellow',
      model: 'Opus Gen 2',
    })
    expect(await listShelfGrinders(db, home.id)).toEqual([owned])
  })

  it('reuses a brand and model spelled differently', async () => {
    const { db, home, work, own } = await setup()

    const first = await own(home.id, 'Fellow', 'Opus Gen 2')
    const again = await own(work.id, 'fellow ', 'opus gen-2')

    expect(again).toEqual(first)
    expect(await db.select().from(grinderBrand)).toHaveLength(1)
    expect(await db.select().from(grinder)).toHaveLength(1)
  })

  it('keeps one model name apart per brand', async () => {
    const { db, home, own } = await setup()

    await own(home.id, 'Comandante', 'C40')
    await own(home.id, 'Timemore', 'C40')

    expect(await listShelfGrinders(db, home.id)).toEqual([
      expect.objectContaining({ brand: 'Comandante', model: 'C40' }),
      expect.objectContaining({ brand: 'Timemore', model: 'C40' }),
    ])
  })

  it('owns a grinder only once per shelf', async () => {
    const { db, home, own } = await setup()

    await own(home.id, 'Fellow', 'Opus Gen 2')
    await own(home.id, 'Fellow', 'Opus Gen 2')

    expect(await listShelfGrinders(db, home.id)).toHaveLength(1)
  })

  it('keeps each shelf its own grinders', async () => {
    const { db, home, work, own } = await setup()

    await own(home.id, 'Fellow', 'Opus Gen 2')

    expect(await listShelfGrinders(db, work.id)).toEqual([])
  })

  it('stops owning a grinder but keeps it in the catalog', async () => {
    const { db, home, own } = await setup()
    const owned = await own(home.id, 'Fellow', 'Opus Gen 2')

    expect(
      await disownGrinder(db, { shelfId: home.id, grinderId: owned.id }),
    ).toEqual({ id: owned.id })
    expect(await listShelfGrinders(db, home.id)).toEqual([])
    expect(await db.select().from(grinder)).toHaveLength(1)
  })

  it('stops owning nothing the shelf does not own', async () => {
    const { db, home, work, own } = await setup()
    const owned = await own(work.id, 'Fellow', 'Opus Gen 2')

    expect(
      await disownGrinder(db, { shelfId: home.id, grinderId: owned.id }),
    ).toBeUndefined()
    expect(await listShelfGrinders(db, work.id)).toHaveLength(1)
  })
})

describe('finding grinder models', () => {
  it('suggests the models of the picked brand only', async () => {
    const { db, home, own } = await setup()
    await own(home.id, 'Fellow', 'Opus Gen 2')
    await own(home.id, 'Fellow', 'Ode Gen 2')
    await own(home.id, 'Niche', 'Zero')

    const models = await findGrinderModels(db, { brand: 'fellow', search: '' })

    expect(models.map(model => model.name)).toEqual(['Ode Gen 2', 'Opus Gen 2'])
  })

  it('narrows the models by what was typed', async () => {
    const { db, home, own } = await setup()
    await own(home.id, 'Fellow', 'Opus Gen 2')
    await own(home.id, 'Fellow', 'Ode Gen 2')

    const models = await findGrinderModels(db, {
      brand: 'Fellow',
      search: 'opus',
    })

    expect(models.map(model => model.name)).toEqual(['Opus Gen 2'])
  })

  it('suggests no models for a brand nobody added', async () => {
    const { db, home, own } = await setup()
    await own(home.id, 'Fellow', 'Opus Gen 2')

    expect(
      await findGrinderModels(db, { brand: 'Eureka', search: '' }),
    ).toEqual([])
  })
})
