import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useRouter } from '#imports'
import { byTestId, tid } from '../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../server'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

mockNuxtImport('authClient', () => ({ signOut }))

beforeEach(async () => {
  await signIn(await scenario.member('Sarah'))
})

describe('profile page', () => {
  it('shows who is signed in', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.get(tid('page-title')).text()).toBe('Profile')
    expect(
      (page.get(tid('profile-name-input')).element as HTMLInputElement).value,
    ).toBe('Sarah')
    expect(page.find(tid('profile-name')).exists()).toBe(false)
    expect(page.get(tid('profile-email')).text()).toMatch(
      /^sarah-.+@example\.com$/,
    )
  })

  it('keeps the admin tools off the profile, even for admins', async () => {
    await signIn(await scenario.member('Jeremy', { role: 'admin' }))

    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.find(tid('profile-invites')).exists()).toBe(false)
    expect(page.find(tid('profile-brew-methods')).exists()).toBe(false)
    expect(page.find(tid('sign-out')).exists()).toBe(true)
  })

  it('links admins to the admin pages for when the sidebar is hidden', async () => {
    await signIn(await scenario.member('Jeremy', { role: 'admin' }))

    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.get(tid('profile-admin')).attributes('href')).toBe('/admin')
  })

  it('keeps the admin link from everyone else', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.find(tid('profile-admin')).exists()).toBe(false)
  })

  it('forgets the pages cached for offline use when signing out', async () => {
    const caches = { delete: vi.fn() }
    vi.stubGlobal('caches', caches)

    const page = await mountSuspended(App, { route: '/profile' })

    await page.get(tid('sign-out')).trigger('click')

    await vi.waitFor(() => expect(caches.delete).toHaveBeenCalledWith('pages'))

    vi.unstubAllGlobals()
  })

  it('signs out and goes to the sign-in page', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    await page.get(tid('sign-out')).trigger('click')

    await vi.waitFor(() => {
      expect(signOut).toHaveBeenCalled()
      expect(useRouter().currentRoute.value.path).toBe('/sign-in')
    })
  })

  it('keeps deleting the account on its own tab', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.get(tid('sign-out')).isVisible()).toBe(true)
    expect(page.get(tid('delete-account-open')).isVisible()).toBe(false)

    const danger = await mountSuspended(App, { route: '/profile?tab=danger' })

    expect(danger.get(tid('delete-account-open')).isVisible()).toBe(true)
    expect(danger.get(tid('sign-out')).isVisible()).toBe(false)
  })

  it('keeps the email settings on a notifications tab', async () => {
    const page = await mountSuspended(App, {
      route: '/profile?tab=notifications',
    })
    await vi.waitFor(() =>
      expect(page.find(tid('notification-email-invited')).exists()).toBe(true),
    )

    expect(page.get(tid('notification-email-invited')).isVisible()).toBe(true)
    expect(page.get(tid('sign-out')).isVisible()).toBe(false)
  })

  it('asks before deleting the account', async () => {
    const page = await mountSuspended(App, {
      route: '/profile?tab=danger',
      attachTo: document.body,
    })

    await page.get(tid('delete-account-open')).trigger('click')

    await vi.waitFor(() =>
      expect(byTestId('confirm-dialog-title')?.textContent).toContain(
        'Delete your account?',
      ),
    )
    page.unmount()
  })

  it('opens straight away while the stats and email settings load', async () => {
    const holds = [
      holdRequest('GET', '/api/me/stats'),
      holdRequest('GET', '/api/me/notifications/emails'),
    ]

    const page = await mountSuspended(App, { route: '/profile' })

    expect(
      (page.get(tid('profile-name-input')).element as HTMLInputElement).value,
    ).toBe('Sarah')
    expect(page.find(tid('profile-stats-skeleton')).exists()).toBe(true)
    expect(
      page.find(tid('profile-notification-emails-skeleton')).exists(),
    ).toBe(true)

    for (const hold of holds) hold.release()

    await vi.waitFor(() => {
      expect(page.find(tid('stats-bags')).exists()).toBe(true)
      expect(page.find(tid('notification-email-invited')).exists()).toBe(true)
    })
  })

  it('keeps the email settings working when the stats fail to load', async () => {
    failRequest('GET', '/api/me/stats', { status: 500, message: 'Nope' })

    const page = await mountSuspended(App, { route: '/profile' })

    await vi.waitFor(() => {
      expect(page.find(tid('profile-stats-error')).exists()).toBe(true)
      expect(page.find(tid('notification-email-invited')).exists()).toBe(true)
    })
    expect(page.find(tid('sign-out')).exists()).toBe(true)
  })
})
