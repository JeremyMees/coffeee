import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { testUser } from '../fixtures'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

mockNuxtImport('authClient', () => ({ signOut }))

function signInAs(role: 'admin' | 'user') {
  useCurrentUser().value = testUser({ role })
}

beforeEach(() => signInAs('user'))

describe('profile page', () => {
  it('shows who is signed in', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.get('h1').text()).toBe('Profile')
    expect(page.text()).toContain('Sarah')
    expect(page.text()).toContain('sarah@example.com')
  })

  it('hides the invites link from users who are not admins', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.find('a[href="/admin/invites"]').exists()).toBe(false)
  })

  it('shows admins the invites link', async () => {
    signInAs('admin')

    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.get('a[href="/admin/invites"]').text()).toBe('Invites')
  })

  it('forgets the pages cached for offline use when signing out', async () => {
    const caches = { delete: vi.fn() }
    vi.stubGlobal('caches', caches)

    const page = await mountSuspended(App, { route: '/profile' })

    const button = page.findAll('button').find(b => b.text() === 'Sign out')
    await button!.trigger('click')

    await vi.waitFor(() => expect(caches.delete).toHaveBeenCalledWith('pages'))

    vi.unstubAllGlobals()
  })

  it('signs out and goes to the sign-in page', async () => {
    const page = await mountSuspended(App, { route: '/profile' })

    const button = page.findAll('button').find(b => b.text() === 'Sign out')
    await button!.trigger('click')

    await vi.waitFor(() => {
      expect(signOut).toHaveBeenCalled()
      expect(useRouter().currentRoute.value.path).toBe('/sign-in')
    })
  })
})
