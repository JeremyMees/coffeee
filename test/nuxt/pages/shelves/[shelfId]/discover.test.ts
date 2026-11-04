import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { coffeePath, shelfPath, useRouter, useSearchFocus } from '#imports'
import type { Member } from '#test/support/types'
import {
  allByTestId,
  click,
  currentPath,
  forgetLastShelf,
  tid,
  type,
} from '../../../fixtures'
import { failRequest, scenario, signIn } from '../../../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  forgetLastShelf()
  useSearchFocus().value = false
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await signIn(sarah)
})

async function threeCoffees() {
  const elParaiso = await scenario.coffee(tom.shelf, {
    name: 'El Paraiso',
    roaster: 'La Cabra',
    roastLevel: 'medium',
    origins: ['CO'],
    flavorNotes: ['Jasmine'],
  })
  const ayele = await scenario.coffee(sarah.shelf, { flavorNotes: ['Lime'] })
  const gesha = await scenario.coffee(tom.shelf, {
    name: 'Gesha Village',
    roaster: 'Tim Wendelboe',
    roastedFor: 'espresso',
    flavorNotes: ['Strawberry'],
  })

  return { elParaiso, ayele, gesha }
}

function discoverPath(query = '') {
  return `${shelfPath(sarah.shelf)}/discover${query}`
}

async function discover(route = discoverPath()) {
  const page = await mountSuspended(App, { route, attachTo: document.body })
  const names = () =>
    page.findAll(tid('catalog-result-name')).map(name => name.text())

  return { page, names }
}

function failFilterLabels() {
  failRequest('GET', `/api/shelves/${sarah.shelf.id}/filter-labels`, {
    status: 500,
    message: 'The names are out of reach',
  })
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

  it('lists every coffee in the catalog, newest first, opening each on its own page', async () => {
    const { gesha } = await threeCoffees()

    const { page, names } = await discover()

    expect(names()).toEqual(['Gesha Village', 'Ayele Fulasa', 'El Paraiso'])
    expect(page.get(tid('discover-total')).text()).toBe('3 coffees')
    expect(page.get(tid('catalog-result')).attributes('href')).toBe(
      coffeePath(gesha),
    )
    expect(allByTestId('catalog-result-mine')).toHaveLength(1)
  })

  it('searches for what was typed and keeps it in the address', async () => {
    await threeCoffees()
    const { names } = await discover()

    await type('search-input', 'strawberry')

    await vi.waitFor(() => expect(names()).toEqual(['Gesha Village']))
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({ q: 'strawberry' }),
    )
  })

  it('starts from the search in the address', async () => {
    await threeCoffees()

    const { page, names } = await discover(discoverPath('?q=jasmine'))

    expect(names()).toEqual(['El Paraiso'])
    expect(
      (page.get(tid('search-input')).element as HTMLInputElement).value,
    ).toBe('jasmine')
  })

  it('keeps only the shelf’s own coffees with Mine', async () => {
    await threeCoffees()
    const { names } = await discover()

    await click('catalog-filter-mine')

    await vi.waitFor(() => expect(names()).toEqual(['Ayele Fulasa']))
  })

  it('sorts by community rating', async () => {
    const { elParaiso, ayele, gesha } = await threeCoffees()
    await scenario.verdict(tom, gesha.id, { rating: 2 })
    await scenario.verdict(tom, ayele.id, { rating: 3 })
    await scenario.verdict(tom, elParaiso.id, { rating: 4 })
    const { names } = await discover()

    await click('catalog-sort-communityRating')

    await vi.waitFor(() =>
      expect(names()).toEqual(['El Paraiso', 'Ayele Fulasa', 'Gesha Village']),
    )
  })

  it('says when nothing matches and clears the search', async () => {
    await threeCoffees()
    const { page, names } = await discover()

    await type('search-input', 'nope')

    await vi.waitFor(() =>
      expect(page.get(tid('discover-no-match')).text()).toContain(
        'No coffee matches “nope”.',
      ),
    )
    await click('discover-no-match-clear')

    await vi.waitFor(() => expect(names()).toHaveLength(3))
    expect(currentPath()).toBe(discoverPath())
  })

  it('says when no coffee matches the filters', async () => {
    await scenario.coffee(tom.shelf)
    const { page } = await discover()

    await click('catalog-filter-mine')

    await vi.waitFor(() =>
      expect(page.get(tid('discover-no-match')).text()).toContain(
        'No coffee matches these filters.',
      ),
    )
  })

  it('loads more coffees as the list is scrolled', async () => {
    for (let number = 1; number <= 30; number++) {
      await scenario.coffee(sarah.shelf, { name: `Coffee ${number}` })
    }
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
    await threeCoffees()
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
    await threeCoffees()
    await scenario.coffee(sarah.shelf, {
      name: 'Bombe',
      roaster: 'La Cabra',
    })
    const laCabra = await scenario.roaster(tom, 'La Cabra')

    const { page, names } = await discover(
      discoverPath(
        `?mine=true&roasterId=${laCabra}&roastedFor=filter&sort=communityRating`,
      ),
    )

    expect(names()).toEqual(['Bombe'])
    expect(
      page.get(tid('catalog-filter-mine')).attributes('aria-pressed'),
    ).toBe('true')
    expect(page.get(tid('catalog-filter-roasters')).text()).toBe('La Cabra')
    expect(page.get(tid('catalog-filter-roasted-for')).text()).toBe('Filter')
  })

  it('knows the names of filters it picked when coming back', async () => {
    await threeCoffees()
    const laCabra = await scenario.roaster(tom, 'La Cabra')
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
      expect(useRouter().currentRoute.value.query).toEqual({
        roasterId: laCabra,
      }),
    )
    failFilterLabels()

    const { page } = await discover(discoverPath(`?roasterId=${laCabra}`))

    expect(page.get(tid('catalog-filter-roasters')).text()).toBe('La Cabra')
  })
})
