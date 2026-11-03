import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { tid } from '../fixtures'

const { social } = vi.hoisted(() => ({ social: vi.fn() }))

mockNuxtImport('authClient', () => ({
  signIn: { social, email: vi.fn() },
}))

describe('sign-in page', () => {
  it('explains that Coffeee is invite-only after a refused sign-in', async () => {
    const page = await mountSuspended(App, { route: '/sign-in?error=invite' })

    expect(page.get(tid('sign-in-refused')).text()).toContain(
      'Coffeee is invite-only',
    )
  })

  it('confirms a changed password', async () => {
    const page = await mountSuspended(App, { route: '/sign-in?reset=done' })

    expect(page.get(tid('sign-in-reset')).text()).toContain('Password changed')
    expect(page.find(tid('sign-in-refused')).exists()).toBe(false)
  })

  it('offers email and password, a way back in, and a way to sign up', async () => {
    const page = await mountSuspended(App, { route: '/sign-in' })

    expect(page.find(tid('sign-in-form')).exists()).toBe(true)
    expect(page.get(tid('sign-in-forgot')).attributes('href')).toBe(
      '/forgot-password',
    )
    expect(page.get(tid('sign-in-sign-up')).attributes('href')).toBe('/sign-up')
  })

  it('signs in with Google and returns to the page that was asked for', async () => {
    const page = await mountSuspended(App, {
      route: '/sign-in?redirect=/admin/invites',
    })

    await page.get(tid('sign-in-google')).trigger('click')

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

    await page.get(tid('sign-in-google')).trigger('click')

    expect(social).toHaveBeenLastCalledWith(
      expect.objectContaining({ callbackURL: '/' }),
    )
  })
})
