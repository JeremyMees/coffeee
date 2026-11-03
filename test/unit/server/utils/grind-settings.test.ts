import { describe, expect, it } from 'vitest'
import { grindSetting, shelfMember } from '#server/db/schemas'
import { listBrewMethods } from '#server/utils/brew-methods'
import { addCoffee, findShelfCoffee, listStock } from '#server/utils/coffees'
import { disownGrinder, ownGrinder } from '#server/utils/grinders'
import {
  grindSettingsOf,
  otherGrindSettingsOf,
  setGrindSetting,
} from '#server/utils/grind-settings'
import { createShelf } from '#server/utils/shelves'
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
  const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })
  await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.id })
  const added = await addCoffee(db, {
    shelfId: home.id,
    userId: sarah.id,
    coffee: firstBag,
  })
  const opus = await ownGrinder(db, {
    shelfId: home.id,
    userId: sarah.id,
    grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
  })
  const [espresso, pourOver] = await listBrewMethods(db)
  const coffeeId = added.coffee.id
  const ref = { shelfId: home.id, coffeeId }
  const sarahs = { userId: sarah.id, coffeeId }

  function grind(
    setting: string | null,
    options: {
      grinderId?: string
      brewMethodId?: string
      shelfId?: string
      userId?: string
    } = {},
  ) {
    return setGrindSetting(db, {
      coffeeId,
      shelfId: options.shelfId ?? home.id,
      userId: options.userId ?? sarah.id,
      change: {
        grinderId: options.grinderId ?? opus.id,
        brewMethodId: options.brewMethodId ?? espresso!.id,
        setting,
      },
    })
  }

  return {
    db,
    sarah,
    tom,
    home,
    work,
    ref,
    sarahs,
    opus,
    espresso: espresso!,
    pourOver: pourOver!,
    grind,
  }
}

describe('grind settings', () => {
  it('remembers a setting for a grinder and brew method', async () => {
    const { db, sarahs, opus, espresso, grind } = await setup()

    const saved = await grind('12')

    expect(saved).toEqual({
      outcome: 'saved',
      grindSetting: {
        grinderId: opus.id,
        brewMethodId: espresso.id,
        setting: '12',
      },
    })
    expect(await grindSettingsOf(db, sarahs)).toEqual([
      {
        grinderId: opus.id,
        brand: 'Fellow',
        model: 'Opus Gen 2',
        brewMethodId: espresso.id,
        brewMethod: 'Espresso',
        setting: '12',
      },
    ])
  })

  it('keeps at most one setting per grinder and brew method', async () => {
    const { db, sarahs, grind } = await setup()

    await grind('12')
    await grind('10')

    const settings = await grindSettingsOf(db, sarahs)
    expect(settings.map(saved => saved.setting)).toEqual(['10'])
  })

  it('keeps a setting for each brew method in brew method order', async () => {
    const { db, sarahs, pourOver, grind } = await setup()

    await grind('4.2', { brewMethodId: pourOver.id })
    await grind('12')

    const settings = await grindSettingsOf(db, sarahs)
    expect(settings.map(saved => [saved.brewMethod, saved.setting])).toEqual([
      ['Espresso', '12'],
      ['Pour over', '4.2'],
    ])
  })

  it('clears a setting', async () => {
    const { db, sarahs, grind } = await setup()

    await grind('12')
    await grind(null)

    expect(await grindSettingsOf(db, sarahs)).toEqual([])
  })

  it('stores the setting on the person who saved it', async () => {
    const { db, sarah, ref, grind } = await setup()

    await grind('12')

    expect(await db.select().from(grindSetting)).toEqual([
      expect.objectContaining({
        userId: sarah.id,
        coffeeId: ref.coffeeId,
        setting: '12',
      }),
    ])
  })

  it('lets two members of one shelf keep their own setting', async () => {
    const { db, tom, sarahs, ref, grind } = await setup()

    await grind('12')
    await grind('9', { userId: tom.id })
    await grind(null, { userId: tom.id })

    expect(
      (await grindSettingsOf(db, sarahs)).map(saved => saved.setting),
    ).toEqual(['12'])
    expect(
      await grindSettingsOf(db, { userId: tom.id, coffeeId: ref.coffeeId }),
    ).toEqual([])
  })

  it('keeps a setting when the shelf gives the grinder away', async () => {
    const { db, home, sarahs, grind, opus } = await setup()
    await grind('12')

    await disownGrinder(db, { shelfId: home.id, grinderId: opus.id })

    expect(
      (await grindSettingsOf(db, sarahs)).map(saved => saved.setting),
    ).toEqual(['12'])
  })

  it('refuses a grinder the shelf does not own', async () => {
    const { db, work, grind } = await setup()

    expect(await grind('12', { shelfId: work.id })).toEqual({
      outcome: 'missing',
      message: 'This shelf does not own that grinder',
    })
    expect(await db.select().from(grindSetting)).toEqual([])
  })

  it('refuses a brew method that does not exist', async () => {
    const { grind } = await setup()

    expect(await grind('12', { brewMethodId: 'missing' })).toEqual({
      outcome: 'missing',
      message: 'Brew method not found',
    })
  })

  it('refuses a coffee that does not exist', async () => {
    const { db, sarah, home, opus, espresso } = await setup()

    expect(
      await setGrindSetting(db, {
        shelfId: home.id,
        coffeeId: 'missing',
        userId: sarah.id,
        change: {
          grinderId: opus.id,
          brewMethodId: espresso.id,
          setting: '12',
        },
      }),
    ).toEqual({ outcome: 'missing', message: 'Coffee not found' })
  })

  it('shows the viewer’s settings on the coffee but not in stock', async () => {
    const { db, sarah, home, ref, grind } = await setup()

    await grind('12')

    const coffee = await findShelfCoffee(db, { ...ref, viewer: sarah })
    expect(coffee?.grindSettings.map(saved => saved.setting)).toEqual(['12'])
    expect(
      (await listStock(db, { shelfId: home.id, userId: sarah.id }))[0],
    ).not.toHaveProperty('grindSettings')
  })
})

