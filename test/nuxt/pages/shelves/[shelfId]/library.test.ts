import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import {
  api,
  fakeApi,
  libraryCoffees,
  manyCoffees,
  resetApi,
} from '../../../fake-api'
import {
  allByTestId,
  click,
  forgetLastShelf,
  setViewport,
  testUser,
  tid,
} from '../../../fixtures'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  resetApi()
  setViewport(375, 812)
  useCurrentUser().value = testUser()
})

async function library() {
  const page = await mountSuspended(App, {
    route: '/shelves/home/library',
    attachTo: document.body,
  })
  const cards = () =>
    page.findAll(tid('library', 'coffee-card-name')).map(name => name.text())
  const rows = () =>
    page.findAll(tid('library-row-name')).map(name => name.text())

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

  it('shows every coffee as a card that opens it, in the order it comes', async () => {
    api.library = libraryCoffees()

    const { page, cards } = await library()

    expect(cards()).toEqual(['Ayele Fulasa', 'El Paraiso', 'Red Brick'])
    expect(page.get(tid('library', 'coffee-card')).attributes('href')).toBe(
      '/shelves/home/coffees/c1',
    )
    expect(page.find(tid('library-more')).exists()).toBe(false)
  })

  it('loads more cards a page at a time', async () => {
    api.library = manyCoffees(30)
    const { page, cards } = await library()

    expect(cards()).toHaveLength(24)

    await page.get(tid('library-more')).trigger('click')

    await vi.waitFor(() => expect(cards()).toHaveLength(30))
    expect(page.find(tid('library-more')).exists()).toBe(false)
  })

  it('asks the server for the coffees the filters pick', async () => {
    api.library = libraryCoffees()
    const { page, cards } = await library()

    await pickFilter('flavor-notes', 'Lime')
    await vi.waitFor(() =>
      expect(cards()).toEqual(['Ayele Fulasa', 'Red Brick']),
    )

    await page.get(tid('library-filter-favourites')).trigger('click')

    await vi.waitFor(() => expect(cards()).toEqual(['Ayele Fulasa']))
    expect(api.libraryQueries.at(-1)).toEqual({
      favourites: 'true',
      flavorNoteId: 'n1',
      page: '0',
    })
  })

  it('says when nothing matches and clears the filters', async () => {
    api.library = libraryCoffees()
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

  it('always shows the grid on a phone', async () => {
    api.library = libraryCoffees()

    const { page } = await library()

    expect(page.find(tid('library-view')).exists()).toBe(false)
    expect(page.find(tid('library-table')).exists()).toBe(false)
  })

  it('switches between the grid and a table on a wide screen', async () => {
    setViewport(1280, 800)
    api.library = libraryCoffees()
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
    api.library = manyCoffees(30)
    const { page, rows } = await library()
    await page.get(tid('library-view-table')).trigger('click')
    await vi.waitFor(() => expect(rows()).toHaveLength(24))

    await page.get(tid('data-table-next')).trigger('click')

    await vi.waitFor(() => expect(rows()).toHaveLength(6))
    expect(page.get(tid('data-table-page')).text()).toBe('Page 2 of 2')

    await page.get(tid('library-sort-lastBought')).trigger('click')

    await vi.waitFor(() =>
      expect(api.libraryQueries.at(-1)).toEqual({
        sort: 'lastBought',
        direction: 'ascending',
        page: '0',
      }),
    )
    expect(page.get(tid('data-table-page')).text()).toBe('Page 1 of 2')
  })
})
