import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfilePush from '~/components/organisms/ProfilePush.vue'
import { pushSubscription } from '#server/db/schemas'
import {
  deviceEndpoint,
  fakePushDevice,
  forgetInstall,
  forgetPushDevice,
  onDevice,
  runInstalled,
  tid,
} from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

beforeEach(async () => {
  forgetInstall()
  forgetPushDevice()
  await signIn(await scenario.member('Sarah'))
})

afterEach(() => {
  vi.restoreAllMocks()
  forgetPushDevice()
})

async function mount() {
  const push = await mountSuspended(ProfilePush)
  await flushPromises()

  return push
}

function switchOf(push: Awaited<ReturnType<typeof mount>>) {
  return push.get(tid('push-switch'))
}

async function endpoints() {
  const db = await database()
  const found = await db.select().from(pushSubscription)

  return found.map(row => row.endpoint)
}

describe('ProfilePush', () => {
  it('turns push on for this device', async () => {
    fakePushDevice()
    const push = await mount()

    expect(switchOf(push).attributes('data-state')).toBe('unchecked')

    await switchOf(push).trigger('click')

    await vi.waitFor(() =>
      expect(switchOf(push).attributes('data-state')).toBe('checked'),
    )
    expect(await endpoints()).toEqual([deviceEndpoint])
  })

  it('turns push off for this device', async () => {
    fakePushDevice()
    const push = await mount()
    await switchOf(push).trigger('click')
    await vi.waitFor(() =>
      expect(switchOf(push).attributes('data-state')).toBe('checked'),
    )

    await switchOf(push).trigger('click')

    await vi.waitFor(() =>
      expect(switchOf(push).attributes('data-state')).toBe('unchecked'),
    )
    expect(await endpoints()).toEqual([])
  })

  it.each([
    ['blocked', { permission: 'denied' as const }, 'push-blocked'],
    ['unsupported', undefined, 'push-unsupported'],
  ])('explains push is %s', async (_, options, message) => {
    if (options) fakePushDevice(options)

    const push = await mount()

    expect(push.find(tid(message)).exists()).toBe(true)
    expect(switchOf(push).attributes('disabled')).toBeDefined()
  })

  it.each([
    ['desktop', 'set Notifications to Allow'],
    ['firefox', 'clear Blocked next to Send notifications'],
    ['safari', 'Open Safari Settings'],
  ] as const)('tells %s users where to allow push', async (device, steps) => {
    onDevice(device)
    fakePushDevice({ permission: 'denied' })

    const push = await mount()

    expect(push.get(tid('push-blocked')).text()).toContain(steps)
  })

  it('points the installed app to the phone settings', async () => {
    onDevice('android')
    runInstalled()
    fakePushDevice({ permission: 'denied' })

    const push = await mount()

    expect(push.get(tid('push-blocked')).text()).toContain('App info')
  })

  it('makes the switch usable once push is allowed', async () => {
    const device = fakePushDevice({ permission: 'denied' })
    const push = await mount()

    device.allowInBrowser()

    await vi.waitFor(() =>
      expect(push.find(tid('push-blocked')).exists()).toBe(false),
    )
    expect(switchOf(push).attributes('disabled')).toBeUndefined()
  })

  it('shows an iPhone how to add Coffeee to the Home Screen first', async () => {
    onDevice('iPhone')

    const push = await mount()

    expect(push.find(tid('push-needs-install', 'install-steps')).exists()).toBe(
      true,
    )
    expect(switchOf(push).attributes('disabled')).toBeDefined()
  })

  it('explains nothing while push works', async () => {
    fakePushDevice()

    const push = await mount()

    expect(push.find(tid('push-blocked')).exists()).toBe(false)
    expect(push.find(tid('push-unsupported')).exists()).toBe(false)
    expect(push.find(tid('push-needs-install')).exists()).toBe(false)
  })

  it('gives up instead of waiting where no service worker runs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const device = fakePushDevice({ withoutWorker: true })
    const push = await mount()

    await switchOf(push).trigger('click')

    await vi.waitFor(() =>
      expect(push.find(tid('push-error')).exists()).toBe(true),
    )
    expect(device.subscribe).not.toHaveBeenCalled()
    expect(switchOf(push).attributes('disabled')).toBeUndefined()
  })

  it('says so when push cannot be turned on', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fakePushDevice()
    failRequest('PUT', '/api/me/push/subscription', {
      status: 500,
      message: 'Server error',
    })
    const push = await mount()

    await switchOf(push).trigger('click')

    await vi.waitFor(() =>
      expect(push.get(tid('push-error')).text()).toBe(
        "Push couldn't be turned on. Try again.",
      ),
    )
    expect(switchOf(push).attributes('data-state')).toBe('unchecked')
    expect(await endpoints()).toEqual([])
  })
})
