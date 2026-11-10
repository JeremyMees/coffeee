import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppDock from '~/components/organisms/AppDock.vue'
import { useAddCoffee, useAddRoaster, useCurrentUser } from '#imports'
import { byTestId, click, forgetLastShelf, tid } from '../../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
  useAddRoaster().value = false
})

function mountDock(route = '/shelves/work-work/library') {
  return mountSuspended(AppDock, { route, attachTo: document.body })
}

async function openAddMenu() {
  const dock = await mountDock()

  await dock.get(tid('dock-add')).trigger('keydown', { key: 'Enter' })
  await flushPromises()

  return dock
}

describe('AppDock', () => {
  it('links every destination of the current shelf by name', async () => {
    const dock = await mountDock()

    expect(
      dock
        .findAll(tid('dock-link'))
        .map(link => [link.attributes('aria-label'), link.attributes('href')]),
    ).toEqual([
      ['Stock', '/shelves/work-work'],
      ['Library', '/shelves/work-work/library'],
      ['Discover', '/shelves/work-work/discover'],
      ['Roasters', '/roasters'],
      ['Profile', '/profile'],
    ])
  })

  it('marks the page that is open', async () => {
    const dock = await mountDock()

    expect(
      dock
        .get(`${tid('dock-link')}[href="/shelves/work-work/library"]`)
        .attributes('aria-current'),
    ).toBe('page')
    expect(
      dock
        .get(`${tid('dock-link')}[href="/shelves/work-work"]`)
        .attributes('aria-current'),
    ).toBeUndefined()
  })

  it('names the add button for screen readers', async () => {
    const dock = await mountDock()

    expect(dock.get(tid('dock-add')).attributes('aria-label')).toBe('Add')
    expect(byTestId('dock-add-menu')).toBeNull()
  })

  it('offers to add a coffee or a roaster', async () => {
    await openAddMenu()

    expect(
      [...byTestId('dock-add-menu')!.querySelectorAll('[role="menuitem"]')].map(
        item => item.textContent?.trim(),
      ),
    ).toEqual(['Add coffee', 'Add roaster'])
  })

  it('opens the add coffee sheet from the menu', async () => {
    await openAddMenu()

    await click('dock-add-coffee')

    expect(useAddCoffee().value).toBe(true)
    expect(useAddRoaster().value).toBe(false)
    expect(byTestId('dock-add-menu')).toBeNull()
  })

  it('opens the add roaster sheet from the menu', async () => {
    await openAddMenu()

    await click('dock-add-roaster')

    expect(useAddRoaster().value).toBe(true)
    expect(useAddCoffee().value).toBe(false)
  })

  it('closes the menu on Escape without opening a sheet', async () => {
    await openAddMenu()

    byTestId('dock-add-menu')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await flushPromises()

    expect(byTestId('dock-add-menu')).toBeNull()
    expect(useAddCoffee().value).toBe(false)
    expect(useAddRoaster().value).toBe(false)
  })
})
