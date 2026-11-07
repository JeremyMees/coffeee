import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  coffee,
  processList,
  purchase,
  roaster,
  shelfMember,
} from '#server/db/schemas'
import {
  addCoffee,
  editCoffee,
  findCoffee,
  findEditableCoffee,
  findCoffeeCore,
  listStock,
} from '#server/utils/coffees'
import { findSimilar } from '#server/utils/lists'
import { listNotifications } from '#server/utils/notifications'
import { listShelfPurchases } from '#server/utils/purchases'
import { createShelf } from '#server/utils/shelves'
import { seededProcesses } from '#shared/utils/coffee'
import type { CoffeeDetails, NewCoffee } from '#shared/types/coffee'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { testOrigin } from '#test/support/origin'

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: tom.id })

  return { db, sarah, tom, home, work }
}

function newCoffee(overrides: Partial<NewCoffee> = {}): NewCoffee {
  return {
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
    purchasedOn: '2026-11-01',
    roastedOn: '2026-10-28',
    sizeGrams: 250,
    price: 16.5,
    ...overrides,
  }
}

describe('adding a coffee', () => {
  it('creates the roaster, the coffee and the first purchase', async () => {
    const { db, sarah, home } = await setup()

    const added = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })

    expect(added.coffee).toMatchObject({
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
    })
    expect(await db.select().from(purchase)).toEqual([
      expect.objectContaining({
        shelfId: home.id,
        coffeeId: added.coffee.id,
        purchasedOn: '2026-11-01',
        roastedOn: '2026-10-28',
        sizeGrams: 250,
        priceCents: 1650,
        addedBy: sarah.id,
      }),
    ])
  })

  it('tells the other members of the shelf, not the one who added it', async () => {
    const { db, sarah, tom, home } = await setup()
    await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.id })

    const added = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })

    expect(await listNotifications(db, tom.id)).toMatchObject([
      {
        kind: 'coffeeAdded',
        actor: 'Sarah',
        shelfId: home.id,
        coffeeId: added.coffee.id,
      },
    ])
    expect(await listNotifications(db, sarah.id)).toEqual([])
  })

  it('reuses a roaster whose name only differs in case, spacing or hyphens', async () => {
    const { db, sarah, home } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ roaster: 'La Cabra', name: 'Halo' }),
      origin: testOrigin,
    })

    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ roaster: 'la-cabra', name: 'Kiamabara' }),
      origin: testOrigin,
    })

    expect(await findSimilar(db, roaster, '')).toEqual([
      { id: expect.any(String), name: 'La Cabra' },
    ])
  })

  it('adds a purchase to a coffee that already exists instead of a duplicate', async () => {
    const { db, sarah, tom, home, work } = await setup()
    const first = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })

    const second = await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee({
        name: 'ayele  fulasa',
        roaster: 'SQUARE MILE',
        roastLevel: 'dark',
      }),
      origin: testOrigin,
    })

    expect(second.coffee).toEqual(first.coffee)
    expect(await db.select().from(coffee)).toHaveLength(1)
    expect(await db.select().from(purchase)).toHaveLength(2)
  })

  it('keeps one roaster and one coffee when two people add them at once', async () => {
    const { db, sarah, tom, home, work } = await setup()

    await Promise.all([
      addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee(),
        origin: testOrigin,
      }),
      addCoffee(db, {
        shelfId: work.id,
        userId: tom.id,
        coffee: newCoffee({ roaster: 'square-mile' }),
        origin: testOrigin,
      }),
    ])

    expect(await db.select().from(roaster)).toHaveLength(1)
    expect(await db.select().from(coffee)).toHaveLength(1)
    expect(await db.select().from(purchase)).toHaveLength(2)
  })

  it('leaves the optional purchase details empty', async () => {
    const { db, sarah, home } = await setup()

    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ roastedOn: null, sizeGrams: null, price: undefined }),
      origin: testOrigin,
    })

    expect(await db.select().from(purchase)).toEqual([
      expect.objectContaining({
        roastedOn: null,
        sizeGrams: null,
        priceCents: null,
      }),
    ])
  })
})

