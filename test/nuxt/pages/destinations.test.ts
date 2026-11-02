import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'

beforeEach(() => {
  useCurrentUser().value = {
    id: 'user-1',
    name: 'Sarah',
    email: 'sarah@example.com',
    image: null,
    role: 'user',
  }
})

describe.each([
  { route: '/', title: 'Stock' },
  { route: '/library', title: 'Library' },
  { route: '/search', title: 'Search' },
])('$title page', ({ route, title }) => {
  it('has its title as the page heading', async () => {
    const page = await mountSuspended(App, { route })

    expect(page.get('h1').text()).toBe(title)
  })
})
