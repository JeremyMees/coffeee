import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { useGrindSettingSave } from '~/queries/grind-settings'
import { queryKeys } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { runOn } from '../fixtures'

fakeApi()

beforeEach(resetApi)

describe('useGrindSettingSave', () => {
  it('saves the grind setting and refreshes that shelf', async () => {
    const { result, client } = await runOn('/', () => ({
      result: useGrindSettingSave(),
      client: useQueryClient(),
    }))
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const change = {
      grinderId: 'opus',
      brewMethodId: 'espresso',
      setting: '12',
    }

    await result.mutateAsync({ shelfId: 'home', coffeeId: 'c1', change })

    expect(api.grindSettingCalls).toEqual([change])
    expect(invalidate.mock.calls.map(([filters]) => filters)).toEqual([
      { queryKey: queryKeys.shelf('home') },
    ])
  })
})
