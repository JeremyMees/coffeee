import { describe, expect, it } from 'vitest'
import { coffee, notification, purchase, shelfMember } from '#server/db/schemas'
import { addCoffee } from '#server/utils/coffees'
import { listNotifications } from '#server/utils/notifications'
import {
  buyAgain,
  deletePurchase,
  editPurchase,
  finishCoffee,
  finishPurchase,
} from '#server/utils/purchases'
import { createShelf } from '#server/utils/shelves'
import type { NewCoffee } from '#shared/types/coffee'
import type { NewPurchase } from '#shared/types/purchases'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { testOrigin } from '#test/support/origin'

const firstBag: NewCoffee = {
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
  flavorNotes: [],
  link: null,
  altitudeFrom: null,
  altitudeTo: null,
  purchasedOn: '2026-09-01',
  roastedOn: '2026-08-28',
  sizeGrams: 250,
  price: 16.5,
}

function bag(overrides: Partial<NewPurchase> = {}): NewPurchase {
  return {
    purchasedOn: '2026-11-01',
    roastedOn: null,
    sizeGrams: 250,
    price: 17,
    ...overrides,
  }
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
    origin: testOrigin,
  })
  const ref = {
    shelfId: home.id,
    coffeeId: added.coffee.id,
    purchaseId: added.purchase.id,
    userId: sarah.id,
    origin: testOrigin,
  }
  const tom = await createTestUser(db, { name: 'Tom' })
  await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.id })

  return { db, sarah, tom, home, work, ref }
}

describe('buying a coffee again', () => {
  it('adds a purchase without adding a coffee', async () => {
    const { db, sarah, ref } = await setup()

    const added = await buyAgain(db, {
      shelfId: ref.shelfId,
      coffeeId: ref.coffeeId,
      userId: sarah.id,
      purchase: bag({ roastedOn: '2026-10-28' }),
      origin: testOrigin,
    })

    expect(added).toMatchObject({
      purchasedOn: '2026-11-01',
      roastedOn: '2026-10-28',
      sizeGrams: 250,
      priceCents: 1700,
      finishedAt: null,
    })
    expect(await db.select().from(coffee)).toHaveLength(1)
    expect(await db.select().from(purchase)).toHaveLength(2)
  })

  it('tells the other members about the new bag', async () => {
    const { db, sarah, tom, ref } = await setup()

    await buyAgain(db, { ...ref, purchase: bag() })

    expect(await listNotifications(db, tom.id)).toMatchObject([
      { kind: 'purchaseAdded', actor: 'Sarah', coffeeId: ref.coffeeId },
    ])
    expect(await listNotifications(db, sarah.id)).toEqual([])
  })

  it('adds nothing for a coffee that does not exist', async () => {
    const { db, sarah, ref } = await setup()

    expect(
      await buyAgain(db, {
        shelfId: ref.shelfId,
        coffeeId: 'nope',
        userId: sarah.id,
        purchase: bag(),
        origin: testOrigin,
      }),
    ).toBeUndefined()
    expect(await db.select().from(notification)).toEqual([])
  })
})

describe('finishing a coffee', () => {
  it('finishes its oldest purchase that is in stock', async () => {
    const { db, sarah, ref } = await setup()
    await buyAgain(db, {
      shelfId: ref.shelfId,
      coffeeId: ref.coffeeId,
      userId: sarah.id,
      purchase: bag(),
      origin: testOrigin,
    })

    const finished = await finishCoffee(db, ref)

    expect(finished).toMatchObject({
      id: ref.purchaseId,
      finishedAt: expect.any(Date),
    })
  })

  it('tells the other members which coffee was finished', async () => {
    const { db, sarah, tom, ref } = await setup()

    await finishCoffee(db, ref)

    expect(await listNotifications(db, tom.id)).toMatchObject([
      { kind: 'bagFinished', actor: 'Sarah', coffeeId: ref.coffeeId },
    ])
    expect(await listNotifications(db, sarah.id)).toEqual([])
  })

  it('finishes nothing and tells nobody when nothing is in stock', async () => {
    const { db, tom, ref } = await setup()
    await finishCoffee(db, ref)

    expect(await finishCoffee(db, ref)).toBeUndefined()
    expect(await listNotifications(db, tom.id)).toHaveLength(1)
  })

  it('finishes nothing on another shelf', async () => {
    const { db, work, ref } = await setup()

    expect(await finishCoffee(db, { ...ref, shelfId: work.id })).toBeUndefined()
  })
})

describe('changing a purchase', () => {
  it('saves its new dates, size and price', async () => {
    const { db, ref } = await setup()

    const edited = await editPurchase(db, {
      ...ref,
      purchase: bag({
        purchasedOn: '2026-09-02',
        sizeGrams: null,
        price: null,
      }),
    })

    expect(edited).toMatchObject({
      id: ref.purchaseId,
      purchasedOn: '2026-09-02',
      roastedOn: null,
      sizeGrams: null,
      priceCents: null,
    })
  })

  it('keeps the date a purchase was first finished', async () => {
    const { db, ref } = await setup()
    const first = await finishPurchase(db, ref)

    const again = await finishPurchase(db, ref)

    expect(again!.finishedAt).toEqual(first!.finishedAt)
  })

  it('tells the other members once when a bag is finished twice', async () => {
    const { db, tom, ref } = await setup()

    await finishPurchase(db, ref)
    await finishPurchase(db, ref)

    expect(await listNotifications(db, tom.id)).toMatchObject([
      { kind: 'bagFinished', actor: 'Sarah', coffeeId: ref.coffeeId },
    ])
  })

  it('deletes it, leaving the coffee in the catalog', async () => {
    const { db, ref } = await setup()

    expect(await deletePurchase(db, ref)).toEqual({ id: ref.purchaseId })
    expect(await db.select().from(purchase)).toEqual([])
    expect(await db.select().from(coffee)).toHaveLength(1)
  })

  it('touches no purchase of another shelf', async () => {
    const { db, work, ref } = await setup()
    const elsewhere = { ...ref, shelfId: work.id }

    expect(
      await editPurchase(db, { ...elsewhere, purchase: bag() }),
    ).toBeUndefined()
    expect(await finishPurchase(db, elsewhere)).toBeUndefined()
    expect(await deletePurchase(db, elsewhere)).toBeUndefined()
    expect(await db.select().from(purchase)).toEqual([
      expect.objectContaining({ id: ref.purchaseId, finishedAt: null }),
    ])
    expect(await db.select().from(notification)).toEqual([])
  })
})
