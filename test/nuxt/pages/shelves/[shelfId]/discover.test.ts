import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser, useSearchFocus } from '#imports'
import { api, fakeApi, resetApi } from '../../../fake-api'
import { catalogCoffee, catalogCoffees } from '#test/fixtures/coffees'
import {
  allByTestId,
  click,
  currentPath,
  forgetLastShelf,
  tid,
  type,
} from '../../../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  resetApi()
  useCurrentUser().value = testUser()
  useSearchFocus().value = false
})

async function discover(route = '/shelves/sarahs-shelf-home/discover') {
  const page = await mountSuspended(App, { route, attachTo: document.body })
  const names = () =>
    page.findAll(tid('catalog-result-name')).map(name => name.text())

  return { page, names }
}

describe('the Discover page', () => {
  it('has Discover as its heading', async () => {
    const { page } = await discover()

    expect(page.get(tid('page-title')).text()).toBe('Discover')
  })

  it('says when nobody has added a coffee yet', async () => {
    const { page } = await discover()

    expect(page.get(tid('discover-empty')).text()).toBe(
      'Nobody has added a coffee yet.',
    )
  })

  it('lists every coffee in the catalog, opening each on its own page', async () => {
    api.catalog = catalogCoffees()

    const { page, names } = await discover()

    expect(names()).toEqual(['Gesha Village', 'Ayele Fulasa', 'El Paraiso'])
    expect(page.get(tid('discover-total')).text()).toBe('3 coffees')
    expect(page.get(tid('catalog-result')).attributes('href')).toBe(
      '/coffees/gesha-village-c4',
    )
    expect(allByTestId('catalog-result-mine')).toHaveLength(1)
  })

  it('searches for what was typed and keeps it in the address', async () => {
    api.catalog = catalogCoffees()
    const { names } = await discover()

    await type('search-input', 'strawberry')

    await vi.waitFor(() => expect(names()).toEqual(['Gesha Village']))
    expect(api.catalogQueries.at(-1)).toMatchObject({ search: 'strawberry' })
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({ q: 'strawberry' }),
    )
  })

  it('starts from the search in the address', async () => {
    api.catalog = catalogCoffees()

    const { page, names } = await discover(
      '/shelves/sarahs-shelf-home/discover?q=jasmine',
    )

    expect(names()).toEqual(['El Paraiso'])
    expect(
      (page.get(tid('search-input')).element as HTMLInputElement).value,
    ).toBe('jasmine')
  })

  it('keeps only the shelf’s own coffees with Mine', async () => {
    api.catalog = catalogCoffees()
    const { names } = await discover()

    await click('catalog-filter-mine')

    await vi.waitFor(() => expect(names()).toEqual(['Ayele Fulasa']))
    expect(api.catalogQueries.at(-1)).toMatchObject({ mine: 'true' })
  })

  it('sorts by community rating', async () => {
    api.catalog = catalogCoffees().map((coffee, index) => ({
      ...coffee,
      communityRating: { average: index + 2, raters: 1 },
    }))
    const { names } = await discover()

    await click('catalog-sort-communityRating')

    await vi.waitFor(() =>
      expect(names()).toEqual(['El Paraiso', 'Ayele Fulasa', 'Gesha Village']),
    )
    expect(api.catalogQueries.at(-1)).toMatchObject({
      sort: 'communityRating',
    })
  })

  it('says when nothing matches and clears the search', async () => {
    api.catalog = catalogCoffees()
    const { page, names } = await discover()

    await type('search-input', 'nope')

    await vi.waitFor(() =>
      expect(page.get(tid('discover-no-match')).text()).toContain(
        'No coffee matches “nope”.',
      ),
    )
    await click('discover-no-match-clear')

    await vi.waitFor(() => expect(names()).toHaveLength(3))
    expect(currentPath()).toBe('/shelves/sarahs-shelf-home/discover')
  })

  it('says when no coffee matches the filters', async () => {
    api.catalog = [catalogCoffee({ onShelf: false })]
    const { page } = await discover()

    await click('catalog-filter-mine')

    await vi.waitFor(() =>
      expect(page.get(tid('discover-no-match')).text()).toContain(
        'No coffee matches these filters.',
      ),
    )
  })

  it('loads more coffees as the list is scrolled', async () => {
    api.catalog = Array.from({ length: 30 }, (_, index) =>
      catalogCoffee({ id: `m${index + 1}`, name: `Coffee ${index + 1}` }),
    )
    const { names } = await discover()
    expect(names()).toHaveLength(24)

    await click('discover-more')

    await vi.waitFor(() => expect(names()).toHaveLength(30))
  })

  it('focuses the search box when ⌘K asked for it', async () => {
    useSearchFocus().value = true

    const { page } = await discover()

    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        page.get(tid('search-input')).element,
      ),
    )
    expect(useSearchFocus().value).toBe(false)
  })

  it('keeps the search, filters and sort in the address', async () => {
    api.catalog = catalogCoffees()
    await discover()

    await type('search-input', 'a')
    await click('catalog-filter-mine')
    await click('catalog-sort-communityRating')

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({
        q: 'a',
        mine: 'true',
        sort: 'communityRating',
      }),
    )
  })

  it('starts from the filters and sort in the address, with their names', async () => {
    api.catalog = catalogCoffees()

    const { page } = await discover(
      '/shelves/sarahs-shelf-home/discover?mine=true&roasterId=r1&roastedFor=filter&sort=communityRating',
    )

    expect(api.catalogQueries.at(-1)).toMatchObject({
      mine: 'true',
      roasterId: 'r1',
      roastedFor: 'filter',
      sort: 'communityRating',
    })
    expect(api.filterLabelQueries).toEqual([{ roasterId: 'r1' }])
    expect(
      page.get(tid('catalog-filter-mine')).attributes('aria-pressed'),
    ).toBe('true')
    expect(page.get(tid('catalog-filter-roasters')).text()).toBe('La Cabra')
    expect(page.get(tid('catalog-filter-roasted-for')).text()).toBe('Filter')
  })

  it('does not look up names when no filter needs one', async () => {
    await discover('/shelves/sarahs-shelf-home/discover?mine=true')

    expect(api.filterLabelQueries).toEqual([])
  })

  it('knows the names of filters it picked when coming back', async () => {
    api.catalog = catalogCoffees()
    await discover()
    await click('catalog-filter-roasters')
    const option = await vi.waitFor(() => {
      const found = allByTestId('catalog-filter-option').find(
        element => element.textContent?.trim() === 'La Cabra',
      )
      if (!found) throw new Error('No La Cabra')

      return found
    })
    option.click()
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({ roasterId: 'r1' }),
    )

    const { page } = await discover(
      '/shelves/sarahs-shelf-home/discover?roasterId=r1',
    )

    expect(page.get(tid('catalog-filter-roasters')).text()).toBe('La Cabra')
    expect(api.filterLabelQueries).toEqual([])
  })
})
