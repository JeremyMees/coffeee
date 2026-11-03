import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppDock from '~/components/AppDock.vue'
import { useAddCoffee, useCurrentUser } from '#imports'
import { forgetLastShelf, testUser, tid } from '../fixtures'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
})

function mountDock(route = '/shelves/work/library') {
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
      ['Stock', '/shelves/work'],
      ['Library', '/shelves/work/library'],
      ['Discover', '/shelves/work/discover'],
      ['Roasters', '/roasters'],
      ['Profile', '/profile'],
    ])
  })

  it('marks the page that is open', async () => {
    const dock = await mountDock()

    expect(
      dock
        .get(`${tid('dock-link')}[href="/shelves/work/library"]`)
        .attributes('aria-current'),
    ).toBe('page')
    expect(
      dock
        .get(`${tid('dock-link')}[href="/shelves/work"]`)
        .attributes('aria-current'),
    ).toBeUndefined()
  })

  it('opens the add coffee sheet', async () => {
    const dock = await mountDock()

    await dock.get(tid('dock-add-coffee')).trigger('click')

    expect(useAddCoffee().value).toBe(true)
  })
})