describe('current stock', () => {
  it('lists the coffees with a purchase in stock on that shelf only', async () => {
    const { db, sarah, tom, home, work } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })
    await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee({ name: 'Red Brick' }),
      origin: testOrigin,
    })

    const stock = await listStock(db, { shelfId: home.id, userId: sarah.id })

    expect(stock).toEqual([
      {
        id: expect.any(String),
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedFor: 'filter',
        roastedOn: '2026-10-28',
        flavorNotes: [],
        photoUrl: null,
        rating: null,
      },
    ])
  })

  it('leaves out coffees whose bags are all finished', async () => {
    const { db, sarah, home } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })
    await db.update(purchase).set({ finishedAt: new Date() })

    expect(await listStock(db, { shelfId: home.id, userId: sarah.id })).toEqual(
      [],
    )
  })

  it('shows a coffee once, with the newest roast date of its bags in stock', async () => {
    const { db, sarah, home } = await setup()
    for (const roastedOn of ['2026-10-20', '2026-10-28', null]) {
      await addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee({ roastedOn }),
        origin: testOrigin,
      })
    }

    const stock = await listStock(db, { shelfId: home.id, userId: sarah.id })

    expect(stock).toHaveLength(1)
    expect(stock[0]!.roastedOn).toBe('2026-10-28')
  })

  it('puts the coffee bought last first', async () => {
    const { db, sarah, home } = await setup()
    for (const name of ['First', 'Second']) {
      await addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee({ name }),
        origin: testOrigin,
      })
    }

    const stock = await listStock(db, { shelfId: home.id, userId: sarah.id })

    expect(stock.map(item => item.name)).toEqual(['Second', 'First'])
  })
})

describe('a coffee on a shelf', () => {
  it('comes with the purchases of that shelf only', async () => {
    const { db, sarah, tom, home, work } = await setup()
    const { coffee: added } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })
    await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee({ purchasedOn: '2026-10-01' }),
      origin: testOrigin,
    })

    const found = await findCoffeeCore(db, {
      coffeeId: added.id,
      viewer: sarah,
    })
    const purchases = await listShelfPurchases(db, {
      shelfId: home.id,
      coffeeId: added.id,
    })

    expect(found).toMatchObject({
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
    })
    expect(purchases).toMatchObject([
      {
        purchasedOn: '2026-11-01',
        roastedOn: '2026-10-28',
        sizeGrams: 250,
        priceCents: 1650,
        finishedAt: null,
      },
    ])
  })

  it('is not found when it does not exist', async () => {
    const { db, sarah } = await setup()

    expect(
      await findCoffeeCore(db, { coffeeId: 'unknown', viewer: sarah }),
    ).toBeUndefined()
  })

  it('lists the newest purchase first', async () => {
    const { db, sarah, home } = await setup()
    for (const purchasedOn of ['2026-09-01', '2026-11-01']) {
      await addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee({ purchasedOn }),
        origin: testOrigin,
      })
    }
    const [only] = await db.select({ id: coffee.id }).from(coffee)

    const found = await listShelfPurchases(db, {
      shelfId: home.id,
      coffeeId: only!.id,
    })

    expect(found.map(item => item.purchasedOn)).toEqual([
      '2026-11-01',
      '2026-09-01',
    ])
  })

  it('can be edited by the person who added it and by admins only', async () => {
    const { db, sarah, tom, home } = await setup()
    const admin = await createTestUser(db, { role: 'admin' })
    const { coffee: added } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })

    const canEdit = async (viewer: { id: string; role: string | null }) =>
      (await findCoffeeCore(db, { coffeeId: added.id, viewer }))!.canEdit

    expect(await canEdit(sarah)).toBe(true)
    expect(await canEdit(admin)).toBe(true)
    expect(await canEdit(tom)).toBe(false)
  })
})

