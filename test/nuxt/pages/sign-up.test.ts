import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { tid } from '../fixtures'

mockNuxtImport('authClient', () => ({ signUp: { email: vi.fn() } }))

describe('sign-up page', () => {
  it('lets an invited email create an account without signing in first', async () => {
    const page = await mountSuspended(App, { route: '/sign-up' })

    expect(page.get(tid('sign-up-title')).text()).toBe('Create an account')
    expect(page.find(tid('sign-up-form')).exists()).toBe(true)
    expect(page.get(tid('sign-up-sign-in')).attributes('href')).toBe('/sign-in')
  })
})
