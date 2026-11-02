import { describe, expect, it } from 'vitest'
import { grindSetting } from '#server/db/schemas'
import { listBrewMethods } from '#server/utils/brew-methods'
import { addCoffee, findShelfCoffee, listStock } from '#server/utils/coffees'
import { disownGrinder, ownGrinder } from '#server/utils/grinders'
import { grindSettingsOf, setGrindSetting } from '#server/utils/grind-settings'
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
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })
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
  const ref = { shelfId: home.id, coffeeId: added.coffee.id }

  function grind(
    setting: string | null,
    options: {
      grinderId?: string
      brewMethodId?: string
      shelfId?: string
    } = {},
  ) {
    return setGrindSetting(db, {
      ...ref,
      shelfId: options.shelfId ?? ref.shelfId,
      userId: sarah.id,
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
    home,
    work,
    ref,
    opus,
    espresso: espresso!,
    pourOver: pourOver!,
    grind,
  }
}

describe('grind settings', () => {
  it('remembers a setting for a grinder and brew method', async () => {
    const { db, ref, opus, espresso, grind } = await setup()

    const saved = await grind('12')

    expect(saved).toEqual({
      outcome: 'saved',
      grindSetting: {
        grinderId: opus.id,
        brewMethodId: espresso.id,
        setting: '12',
      },
    })
    expect(await grindSettingsOf(db, ref)).toEqual([
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
    const { db, ref, grind } = await setup()

    await grind('12')
    await grind('10')

    const settings = await grindSettingsOf(db, ref)
    expect(settings.map(saved => saved.setting)).toEqual(['10'])
  })

  it('keeps a setting for each brew method in brew method order', async () => {
    const { db, ref, pourOver, grind } = await setup()

    await grind('4.2', { brewMethodId: pourOver.id })
    await grind('12')

    const settings = await grindSettingsOf(db, ref)
    expect(settings.map(saved => [saved.brewMethod, saved.setting])).toEqual([
      ['Espresso', '12'],
      ['Pour over', '4.2'],
    ])
  })

  it('clears a setting', async () => {
    const { db, ref, grind } = await setup()

    await grind('12')
    await grind(null)

    expect(await grindSettingsOf(db, ref)).toEqual([])
  })

  it('keeps who changed it last', async () => {
    const { db, sarah, ref, grind } = await setup()

    await grind('12')

    const [stored] = await db.select().from(grindSetting)
    expect(stored).toMatchObject({ ...ref, updatedBy: sarah.id })
  })

  it('hides a setting while the shelf no longer owns the grinder', async () => {
    const { db, sarah, home, ref, grind, opus } = await setup()
    await grind('12')

    await disownGrinder(db, { shelfId: home.id, grinderId: opus.id })
    expect(await grindSettingsOf(db, ref)).toEqual([])

    await ownGrinder(db, {
      shelfId: home.id,
      userId: sarah.id,
      grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
    })
    expect(
      (await grindSettingsOf(db, ref)).map(saved => saved.setting),
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

  it('keeps each shelf its own settings', async () => {
    const { db, sarah, work, ref, grind } = await setup()
    await ownGrinder(db, {
      shelfId: work.id,
      userId: sarah.id,
      grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
    })

    await grind('12')

    expect(
      await grindSettingsOf(db, { shelfId: work.id, coffeeId: ref.coffeeId }),
    ).toEqual([])
  })

  it('shows the settings on the coffee but not in stock', async () => {
    const { db, sarah, home, ref, grind } = await setup()

    await grind('12')

    const coffee = await findShelfCoffee(db, { ...ref, viewer: sarah })
    expect(coffee?.grindSettings.map(saved => saved.setting)).toEqual(['12'])
    expect((await listStock(db, home.id))[0]).not.toHaveProperty(
      'grindSettings',
    )
  })
})