describe('editing a coffee', () => {
  async function withCoffee() {
    const context = await setup()
    const { coffee: added } = await addCoffee(context.db, {
      shelfId: context.home.id,
      userId: context.sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })

    return { ...context, added }
  }

  const details: CoffeeDetails = {
    name: 'Ayele Fulasa Natural',
    roaster: 'Square Mile',
    roastLevel: 'medium',
    roastedFor: 'omni',
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
  }

  const savedDetails = {
    ...details,
    origins: [{ code: 'ET', name: 'Ethiopia' }],
    regions: [],
    farms: [],
    washingStations: [],
    producers: [],
    processes: [{ id: expect.any(String), name: 'Washed' }],
    varietals: [],
    flavorNotes: [],
  }

  it('changes its shared details for the person who added it', async () => {
    const { db, sarah, added } = await withCoffee()

    const result = await editCoffee(db, {
      coffeeId: added.id,
      editor: sarah,
      details,
    })

    expect(result).toEqual({
      outcome: 'edited',
      coffee: { id: added.id, ...savedDetails, photoUrl: null },
    })
  })

  it('lets an admin change it', async () => {
    const { db, added } = await withCoffee()
    const admin = await createTestUser(db, { role: 'admin' })

    const result = await editCoffee(db, {
      coffeeId: added.id,
      editor: admin,
      details,
    })

    expect(result.outcome).toBe('edited')
  })

  it('refuses everyone else and leaves the coffee as it was', async () => {
    const { db, tom, added } = await withCoffee()

    const result = await editCoffee(db, {
      coffeeId: added.id,
      editor: tom,
      details,
    })

    expect(result).toEqual({ outcome: 'forbidden' })
    expect(await db.select({ name: coffee.name }).from(coffee)).toEqual([
      { name: 'Ayele Fulasa' },
    ])
  })

  it('says when the coffee does not exist', async () => {
    const { db, sarah } = await withCoffee()

    const result = await editCoffee(db, {
      coffeeId: 'unknown',
      editor: sarah,
      details,
    })

    expect(result).toEqual({ outcome: 'notFound' })
  })

  it('refuses a roaster and name that another coffee already has', async () => {
    const { db, sarah, home, added } = await withCoffee()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ name: 'Red Brick' }),
      origin: testOrigin,
    })

    const result = await editCoffee(db, {
      coffeeId: added.id,
      editor: sarah,
      details: { ...details, name: 'red-brick', roaster: 'square mile' },
    })

    expect(result).toEqual({
      outcome: 'taken',
      taken: { roaster: 'Square Mile', name: 'Red Brick' },
    })
    expect(
      await db.select({ name: coffee.name }).from(coffee).orderBy(coffee.name),
    ).toEqual([{ name: 'Ayele Fulasa' }, { name: 'Red Brick' }])
  })

  it('allows fixing the case of its own name', async () => {
    const { db, sarah, added } = await withCoffee()

    const result = await editCoffee(db, {
      coffeeId: added.id,
      editor: sarah,
      details: { ...details, name: 'AYELE FULASA' },
    })

    expect(result).toMatchObject({
      outcome: 'edited',
      coffee: { name: 'AYELE FULASA' },
    })
  })

  it('moves it to a roaster that does not exist yet', async () => {
    const { db, sarah, added } = await withCoffee()

    await editCoffee(db, {
      coffeeId: added.id,
      editor: sarah,
      details: { ...details, roaster: 'April' },
    })

    expect((await findSimilar(db, roaster, '')).map(item => item.name)).toEqual(
      ['April', 'Square Mile'],
    )
  })

  it('never touches anyone’s purchases', async () => {
    const { db, sarah, tom, work, added } = await withCoffee()
    await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee({ purchasedOn: '2026-10-01', price: 12 }),
      origin: testOrigin,
    })
    const before = await db.select().from(purchase).orderBy(purchase.id)

    await editCoffee(db, {
      coffeeId: added.id,
      editor: sarah,
      details: { ...details, roaster: 'April' },
    })

    expect(await db.select().from(purchase).orderBy(purchase.id)).toEqual(
      before,
    )
  })
})

describe('roasters', () => {
  it('are created once per name', async () => {
    const { db, sarah, home } = await setup()
    for (const name of ['Square Mile', 'April', 'La Cabra']) {
      await addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee({ roaster: name }),
        origin: testOrigin,
      })
    }

    const roasters = await findSimilar(db, roaster, '')

    expect(roasters.map(item => item.name)).toEqual([
      'April',
      'La Cabra',
      'Square Mile',
    ])
    expect(
      await db.select().from(roaster).where(eq(roaster.nameKey, 'april')),
    ).toHaveLength(1)
  })
})

describe('processes and link', () => {
  async function shown(overrides: Partial<NewCoffee> = {}) {
    const context = await setup()
    const { coffee: added } = await addCoffee(context.db, {
      shelfId: context.home.id,
      userId: context.sarah.id,
      coffee: newCoffee(overrides),
      origin: testOrigin,
    })
    const show = () =>
      findCoffeeCore(context.db, {
        coffeeId: added.id,
        viewer: context.sarah,
      })

    return { ...context, added, show }
  }

  it('seeds the processes roasters use most', async () => {
    const { db } = await createTestDatabase()

    expect(
      (await db.select().from(processList)).map(entry => entry.name),
    ).toEqual(seededProcesses)
  })

  it('keeps the link and replaces it when the coffee is edited', async () => {
    const { db, sarah, added, show } = await shown({
      link: 'https://example.com/a',
    })

    expect((await show())!.link).toBe('https://example.com/a')

    await editCoffee(db, {
      coffeeId: added.id,
      editor: sarah,
      details: { ...newCoffee(), link: null },
    })

    expect((await show())!.link).toBeNull()
  })
})

