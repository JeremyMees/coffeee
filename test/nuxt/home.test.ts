import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

mockNuxtImport('authClient', () => ({ signOut }))

function signInAs(role: 'admin' | 'user') {
  useCurrentUser().value = {
    id: 'user-1',
    name: 'Sarah',
    email: 'sarah@example.com',
    image: null,
    role,
  }
}

beforeEach(() => signInAs('user'))

describe('home page', () => {
  it('shows the app name and who is signed in', async () => {
    const page = await mountSuspended(App, { route: '/' })

    expect(page.find('h1').text()).toBe('Coffeee')
    expect(page.text()).toContain('Signed in as Sarah')
  })

  it('hides the invites button from users who are not admins', async () => {
    const page = await mountSuspended(App, { route: '/' })

    expect(page.find('a[href="/admin/invites"]').exists()).toBe(false)
  })

  it('shows admins the invites button', async () => {
    signInAs('admin')

    const page = await mountSuspended(App, { route: '/' })

    expect(page.get('a[href="/admin/invites"]').text()).toBe('Invites')
  })

  it('signs out and goes to the sign-in page', async () => {
    const page = await mountSuspended(App, { route: '/' })

    const button = page.findAll('button').find(b => b.text() === 'Sign out')
    await button!.trigger('click')

    await vi.waitFor(() => {
      expect(signOut).toHaveBeenCalled()
      expect(useRouter().currentRoute.value.path).toBe('/sign-in')
    })
  })
})
