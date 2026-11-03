import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  coffee,
  coffeeVerdict,
  flavorNote,
  grindSetting,
  grinder,
  grinderBrand,
  purchase,
  roaster,
  session,
  shelf,
  shelfGrinder,
  shelfMember,
  user,
} from '#server/db/schemas'
import { deleteAccount, listOwnedShelves } from '#server/utils/accounts'
import { listBrewMethods } from '#server/utils/brew-methods'
import { addCoffee } from '#server/utils/coffees'
import { ownGrinder } from '#server/utils/grinders'
import { setGrindSetting } from '#server/utils/grind-settings'
import { createShelf } from '#server/utils/shelves'
import { communityRatingOf, judgeCoffee } from '#server/utils/verdicts'
import type { NewCoffee } from '#shared/types/coffee'
import { createTestDatabase, createTestUser } from '#test/support/database'

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
  flavorNotes: ['Jasmine'],
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
  const admin = await createTestUser(db, { name: 'Jeremy', role: 'admin' })
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const lisa = await createTestUser(db, { name: 'Lisa' })
  const solo = await createShelf(db, {
    name: "Sarah's shelf",
    ownerId: sarah.id,
  })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: tom.id })
  await db.insert(shelfMember).values([
    { shelfId: home.id, userId: tom.id },
    { shelfId: home.id, userId: lisa.id },
    { shelfId: work.id, userId: sarah.id },
  ])

  return { db, admin, sarah, tom, lisa, solo, home, work }
}

describe('listOwnedShelves', () => {
  it('lists the shelves a user owns with everyone else in them', async () => {
    const { db, sarah, tom, lisa, solo, home } = await setup()

    expect(await listOwnedShelves(db, sarah.id)).toEqual([
      { id: solo.id, name: "Sarah's shelf", members: [] },
      {
        id: home.id,
        name: 'Home',
        members: [
          { id: tom.id, name: 'Tom' },
          { id: lisa.id, name: 'Lisa' },
        ],
      },
    ])
  })
})