describe('where a coffee was grown', () => {
  it('shows its description and altitude', async () => {
    const { db, sarah, home } = await setup()
    const { coffee: added } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({
        origins: ['CO'],
        regions: [{ origin: 'CO', name: 'Huila' }],
        producers: ['Nestor Lasso'],
        flavorNotes: ['Lime'],
        altitudeFrom: 1700,
        altitudeTo: 2100,
      }),
      origin: testOrigin,
    })

    expect(
      await findCoffeeCore(db, { coffeeId: added.id, viewer: sarah }),
    ).toMatchObject({
      origins: [{ code: 'CO', name: 'Colombia' }],
      regions: [{ name: 'Huila', origin: 'CO' }],
      producers: [{ name: 'Nestor Lasso' }],
      flavorNotes: [{ name: 'Lime' }],
      altitudeFrom: 1700,
      altitudeTo: 2100,
    })
  })

  it('stays as it was when the coffee is bought again', async () => {
    const { db, sarah, home } = await setup()
    const first = newCoffee({
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Huila' }],
      altitudeFrom: 1700,
      altitudeTo: 2100,
    })
    const { coffee: added } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: first,
      origin: testOrigin,
    })

    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: { ...first, origins: ['KE'], regions: [], altitudeFrom: 1 },
      origin: testOrigin,
    })

    expect(
      await findCoffeeCore(db, { coffeeId: added.id, viewer: sarah }),
    ).toMatchObject({
      origins: [{ code: 'CO' }],
      regions: [{ name: 'Huila' }],
      altitudeFrom: 1700,
    })
  })

  it('shows the flavor notes of each coffee in stock', async () => {
    const { db, sarah, home } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ flavorNotes: ['Lime', 'Jasmine'] }),
      origin: testOrigin,
    })
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ name: 'Red Brick' }),
      origin: testOrigin,
    })

    const stock = await listStock(db, { shelfId: home.id, userId: sarah.id })

    expect(
      Object.fromEntries(
        stock.map(row => [row.name, row.flavorNotes.map(note => note.name)]),
      ),
    ).toEqual({ 'Ayele Fulasa': ['Lime', 'Jasmine'], 'Red Brick': [] })
  })
})

describe('finding a coffee to edit', () => {
  it('gives its photo to someone who may edit it', async () => {
    const { db, sarah, home } = await setup()
    const { coffee: added } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })
    await db
      .update(coffee)
      .set({ photoUrl: '/api/photos/coffees/a.webp' })
      .where(eq(coffee.id, added.id))

    expect(
      await findEditableCoffee(db, { coffeeId: added.id, editor: sarah }),
    ).toEqual({ outcome: 'editable', photoUrl: '/api/photos/coffees/a.webp' })
  })

  it('refuses anyone else', async () => {
    const { db, sarah, tom, home } = await setup()
    const { coffee: added } = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })

    expect(
      await findEditableCoffee(db, { coffeeId: added.id, editor: tom }),
    ).toEqual({ outcome: 'forbidden' })
  })

  it('says when there is no such coffee', async () => {
    const { db, sarah } = await setup()

    expect(
      await findEditableCoffee(db, { coffeeId: 'nope', editor: sarah }),
    ).toEqual({ outcome: 'notFound' })
  })
})

describe('findCoffee', () => {
  it('shows the coffee without any shelf’s bags, with the shelves of the viewer', async () => {
    const { db, sarah, tom, home, work } = await setup()
    const { coffee: added } = await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee(),
      origin: testOrigin,
    })

    const found = await findCoffee(db, { coffeeId: added.id, viewer: sarah })

    expect(found).toMatchObject({
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
      canEdit: false,
      rating: null,
      roasterDetails: { name: 'Square Mile' },
      shelves: [{ id: home.id, name: 'Home', bags: 0, inStock: 0 }],
    })
    expect(found).not.toHaveProperty('purchases')
    expect(found).toMatchObject({
      communityRating: { average: null, raters: 0, wouldBuyAgain: 0 },
      reviews: [],
    })
  })

  it('is not found when it does not exist', async () => {
    const { db, sarah } = await setup()

    expect(
      await findCoffee(db, { coffeeId: 'unknown', viewer: sarah }),
    ).toBeUndefined()
  })
})
