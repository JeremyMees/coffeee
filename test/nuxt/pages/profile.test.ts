import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { testUser, tid } from '../fixtures'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

mockNuxtImport('authClient', () => ({ signOut }))

function signInAs(role: 'admin' | 'user') {
  useCurrentUser().value = testUser({ role })
}

beforeEach(() => signInAs('user'))

describe('profile page', () => {
  it('shows who is signed in', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.get(tid('page-title')).text()).toBe('Profile')
    expect(page.get(tid('profile-name')).text()).toBe('Sarah')
    expect(page.get(tid('profile-email')).text()).toBe('sarah@example.com')
  })

  it('hides the invites link from users who are not admins', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.find(tid('profile-invites')).exists()).toBe(false)
    expect(page.find(tid('profile-brew-methods')).exists()).toBe(false)
  })

  it('shows admins the invites link', async () => {
    signInAs('admin')

    const page = await mountSuspended(App, { route: '/profile' })

    const invites = page.get(tid('profile-invites'))

    expect(invites.text()).toBe('Invites')
    expect(invites.attributes('href')).toBe('/admin/invites')
  })

  it('shows admins the brew methods link', async () => {
    signInAs('admin')

    const page = await mountSuspended(App, { route: '/profile' })

    const brewMethods = page.get(tid('profile-brew-methods'))

    expect(brewMethods.text()).toBe('Brew methods')
    expect(brewMethods.attributes('href')).toBe('/admin/brew-methods')
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
})
