import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogPages } from '~/queries/catalog'
import { api, fakeApi, resetApi } from '../fake-api'
import { catalogCoffee } from '#test/fixtures/coffees'
import { runOn } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  api.catalog = Array.from({ length: 30 }, (_, index) =>
    catalogCoffee({ id: `m${index + 1}`, name: `Coffee ${index + 1}` }),
  )
})

describe('useCatalogPages', () => {
  it('loads the catalog a page at a time until all is loaded', async () => {
    const pages = await runOn('/', () =>
      useCatalogPages('home', { search: 'coffee' }),
    )
    await pages.suspense()

    expect(pages.data.value?.pages[0]?.coffees).toHaveLength(24)
    expect(pages.hasNextPage.value).toBe(true)

    await pages.fetchNextPage()

    expect(pages.data.value?.pages[1]?.coffees).toHaveLength(6)
    expect(pages.hasNextPage.value).toBe(false)
    expect(api.catalogQueries).toEqual([
      { search: 'coffee', page: '0' },
      { search: 'coffee', page: '1' },
    ])
  })
})
