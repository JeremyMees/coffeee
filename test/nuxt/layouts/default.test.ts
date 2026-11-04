import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { forgetLastShelf, tid } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

describe('the app shell', () => {
  it.each(['dock-link', 'sidebar-link'])(
    'points every %s to the pages of the current shelf',
    async name => {
      const page = await mountSuspended(App, {
        route: '/shelves/work-work/discover',
      })
      const link = (href: string) => page.find(`${tid(name)}[href="${href}"]`)

      expect(link('/shelves/work-work').exists()).toBe(true)
      expect(link('/shelves/work-work/library').exists()).toBe(true)
      expect(
        link('/shelves/work-work/discover').attributes('aria-current'),
      ).toBe('page')
    },
  )

  it('keeps linking the last shelf from pages outside a shelf', async () => {
    await mountSuspended(App, { route: '/shelves/work-work' })

    const page = await mountSuspended(App, { route: '/profile' })

    expect(
      page.find(`${tid('sidebar-link')}[href="/shelves/work-work"]`).exists(),
    ).toBe(true)
  })

  it('shows the current shelf in a switcher on phones and on desktop', async () => {
    const page = await mountSuspended(App, { route: '/shelves/work-work' })

    expect(page.get(tid('top-bar-shelf-switcher')).text()).toBe('Shelf: Work')
    expect(page.get(tid('sidebar-shelf-switcher')).text()).toBe('Shelf: Work')
  })

  it('puts Add coffee in the dock and in the page header', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/sarahs-shelf-home',
    })

    expect(page.find(tid('dock-add-coffee')).exists()).toBe(true)
    expect(page.find(tid('page-add-coffee')).exists()).toBe(true)
  })

  it.each(['/sign-in', '/invite/the-token'])(
    'stays out of the way on %s',
    async route => {
      useCurrentUser().value = null

      const page = await mountSuspended(App, { route })

      expect(page.find(tid('dock')).exists()).toBe(false)
      expect(page.find(tid('sidebar')).exists()).toBe(false)
      expect(page.find(tid('top-bar')).exists()).toBe(false)
    },
  )
})
