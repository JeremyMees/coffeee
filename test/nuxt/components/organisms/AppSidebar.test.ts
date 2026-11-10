import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppSidebar from '~/components/organisms/AppSidebar.vue'
import { useCurrentUser, useState } from '#imports'
import { forgetLastShelf, tid } from '../../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useState('last-section').value = null
})

function mountSidebar(route = '/shelves/work-work/discover') {
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
      ['Stock', '/shelves/work-work'],
      ['Library', '/shelves/work-work/library'],
      ['Discover', '/shelves/work-work/discover'],
      ['Roasters', '/roasters'],
      ['Profile', '/profile'],
    ])
  })

  it('links admins to the admin page', async () => {
    useCurrentUser().value = testUser({ role: 'admin' })

    const sidebar = await mountSidebar()
    const admin = sidebar.findAll(tid('sidebar-link')).at(-1)!

    expect(admin.text()).toBe('Admin')
    expect(admin.attributes('href')).toBe('/admin')
  })

  it('shows the admin link to admins only', async () => {
    const sidebar = await mountSidebar()

    expect(
      sidebar.findAll(tid('sidebar-link')).map(link => link.text()),
    ).not.toContain('Admin')
  })

  it('marks the page that is open', async () => {
    const sidebar = await mountSidebar()

    expect(
      sidebar
        .get(`${tid('sidebar-link')}[href="/shelves/work-work/discover"]`)
        .attributes('aria-current'),
    ).toBe('page')
  })

  it('keeps Stock active on a coffee of the shelf', async () => {
    const sidebar = await mountSidebar(
      '/shelves/work-work/coffees/ayele-fulasa-c1',
    )
    const stock = sidebar.get(
      `${tid('sidebar-link')}[href="/shelves/work-work"]`,
    )

    expect(stock.classes()).toContain('bg-primary')
    expect(stock.attributes('aria-current')).toBeUndefined()
  })

  it('keeps Admin active on every admin page', async () => {
    useCurrentUser().value = testUser({ role: 'admin' })

    const sidebar = await mountSidebar('/admin/invites')
    const admin = sidebar.findAll(tid('sidebar-link')).at(-1)!

    expect(admin.classes()).toContain('bg-primary')
    expect(admin.attributes('aria-current')).toBeUndefined()
  })

  it('has the shelf switcher', async () => {
    const sidebar = await mountSidebar()

    expect(sidebar.get(tid('sidebar-shelf-switcher')).text()).toBe(
      'Shelf: Work',
    )
  })

  it('opens the list of keyboard shortcuts', async () => {
    const sidebar = await mountSidebar()

    expect(sidebar.get(tid('shortcuts-open')).text()).toBe('Shortcuts')
  })
})
