import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useGrinderDisown,
  useGrinderOwn,
  useShelfGrinders,
} from '~/queries/grinders'
import { queryKeys } from '#imports'
import { api, fakeApi, opus, resetApi } from '../fake-api'
import { runOn } from '../fixtures'

fakeApi()

beforeEach(resetApi)

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

describe('useShelfGrinders', () => {
  it('fetches the grinders the shelf owns', async () => {
    const { data, suspense } = await runOn('/', () => useShelfGrinders('home'))

    await suspense()

    expect(data.value).toEqual([opus()])
  })
})

describe('useGrinderOwn', () => {
  it('adds a grinder and refreshes the shelf and the lists', async () => {
    const { result, invalidated } = await withClient(useGrinderOwn)

    await result.mutateAsync({
      shelfId: 'home',
      grinder: { brand: 'Niche', model: 'Zero' },
    })

    expect(api.grinderCalls).toEqual([
      { own: { brand: 'Niche', model: 'Zero' } },
    ])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelf('home') },
      { queryKey: queryKeys.lists() },
    ])
  })
})

describe('useGrinderDisown', () => {
  it('removes a grinder and refreshes the shelf', async () => {
    const { result, invalidated } = await withClient(useGrinderDisown)

    await result.mutateAsync({ shelfId: 'home', grinderId: 'opus' })

    expect(api.grinderCalls).toEqual([{ disown: 'opus' }])
    expect(invalidated()).toEqual([{ queryKey: queryKeys.shelf('home') }])
  })
})
