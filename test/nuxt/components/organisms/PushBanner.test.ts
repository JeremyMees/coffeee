import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PushBanner from '~/components/organisms/PushBanner.vue'
import {
  fakePushDevice,
  forgetInstall,
  forgetPushDevice,
  tid,
} from '../../fixtures'
import { failRequest, scenario, signIn } from '../../server'

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
  const banner = await mountSuspended(PushBanner)
  await flushPromises()

  return banner
}

describe('PushBanner', () => {
  it('turns on push for someone who has not decided', async () => {
    const device = fakePushDevice()
    const banner = await mount()

    await banner.get(tid('push-banner-turn-on')).trigger('click')

    await vi.waitFor(() =>
      expect(banner.find(tid('push-banner')).exists()).toBe(false),
    )
    expect(device.subscribe).toHaveBeenCalledOnce()
  })

  it('stays hidden for good once dismissed', async () => {
    const device = fakePushDevice()
    const banner = await mount()

    await banner.get(tid('push-banner-dismiss')).trigger('click')

    expect(banner.find(tid('push-banner')).exists()).toBe(false)
    expect((await mount()).find(tid('push-banner')).exists()).toBe(false)
    expect(device.requestPermission).not.toHaveBeenCalled()
  })

  it.each([
    ['push is on', { permission: 'granted', subscribed: true }],
    ['push was allowed before', { permission: 'granted' }],
    ['push is blocked', { permission: 'denied' }],
  ] as const)('stays hidden when %s', async (_, options) => {
    fakePushDevice(options)

    const banner = await mount()

    expect(banner.find(tid('push-banner')).exists()).toBe(false)
  })

  it('stays hidden where push is not available', async () => {
    const banner = await mount()

    expect(banner.find(tid('push-banner')).exists()).toBe(false)
  })

  it('says so when the subscription cannot be saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fakePushDevice()
    failRequest('PUT', '/api/me/push/subscription', {
      status: 500,
      message: 'Server error',
    })
    const banner = await mount()

    await banner.get(tid('push-banner-turn-on')).trigger('click')

    await vi.waitFor(() =>
      expect(banner.find(tid('push-banner-error')).exists()).toBe(true),
    )
  })
})
