import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import {
  coffee,
  coffeeVerdict,
  flavorNote,
  purchase,
  roaster,
} from '#server/db/schemas'
import { findShelfCoffee } from '#server/utils/coffees'
import { listShelfGrinders } from '#server/utils/grinders'
import {
  findImportShelf,
  importNotion,
  readNotionCoffee,
  roastedForOf,
} from '#server/utils/notion-import'
import { createShelf } from '#server/utils/shelves'
import type { NotionCoffee, NotionProperty } from '#server/types/notion'
import { createTestDatabase, createTestUser } from '#test/support/database'

function notionPage(
  properties: Record<string, NotionProperty>,
  createdTime = '2026-04-23T12:48:48.000Z',
) {
  return {
    id: 'page',
    created_time: createdTime,
    last_edited_time: '2026-05-01T09:00:00.000Z',
    properties: {
      'Coffee Name': { type: 'title', title: [{ plain_text: 'Frinsa Manis' }] },
      Roaster: { type: 'multi_select', multi_select: [{ name: 'Tanat' }] },
      'Roast Level': { type: 'select', select: { name: 'Light' } },
      Inventory: { type: 'select', select: { name: 'Out-of-stock' } },
      ...properties,
    } satisfies Record<string, NotionProperty>,
  }
}

function notionCoffee(overrides: Partial<NotionCoffee> = {}): NotionCoffee {
  return {
    roaster: 'Mok',
    name: 'Finca Gascon',
    roastLevel: 'light',
    origins: ['GT'],
    processes: ['Washed'],
    varietals: ['Bourbon'],
    flavorNotes: ['Plum'],
    link: null,
    photoUrl: null,
    purchasedOn: '2025-12-25',
    finishedAt: new Date('2026-01-10T10:00:00Z'),
    sizeGrams: 200,
    price: 25,
    rating: null,
    wouldBuyAgain: false,
    ...overrides,
  }
}

const notes = new Map([
  ['plum', 'Plum'],
  ['lime', 'Lime'],
])

describe('reading a Notion coffee', () => {
  it('reads every property the import keeps', () => {
    const read = readNotionCoffee(
      notionPage({
        Origin: {
          type: 'multi_select',
          multi_select: [{ name: 'Columbia' }, { name: 'Costa rica' }],
        },
        Process: { type: 'multi_select', multi_select: [{ name: 'Honey' }] },
        Varietal: {
          type: 'multi_select',
          multi_select: [
            { name: 'Arabica' },
            { name: 'Bourbon' },
            { name: 'Multiple' },
            { name: 'Blend' },
            { name: 'Acaia' },
          ],
        },
        'Flavor Notes': {
          type: 'relation',
          relation: [{ id: 'lime' }, { id: 'plum' }],
        },
        Link: {
          type: 'rich_text',
          rich_text: [{ plain_text: 'https://tanat.coffee/frinsa' }],
        },
        Image: {
          type: 'files',
          files: [{ type: 'file', file: { url: 'https://notion/bag.webp' } }],
        },
        Inventory: { type: 'select', select: { name: 'In-stock' } },
        'Size (g / bag)': { type: 'number', number: 200 },
        Price: { type: 'number', number: 15.9 },
        Rating: { type: 'select', select: { name: '★★★★' } },
        'Would buy again?': { type: 'checkbox', checkbox: true },
      }),
      notes,
    )

    expect(read).toEqual({
      roaster: 'Tanat',
      name: 'Frinsa Manis',
      roastLevel: 'light',
      origins: ['CO', 'CR'],
      processes: ['Honey'],
      varietals: ['Bourbon'],
      flavorNotes: ['Lime', 'Plum'],
      link: 'https://tanat.coffee/frinsa',
      photoUrl: 'https://notion/bag.webp',
      purchasedOn: expect.stringMatching(/^2026-04-2[34]$/),
      finishedAt: null,
      sizeGrams: 200,
      price: 15.9,
      rating: 4,
      wouldBuyAgain: true,
    })
  })

  it('takes the Notion creation date as the purchase date', () => {
    const read = readNotionCoffee(
      notionPage({}, new Date(2025, 11, 25, 9, 12).toISOString()),
      notes,
    )

    expect(read.purchasedOn).toBe('2025-12-25')
  })

  it('finishes an out-of-stock row when it was last edited', () => {
    const read = readNotionCoffee(notionPage({}), notes)

    expect(read).toMatchObject({
      finishedAt: new Date('2026-05-01T09:00:00.000Z'),
      link: null,
      photoUrl: null,
      sizeGrams: null,
      price: null,
      rating: null,
      wouldBuyAgain: false,
    })
  })

  it('needs a roaster, a roast level and known origins', () => {
    expect(() =>
      readNotionCoffee(
        notionPage({ Roaster: { type: 'multi_select', multi_select: [] } }),
        notes,
      ),
    ).toThrow('Frinsa Manis has no roaster')
    expect(() =>
      readNotionCoffee(
        notionPage({ 'Roast Level': { type: 'select', select: null } }),
        notes,
      ),
    ).toThrow('Frinsa Manis has no roast level')
    expect(() =>
      readNotionCoffee(
        notionPage({
          Origin: {
            type: 'multi_select',
            multi_select: [{ name: 'Atlantis' }],
          },
        }),
        notes,
      ),
    ).toThrow('No origin matches "Atlantis"')
  })
})

