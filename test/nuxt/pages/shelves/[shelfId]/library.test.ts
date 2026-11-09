import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { shelfCoffeePath, shelfPath, useRouter } from '#imports'
import type { Member } from '#test/support/types'
import {
  allByTestId,
  click,
  forgetLastShelf,
  setViewport,
  tid,
  type,
} from '../../../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../../../server'

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  setViewport(375, 812)
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function threeCoffees() {
  const redBrick = await scenario.coffee(sarah.shelf, {
    name: 'Red Brick',
    roastLevel: 'dark',
    origins: ['BR'],
    flavorNotes: ['Lime'],
    purchasedOn: '2026-09-01',
  })
  const elParaiso = await scenario.coffee(sarah.shelf, {
    name: 'El Paraiso',
    roaster: 'La Cabra',
    roastLevel: 'medium',
    roastedFor: 'espresso',
    origins: ['CO'],
    flavorNotes: ['Jasmine'],
    varietals: ['Geisha'],
    purchasedOn: '2026-10-01',
  })
  const ayele = await scenario.coffee(sarah.shelf, {
    flavorNotes: ['Lime'],
    purchasedOn: '2026-11-01',
  })
  await scenario.verdict(sarah, ayele.id, { rating: 5, wouldBuyAgain: true })
  await scenario.verdict(sarah, elParaiso.id, {
    rating: 4,
    wouldBuyAgain: false,
  })

  return { ayele, elParaiso, redBrick }
}

async function thirtyCoffees() {
  for (let day = 1; day <= 30; day++) {
    await scenario.coffee(sarah.shelf, {
      name: `Coffee ${day}`,
      purchasedOn: `2026-10-${String(day).padStart(2, '0')}`,
    })
  }
}

const skeletons = [
  'library-skeleton',
  'library-table-skeleton',
  'browsing-filters-skeleton',
]
  .map(id => tid(id))
  .join(', ')

function libraryPath(query = '') {
  return `${shelfPath(sarah.shelf)}/library${query}`
}

function listPath() {
  return `/api/shelves/${sarah.shelf.id}/library`
}

function labelsPath() {
  return `/api/shelves/${sarah.shelf.id}/filter-labels`
}

function mount(route = libraryPath()) {
  return mountSuspended(App, { route, attachTo: document.body })
}

async function library(route = libraryPath()) {
  const page = await mountSuspended(App, {
    route,
    attachTo: document.body,
  })
  const cards = () =>
    page.findAll(tid('library', 'coffee-card-name')).map(name => name.text())
  const rows = () =>
    page.findAll(tid('library-row-name')).map(name => name.text())
  await vi.waitFor(() => expect(page.find(skeletons).exists()).toBe(false))

  return { page, cards, rows }
}

async function pickFilter(kind: string, label: string) {
  await click(`library-filter-${kind}`)
  const option = await vi.waitFor(() => {
    const found = allByTestId('library-filter-option').find(
      element => element.textContent?.trim() === label,
    )
    if (!found) throw new Error(`No option “${label}”`)

    return found
  })
  option.click()
}

