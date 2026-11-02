import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppSidebar from '~/components/AppSidebar.vue'
import { useCurrentUser } from '#imports'
import { forgetLastShelf, testUser, tid } from '../fixtures'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

function mountSidebar(route = '/shelves/work/search') {
  return mountSuspended(AppSidebar, { route })
}

describe('AppSidebar', () => {
  it('links home under the name of the app', async () => {
    const sidebar = await mountSidebar()

    expect(sidebar.get(tid('sidebar-home')).text()).toContain('Coffeee')
  })

  it('links every destination of the current shelf', async () => {
    const sidebar = await mountSidebar()
    expect(
      sidebar
        .findAll(tid('sidebar-link'))
        .map(link => [link.text(), link.attributes('href')]),
    ).toEqual([
      ['Stock', '/shelves/work'],
      ['Library', '/shelves/work/library'],
      ['Search', '/shelves/work/search'],
      ['Profile', '/profile'],
    ])
  })

  it('marks the page that is open', async () => {
    const sidebar = await mountSidebar()

    expect(
      sidebar
        .get(`${tid('sidebar-link')}[href="/shelves/work/search"]`)
        .attributes('aria-current'),
    ).toBe('page')
  })

  it('has the shelf switcher', async () => {
    const sidebar = await mountSidebar()

    expect(sidebar.get(tid('sidebar-shelf-switcher')).text()).toBe(
      'Shelf: Work',
    )
  })
})
