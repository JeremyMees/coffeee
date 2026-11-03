import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import {
  useLibraryFilterOptions,
  useLibraryPage,
  useLibraryPages,
} from '~/queries/library'
import { api, fakeApi, manyCoffees, resetApi } from '../fake-api'
import { runOn } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  api.library = manyCoffees(30)
})

describe('useLibraryPages', () => {
  it('loads the library a page at a time until all is loaded', async () => {
    const pages = await runOn('/', () =>
      useLibraryPages('home', { favourites: 'false' }),
    )
    await pages.suspense()

    expect(pages.data.value?.pages[0]?.coffees).toHaveLength(24)
    expect(pages.hasNextPage.value).toBe(true)

    await pages.fetchNextPage()

    expect(pages.data.value?.pages[1]?.coffees).toHaveLength(6)
    expect(pages.hasNextPage.value).toBe(false)
    expect(api.libraryQueries).toEqual([
      { favourites: 'false', page: '0' },
      { favourites: 'false', page: '1' },
    ])
  })

  it('asks for nothing while switched off', async () => {
    await runOn('/', () => useLibraryPages('home', {}, false))
    await flushPromises()

    expect(api.libraryQueries).toEqual([])
  })
})

describe('useLibraryPage', () => {
  it('loads one page of the library', async () => {
    const page = await runOn('/', () =>
      useLibraryPage('home', { sort: 'rating' }, 1),
    )
    await page.suspense()

    expect(page.data.value?.total).toBe(30)
    expect(page.data.value?.coffees).toHaveLength(6)
    expect(api.libraryQueries).toEqual([{ sort: 'rating', page: '1' }])
  })
})

describe('useLibraryFilterOptions', () => {
  it('waits to be switched on, then pages through the options', async () => {
    const enabled = ref(false)
    const options = await runOn('/', () =>
      useLibraryFilterOptions('home', 'roasters', '', enabled),
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
})