describe('deleteAccount', () => {
  it('hands each shared shelf to the member chosen for it', async () => {
    const { db, sarah, lisa, home } = await setup()

    const result = await deleteAccount(db, {
      userId: sarah.id,
      heirs: { [home.id]: lisa.id },
    })

    const [found] = await db.select().from(shelf).where(eq(shelf.id, home.id))
    expect(result).toEqual({ outcome: 'deleted' })
    expect(found?.ownerId).toBe(lisa.id)
  })

  it('deletes the shelves nobody else is in, with their bags and grinders', async () => {
    const { db, sarah, tom, solo, home } = await setup()
    const added = await addCoffee(db, {
      shelfId: solo.id,
      userId: sarah.id,
      coffee: firstBag,
    })
    await ownGrinder(db, {
      shelfId: solo.id,
      userId: sarah.id,
      grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
    })

    await deleteAccount(db, { userId: sarah.id, heirs: { [home.id]: tom.id } })

    expect(await db.select().from(shelf).where(eq(shelf.id, solo.id))).toEqual(
      [],
    )
    expect(
      await db.select().from(purchase).where(eq(purchase.shelfId, solo.id)),
    ).toEqual([])
    expect(
      await db
        .select()
        .from(shelfGrinder)
        .where(eq(shelfGrinder.shelfId, solo.id)),
    ).toEqual([])
    expect(
      await db.select().from(coffee).where(eq(coffee.id, added.coffee.id)),
    ).toHaveLength(1)
  })

  it('leaves the other shelves and keeps what was added there', async () => {
    const { db, sarah, tom, home, work } = await setup()
    await addCoffee(db, {
      shelfId: work.id,
      userId: sarah.id,
      coffee: firstBag,
    })

    await deleteAccount(db, { userId: sarah.id, heirs: { [home.id]: tom.id } })

    expect(
      await db
        .select()
        .from(shelfMember)
        .where(eq(shelfMember.userId, sarah.id)),
    ).toEqual([])
    expect(
      await db
        .select({ addedBy: purchase.addedBy })
        .from(purchase)
        .where(eq(purchase.shelfId, work.id)),
    ).toEqual([{ addedBy: null }])
  })

  it('deletes the sessions, verdicts and grind settings of the user', async () => {
    const { db, sarah, tom, home, work } = await setup()
    const added = await addCoffee(db, {
      shelfId: work.id,
      userId: tom.id,
      coffee: firstBag,
    })
    const coffeeId = added.coffee.id
    const opus = await ownGrinder(db, {
      shelfId: work.id,
      userId: tom.id,
      grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
    })
    const [espresso] = await listBrewMethods(db)
    await judgeCoffee(db, {
      userId: sarah.id,
      coffeeId,
      verdict: { rating: 1 },
    })
    await judgeCoffee(db, { userId: tom.id, coffeeId, verdict: { rating: 5 } })
    await setGrindSetting(db, {
      shelfId: work.id,
      coffeeId,
      userId: sarah.id,
      change: { grinderId: opus.id, brewMethodId: espresso!.id, setting: '12' },
    })
    await db.insert(session).values({
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      userId: sarah.id,
      expiresAt: new Date(Date.now() + 60_000),
    })

    await deleteAccount(db, { userId: sarah.id, heirs: { [home.id]: tom.id } })

    expect(
      await db.select().from(session).where(eq(session.userId, sarah.id)),
    ).toEqual([])
    expect(
      await db
        .select()
        .from(coffeeVerdict)
        .where(eq(coffeeVerdict.userId, sarah.id)),
    ).toEqual([])
    expect(
      await db
        .select()
        .from(grindSetting)
        .where(eq(grindSetting.userId, sarah.id)),
    ).toEqual([])
    expect(await communityRatingOf(db, coffeeId)).toMatchObject({
      average: 5,
      raters: 1,
    })
    expect(await db.select().from(user).where(eq(user.id, sarah.id))).toEqual(
      [],
    )
  })

  it('gives the catalog entries the user added to an admin', async () => {
    const { db, admin, sarah, tom, home, work } = await setup()
    const added = await addCoffee(db, {
      shelfId: work.id,
      userId: sarah.id,
      coffee: firstBag,
    })
    await ownGrinder(db, {
      shelfId: work.id,
      userId: sarah.id,
      grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
    })

    await deleteAccount(db, { userId: sarah.id, heirs: { [home.id]: tom.id } })

    for (const table of [coffee, roaster, flavorNote, grinder, grinderBrand]) {
      expect(
        await db.select({ createdBy: table.createdBy }).from(table),
      ).toEqual([{ createdBy: admin.id }])
    }
    expect(
      await db.select().from(coffee).where(eq(coffee.id, added.coffee.id)),
    ).toHaveLength(1)
  })

  it('refuses until every shared shelf has a member to take it over', async () => {
    const { db, sarah, home } = await setup()

    const unchosen = await deleteAccount(db, { userId: sarah.id, heirs: {} })
    const outsider = await deleteAccount(db, {
      userId: sarah.id,
      heirs: { [home.id]: sarah.id },
    })

    expect(unchosen).toMatchObject({
      outcome: 'heirMissing',
      shelf: { id: home.id },
    })
    expect(outsider).toMatchObject({ outcome: 'heirMissing' })
    expect(
      await db.select().from(user).where(eq(user.id, sarah.id)),
    ).toHaveLength(1)
  })

  it('refuses when no other admin can look after the catalog', async () => {
    const { db, admin } = await setup()

    const result = await deleteAccount(db, { userId: admin.id, heirs: {} })

    expect(result).toEqual({ outcome: 'noAdmin' })
    expect(
      await db.select().from(user).where(eq(user.id, admin.id)),
    ).toHaveLength(1)
  })
})
