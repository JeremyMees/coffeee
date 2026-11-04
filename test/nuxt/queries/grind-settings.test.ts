import { describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { useGrindSettingSave } from '~/queries/grind-settings'
import { grindSettingsOf } from '#server/utils/grind-settings'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

describe('useGrindSettingSave', () => {
  it('saves the grind setting and refreshes every shelf', async () => {
    const sarah = await scenario.member('Sarah')
    const ayele = await scenario.coffee(sarah.shelf)
    const opus = await scenario.grinder(sarah.shelf, {
      brand: '1Zpresso',
      model: 'Opus',
    })
    const espresso = await scenario.brewMethod('Espresso')
    await signIn(sarah)
    const { result, client } = await runOn('/', () => ({
      result: useGrindSettingSave(),
      client: useQueryClient(),
    }))
    const invalidate = vi.spyOn(client, 'invalidateQueries')

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
    expect(invalidate.mock.calls.map(([filters]) => filters)).toEqual([
      { queryKey: queryKeys.shelves() },
    ])
  })
})
