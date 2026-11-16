import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useAddCoffee, useCurrentUser, useRouter } from '#imports'
import {
  byTestId,
  currentPath,
  forgetLastShelf,
  rememberShelf,
} from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
})

describe('the last-shelf middleware', () => {
  it('goes to the first shelf the first time', async () => {
    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/sarahs-shelf-home')
  })

  it('goes back to the last shelf used', async () => {
    rememberShelf('work')

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/work-work')
  })

  it('goes to the first shelf when the last one is gone', async () => {
    document.cookie = 'shelf=left; path=/'

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/sarahs-shelf-home')
  })

  it('asks for a shelf when there is none', async () => {
    useCurrentUser().value = testUser({ shelves: [] })

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/new')
  })

  it('opens add coffee on the last shelf from the add-coffee link', async () => {
    rememberShelf('work')

    await mountSuspended(App, { route: '/?add=coffee' })
    await flushPromises()

    expect(useRouter().currentRoute.value.fullPath).toBe('/shelves/work-work')
    expect(useAddCoffee().value).toBe(true)
    await vi.waitFor(() => expect(byTestId('add-coffee-sheet')).not.toBeNull())
  })

  it('leaves add coffee closed on a plain visit', async () => {
    await mountSuspended(App, { route: '/' })

    expect(useAddCoffee().value).toBe(false)
  })

  it('asks for a shelf before adding a coffee when there is none', async () => {
    useCurrentUser().value = testUser({ shelves: [] })

    await mountSuspended(App, { route: '/?add=coffee' })

    expect(currentPath()).toBe('/shelves/new')
    expect(useAddCoffee().value).toBe(false)
  })
})