describe('telling what a coffee was roasted for', () => {
  it('reads it from the shop link', () => {
    expect(roastedForOf('https://gust.coffee/products/atitlan-espresso')).toBe(
      'espresso',
    )
    expect(roastedForOf('https://gust.coffee/products/koke-Filter')).toBe(
      'filter',
    )
    expect(roastedForOf('https://gust.coffee/products/anibal-omni')).toBe(
      'omni',
    )
    expect(roastedForOf(null)).toBe('omni')
  })
})

async function setup() {
  const { db } = await createTestDatabase()
  const jeremy = await createTestUser(db, { email: 'jeremy@example.com' })
  const home = await createShelf(db, {
    name: "Jeremy's shelf",
    ownerId: jeremy.id,
  })
  const copyPhoto = vi.fn(async (url: string) =>
    url.includes('broken') ? null : `https://blob/${url.split('/').at(-1)}`,
  )

  function run(coffees: NotionCoffee[], flavorNotes = ['Plum', 'Kiwi']) {
    return importNotion(db, {
      shelfId: home.id,
      userId: jeremy.id,
      flavorNotes,
      coffees,
      copyPhoto,
    })
  }

  return { db, jeremy, home, copyPhoto, run }
}

describe('importing the Notion inventory', () => {
  it('turns each row into a purchase of its coffee', async () => {
    const { db, jeremy, home, run } = await setup()

    const result = await run([
      notionCoffee({
        link: 'https://mokcoffee.be/gascon-filter',
        rating: 5,
        wouldBuyAgain: true,
        finishedAt: null,
      }),
    ])

    expect(result).toEqual({
      coffees: 1,
      purchases: 1,
      flavorNotes: 2,
      missingPhotos: [],
    })

    const [imported] = await db.select().from(coffee)
    const found = await findShelfCoffee(db, {
      shelfId: home.id,
      coffeeId: imported!.id,
      viewer: { id: jeremy.id, role: 'user' },
    })

    expect(found).toMatchObject({
      name: 'Finca Gascon',
      roaster: 'Mok',
      roastLevel: 'light',
      roastedFor: 'filter',
      link: 'https://mokcoffee.be/gascon-filter',
      origins: [{ code: 'GT', name: 'Guatemala' }],
      processes: [{ name: 'Washed' }],
      varietals: [{ name: 'Bourbon' }],
      flavorNotes: [{ name: 'Plum' }],
      rating: 5,
      wouldBuyAgain: true,
      purchases: [
        {
          purchasedOn: '2025-12-25',
          roastedOn: null,
          sizeGrams: 200,
          priceCents: 2500,
          finishedAt: null,
        },
      ],
    })
  })

  it('keeps flavor notes no coffee uses', async () => {
    const { db, run } = await setup()

    await run([notionCoffee()])

    expect(
      (await db.select().from(flavorNote)).map(note => note.name).sort(),
    ).toEqual(['Kiwi', 'Plum'])
  })

  it('merges duplicate rows into one coffee with several purchases', async () => {
    const { db, run } = await setup()

    await run([
      notionCoffee({ link: 'https://mok/gascon', rating: 4 }),
      notionCoffee({
        purchasedOn: '2026-01-24',
        sizeGrams: 250,
        price: 17,
        flavorNotes: ['Kiwi'],
        wouldBuyAgain: true,
      }),
    ])

    const coffees = await db.select().from(coffee)
    const verdicts = await db.select().from(coffeeVerdict)

    expect(coffees).toHaveLength(1)
    expect(coffees[0]!.link).toBe('https://mok/gascon')
    expect(await db.select().from(purchase)).toHaveLength(2)
    expect(verdicts).toEqual([
      expect.objectContaining({ rating: 4, wouldBuyAgain: true }),
    ])
  })

  it('keeps the same name from two roasters as two coffees', async () => {
    const { db, run } = await setup()

    await run([
      notionCoffee({ roaster: 'Schot', name: 'Sakami' }),
      notionCoffee({ roaster: 'Winok', name: 'Sakami' }),
    ])

    expect(await db.select().from(coffee)).toHaveLength(2)
    expect(await db.select().from(roaster)).toHaveLength(2)
  })

  it('owns the Fellow and Timemore grinders on the shelf', async () => {
    const { db, home, run } = await setup()

    await run([])

    expect(await listShelfGrinders(db, home.id)).toEqual([
      { id: expect.any(String), brand: 'Fellow', model: 'Opus Gen 2' },
      { id: expect.any(String), brand: 'Timemore', model: 'Chestnut C5 Pro' },
    ])
  })

  it('copies photos and lists the ones it could not copy', async () => {
    const { db, run } = await setup()

    const result = await run([
      notionCoffee({ photoUrl: 'https://notion/gascon.webp' }),
      notionCoffee({ name: 'Las lajas', photoUrl: 'https://notion/broken' }),
    ])

    expect(result.missingPhotos).toEqual(['Mok Las lajas'])
    expect(
      (await db.select().from(coffee)).map(found => found.photoUrl).sort(),
    ).toEqual(['https://blob/gascon.webp', null])
  })

  it('does not duplicate anything when run again', async () => {
    const { db, copyPhoto, run } = await setup()
    const rows = [
      notionCoffee({ photoUrl: 'https://notion/gascon.webp' }),
      notionCoffee({ purchasedOn: '2026-01-24', price: 17 }),
    ]

    await run(rows)
    const [first] = await db.select().from(coffee)
    await run([rows[0]!, { ...rows[1]!, price: 18, finishedAt: null }])

    const purchases = await db
      .select()
      .from(purchase)
      .where(eq(purchase.purchasedOn, '2026-01-24'))

    expect(await db.select().from(coffee)).toEqual([first])
    expect(await db.select().from(purchase)).toHaveLength(2)
    expect(purchases).toEqual([
      expect.objectContaining({ priceCents: 1800, finishedAt: null }),
    ])
    expect(await db.select().from(flavorNote)).toHaveLength(2)
    expect(copyPhoto).toHaveBeenCalledTimes(1)
  })
})

describe('finding the shelf to import onto', () => {
  it('takes the oldest shelf the user owns', async () => {
    const { db, jeremy, home } = await setup()
    await createShelf(db, { name: 'Work', ownerId: jeremy.id })

    expect(await findImportShelf(db, 'Jeremy@example.com')).toEqual({
      shelfId: home.id,
      userId: jeremy.id,
    })
  })

  it('says when nobody with that email owns a shelf', async () => {
    const { db } = await setup()

    await expect(findImportShelf(db, 'nobody@example.com')).rejects.toThrow(
      'No user with a shelf of their own for nobody@example.com',
    )
  })
})
