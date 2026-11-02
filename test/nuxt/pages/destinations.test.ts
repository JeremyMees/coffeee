import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { testUser } from '../fixtures'

beforeEach(() => {
  useCurrentUser().value = testUser()
})

describe.each([
  { route: '/shelves/home', title: 'Stock' },
  { route: '/shelves/home/library', title: 'Library' },
  { route: '/shelves/home/search', title: 'Search' },
])('$title page', ({ route, title }) => {
  it('has its title as the page heading', async () => {
    const page = await mountSuspended(App, { route })

    expect(page.get('h1').text()).toBe(title)
  })
})
