import { describe, expect, it } from 'vitest'
import {
  useGrindSettingSave,
  useShelfGrindSettings,
} from '~/queries/grind-settings'
import { grindSettingsOf } from '#server/utils/grind-settings'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

describe('useGrindSettingSave', () => {
  it('saves the grind setting and shows it on the coffee', async () => {
    const sarah = await scenario.member('Sarah')
    const ayele = await scenario.coffee(sarah.shelf)
    const opus = await scenario.grinder(sarah.shelf, {
      brand: '1Zpresso',
      model: 'Opus',
    })
    const espresso = await scenario.brewMethod('Espresso')
    await signIn(sarah)
    const { result, coffee } = await runOn('/', () => ({
      result: useGrindSettingSave(),
      coffee: useShelfGrindSettings(sarah.shelf.id, ayele.id),
    }))
    await coffee.suspense()

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      coffeeId: ayele.id,
      change: { grinderId: opus.id, brewMethodId: espresso.id, setting: '12' },
    })

    expect(
      await grindSettingsOf(await database(), {
        userId: sarah.id,
        coffeeId: ayele.id,
      }),
    ).toEqual([
      expect.objectContaining({
        model: 'Opus',
        brewMethod: 'Espresso',
        setting: '12',
      }),
    ])
    expect(coffee.data.value?.grindSettings).toEqual([
      expect.objectContaining({ model: 'Opus', setting: '12' }),
    ])
  })
})
