import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { pushSubscription } from '#server/db/schemas'
import { useCurrentUser } from '#imports'
import {
  currentPath,
  deviceEndpoint,
  fakePushDevice,
  forgetPushDevice,
} from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'
import { testUser } from '#test/fixtures/users'

const { authSignOut } = vi.hoisted(() => ({ authSignOut: vi.fn() }))

mockNuxtImport('authClient', () => ({ signOut: authSignOut }))

beforeEach(() => {
  authSignOut.mockReset()
  forgetPushDevice()
  useCurrentUser().value = testUser()
})

afterEach(() => {
  forgetPushDevice()
})

async function subscribedDevice() {
  const member = await scenario.member('Sarah')
  await signIn(member)
  const db = await database()
  await db.insert(pushSubscription).values({
    userId: member.id,
    endpoint: deviceEndpoint,
    p256dh: 'device-p256dh',
    auth: 'device-auth',
  })

  return fakePushDevice({ permission: 'granted', subscribed: true })
}

async function endpoints() {
  const db = await database()
  const found = await db.select().from(pushSubscription)

  return found.map(row => row.endpoint)
}

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

  it('stops push on this device before the session ends', async () => {
    const device = await subscribedDevice()
    const subscription = device.subscription!
    let leftWhenSigningOut: string[] = []
    authSignOut.mockImplementation(async () => {
      leftWhenSigningOut = await endpoints()
    })

    await signOut()

    expect(leftWhenSigningOut).toEqual([])
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  it('still signs out when the subscription cannot be removed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const device = await subscribedDevice()
    const subscription = device.subscription!
    failRequest('DELETE', '/api/me/push/subscription', {
      status: 500,
      message: 'Server error',
    })

    await signOut()

    expect(authSignOut).toHaveBeenCalledOnce()
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(currentPath()).toBe('/sign-in')
    vi.restoreAllMocks()
  })
})

describe('forgetCurrentUser', () => {
  it('forgets the user without signing out again', async () => {
    await forgetCurrentUser()

    expect(authSignOut).not.toHaveBeenCalled()
    expect(useCurrentUser().value).toBeNull()
    expect(currentPath()).toBe('/sign-in')
  })

  it('stops push on this device', async () => {
    const device = fakePushDevice({ permission: 'granted', subscribed: true })
    const subscription = device.subscription!

    await forgetCurrentUser()

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
  })
})
