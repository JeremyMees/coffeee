import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfSwitcher from '~/components/ShelfSwitcher.vue'
import { useCurrentUser } from '#imports'
import { allByTestId, byTestId, forgetLastShelf, tid } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

async function openSwitcher(route: string) {
  const switcher = await mountSuspended(ShelfSwitcher, {
    route,
    attachTo: document.body,
  })

  await switcher.get(tid('shelf-switcher')).trigger('keydown', { key: 'Enter' })
  await flushPromises()

  const menu = byTestId('shelf-menu')!
  const links = allByTestId('shelf-menu', 'shelf-menu-shelf').map(link => [
    link.textContent?.trim(),
    link.getAttribute('href'),
  ])

  return { menu, links }
}

describe('ShelfSwitcher', () => {
  it('shows the current shelf', async () => {
    const switcher = await mountSuspended(ShelfSwitcher, {
      route: '/shelves/work',
    })

    expect(switcher.get(tid('shelf-switcher')).text()).toBe('Shelf: Work')
  })

  it('switches to the same page on another shelf', async () => {
    const { menu, links } = await openSwitcher('/shelves/work/library')

    expect(links).toEqual([
      ["Sarah's shelf", '/shelves/home/library'],
      ['Work', '/shelves/work/library'],
    ])
    expect(byTestId('shelf-menu-new')!.getAttribute('href')).toBe(
      '/shelves/new',
    )
    expect(byTestId('shelf-menu-settings')!.getAttribute('href')).toBe(
      '/shelves/work/settings',
    )
    expect(menu.querySelector('[aria-current="page"]')?.textContent).toBe(
      'Work',
    )
  })

  it('goes to the stock of a shelf from pages outside a shelf', async () => {
    const { links } = await openSwitcher('/profile')

    expect(links).toEqual([
      ["Sarah's shelf", '/shelves/home'],
      ['Work', '/shelves/work'],
    ])
  })
})