describe('the Library page', () => {
  it('has Library as its heading', async () => {
    const { page } = await library()

    expect(page.get(tid('page-title')).text()).toBe('Library')
  })

  it('says the library fills up as coffee is bought', async () => {
    const { page } = await library()

    expect(page.get(tid('library-empty')).text()).toContain(
      "Every coffee you've bought",
    )
    expect(page.find(tid('library-filters')).exists()).toBe(false)
  })

  it('shows every coffee as a card that opens it, last bought first', async () => {
    const { ayele } = await threeCoffees()

    const { page, cards } = await library()

    expect(cards()).toEqual(['Ayele Fulasa', 'El Paraiso', 'Red Brick'])
    expect(page.get(tid('library', 'coffee-card')).attributes('href')).toBe(
      shelfCoffeePath(sarah.shelf, ayele),
    )
    expect(page.find(tid('library-more')).exists()).toBe(false)
  })

  it('loads more cards a page at a time', async () => {
    await thirtyCoffees()
    const { page, cards } = await library()

    expect(cards()).toHaveLength(24)

    await page.get(tid('library-more')).trigger('click')

    await vi.waitFor(() => expect(cards()).toHaveLength(30))
    expect(page.find(tid('library-more')).exists()).toBe(false)
  })

  it('shows only the coffees the filters pick', async () => {
    await threeCoffees()
    const { page, cards } = await library()

    await pickFilter('flavor-notes', 'Lime')
    await vi.waitFor(() =>
      expect(cards()).toEqual(['Ayele Fulasa', 'Red Brick']),
    )

    await page.get(tid('library-filter-favourites')).trigger('click')

    await vi.waitFor(() => expect(cards()).toEqual(['Ayele Fulasa']))
  })

  it('searches only the shelf’s coffees and says why each matched', async () => {
    await threeCoffees()
    const tom = await scenario.member('Tom')
    await scenario.coffee(tom.shelf, { name: 'Geisha Lot' })
    const { page, cards } = await library()

    await type('search-input', 'geisha')

    await vi.waitFor(() => expect(cards()).toEqual(['El Paraiso']))
    expect(
      page.findAll(tid('coffee-card-match')).map(match => match.text()),
    ).toEqual(['Varietal: Geisha'])
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({ q: 'geisha' }),
    )
  })

  it('shows no match line without a search', async () => {
    await threeCoffees()

    const { page } = await library()

    expect(page.find(tid('coffee-card-matches')).exists()).toBe(false)
  })

  it('says why each table row matched the search', async () => {
    setViewport(1280, 800)
    await threeCoffees()
    const { page, rows } = await library(libraryPath('?view=table&q=jasmine'))

    await vi.waitFor(() => expect(rows()).toEqual(['El Paraiso']))
    expect(
      page.findAll(tid('library-row-match')).map(match => match.text()),
    ).toEqual(['Flavor note: Jasmine'])
  })

  it('filters by varietal, roast level and roasted for like Discover', async () => {
    await threeCoffees()
    const { cards } = await library()

    await pickFilter('roasted-for', 'Espresso')
    await vi.waitFor(() => expect(cards()).toEqual(['El Paraiso']))
    await pickFilter('varietals', 'Geisha')
    await vi.waitFor(() => expect(cards()).toEqual(['El Paraiso']))
    await pickFilter('roast-levels', 'Dark')

    await vi.waitFor(() => {
      expect(cards()).toEqual([])
      expect(useRouter().currentRoute.value.query).toEqual({
        roastedFor: 'espresso',
        varietalId: expect.any(String),
        roastLevel: 'dark',
      })
    })
  })

  it('says when nothing matches the search and clears it', async () => {
    await threeCoffees()
    const { page, cards } = await library()

    await type('search-input', 'nope')

    await vi.waitFor(() =>
      expect(page.get(tid('library-no-match')).text()).toContain(
        'No coffee in your library matches “nope”.',
      ),
    )
    await page.get(tid('library-no-match-clear')).trigger('click')

    await vi.waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('says when nothing matches and clears the filters', async () => {
    await threeCoffees()
    const { page, cards } = await library()

    await pickFilter('roasters', 'La Cabra')
    await vi.waitFor(() => expect(cards()).toEqual(['El Paraiso']))
    await page.get(tid('library-filter-favourites')).trigger('click')

    await vi.waitFor(() =>
      expect(page.get(tid('library-no-match')).text()).toContain(
        'No coffee in your library matches',
      ),
    )

    await page.get(tid('library-no-match-clear')).trigger('click')

    await vi.waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('sends an empty search to Discover with the same search and filters', async () => {
    await threeCoffees()
    const laCabra = await scenario.roaster(sarah, 'La Cabra')
    const { page } = await library(
      libraryPath(`?q=nope&roasterId=${laCabra}&favourites=true`),
    )

    const link = page.get(tid('library-no-match-discover'))

    expect(link.text()).toBe('Search Discover for “nope”')
    expect(link.attributes('href')).toBe(
      `${shelfPath(sarah.shelf)}/discover?q=nope&roasterId=${laCabra}`,
    )
  })

  it('sends empty filters to Discover to look there', async () => {
    await threeCoffees()
    const { page } = await library(
      libraryPath('?roastLevel=light&roastedFor=espresso'),
    )

    const link = page.get(tid('library-no-match-discover'))

    expect(link.text()).toBe('Look in Discover')
    expect(link.attributes('href')).toBe(
      `${shelfPath(sarah.shelf)}/discover?roastLevel=light&roastedFor=espresso`,
    )
  })

  it('points to Discover from an empty table too', async () => {
    setViewport(1280, 800)
    await threeCoffees()
    const { page } = await library(libraryPath('?view=table&q=nope'))

    expect(page.find(tid('library-table')).exists()).toBe(false)
    expect(page.get(tid('library-no-match-discover')).text()).toBe(
      'Search Discover for “nope”',
    )
  })

  it('always shows the grid on a phone', async () => {
    await threeCoffees()

    const { page } = await library()

    expect(page.find(tid('library-view')).exists()).toBe(false)
    expect(page.find(tid('library-table')).exists()).toBe(false)
  })

  it('switches between the grid and a table on a wide screen', async () => {
    setViewport(1280, 800)
    await threeCoffees()
    const { page, rows } = await library()

    await page.get(tid('library-view-table')).trigger('click')

    await vi.waitFor(() =>
      expect(rows()).toEqual(['Ayele Fulasa', 'El Paraiso', 'Red Brick']),
    )
    expect(page.find(tid('library')).exists()).toBe(false)
    expect(page.get(tid('library-view-table')).attributes('aria-pressed')).toBe(
      'true',
    )

    await page.get(tid('library-view-grid')).trigger('click')

    expect(page.find(tid('library-table')).exists()).toBe(false)
    expect(page.findAll(tid('library', 'coffee-card'))).toHaveLength(3)
  })

  it('pages and sorts the table on the server, back to the first page on a new sort', async () => {
    setViewport(1280, 800)
    await thirtyCoffees()
    const { page, rows } = await library()
    await page.get(tid('library-view-table')).trigger('click')
    await vi.waitFor(() => expect(rows()).toHaveLength(24))
    expect(rows()[0]).toBe('Coffee 30')

    await page.get(tid('data-table-next')).trigger('click')

    await vi.waitFor(() => expect(rows()).toHaveLength(6))
    expect(page.get(tid('data-table-page')).text()).toBe('Page 2 of 2')

    await page.get(tid('library-sort-lastBought')).trigger('click')

    await vi.waitFor(() => expect(rows()[0]).toBe('Coffee 1'))
    expect(rows()).toHaveLength(24)
    expect(page.get(tid('data-table-page')).text()).toBe('Page 1 of 2')
  })

  it('keeps the filters, view, sort and page in the address', async () => {
    setViewport(1280, 800)
    await thirtyCoffees()
    const { page, rows } = await library()

    await pickFilter('origins', 'Ethiopia')
    await page.get(tid('library-view-table')).trigger('click')
    await vi.waitFor(() => expect(rows()).toHaveLength(24))
    await page.get(tid('library-sort-lastBought')).trigger('click')

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({
        originCode: 'ET',
        view: 'table',
        sort: 'lastBought',
        direction: 'ascending',
      }),
    )
  })

  it('starts from the address, with the names of its filters', async () => {
    setViewport(1280, 800)
    await thirtyCoffees()

    const { page, rows } = await library(
      libraryPath(
        '?originCode=ET&view=table&sort=lastBought&direction=descending&page=2',
      ),
    )

    await vi.waitFor(() =>
      expect(rows()).toEqual([
        'Coffee 6',
        'Coffee 5',
        'Coffee 4',
        'Coffee 3',
        'Coffee 2',
        'Coffee 1',
      ]),
    )
    expect(page.get(tid('data-table-page')).text()).toBe('Page 2 of 2')
    expect(page.get(tid('library-applied-filter')).text()).toBe(
      'Origin: Ethiopia',
    )
  })
  it('shows the page, the filters and a card skeleton while the coffees load', async () => {
    await threeCoffees()
    const hold = holdRequest('GET', listPath())

    const page = await mount()

    expect(page.get(tid('page-title')).text()).toBe('Library')
    expect(page.find(tid('library-filters')).exists()).toBe(true)
    expect(page.find(tid('library-skeleton')).exists()).toBe(true)
    expect(page.find(tid('library')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(page.findAll(tid('library', 'coffee-card'))).toHaveLength(3),
    )
    expect(page.find(tid('library-skeleton')).exists()).toBe(false)
  })

  it('shows a row skeleton while the table loads', async () => {
    setViewport(1280, 800)
    await threeCoffees()
    const hold = holdRequest('GET', listPath())

    const page = await mount(libraryPath('?view=table'))

    expect(page.find(tid('library-table-skeleton')).exists()).toBe(true)
    expect(page.find(tid('library-table')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(page.find(tid('library-table')).exists()).toBe(true),
    )
    expect(page.find(tid('library-table-skeleton')).exists()).toBe(false)
  })

  it('loads the coffees without waiting for the names of the filters in the address', async () => {
    await threeCoffees()
    const hold = holdRequest('GET', labelsPath())

    const page = await mount(libraryPath('?originCode=CO'))

    expect(page.find(tid('browsing-filters-skeleton')).exists()).toBe(true)
    await vi.waitFor(() =>
      expect(
        page
          .findAll(tid('library', 'coffee-card-name'))
          .map(name => name.text()),
      ).toEqual(['El Paraiso']),
    )
    expect(page.find(tid('library-filters')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(page.find(tid('library-applied-filter')).exists()).toBe(true),
    )
    expect(page.get(tid('library-applied-filter')).text()).toBe(
      'Origin: Colombia',
    )
    expect(page.find(tid('browsing-filters-skeleton')).exists()).toBe(false)
  })

  it('shows an error with a retry when the coffees fail, and the filters still work', async () => {
    await threeCoffees()
    const lift = failRequest('GET', listPath(), {
      status: 500,
      message: 'Nope',
    })

    const page = await mount()

    await vi.waitFor(() =>
      expect(page.find(tid('library-error')).exists()).toBe(true),
    )
    expect(page.find(tid('library-skeleton')).exists()).toBe(false)

    await pickFilter('origins', 'Colombia')

    await vi.waitFor(() =>
      expect(page.find(tid('library-applied-filter')).exists()).toBe(true),
    )
    expect(page.get(tid('library-applied-filter')).text()).toBe(
      'Origin: Colombia',
    )
    await vi.waitFor(() =>
      expect(page.find(tid('library-error')).exists()).toBe(true),
    )

    lift()
    await page.get(tid('library-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(
        page
          .findAll(tid('library', 'coffee-card-name'))
          .map(name => name.text()),
      ).toEqual(['El Paraiso']),
    )
    expect(page.find(tid('library-error')).exists()).toBe(false)
  })

  it('keeps the coffees on screen with no skeleton while a new filter loads', async () => {
    await threeCoffees()
    const { page, cards } = await library()
    const hold = holdRequest('GET', listPath())

    await pickFilter('origins', 'Colombia')
    await vi.waitFor(() =>
      expect(page.find(tid('library-applied-filter')).exists()).toBe(true),
    )

    expect(page.find(tid('library-skeleton')).exists()).toBe(false)
    expect(cards()).toEqual(['Ayele Fulasa', 'El Paraiso', 'Red Brick'])

    hold.release()

    await vi.waitFor(() => expect(cards()).toEqual(['El Paraiso']))
  })
})
