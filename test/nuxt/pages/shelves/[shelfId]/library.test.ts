import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import {
  coffeePath,
  shelfCoffeePath,
  shelfPath,
  useRouter,
  useSearchFocus,
} from '#imports'
import type { Member } from '#test/support/types'
import {
  allByTestId,
  click,
  currentPath,
  forgetLastShelf,
  setViewport,
  tid,
  type,
} from '../../../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../../../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  forgetLastShelf()
  useSearchFocus().value = false
  setViewport(375, 812)
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
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

async function tomsCoffee() {
  return scenario.coffee(tom.shelf, {
    name: 'Gesha Village',
    roaster: 'Tim Wendelboe',
    roastedFor: 'espresso',
    flavorNotes: ['Strawberry'],
  })
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

const content = [
  'library-empty',
  'library-no-match',
  'library-table',
  'catalog-result',
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

function query() {
  return useRouter().currentRoute.value.query
}

function mount(route = libraryPath()) {
  return mountSuspended(App, { route, attachTo: document.body })
}

async function library(route = libraryPath()) {
  const page = await mount(route)
  const cards = () =>
    page.findAll(tid('library', 'catalog-result-name')).map(name => name.text())
  const rows = () =>
    page.findAll(tid('library-row-name')).map(name => name.text())
  await vi.waitFor(() => {
    expect(page.find(skeletons).exists()).toBe(false)
    expect(page.find(content).exists()).toBe(true)
  })

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

async function pickSort(column: string) {
  await click('library-sort')
  const option = await vi.waitFor(() => {
    const found = allByTestId(`library-sort-option-${column}`)[0]
    if (!found) throw new Error(`No sort ${column}`)

    return found
  })
  option.click()
}

describe('the Library page', () => {
  it('has Library as its heading and shows all coffees first', async () => {
    const { page } = await library()

    expect(page.get(tid('page-title')).text()).toBe('Library')
    expect(page.get(tid('library-scope-all')).attributes('aria-pressed')).toBe(
      'true',
    )
  })

  it('says when nobody has added a coffee yet', async () => {
    const { page } = await library()

    expect(page.get(tid('library-empty')).text()).toBe(
      'Nobody has added a coffee yet.',
    )
  })

  it('lists every coffee in the catalog, newest first, marking the bought ones', async () => {
    const { ayele } = await threeCoffees()
    const gesha = await tomsCoffee()

    const { page, cards } = await library()

    expect(cards()).toEqual([
      'Gesha Village',
      'Ayele Fulasa',
      'El Paraiso',
      'Red Brick',
    ])
    expect(page.get(tid('library-total')).text()).toBe('4 coffees')
    expect(allByTestId('catalog-result-bought')).toHaveLength(3)
    const links = page
      .findAll(tid('catalog-result'))
      .map(result => result.attributes('href'))
    expect(links[0]).toBe(coffeePath(gesha))
    expect(links[1]).toBe(shelfCoffeePath(sarah.shelf, ayele))
  })

  it('shows the viewer’s own rating on each card, or that they did not rate it', async () => {
    await threeCoffees()

    const { page } = await library()

    expect(
      page.findAll(tid('catalog-result-rating')).map(rating => rating.text()),
    ).toEqual(['', '', 'Not rated'])
  })

  it('narrows to the coffees the shelf bought, last bought first, without the badge', async () => {
    await threeCoffees()
    await tomsCoffee()
    const { page, cards } = await library()

    await click('library-scope-bought')

    await vi.waitFor(() =>
      expect(cards()).toEqual(['Ayele Fulasa', 'El Paraiso', 'Red Brick']),
    )
    expect(allByTestId('catalog-result-bought')).toHaveLength(0)
    expect(page.get(tid('library-sort')).text()).toContain('Last bought')
    await vi.waitFor(() => expect(query()).toEqual({ scope: 'bought' }))
  })

  it('says the bought coffees fill up as coffee is bought, and shows all coffees', async () => {
    await tomsCoffee()
    const { page, cards } = await library(libraryPath('?scope=bought'))

    expect(page.get(tid('library-empty')).text()).toContain(
      "Every coffee you've bought",
    )

    await click('library-empty-all')

    await vi.waitFor(() => expect(cards()).toEqual(['Gesha Village']))
  })

  it('loads more cards a page at a time', async () => {
    await thirtyCoffees()
    const { page, cards } = await library()

    expect(cards()).toHaveLength(24)

    await page.get(tid('library-more')).trigger('click')

    await vi.waitFor(() => expect(cards()).toHaveLength(30))
    expect(page.find(tid('library-more')).exists()).toBe(false)
  })

  it('shows only the coffees the filters and Favourites pick, on both sides', async () => {
    await threeCoffees()
    const gesha = await tomsCoffee()
    await scenario.verdict(sarah, gesha.id, { rating: 5, wouldBuyAgain: true })
    const { page, cards } = await library()

    await page.get(tid('library-filter-favourites')).trigger('click')
    await vi.waitFor(() =>
      expect(cards()).toEqual(['Gesha Village', 'Ayele Fulasa']),
    )

    await click('library-scope-bought')

    await vi.waitFor(() => expect(cards()).toEqual(['Ayele Fulasa']))
    expect(query()).toEqual({ scope: 'bought', favourites: 'true' })
  })

  it('offers only the bought coffees’ options on the Bought side', async () => {
    await threeCoffees()
    await tomsCoffee()
    await library(libraryPath('?scope=bought'))

    await click('library-filter-roasters')

    await vi.waitFor(() =>
      expect(
        allByTestId('library-filter-option').map(option =>
          option.textContent?.trim(),
        ),
      ).toEqual(['La Cabra', 'Square Mile']),
    )
  })

  it('filters by flavor note, varietal, roast level and roasted for', async () => {
    await threeCoffees()
    const { page, cards } = await library()

    await pickFilter('flavor-notes', 'Lime')
    await vi.waitFor(() =>
      expect(cards()).toEqual(['Ayele Fulasa', 'Red Brick']),
    )
    await click('library-filter-clear')
    await pickFilter('roasted-for', 'Espresso')
    await vi.waitFor(() => expect(cards()).toEqual(['El Paraiso']))
    await pickFilter('varietals', 'Geisha')
    await vi.waitFor(() => expect(cards()).toEqual(['El Paraiso']))
    await pickFilter('roast-levels', 'Dark')

    await vi.waitFor(() => {
      expect(page.find(tid('library-no-match')).exists()).toBe(true)
      expect(query()).toEqual({
        roastedFor: 'espresso',
        varietalId: expect.any(String),
        roastLevel: 'dark',
      })
    })
  })

  it('searches the whole catalog and says why each matched', async () => {
    await threeCoffees()
    await scenario.coffee(tom.shelf, {
      name: 'Kochere Natural',
      origins: ['ET'],
      washingStations: [{ origin: 'ET', name: 'Kochere Station' }],
      varietals: ['Geisha'],
    })
    const { page, cards } = await library()
    const matches = () =>
      page.findAll(tid('catalog-result-match')).map(match => match.text())

    await type('search-input', 'geisha')

    await vi.waitFor(() =>
      expect(cards()).toEqual(['Kochere Natural', 'El Paraiso']),
    )
    expect(matches()).toEqual(['Varietal: Geisha', 'Varietal: Geisha'])
    await vi.waitFor(() => expect(query()).toEqual({ q: 'geisha' }))

    await type('search-input', 'station')
    await vi.waitFor(() =>
      expect(matches()).toEqual(['Washing station: Kochere Station']),
    )
  })

  it('starts from the search in the address', async () => {
    await threeCoffees()

    const { page, cards } = await library(libraryPath('?q=jasmine'))

    expect(cards()).toEqual(['El Paraiso'])
    expect(
      (page.get(tid('search-input')).element as HTMLInputElement).value,
    ).toBe('jasmine')
  })

  it('says when nothing matches the search and clears it', async () => {
    await threeCoffees()
    const { page, cards } = await library()

    await type('search-input', 'nope')

    await vi.waitFor(() =>
      expect(page.get(tid('library-no-match')).text()).toContain(
        'No coffee matches “nope”.',
      ),
    )
    expect(page.find(tid('library-no-match-all')).exists()).toBe(false)
    await click('library-no-match-clear')

    await vi.waitFor(() => {
      expect(cards()).toHaveLength(3)
      expect(currentPath()).toBe(libraryPath())
    })
  })

  it('looks in all coffees when none the shelf bought match the search', async () => {
    await threeCoffees()
    await tomsCoffee()
    const { page, cards } = await library(
      libraryPath('?scope=bought&q=strawberry'),
    )

    expect(page.get(tid('library-no-match')).text()).toContain(
      'No coffee you bought matches “strawberry”.',
    )
    expect(page.get(tid('library-no-match-all')).text()).toBe(
      'Search all coffees for “strawberry”',
    )

    await click('library-no-match-all')

    await vi.waitFor(() => expect(cards()).toEqual(['Gesha Village']))
    expect(query()).toEqual({ q: 'strawberry' })
  })

  it('looks in all coffees when none the shelf bought match the filters', async () => {
    await threeCoffees()
    const { page } = await library(libraryPath('?scope=bought&roastedFor=omni'))

    expect(page.get(tid('library-no-match')).text()).toContain(
      'No coffee you bought matches these filters.',
    )
    expect(page.get(tid('library-no-match-all')).text()).toBe(
      'Look in all coffees',
    )
  })

  it('sorts the grid by what was picked, and keeps it in the address', async () => {
    const { elParaiso, ayele, redBrick } = await threeCoffees()
    await scenario.verdict(tom, redBrick.id, { rating: 5 })
    await scenario.verdict(tom, ayele.id, { rating: 2 })
    await scenario.verdict(tom, elParaiso.id, { rating: 4 })
    const { cards } = await library()

    await pickSort('communityRating')

    await vi.waitFor(() =>
      expect(cards()).toEqual(['Red Brick', 'El Paraiso', 'Ayele Fulasa']),
    )
    expect(query()).toEqual({
      sort: 'communityRating',
      direction: 'descending',
    })
  })

  it('offers price and last bought sorts only on the Bought side, and drops them when leaving it', async () => {
    await threeCoffees()
    await library(libraryPath('?scope=bought'))

    await pickSort('latestPrice')
    await vi.waitFor(() =>
      expect(query()).toEqual({
        scope: 'bought',
        sort: 'latestPrice',
        direction: 'ascending',
      }),
    )

    await click('library-scope-all')

    await vi.waitFor(() => expect(query()).toEqual({}))
    await click('library-sort')
    await vi.waitFor(() =>
      expect(allByTestId('library-sort-option-newest')).toHaveLength(1),
    )
    expect(allByTestId('library-sort-option-latestPrice')).toHaveLength(0)
    expect(allByTestId('library-sort-option-lastBought')).toHaveLength(0)
  })

  it('opens on the Bought side from a link sorted by last bought', async () => {
    await threeCoffees()
    await tomsCoffee()

    const { page, cards } = await library(
      libraryPath('?sort=lastBought&direction=ascending'),
    )

    expect(cards()).toEqual(['Red Brick', 'El Paraiso', 'Ayele Fulasa'])
    expect(
      page.get(tid('library-scope-bought')).attributes('aria-pressed'),
    ).toBe('true')
  })

  it('focuses the search box when ⌘K asked for it', async () => {
    useSearchFocus().value = true

    const { page } = await library()

    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        page.get(tid('search-input')).element,
      ),
    )
    expect(useSearchFocus().value).toBe(false)
  })

  it('always shows the grid on a phone', async () => {
    await threeCoffees()

    const { page } = await library(libraryPath('?view=table'))

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
    expect(page.find(tid('library-sort')).exists()).toBe(false)
    expect(page.get(tid('library-view-table')).attributes('aria-pressed')).toBe(
      'true',
    )

    await page.get(tid('library-view-grid')).trigger('click')

    expect(page.find(tid('library-table')).exists()).toBe(false)
    expect(page.findAll(tid('library', 'catalog-result'))).toHaveLength(3)
  })

  it('shows the price and last bought columns only on the Bought side', async () => {
    setViewport(1280, 800)
    await threeCoffees()
    await tomsCoffee()
    const { page } = await library(libraryPath('?view=table'))

    expect(page.find(tid('library-sort-latestPrice')).exists()).toBe(false)
    expect(page.find(tid('library-sort-lastBought')).exists()).toBe(false)
    expect(allByTestId('library-row-bought')).toHaveLength(3)

    await click('library-scope-bought')

    await vi.waitFor(() =>
      expect(page.find(tid('library-sort-lastBought')).exists()).toBe(true),
    )
    expect(page.find(tid('library-sort-latestPrice')).exists()).toBe(true)
    expect(allByTestId('library-row-bought')).toHaveLength(0)
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

  it('pages and sorts the table on the server, back to the first page on a new sort', async () => {
    setViewport(1280, 800)
    await thirtyCoffees()
    const { page, rows } = await library(libraryPath('?scope=bought'))
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

  it('keeps the side, filters, view, sort and page in the address', async () => {
    setViewport(1280, 800)
    await thirtyCoffees()
    const { page, rows } = await library()

    await click('library-scope-bought')
    await pickFilter('origins', 'Ethiopia')
    await page.get(tid('library-view-table')).trigger('click')
    await vi.waitFor(() => expect(rows()).toHaveLength(24))
    await page.get(tid('library-sort-lastBought')).trigger('click')

    await vi.waitFor(() =>
      expect(query()).toEqual({
        scope: 'bought',
        originCode: 'ET',
        sort: 'lastBought',
        direction: 'ascending',
        view: 'table',
      }),
    )
  })

  it('starts from the address, with the names of its filters', async () => {
    setViewport(1280, 800)
    await thirtyCoffees()

    const { page, rows } = await library(
      libraryPath(
        '?scope=bought&originCode=ET&view=table&sort=lastBought&direction=descending&page=2',
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
      expect(page.findAll(tid('library', 'catalog-result'))).toHaveLength(3),
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
          .findAll(tid('library', 'catalog-result-name'))
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

  it('shows an error with a retry when the filter names fail, and still lists the coffees', async () => {
    await threeCoffees()
    const lift = failRequest('GET', labelsPath(), {
      status: 500,
      message: 'Nope',
    })

    const page = await mount(libraryPath('?originCode=CO'))

    await vi.waitFor(() =>
      expect(page.find(tid('library-filters-error')).exists()).toBe(true),
    )
    await vi.waitFor(() =>
      expect(
        page
          .findAll(tid('library', 'catalog-result-name'))
          .map(name => name.text()),
      ).toEqual(['El Paraiso']),
    )

    lift()
    await page.get(tid('library-filters-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(page.get(tid('library-applied-filter')).text()).toBe(
        'Origin: Colombia',
      ),
    )
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
      expect(page.get(tid('library-applied-filter')).text()).toBe(
        'Origin: Colombia',
      ),
    )
    await vi.waitFor(() =>
      expect(page.find(tid('library-error')).exists()).toBe(true),
    )

    lift()
    await page.get(tid('library-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(
        page
          .findAll(tid('library', 'catalog-result-name'))
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
