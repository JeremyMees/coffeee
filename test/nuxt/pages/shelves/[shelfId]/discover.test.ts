import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser, useSearchFocus } from '#imports'
import {
  api,
  catalogCoffee,
  catalogCoffees,
  fakeApi,
  resetApi,
} from '../../../fake-api'
import {
  allByTestId,
  click,
  currentPath,
  forgetLastShelf,
  testUser,
  tid,
  type,
} from '../../../fixtures'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  resetApi()
  useCurrentUser().value = testUser()
  useSearchFocus().value = false
})

async function discover(route = '/shelves/home/discover') {
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
      '/coffees/c4',
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

    const { page, names } = await discover('/shelves/home/discover?q=jasmine')

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
    expect(currentPath()).toBe('/shelves/home/discover')
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
})
