import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  coffee,
  coffeeVerdict,
  grindSetting,
  grinder,
  invite,
  notification,
  purchase,
  shelfGrinder,
  shelfMember,
} from '#server/db/schemas'
import { listBrewMethods } from '#server/utils/brew-methods'
import { addCoffee } from '#server/utils/coffees'
import { ownGrinder } from '#server/utils/grinders'
import { setGrindSetting } from '#server/utils/grind-settings'
import { inviteToShelf } from '#server/utils/invites'
import { listNotifications } from '#server/utils/notifications'
import { addPurchase, finishPurchase } from '#server/utils/purchases'
import {
  createShelf,
  deleteShelf,
  findShelf,
  handOverShelf,
  leaveShelf,
  listShelfMembers,
  listShelves,
  removeMember,
  renameShelf,
  shelfNameFor,
  shelvesHolding,
} from '#server/utils/shelves'
import { judgeCoffee } from '#server/utils/verdicts'
import type { NewCoffee } from '#shared/types/coffee'
import type { TestDatabase } from '#test/support/types'
import { createTestDatabase, createTestUser } from '#test/support/database'
import { testOrigin } from '#test/support/origin'

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })

  return { db, sarah, tom }
}

describe('shelfNameFor', () => {
  it('names a shelf after the first name of its owner', () => {
    expect(shelfNameFor('Sarah Jones')).toBe("Sarah's shelf")
  })

  it('falls back to a plain name when there is no name', () => {
    expect(shelfNameFor('  ')).toBe('My shelf')
  })
})

describe('shelves', () => {
  it('makes the creator of a shelf its owner and a member', async () => {
    const { db, sarah } = await setup()

    const shelf = await createShelf(db, { name: 'Work', ownerId: sarah.id })

    expect(shelf).toMatchObject({ name: 'Work', ownerId: sarah.id })
    expect(await listShelves(db, sarah.id)).toEqual([
      { id: shelf.id, name: 'Work', ownerId: sarah.id },
    ])
  })

  it('lists only the shelves a user is a member of, oldest first', async () => {
    const { db, sarah, tom } = await setup()
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
    await createShelf(db, { name: "Tom's shelf", ownerId: tom.id })
    const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })

    const shelves = await listShelves(db, sarah.id)

    expect(shelves.map(shelf => shelf.id)).toEqual([home.id, work.id])
  })

  it('finds a shelf for its members', async () => {
    const { db, sarah } = await setup()
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })

    const found = await findShelf(db, { shelfId: home.id, userId: sarah.id })

    expect(found).toEqual({ id: home.id, name: 'Home', ownerId: sarah.id })
  })

  it('finds nothing for someone who is not a member', async () => {
    const { db, sarah, tom } = await setup()
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })

    const found = await findShelf(db, { shelfId: home.id, userId: tom.id })

    expect(found).toBeUndefined()
  })
})

describe('shelvesHolding', () => {
  const bag = {
    purchasedOn: '2026-11-01',
    roastedOn: null,
    sizeGrams: null,
    price: null,
  }

  it('counts the bags and those in stock on each shelf of the viewer, oldest shelf first', async () => {
    const { db, sarah, tom } = await setup()
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
    const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })
    const toms = await createShelf(db, { name: "Tom's shelf", ownerId: tom.id })
    const { coffee, purchase: first } = await addCoffee(db, {
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
        processes: [],
        varietals: [],
        flavorNotes: [],
        link: null,
        altitudeFrom: null,
        altitudeTo: null,
        ...bag,
      },
      origin: testOrigin,
    })
    await addPurchase(db, {
      shelfId: home.id,
      coffeeId: coffee.id,
      userId: sarah.id,
      purchase: bag,
    })
    await finishPurchase(db, {
      shelfId: home.id,
      coffeeId: coffee.id,
      purchaseId: first.id,
      userId: sarah.id,
      origin: testOrigin,
    })
    await addPurchase(db, {
      shelfId: toms.id,
      coffeeId: coffee.id,
      userId: tom.id,
      purchase: bag,
    })

    const shelves = await shelvesHolding(db, {
      coffeeId: coffee.id,
      userId: sarah.id,
    })

    expect(shelves).toEqual([
      { id: home.id, name: 'Home', bags: 2, inStock: 1 },
      { id: work.id, name: 'Work', bags: 0, inStock: 0 },
    ])
  })
})

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
  processes: [],
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

