import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppDock from '~/components/organisms/AppDock.vue'
import { useAddCoffee, useCurrentUser } from '#imports'
import { forgetLastShelf, tid } from '../../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
})

function mountDock(route = '/shelves/work-work/library') {
  return mountSuspended(AppDock, { route })
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

  it('opens the add coffee sheet', async () => {
    const dock = await mountDock()

    await dock.get(tid('dock-add-coffee')).trigger('click')

    expect(useAddCoffee().value).toBe(true)
  })
})
