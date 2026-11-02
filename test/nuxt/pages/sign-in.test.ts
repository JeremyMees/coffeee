import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'

const { social } = vi.hoisted(() => ({ social: vi.fn() }))

mockNuxtImport('authClient', () => ({ signIn: { social } }))

describe('sign-in page', () => {
  it('explains that Coffeee is invite-only after a refused sign-in', async () => {
    const page = await mountSuspended(App, { route: '/sign-in?error=invite' })

    expect(page.text()).toContain('Coffeee is invite-only')
  })

  it('signs in with Google and returns to the page that was asked for', async () => {
    const page = await mountSuspended(App, {
      route: '/sign-in?redirect=/admin/invites',
    })

    await page.get('button').trigger('click')

    expect(social).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provider: 'google',
        callbackURL: '/admin/invites',
      }),
    )
  })

  it('never returns to another site after signing in', async () => {
    const page = await mountSuspended(App, {
      route: '/sign-in?redirect=//evil.example',
    })

    await page.get('button').trigger('click')

    expect(social).toHaveBeenLastCalledWith(
      expect.objectContaining({ callbackURL: '/' }),
    )
  })
})