async function shared() {
  const { db, sarah, tom } = await setup()
  const lisa = await createTestUser(db, { name: 'Lisa' })
  const sarahs = await createShelf(db, {
    name: "Sarah's shelf",
    ownerId: sarah.id,
  })
  const toms = await createShelf(db, { name: "Tom's shelf", ownerId: tom.id })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await db.insert(shelfMember).values([
    { shelfId: home.id, userId: tom.id },
    { shelfId: home.id, userId: lisa.id },
  ])

  return { db, sarah, tom, lisa, sarahs, toms, home }
}

function shelfNamesOf(db: TestDatabase, userId: string) {
  return listShelves(db, userId).then(shelves =>
    shelves.map(shelf => shelf.name),
  )
}

describe('listShelfMembers', () => {
  it('lists everyone on a shelf in the order they joined', async () => {
    const { db, sarah, tom, lisa, home } = await shared()

    const members = await listShelfMembers(db, home.id)

    expect(members.map(member => member.id)).toEqual([
      sarah.id,
      tom.id,
      lisa.id,
    ])
    expect(members[1]).toMatchObject({
      name: 'Tom',
      email: tom.email,
      image: null,
    })
  })
})

describe('renameShelf', () => {
  it('renames a shelf', async () => {
    const { db, sarah, home } = await shared()

    const renamed = await renameShelf(db, { shelfId: home.id, name: 'Flat' })

    expect(renamed).toEqual({ id: home.id, name: 'Flat', ownerId: sarah.id })
  })
})

describe('handOverShelf', () => {
  it('makes another member the shelf owner', async () => {
    const { db, tom, home } = await shared()

    const result = await handOverShelf(db, {
      shelfId: home.id,
      ownerId: tom.id,
    })

    expect(result).toEqual({
      outcome: 'handedOver',
      shelf: { id: home.id, name: 'Home', ownerId: tom.id },
    })
  })

  it('refuses someone who is not a member', async () => {
    const { db, home } = await shared()
    const stranger = await createTestUser(db, { name: 'Anna' })

    const result = await handOverShelf(db, {
      shelfId: home.id,
      ownerId: stranger.id,
    })

    expect(result).toEqual({ outcome: 'notMember' })
  })
})

describe('removeMember', () => {
  it('takes a member off the shelf', async () => {
    const { db, sarah, tom, home } = await shared()

    const result = await removeMember(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: tom.id,
      origin: testOrigin,
    })

    expect(result).toEqual({ outcome: 'removed' })
    expect(await shelfNamesOf(db, tom.id)).toEqual(["Tom's shelf"])
  })

  it('tells the other members, not the shelf owner or the one removed', async () => {
    const { db, sarah, tom, lisa, home } = await shared()

    await removeMember(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: tom.id,
      origin: testOrigin,
    })

    expect(await listNotifications(db, lisa.id)).toMatchObject([
      { kind: 'memberLeft', actor: 'Tom', shelfId: home.id },
    ])
    expect(await listNotifications(db, sarah.id)).toEqual([])
    expect(await listNotifications(db, tom.id)).toEqual([])
  })

  it('refuses to remove the shelf owner', async () => {
    const { db, sarah, home } = await shared()

    const result = await removeMember(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: sarah.id,
      origin: testOrigin,
    })

    expect(result).toEqual({ outcome: 'owner' })
  })

  it('says when the person is not on the shelf', async () => {
    const { db, sarah, home } = await shared()
    const stranger = await createTestUser(db, { name: 'Anna' })

    const result = await removeMember(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: stranger.id,
      origin: testOrigin,
    })

    expect(result).toEqual({ outcome: 'notMember' })
    expect(await db.select().from(notification)).toEqual([])
  })

  it('gives someone a new shelf of their own when they lose their only one', async () => {
    const { db, sarah, lisa, home } = await shared()

    await removeMember(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: lisa.id,
      origin: testOrigin,
    })

    expect(await listShelves(db, lisa.id)).toMatchObject([
      { name: "Lisa's shelf", ownerId: lisa.id },
    ])
  })
})

