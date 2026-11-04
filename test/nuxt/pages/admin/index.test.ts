import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser, useRouter } from '#imports'
import { tid } from '../../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  useCurrentUser().value = testUser({ role: 'admin' })
})

describe('the admin page', () => {
  it('links every admin tool', async () => {
    const page = await mountSuspended(App, { route: '/admin' })

    expect(page.get(tid('page-title')).text()).toBe('Admin')
    expect(page.find(tid('page-add-coffee')).exists()).toBe(false)
    expect(
      page
        .findAll(tid('admin-link'))
        .map(link => [link.text(), link.attributes('href')]),
    ).toEqual([
      ['Invites', '/admin/invites'],
      ['Coffees', '/admin/lists/coffees'],
      ['Roasters', '/admin/lists/roasters'],
      ['Flavor notes', '/admin/lists/flavorNotes'],
      ['Regions', '/admin/lists/regions'],
      ['Producers', '/admin/lists/producers'],
      ['Farms', '/admin/lists/farms'],
      ['Washing stations', '/admin/lists/washingStations'],
      ['Processes', '/admin/lists/processes'],
      ['Varietals', '/admin/lists/varietals'],
      ['Grinders', '/admin/lists/grinders'],
      ['Grinder brands', '/admin/lists/grinderBrands'],
      ['Brew methods', '/admin/lists/brewMethods'],
    ])
  })

  it('sends users who are not admins home', async () => {
    useCurrentUser().value = testUser()
    await mountSuspended(App, { route: '/profile' })

    await useRouter().push('/admin')

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.path).toBe('/shelves/home'),
    )
  })
})
