import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import IndexPage from '~/pages/index.vue'
import { useCurrentUser } from '#imports'
import { currentPath, forgetLastShelf } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

describe('the home page', () => {
  it('opens the last shelf instead of a page of its own', async () => {
    await mountSuspended(App, { route: '/shelves/work/library' })

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/work')
  })

  it('has nothing to show while it sends you on', async () => {
    const page = await mountSuspended(IndexPage)

    expect(page.element.tagName).toBe('MAIN')
    expect(page.text()).toBe('')
  })
})
