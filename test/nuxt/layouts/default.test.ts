import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { forgetInstall, forgetLastShelf, onDevice, tid } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  forgetInstall()
  useCurrentUser().value = testUser()
})

afterEach(() => {
  vi.restoreAllMocks()
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

  it('puts Add in the dock and Add coffee in the page header', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/sarahs-shelf-home',
    })

    expect(page.find(tid('dock-add')).exists()).toBe(true)
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

  it('invites phone users to install Coffeee', async () => {
    onDevice('iPhone')

    const page = await mountSuspended(App, { route: '/shelves/work-work' })

    expect(page.find(tid('install-banner')).exists()).toBe(true)
  })

  it('keeps the install banner off desktops', async () => {
    onDevice('desktop')

    const page = await mountSuspended(App, { route: '/shelves/work-work' })

    expect(page.find(tid('install-banner')).exists()).toBe(false)
  })
})
