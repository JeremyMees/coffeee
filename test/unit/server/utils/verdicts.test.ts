import { describe, expect, it } from 'vitest'
import { coffeeVerdict, shelfMember } from '#server/db/schemas'
import { addCoffee, findShelfCoffee, listStock } from '#server/utils/coffees'
import { createShelf } from '#server/utils/shelves'
import {
  findVerdict,
  judgeCoffee,
  memberVerdictsOf,
} from '#server/utils/verdicts'
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
  const tom = await createTestUser(db, { name: 'Tom' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.id })
  const added = await addCoffee(db, {
    shelfId: home.id,
    userId: sarah.id,
    coffee: firstBag,
  })
  const coffeeId = added.coffee.id

  function judge(
    userId: string,
    verdict: Parameters<typeof judgeCoffee>[1]['verdict'],
  ) {
    return judgeCoffee(db, { userId, coffeeId, verdict })
  }

  return { db, sarah, tom, home, coffeeId, judge }
}

describe('judging a coffee', () => {
  it('starts out not yet rated and not to be bought again', async () => {
    const { db, sarah, coffeeId } = await setup()

    expect(await findVerdict(db, { userId: sarah.id, coffeeId })).toEqual({
      rating: null,
      wouldBuyAgain: false,
    })
  })

  it('keeps the rating when only would buy again changes', async () => {
    const { db, sarah, coffeeId, judge } = await setup()

    await judge(sarah.id, { rating: 4 })
    const judged = await judge(sarah.id, { wouldBuyAgain: true })

    expect(judged).toEqual({ rating: 4, wouldBuyAgain: true })
    expect(await findVerdict(db, { userId: sarah.id, coffeeId })).toEqual(
      judged,
    )
  })

  it('clears the rating back to not yet rated', async () => {
    const { db, sarah, coffeeId, judge } = await setup()

    await judge(sarah.id, { rating: 5 })
    await judge(sarah.id, { rating: null })

    expect(
      (await findVerdict(db, { userId: sarah.id, coffeeId })).rating,
    ).toBeNull()
  })

  it('stores the verdict on the person who gave it', async () => {
    const { db, sarah, coffeeId, judge } = await setup()

    await judge(sarah.id, { rating: 3 })

    expect(await db.select().from(coffeeVerdict)).toEqual([
      expect.objectContaining({ userId: sarah.id, coffeeId, rating: 3 }),
    ])
  })

  it('judges nothing for a coffee that does not exist', async () => {
    const { db, sarah } = await setup()

    expect(
      await judgeCoffee(db, {
        userId: sarah.id,
        coffeeId: 'missing',
        verdict: { rating: 3 },
      }),
    ).toBeUndefined()
    expect(await db.select().from(coffeeVerdict)).toEqual([])
  })

  it('lets two members of one shelf judge the same coffee differently', async () => {
    const { db, sarah, tom, coffeeId, judge } = await setup()

    await judge(sarah.id, { rating: 5, wouldBuyAgain: true })
    await judge(tom.id, { rating: 2 })

    expect(await findVerdict(db, { userId: sarah.id, coffeeId })).toEqual({
      rating: 5,
      wouldBuyAgain: true,
    })
    expect(await findVerdict(db, { userId: tom.id, coffeeId })).toEqual({
      rating: 2,
      wouldBuyAgain: false,
    })
  })

  it('lets anyone judge a coffee their shelf has not bought', async () => {
    const { db, coffeeId } = await setup()
    const ana = await createTestUser(db, { name: 'Ana' })

    expect(
      await judgeCoffee(db, {
        userId: ana.id,
        coffeeId,
        verdict: { rating: 4 },
      }),
    ).toEqual({ rating: 4, wouldBuyAgain: false })
  })

  it('shows the viewer their own verdict in stock and on the coffee', async () => {
    const { db, sarah, tom, home, coffeeId, judge } = await setup()

    await judge(sarah.id, { rating: 4, wouldBuyAgain: true })
    await judge(tom.id, { rating: 1 })

    expect(
      (await listStock(db, { shelfId: home.id, userId: sarah.id }))[0],
    ).toMatchObject({ rating: 4 })
    expect(
      (await listStock(db, { shelfId: home.id, userId: tom.id }))[0],
    ).toMatchObject({ rating: 1 })
    expect(
      await findShelfCoffee(db, { shelfId: home.id, coffeeId, viewer: tom }),
    ).toMatchObject({ rating: 1, wouldBuyAgain: false })
  })
})

describe('the other members’ verdicts', () => {
  it('lists the other members of the shelf who judged the coffee', async () => {
    const { db, sarah, tom, home, coffeeId, judge } = await setup()

    await judge(sarah.id, { rating: 5 })
    await judge(tom.id, { wouldBuyAgain: true })

    expect(
      await memberVerdictsOf(db, {
        shelfId: home.id,
        coffeeId,
        userId: sarah.id,
      }),
    ).toEqual([
      { userId: tom.id, name: 'Tom', rating: null, wouldBuyAgain: true },
    ])
  })

  it('leaves out people off the shelf and members with no verdict left', async () => {
    const { db, sarah, tom, home, coffeeId, judge } = await setup()
    const ana = await createTestUser(db, { name: 'Ana' })

    await judgeCoffee(db, { userId: ana.id, coffeeId, verdict: { rating: 3 } })
    await judge(tom.id, { rating: 4 })
    await judge(tom.id, { rating: null })

    expect(
      await memberVerdictsOf(db, {
        shelfId: home.id,
        coffeeId,
        userId: sarah.id,
      }),
    ).toEqual([])
  })

  it('shows them on the coffee', async () => {
    const { db, sarah, tom, home, coffeeId, judge } = await setup()

    await judge(tom.id, { rating: 2 })

    expect(
      await findShelfCoffee(db, { shelfId: home.id, coffeeId, viewer: sarah }),
    ).toMatchObject({
      rating: null,
      memberVerdicts: [{ name: 'Tom', rating: 2, wouldBuyAgain: false }],
    })
  })
})
