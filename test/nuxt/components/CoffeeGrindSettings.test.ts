import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeGrindSettings from '~/components/CoffeeGrindSettings.vue'
import type { ShelfGrindSetting } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

beforeEach(resetApi)

const espresso12: ShelfGrindSetting = {
  grinderId: 'opus',
  brand: 'Fellow',
  model: 'Opus Gen 2',
  brewMethodId: 'espresso',
  brewMethod: 'Espresso',
  setting: '12',
}

function mountSettings(grindSettings: ShelfGrindSetting[] = []) {
  return mountSuspended(CoffeeGrindSettings, {
    props: { shelfId: 'home', coffeeId: 'c1', grindSettings },
  })
}

describe('CoffeeGrindSettings', () => {
  it('lists the grind settings of the coffee', async () => {
    const settings = await mountSettings([espresso12])

    const [saved] = settings.findAll(tid('grind-setting'))
    expect(saved!.get(tid('grind-setting-for')).text()).toBe(
      'Fellow Opus Gen 2 · Espresso',
    )
    expect(saved!.get(tid('grind-setting-value')).text()).toBe('12')
  })

  it('says when the coffee has no grind settings yet', async () => {
    const settings = await mountSettings()

    expect(settings.get(tid('grind-settings-empty')).text()).toBe(
      'No grind settings for this coffee yet.',
    )
  })

  it('sends the shelf to its settings when it owns no grinders', async () => {
    api.grinders = []

    const settings = await mountSettings([espresso12])

    expect(settings.get(tid('grind-no-grinders')).text()).toContain(
      'This shelf owns no grinders yet.',
    )
    expect(settings.get(tid('grind-add-grinder')).attributes('href')).toBe(
      '/shelves/home/settings',
    )
    expect(settings.find(tid('grind-setting-form')).exists()).toBe(false)
  })

  it('saves a setting for the picked grinder and brew method', async () => {
    const settings = await mountSettings()

    await settings.get(tid('grind-brew-method')).setValue('pour-over')
    await settings.get(tid('grind-setting-input')).setValue(' 4.2 ')
    await settings.get(tid('grind-setting-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(api.grindSettingCalls).toEqual([
        { grinderId: 'opus', brewMethodId: 'pour-over', setting: '4.2' },
      ]),
    )
  })

  it('fills in the setting already kept for the picked combination', async () => {
    const settings = await mountSettings([espresso12])

    const input = settings.get<HTMLInputElement>(tid('grind-setting-input'))
    expect(input.element.value).toBe('12')

    await settings.get(tid('grind-brew-method')).setValue('pour-over')
    expect(input.element.value).toBe('')
  })

  it('edits a saved setting', async () => {
    const settings = await mountSettings([
      { ...espresso12, brewMethodId: 'pour-over', brewMethod: 'Pour over' },
    ])
    const brewMethod = settings.get<HTMLSelectElement>(tid('grind-brew-method'))
    expect(brewMethod.element.value).toBe('espresso')

    await settings.get(tid('grind-setting-edit')).trigger('click')

    expect(brewMethod.element.value).toBe('pour-over')
    expect(
      settings.get<HTMLInputElement>(tid('grind-setting-input')).element.value,
    ).toBe('12')
  })

  it('clears a saved setting', async () => {
    const settings = await mountSettings([espresso12])

    await settings.get(tid('grind-setting-clear')).trigger('click')

    await vi.waitFor(() =>
      expect(api.grindSettingCalls).toEqual([
        { grinderId: 'opus', brewMethodId: 'espresso', setting: null },
      ]),
    )
  })

  it('says why the setting could not be saved', async () => {
    api.grindSettingFails = true
    const settings = await mountSettings()

    await settings.get(tid('grind-setting-input')).setValue('12')
    await settings.get(tid('grind-setting-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(settings.get(tid('grind-setting-error')).text()).toBe(
        'This shelf does not own that grinder',
      ),
    )
  })
})
