import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { useFilterOptions } from '~/queries/filters'
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
