import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'

const destinations = [
  { label: 'Stock', href: '/' },
  { label: 'Library', href: '/library' },
  { label: 'Search', href: '/search' },
  { label: 'Profile', href: '/profile' },
]

beforeEach(() => {
  useCurrentUser().value = {
    id: 'user-1',
    name: 'Sarah',
    email: 'sarah@example.com',
    image: null,
    role: 'user',
  }
})

describe('app shell', () => {
  it.each(['Dock', 'Sidebar'])(
    'links every destination from the %s',
    async name => {
      const page = await mountSuspended(App, { route: '/' })
      const nav = page.get(`nav[aria-label="${name}"]`)

      for (const { label, href } of destinations) {
        const link = nav.get(`a[href="${href}"]`)

        expect(link.attributes('aria-label') ?? link.text()).toBe(label)
      }
    },
  )

  it.each(['Dock', 'Sidebar'])(
    'marks the current page in the %s',
    async name => {
      const page = await mountSuspended(App, { route: '/library' })
      const nav = page.get(`nav[aria-label="${name}"]`)

      expect(nav.get('a[href="/library"]').attributes('aria-current')).toBe(
        'page',
      )
      expect(nav.get('a[href="/"]').attributes('aria-current')).toBeUndefined()
    },
  )

  it('puts Add coffee in the dock and in the page header', async () => {
    const page = await mountSuspended(App, { route: '/' })

    expect(
      page
        .find('nav[aria-label="Dock"] button[aria-label="Add coffee"]')
        .exists(),
    ).toBe(true)
    expect(page.get('header button').text()).toBe('Add coffee')
  })

  it.each(['/sign-in', '/invite/the-token'])(
    'stays out of the way on %s',
    async route => {
      useCurrentUser().value = null

      const page = await mountSuspended(App, { route })

      expect(page.find('nav').exists()).toBe(false)
    },
  )
})
