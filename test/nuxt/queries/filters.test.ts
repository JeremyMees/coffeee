import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { useFilterLabels, useFilterOptions } from '~/queries/filters'
import { api, fakeApi, resetApi } from '../fake-api'
import { runOn } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
})

describe('useFilterOptions', () => {
  it('waits to be switched on, then pages through the options', async () => {
    const enabled = ref(false)
    const options = await runOn('/', () =>
      useFilterOptions('home', 'library', 'roasters', '', enabled),
    )
    await flushPromises()
    expect(api.libraryFilterQueries).toEqual([])

    enabled.value = true
    await vi.waitFor(() =>
      expect(options.data.value?.pages[0]?.options).toHaveLength(2),
    )
    await options.fetchNextPage()

    expect(
      options.data.value?.pages.flatMap(page =>
        page.options.map(option => option.label),
      ),
    ).toEqual(['La Cabra', 'Square Mile', 'Tim Wendelboe'])
    expect(options.hasNextPage.value).toBe(false)
  })

  it('asks the catalog for catalog options', async () => {
    const options = await runOn('/', () =>
      useFilterOptions('home', 'catalog', 'processes', 'wash', true),
    )

    await vi.waitFor(() =>
      expect(options.data.value?.pages[0]?.options).toEqual([
        { value: 's1', label: 'Washed' },
      ]),
    )
    expect(api.catalogFilterQueries).toEqual([
      { kind: 'processes', search: 'wash', page: '0' },
    ])
  })
})

describe('useFilterLabels', () => {
  it('names the filters in the address', async () => {
    const labels = await runOn('/', () =>
      useFilterLabels('home', { roasterId: 'r2', originCode: 'ET' }),
    )

    await labels.suspense()

    expect(labels.data.value).toEqual({
      roasterId: 'Square Mile',
      originCode: 'Ethiopia',
    })
  })

  it('asks nothing when no filter needs a name', async () => {
    const labels = await runOn('/', () => useFilterLabels('home', {}))

    await labels.suspense()
    await flushPromises()

    expect(api.filterLabelQueries).toEqual([])
  })

  it('remembers names already known, so coming back asks nothing', async () => {
    const { labels, client } = await runOn('/', () => ({
      labels: useFilterLabels('home', {}),
      client: useQueryClient(),
    }))

    labels.remember(
      { q: 'lime', roasterId: 'r1', mine: 'true' },
      { roasterId: 'La Cabra' },
    )

    expect(
      client.getQueryData(queryKeys.filterLabels('home', { roasterId: 'r1' })),
    ).toEqual({ roasterId: 'La Cabra' })
  })
})
