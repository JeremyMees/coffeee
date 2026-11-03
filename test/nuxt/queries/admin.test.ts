import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { getQuery, readBody } from 'h3'
import {
  useAdminEntries,
  useAdminEntryCreate,
  useAdminEntryDelete,
  useAdminEntryMerge,
  useAdminEntryUpdate,
} from '~/queries/admin'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'

const calls = { listed: [] as unknown[], changed: [] as unknown[] }

registerEndpoint('/api/admin/lists/producers', {
  method: 'GET',
  handler: event => {
    calls.listed.push(getQuery(event))

    return {
      total: 1,
      entries: [
        {
          id: 'p1',
          name: 'Nestor Lasso',
          detail: null,
          detailId: null,
          uses: 2,
        },
      ],
    }
  },
})

registerEndpoint('/api/admin/lists/producers', {
  method: 'POST',
  handler: async event => {
    calls.changed.push({ add: await readBody(event) })

    return { id: 'p3', name: 'Diego Bermudez' }
  },
})

registerEndpoint('/api/admin/lists/producers/p2', {
  method: 'PATCH',
  handler: async event => {
    calls.changed.push({ rename: await readBody(event) })

    return { id: 'p2', name: 'Nestor' }
  },
})

registerEndpoint('/api/admin/lists/producers/p2/merge', {
  method: 'POST',
  handler: async event => {
    calls.changed.push({ merge: await readBody(event) })

    return { id: 'p1', name: 'Nestor Lasso' }
  },
})

registerEndpoint('/api/admin/lists/producers/p2', {
  method: 'DELETE',
  handler: () => {
    calls.changed.push('delete')

    return null
  },
})

beforeEach(() => {
  calls.listed = []
  calls.changed = []
})

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

const everythingChanged = [
  { queryKey: queryKeys.admin() },
  { queryKey: queryKeys.shelves() },
  { queryKey: queryKeys.coffees() },
  { queryKey: queryKeys.roasters() },
  { queryKey: queryKeys.lists() },
  { queryKey: queryKeys.brewMethods() },
]

describe('useAdminEntries', () => {
  it('fetches a page of a shared list', async () => {
    const { data, suspense } = await runOn('/', () =>
      useAdminEntries('producers', { search: 'nes', page: '0' }),
    )

    await suspense()

    expect(data.value?.entries.map(entry => entry.name)).toEqual([
      'Nestor Lasso',
    ])
    expect(calls.listed).toEqual([{ search: 'nes', page: '0' }])
  })
})

describe('useAdminEntryCreate', () => {
  it('adds the entry and refreshes everything that shows it', async () => {
    const { result, invalidated } = await withClient(useAdminEntryCreate)

    await result.mutateAsync({
      list: 'producers',
      body: { name: 'Diego Bermudez' },
    })

    expect(calls.changed).toEqual([{ add: { name: 'Diego Bermudez' } }])
    expect(invalidated()).toEqual(everythingChanged)
  })
})

describe('useAdminEntryUpdate', () => {
  it('updates the entry and refreshes everything that shows it', async () => {
    const { result, invalidated } = await withClient(useAdminEntryUpdate)

    await result.mutateAsync({
      list: 'producers',
      entryId: 'p2',
      body: { name: 'Nestor' },
    })

    expect(calls.changed).toEqual([{ rename: { name: 'Nestor' } }])
    expect(invalidated()).toEqual(everythingChanged)
  })
})

describe('useAdminEntryMerge', () => {
  it('merges the entry and refreshes everything that shows it', async () => {
    const { result, invalidated } = await withClient(useAdminEntryMerge)

    await result.mutateAsync({
      list: 'producers',
      entryId: 'p2',
      intoId: 'p1',
    })

    expect(calls.changed).toEqual([{ merge: { intoId: 'p1' } }])
    expect(invalidated()).toEqual(everythingChanged)
  })
})

describe('useAdminEntryDelete', () => {
  it('deletes the entry and refreshes everything that shows it', async () => {
    const { result, invalidated } = await withClient(useAdminEntryDelete)

    await result.mutateAsync({ list: 'producers', entryId: 'p2' })

    expect(calls.changed).toEqual(['delete'])
    expect(invalidated()).toEqual(everythingChanged)
  })
})
