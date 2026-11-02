import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { useBrewMethodCreate, useBrewMethods } from '~/queries/brew-methods'
import { queryKeys } from '#imports'
import { api, brewMethods, fakeApi, resetApi } from '../fake-api'
import { runOn } from '../fixtures'

fakeApi()

beforeEach(resetApi)

describe('useBrewMethods', () => {
  it('fetches the brew methods', async () => {
    const { data, suspense } = await runOn('/', useBrewMethods)

    await suspense()

    expect(data.value).toEqual(brewMethods())
  })
})

describe('useBrewMethodCreate', () => {
  it('adds a brew method and refreshes the brew methods', async () => {
    const { result, client } = await runOn('/', () => ({
      result: useBrewMethodCreate(),
      client: useQueryClient(),
    }))
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    await result.mutateAsync({ name: 'Siphon' })

    expect(api.brewMethodCalls).toEqual([{ name: 'Siphon' }])
    expect(invalidate.mock.calls.map(([filters]) => filters)).toEqual([
      { queryKey: queryKeys.brewMethods() },
    ])
  })
})
