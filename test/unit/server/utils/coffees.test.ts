import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { coffee, purchase, roaster } from '#server/db/schemas'
import {
  addCoffee,
  findShelfCoffee,
  listRoasters,
  listStock,
} from '#server/utils/coffees'
import { createShelf } from '#server/utils/shelves'
import type { NewCoffee } from '#shared/utils/schemas'
import { createTestDatabase, createTestUser } from '#test/support/database'

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
    colour: '#e4572e',
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

  it('reuses a roaster whose name only differs in case, spacing or hyphens', async () => {
    const { db, sarah, home } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ roaster: 'La Cabra', name: 'Halo' }),
    })

    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee({ roaster: 'la-cabra', name: 'Kiamabara' }),
    })

    expect(await listRoasters(db)).toEqual([
      { id: expect.any(String), name: 'La Cabra' },
    ])
  })

  it('adds a purchase to a coffee that already exists instead of a duplicate', async () => {
    const { db, sarah, tom, home, work } = await setup()
    const first = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
    })

    const second = await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee({
        name: 'ayele  fulasa',
        roaster: 'SQUARE MILE',
        roastLevel: 'dark',
      }),
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
      }),
      addCoffee(db, {
        shelfId: work.id,
        userId: tom.id,
        coffee: newCoffee({ roaster: 'square-mile' }),
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
    })
    await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee({ name: 'Red Brick' }),
    })

    const stock = await listStock(db, home.id)

    expect(stock).toEqual([
      {
        id: expect.any(String),
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedFor: 'filter',
        colour: '#e4572e',
        roastedOn: '2026-10-28',
      },
    ])
  })

  it('leaves out coffees whose bags are all finished', async () => {
    const { db, sarah, home } = await setup()
    await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: newCoffee(),
    })
    await db.update(purchase).set({ finishedAt: new Date() })

    expect(await listStock(db, home.id)).toEqual([])
  })

  it('shows a coffee once, with the newest roast date of its bags in stock', async () => {
    const { db, sarah, home } = await setup()
    for (const roastedOn of ['2026-10-20', '2026-10-28', null]) {
      await addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee({ roastedOn }),
      })
    }

    const stock = await listStock(db, home.id)

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
      })
    }

    const stock = await listStock(db, home.id)

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
    })
    await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: newCoffee({ purchasedOn: '2026-10-01' }),
    })

    const found = await findShelfCoffee(db, {
      shelfId: home.id,
      coffeeId: added.id,
    })

    expect(found).toMatchObject({
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
      purchases: [
        {
          purchasedOn: '2026-11-01',
          roastedOn: '2026-10-28',
          sizeGrams: 250,
          priceCents: 1650,
          finishedAt: null,
        },
      ],
    })
  })

  it('is not found when it does not exist', async () => {
    const { db, home } = await setup()

    expect(
      await findShelfCoffee(db, { shelfId: home.id, coffeeId: 'unknown' }),
    ).toBeUndefined()
  })

  it('lists the newest purchase first', async () => {
    const { db, sarah, home } = await setup()
    for (const purchasedOn of ['2026-09-01', '2026-11-01']) {
      await addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee({ purchasedOn }),
      })
    }
    const [only] = await db.select({ id: coffee.id }).from(coffee)

    const found = await findShelfCoffee(db, {
      shelfId: home.id,
      coffeeId: only!.id,
    })

    expect(found!.purchases.map(item => item.purchasedOn)).toEqual([
      '2026-11-01',
      '2026-09-01',
    ])
  })
})

describe('roasters', () => {
  it('are listed by name', async () => {
    const { db, sarah, home } = await setup()
    for (const name of ['Square Mile', 'April', 'La Cabra']) {
      await addCoffee(db, {
        shelfId: home.id,
        userId: sarah.id,
        coffee: newCoffee({ roaster: name }),
      })
    }

    const roasters = await listRoasters(db)

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
