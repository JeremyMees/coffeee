import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import CoffeeGrindSettings from '~/components/CoffeeGrindSettings.vue'
import type { OwnGrindSetting } from '#imports'
import { shelfPath } from '#imports'
import { grindSetting } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { tid } from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let sarah: Member
let coffeeId: string
let opus: { id: string }
let espresso: { id: string }
let pourOver: { id: string }

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  coffeeId = (await scenario.coffee(sarah.shelf)).id
  opus = await scenario.grinder(sarah.shelf, {
    brand: 'Fellow',
    model: 'Opus Gen 2',
  })
  espresso = await scenario.brewMethod('Espresso')
  pourOver = await scenario.brewMethod('Pour over')
  await signIn(sarah)
})

async function keep(brewMethod: { id: string }, setting: string) {
  await scenario.grindSetting(sarah, sarah.shelf, coffeeId, {
    grinderId: opus.id,
    brewMethodId: brewMethod.id,
    setting,
  })
}

async function ownSettings() {
  const shelfCoffee = await $fetch<{ grindSettings: OwnGrindSetting[] }>(
    `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}`,
  )

  return shelfCoffee.grindSettings
}

async function mountSettings() {
  return mountSuspended(CoffeeGrindSettings, {
    props: {
      shelfId: sarah.shelf.id,
      coffeeId,
      grindSettings: await ownSettings(),
    },
  })
}

async function stored() {
  const db = await database()

  return db
    .select({
      grinderId: grindSetting.grinderId,
      brewMethodId: grindSetting.brewMethodId,
      setting: grindSetting.setting,
    })
    .from(grindSetting)
    .where(eq(grindSetting.coffeeId, coffeeId))
}

describe('CoffeeGrindSettings', () => {
  it('lists the grind settings of the coffee', async () => {
    await keep(espresso, '12')

    const settings = await mountSettings()

    const [saved] = settings.findAll(tid('grind-setting'))
    expect(saved!.get(tid('grind-setting-for')).text()).toBe(
      'Fellow Opus Gen 2 · Espresso',
    )
    expect(saved!.get(tid('grind-setting-value')).text()).toBe('12')
  })

  it('says when the coffee has no grind settings yet', async () => {
    const settings = await mountSettings()

    expect(settings.get(tid('grind-settings-empty')).text()).toBe(
      'You have no grind settings for this coffee yet.',
    )
  })

  it('sends the shelf to its settings when it owns no grinders', async () => {
    const tom = await scenario.member('Tom')
    await signIn(tom)
    const tomsCoffee = await scenario.coffee(tom.shelf)

    const settings = await mountSuspended(CoffeeGrindSettings, {
      props: {
        shelfId: tom.shelf.id,
        coffeeId: tomsCoffee.id,
        grindSettings: [],
      },
    })

    expect(settings.get(tid('grind-no-grinders')).text()).toContain(
      'This shelf owns no grinders yet.',
    )
    expect(settings.get(tid('grind-add-grinder')).attributes('href')).toBe(
      `${shelfPath(tom.shelf)}/settings?tab=grinders`,
    )
    expect(settings.find(tid('grind-setting-form')).exists()).toBe(false)
  })

  it('saves a setting for the picked grinder and brew method', async () => {
    const settings = await mountSettings()

    await settings.get(tid('grind-brew-method')).setValue(pourOver.id)
    await settings.get(tid('grind-setting-input')).setValue(' 4.2 ')
    await settings.get(tid('grind-setting-form')).trigger('submit')

    await vi.waitFor(async () =>
      expect(await stored()).toEqual([
        { grinderId: opus.id, brewMethodId: pourOver.id, setting: '4.2' },
      ]),
    )
  })

  it('fills in the setting already kept for the picked combination', async () => {
    await keep(espresso, '12')
    const settings = await mountSettings()

    const input = settings.get<HTMLInputElement>(tid('grind-setting-input'))
    expect(input.element.value).toBe('12')

    await settings.get(tid('grind-brew-method')).setValue(pourOver.id)
    expect(input.element.value).toBe('')
  })

  it('edits a saved setting', async () => {
    await keep(pourOver, '12')
    const settings = await mountSettings()
    const brewMethod = settings.get<HTMLSelectElement>(tid('grind-brew-method'))
    expect(brewMethod.element.value).toBe(espresso.id)

    await settings.get(tid('grind-setting-edit')).trigger('click')

    expect(brewMethod.element.value).toBe(pourOver.id)
    expect(
      settings.get<HTMLInputElement>(tid('grind-setting-input')).element.value,
    ).toBe('12')
  })

  it('clears a saved setting', async () => {
    await keep(espresso, '12')
    const settings = await mountSettings()

    await settings.get(tid('grind-setting-clear')).trigger('click')

    await vi.waitFor(async () => expect(await stored()).toEqual([]))
  })

  it('says why the setting could not be saved', async () => {
    failRequest(
      'PUT',
      `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}/grind-settings`,
      { status: 404, message: 'This shelf does not own that grinder' },
    )
    const settings = await mountSettings()

    await settings.get(tid('grind-setting-input')).setValue('12')
    await settings.get(tid('grind-setting-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(settings.get(tid('grind-setting-error')).text()).toBe(
        'This shelf does not own that grinder',
      ),
    )
    expect(await stored()).toEqual([])
  })
})