describe('everyone else’s grind settings', () => {
  it('lists other people’s settings with their name, grinders the shelf owns first', async () => {
    const { db, sarah, tom, ref, opus, espresso, grind } = await setup()
    const ana = await createTestUser(db, { name: 'Ana' })
    const anaShelf = await createShelf(db, { name: 'Ana', ownerId: ana.id })
    const c40 = await ownGrinder(db, {
      shelfId: anaShelf.id,
      userId: ana.id,
      grinder: { brand: 'Comandante', model: 'C40' },
    })
    await ownGrinder(db, {
      shelfId: anaShelf.id,
      userId: ana.id,
      grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
    })

    await grind('12')
    await grind('10', { userId: tom.id })
    await grind('20', {
      userId: ana.id,
      shelfId: anaShelf.id,
      grinderId: c40.id,
    })
    await grind('11', { userId: ana.id, shelfId: anaShelf.id })

    const others = await otherGrindSettingsOf(db, { ...ref, userId: sarah.id })

    expect(
      others.map(other => [
        other.name,
        other.model,
        other.setting,
        other.ownedByShelf,
      ]),
    ).toEqual([
      ['Ana', 'Opus Gen 2', '11', true],
      ['Tom', 'Opus Gen 2', '10', true],
      ['Ana', 'C40', '20', false],
    ])
    expect(others[0]).toMatchObject({
      userId: ana.id,
      grinderId: opus.id,
      brewMethodId: espresso.id,
      brewMethod: 'Espresso',
    })
  })

  it('shows them on the coffee, also to someone whose shelf never bought it', async () => {
    const { db, ref, grind } = await setup()
    const ana = await createTestUser(db, { name: 'Ana' })
    const anaShelf = await createShelf(db, { name: 'Ana', ownerId: ana.id })

    await grind('12')

    const coffee = await findShelfCoffee(db, {
      shelfId: anaShelf.id,
      coffeeId: ref.coffeeId,
      viewer: ana,
    })

    expect(coffee).toMatchObject({
      grindSettings: [],
      otherGrindSettings: [
        { name: 'Sarah', setting: '12', ownedByShelf: false },
      ],
    })
  })
})
