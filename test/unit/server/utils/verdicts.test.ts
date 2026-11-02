import { describe, expect, it } from 'vitest'
import { coffeeVerdict } from '#server/db/schemas'
import { addCoffee, findShelfCoffee, listStock } from '#server/utils/coffees'
import { createShelf } from '#server/utils/shelves'
import { findVerdict, judgeCoffee } from '#server/utils/verdicts'
import type { NewCoffee } from '#shared/types/coffee'
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

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })
  const added = await addCoffee(db, {
    shelfId: home.id,
    userId: sarah.id,
    coffee: firstBag,
  })
  const ref = { shelfId: home.id, coffeeId: added.coffee.id }

  return { db, sarah, home, work, ref }
}

describe('judging a coffee', () => {
  it('starts out not yet rated and not to be bought again', async () => {
    const { db, ref } = await setup()

    expect(await findVerdict(db, ref)).toEqual({
      rating: null,
      wouldBuyAgain: false,
    })
  })

  it('keeps the rating when only would buy again changes', async () => {
    const { db, sarah, ref } = await setup()

    await judgeCoffee(db, { ...ref, userId: sarah.id, verdict: { rating: 4 } })
    const judged = await judgeCoffee(db, {
      ...ref,
      userId: sarah.id,
      verdict: { wouldBuyAgain: true },
    })

    expect(judged).toEqual({ rating: 4, wouldBuyAgain: true })
    expect(await findVerdict(db, ref)).toEqual(judged)
  })

  it('clears the rating back to not yet rated', async () => {
    const { db, sarah, ref } = await setup()

    await judgeCoffee(db, { ...ref, userId: sarah.id, verdict: { rating: 5 } })
    await judgeCoffee(db, {
      ...ref,
      userId: sarah.id,
      verdict: { rating: null },
    })

    expect((await findVerdict(db, ref)).rating).toBeNull()
  })

  it('keeps who changed it last', async () => {
    const { db, sarah, ref } = await setup()

    await judgeCoffee(db, { ...ref, userId: sarah.id, verdict: { rating: 3 } })

    const [stored] = await db.select().from(coffeeVerdict)
    expect(stored).toMatchObject({ ...ref, rating: 3, updatedBy: sarah.id })
  })

  it('judges nothing for a coffee that does not exist', async () => {
    const { db, sarah, home } = await setup()

    expect(
      await judgeCoffee(db, {
        shelfId: home.id,
        coffeeId: 'missing',
        userId: sarah.id,
        verdict: { rating: 3 },
      }),
    ).toBeUndefined()
    expect(await db.select().from(coffeeVerdict)).toEqual([])
  })

  it('keeps each shelf its own verdict', async () => {
    const { db, sarah, work, ref } = await setup()

    await judgeCoffee(db, { ...ref, userId: sarah.id, verdict: { rating: 5 } })

    expect(
      await findVerdict(db, { shelfId: work.id, coffeeId: ref.coffeeId }),
    ).toEqual({ rating: null, wouldBuyAgain: false })
  })

  it('shows the verdict in stock and on the coffee', async () => {
    const { db, sarah, home, work, ref } = await setup()
    await addCoffee(db, {
      shelfId: work.id,
      userId: sarah.id,
      coffee: firstBag,
    })

    await judgeCoffee(db, {
      ...ref,
      userId: sarah.id,
      verdict: { rating: 4, wouldBuyAgain: true },
    })

    expect((await listStock(db, home.id))[0]).toMatchObject({ rating: 4 })
    expect((await listStock(db, work.id))[0]).toMatchObject({ rating: null })
    expect(await findShelfCoffee(db, { ...ref, viewer: sarah })).toMatchObject({
      rating: 4,
      wouldBuyAgain: true,
    })
  })
})
