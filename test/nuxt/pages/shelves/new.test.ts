import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../../fake-api'
import { currentPath, forgetLastShelf, testUser, tid } from '../../fixtures'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  resetApi()
  useCurrentUser().value = testUser()
})

async function create(name: string) {
  const page = await mountSuspended(App, { route: '/shelves/new' })

  await page.get(tid('shelf-name')).setValue(name)
  await page.get(tid('new-shelf-form')).trigger('submit')
  await flushPromises()

  return page
}

describe('creating a shelf', () => {
  it('names the shelf and goes to it', async () => {
    const page = await create('Garage')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/garage'))
    expect(page.get(tid('top-bar-shelf-switcher')).text()).toBe('Shelf: Garage')
  })

  it('asks for a name before sending anything', async () => {
    const page = await create('   ')

    await vi.waitFor(() =>
      expect(page.get(tid('new-shelf-form')).text()).toContain(
        'Give the shelf a name',
      ),
    )
    expect(api.shelves).toEqual([])
    expect(currentPath()).toBe('/shelves/new')
  })

  it('says why the server refused the shelf', async () => {
    const page = await create('Broken')

    await vi.waitFor(() =>
      expect(page.get(tid('form-error')).text()).toBe(
        'That shelf could not be made',
      ),
    )
    expect(currentPath()).toBe('/shelves/new')
  })
})
