import { and, asc, eq } from 'drizzle-orm'
import type { NewGrinder } from '#shared/types/grinders'
import type { Database } from '#server/types/database'
import { coffee, purchase, shelf, shelfMember, user } from '#server/db/schemas'
import { listBrewMethods } from '#server/utils/brew-methods'
import { ownGrinder } from '#server/utils/grinders'
import { setGrindSetting } from '#server/utils/grind-settings'
import { addPurchase } from '#server/utils/purchases'
import { createShelf } from '#server/utils/shelves'
import { judgeCoffee } from '#server/utils/verdicts'

const grinders = {
  opus: { brand: 'Fellow', model: 'Opus Gen 2' },
  timemore: { brand: 'Timemore', model: 'Chestnut C5 Pro' },
  c40: { brand: 'Comandante', model: 'C40 MK4' },
  zp6: { brand: '1Zpresso', model: 'ZP6 Special' },
} satisfies Record<string, NewGrinder>

type GrinderKey = keyof typeof grinders

export const devMember = { id: 'dev-tom', name: 'Tom Tester' }

export const devOutsiders: {
  id: string
  name: string
  grinders: [GrinderKey, GrinderKey]
  offset: number
}[] = [
  { id: 'dev-ana', name: 'Ana Outsider', grinders: ['opus', 'c40'], offset: 0 },
  {
    id: 'dev-liam',
    name: 'Liam Random',
    grinders: ['timemore', 'c40'],
    offset: 3,
  },
  { id: 'dev-noor', name: 'Noor Random', grinders: ['opus', 'zp6'], offset: 6 },
]

const testShelfCoffees = 6
const outsiderCoffees = 20
const memberRatings = [5, 2, 4, 3, 1, 4]

export function isLocalDatabase(url: string) {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

async function findOrCreateShelf(db: Database, ownerId: string, name: string) {
  const [owned] = await db
    .select({ id: shelf.id })
    .from(shelf)
    .where(eq(shelf.ownerId, ownerId))
    .orderBy(asc(shelf.createdAt))
    .limit(1)

  return owned ?? createShelf(db, { name, ownerId })
}

async function ownAll(
  db: Database,
  input: { shelfId: string; userId: string },
  keys: GrinderKey[],
) {
  const owned = {} as Record<GrinderKey, string>

  for (const key of keys) {
    owned[key] = (await ownGrinder(db, { ...input, grinder: grinders[key] })).id
  }

  return owned
}

async function stockTestShelf(
  db: Database,
  input: { shelfId: string; ownerId: string; coffeeIds: string[] },
) {
  for (const [index, coffeeId] of input.coffeeIds.entries()) {
    const [bought] = await db
      .select({ id: purchase.id })
      .from(purchase)
      .where(
        and(
          eq(purchase.shelfId, input.shelfId),
          eq(purchase.coffeeId, coffeeId),
        ),
      )

    if (bought) continue

    const purchasedOn = new Date(Date.now() - index * 9 * 24 * 60 * 60 * 1000)
    const added = await addPurchase(db, {
      shelfId: input.shelfId,
      coffeeId,
      userId: index % 2 ? devMember.id : input.ownerId,
      purchase: {
        purchasedOn: purchasedOn.toISOString().slice(0, 10),
        roastedOn: null,
        sizeGrams: 250,
        price: 16.5,
      },
    })

    if (index >= testShelfCoffees / 2) {
      await db
        .update(purchase)
        .set({ finishedAt: new Date() })
        .where(eq(purchase.id, added.id))
    }
  }
}

export async function seedDevData(db: Database, shelfName = 'test') {
  const [testShelf] = await db
    .select({ id: shelf.id, ownerId: shelf.ownerId })
    .from(shelf)
    .where(eq(shelf.name, shelfName))
    .limit(1)

  if (!testShelf) throw new Error(`Create a shelf named "${shelfName}" first`)

  const coffees = await db
    .select({ id: coffee.id })
    .from(coffee)
    .orderBy(asc(coffee.nameKey))
    .limit(outsiderCoffees)

  if (coffees.length < testShelfCoffees) {
    throw new Error(`Add at least ${testShelfCoffees} coffees first`)
  }

  const people = [devMember, ...devOutsiders]

  await db
    .insert(user)
    .values(
      people.map(person => ({
        id: person.id,
        name: person.name,
        email: `${person.id.slice('dev-'.length)}@coffeee.test`,
        emailVerified: true,
        role: 'user',
      })),
    )
    .onConflictDoNothing()
  await db
    .insert(shelfMember)
    .values({ shelfId: testShelf.id, userId: devMember.id })
    .onConflictDoNothing()

  const brewMethods = await listBrewMethods(db)
  const brewMethodId = (name: string) =>
    brewMethods.find(method => method.name === name)!.id
  const coffeeIds = coffees.map(found => found.id)
  const onTestShelf = coffeeIds.slice(0, testShelfCoffees)

  const testGrinders = await ownAll(
    db,
    { shelfId: testShelf.id, userId: testShelf.ownerId },
    ['opus', 'timemore'],
  )
  await stockTestShelf(db, {
    shelfId: testShelf.id,
    ownerId: testShelf.ownerId,
    coffeeIds: onTestShelf,
  })

  for (const [index, coffeeId] of onTestShelf.entries()) {
    const rating = memberRatings[index]!

    await judgeCoffee(db, {
      userId: devMember.id,
      coffeeId,
      verdict: { rating, wouldBuyAgain: rating >= 4 },
    })

    for (const [grinderId, brewMethod, setting] of [
      [testGrinders.opus, 'Espresso', `${10 + index}`],
      [testGrinders.timemore, 'Pour over', `${18 + index} clicks`],
    ] as const) {
      await setGrindSetting(db, {
        shelfId: testShelf.id,
        coffeeId,
        userId: devMember.id,
        change: { grinderId, brewMethodId: brewMethodId(brewMethod), setting },
      })
    }
  }

  for (const outsider of devOutsiders) {
    const own = await findOrCreateShelf(
      db,
      outsider.id,
      `${outsider.name.split(' ')[0]}'s shelf`,
    )
    const owned = await ownAll(
      db,
      { shelfId: own.id, userId: outsider.id },
      outsider.grinders,
    )
    const [espressoGrinder, pourOverGrinder] = outsider.grinders

    for (const [index, coffeeId] of coffeeIds.entries()) {
      const turn = index + outsider.offset

      if (turn % 3 === 2) continue

      const rating = ((index * 7 + outsider.offset) % 5) + 1

      await judgeCoffee(db, {
        userId: outsider.id,
        coffeeId,
        verdict: { rating, wouldBuyAgain: rating >= 4 && index % 2 === 0 },
      })

      for (const [grinderId, brewMethod, setting] of [
        [owned[espressoGrinder], 'Espresso', `${8 + (turn % 6)}.5`],
        [owned[pourOverGrinder], 'Pour over', `${20 + (turn % 8)} clicks`],
      ] as const) {
        await setGrindSetting(db, {
          shelfId: own.id,
          coffeeId,
          userId: outsider.id,
          change: {
            grinderId,
            brewMethodId: brewMethodId(brewMethod),
            setting,
          },
        })
      }
    }
  }

  return {
    shelfId: testShelf.id,
    people: people.map(person => person.name),
    testShelfCoffees: onTestShelf.length,
    coffeesJudgedByOutsiders: coffeeIds.length,
  }
}
