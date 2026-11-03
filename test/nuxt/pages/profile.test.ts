import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { fakeApi } from '../fake-api'
import { byTestId, testUser, tid } from '../fixtures'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

mockNuxtImport('authClient', () => ({ signOut }))

fakeApi()

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

  it('keeps the admin tools off the profile, even for admins', async () => {
    signInAs('admin')

    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.find(tid('profile-invites')).exists()).toBe(false)
    expect(page.find(tid('profile-brew-methods')).exists()).toBe(false)
    expect(page.find(tid('sign-out')).exists()).toBe(true)
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

  it('asks before deleting the account', async () => {
    const page = await mountSuspended(App, {
      route: '/profile',
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
})
