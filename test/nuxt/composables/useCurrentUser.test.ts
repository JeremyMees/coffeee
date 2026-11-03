import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCurrentUser } from '#imports'
import { currentPath, testUser } from '../fixtures'

const { authSignOut } = vi.hoisted(() => ({ authSignOut: vi.fn() }))

mockNuxtImport('authClient', () => ({ signOut: authSignOut }))

beforeEach(() => {
  authSignOut.mockClear()
  useCurrentUser().value = testUser()
})

describe('useCurrentUser', () => {
  it('is the same user for every caller', () => {
    expect(useCurrentUser().value?.email).toBe('sarah@example.com')
  })
})

describe('signOut', () => {
  it('signs out, forgets the user and goes to sign in', async () => {
    await signOut()

    expect(authSignOut).toHaveBeenCalledOnce()
    expect(useCurrentUser().value).toBeNull()
    expect(currentPath()).toBe('/sign-in')
  })

  it('throws away the cached pages so the next person cannot see them', async () => {
    const remove = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', { delete: remove })

    await signOut()

    expect(remove).toHaveBeenCalledWith('pages')
    vi.unstubAllGlobals()
  })
})

describe('forgetCurrentUser', () => {
  it('forgets the user without signing out again', async () => {
    await forgetCurrentUser()

    expect(authSignOut).not.toHaveBeenCalled()
    expect(useCurrentUser().value).toBeNull()
    expect(currentPath()).toBe('/sign-in')
  })
})