describe('leaveShelf', () => {
  it('lets a member leave', async () => {
    const { db, sarah, tom, home } = await shared()

    const result = await leaveShelf(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: tom.id,
      origin: testOrigin,
    })

    expect(result).toEqual({ outcome: 'left' })
    expect(await shelfNamesOf(db, tom.id)).toEqual(["Tom's shelf"])
    expect(await shelfNamesOf(db, sarah.id)).toEqual(["Sarah's shelf", 'Home'])
  })

  it('tells the members who stay', async () => {
    const { db, sarah, tom, lisa, home } = await shared()

    await leaveShelf(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: tom.id,
      origin: testOrigin,
    })

    for (const member of [sarah, lisa]) {
      expect(await listNotifications(db, member.id)).toMatchObject([
        { kind: 'memberLeft', actor: 'Tom', shelfId: home.id },
      ])
    }
    expect(await listNotifications(db, tom.id)).toEqual([])
  })

  it('keeps a member on their only shelf', async () => {
    const { db, sarah, lisa, home } = await shared()

    const result = await leaveShelf(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: lisa.id,
      origin: testOrigin,
    })

    expect(result).toEqual({ outcome: 'lastShelf' })
    expect(await shelfNamesOf(db, lisa.id)).toEqual(['Home'])
    expect(await db.select().from(notification)).toEqual([])
  })

  it('makes the shelf owner hand the shelf over while others are on it', async () => {
    const { db, sarah, home } = await shared()

    const result = await leaveShelf(db, {
      shelfId: home.id,
      ownerId: sarah.id,
      userId: sarah.id,
      origin: testOrigin,
    })

    expect(result).toEqual({ outcome: 'handOverFirst' })
    expect(await shelfNamesOf(db, sarah.id)).toEqual(["Sarah's shelf", 'Home'])
    expect(await db.select().from(notification)).toEqual([])
  })

  it('deletes the shelf when the shelf owner is the last member to leave', async () => {
    const { db, sarah } = await shared()
    const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })

    const result = await leaveShelf(db, {
      shelfId: work.id,
      ownerId: sarah.id,
      userId: sarah.id,
      origin: testOrigin,
    })

    expect(result).toEqual({ outcome: 'deleted' })
    expect(await findShelf(db, { shelfId: work.id, userId: sarah.id })).toBe(
      undefined,
    )
  })
})

describe('deleteShelf', () => {
  it('keeps the only shelf of the shelf owner', async () => {
    const { db, sarah } = await setup()
    const only = await createShelf(db, { name: 'Only', ownerId: sarah.id })

    const result = await deleteShelf(db, { shelfId: only.id, userId: sarah.id })

    expect(result).toEqual({ outcome: 'lastShelf' })
    expect(await shelfNamesOf(db, sarah.id)).toEqual(['Only'])
  })

  it("deletes the bags, owned grinders and invites of the shelf but nothing in the catalog or anyone's verdicts", async () => {
    const { db, sarah, tom, home } = await shared()
    const added = await addCoffee(db, {
      shelfId: home.id,
      userId: sarah.id,
      coffee: firstBag,
      origin: testOrigin,
    })
    const opus = await ownGrinder(db, {
      shelfId: home.id,
      userId: sarah.id,
      grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
    })
    const [espresso] = await listBrewMethods(db)
    await judgeCoffee(db, {
      userId: tom.id,
      coffeeId: added.coffee.id,
      verdict: { rating: 4, wouldBuyAgain: true },
    })
    await setGrindSetting(db, {
      shelfId: home.id,
      coffeeId: added.coffee.id,
      userId: tom.id,
      change: { grinderId: opus.id, brewMethodId: espresso!.id, setting: '12' },
    })
    await inviteToShelf(db, {
      shelfId: home.id,
      email: 'anna@example.com',
      createdBy: sarah.id,
    })

    const result = await deleteShelf(db, { shelfId: home.id, userId: sarah.id })

    expect(result).toEqual({ outcome: 'deleted' })
    expect(
      await db.select().from(purchase).where(eq(purchase.shelfId, home.id)),
    ).toEqual([])
    expect(
      await db
        .select()
        .from(shelfGrinder)
        .where(eq(shelfGrinder.shelfId, home.id)),
    ).toEqual([])
    expect(
      await db.select().from(invite).where(eq(invite.shelfId, home.id)),
    ).toEqual([])
    expect(
      await db.select().from(coffee).where(eq(coffee.id, added.coffee.id)),
    ).toHaveLength(1)
    expect(
      await db.select().from(grinder).where(eq(grinder.id, opus.id)),
    ).toHaveLength(1)
    expect(
      await db
        .select()
        .from(coffeeVerdict)
        .where(eq(coffeeVerdict.userId, tom.id)),
    ).toHaveLength(1)
    expect(
      await db
        .select()
        .from(grindSetting)
        .where(eq(grindSetting.userId, tom.id)),
    ).toHaveLength(1)
  })

  it('gives members who lose their only shelf a new one of their own', async () => {
    const { db, sarah, tom, lisa, home } = await shared()

    await deleteShelf(db, { shelfId: home.id, userId: sarah.id })

    expect(await shelfNamesOf(db, sarah.id)).toEqual(["Sarah's shelf"])
    expect(await shelfNamesOf(db, tom.id)).toEqual(["Tom's shelf"])
    expect(await listShelves(db, lisa.id)).toMatchObject([
      { name: "Lisa's shelf", ownerId: lisa.id },
    ])
  })
})
