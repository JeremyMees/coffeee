import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { currentPath, forgetLastShelf, rememberShelf } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

describe('the last-shelf middleware', () => {
  it('goes to the first shelf the first time', async () => {
    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/home')
  })

  it('goes back to the last shelf used', async () => {
    rememberShelf('work')

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/work')
  })

  it('goes to the first shelf when the last one is gone', async () => {
    document.cookie = 'shelf=left; path=/'

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/home')
  })

  it('asks for a shelf when there is none', async () => {
    useCurrentUser().value = testUser({ shelves: [] })

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/new')
  })
})
