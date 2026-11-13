import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InstallBanner from '~/components/organisms/InstallBanner.vue'
import ProfileInstall from '~/components/organisms/ProfileInstall.vue'
import {
  forgetInstall,
  offerInstall,
  onDevice,
  runInstalled,
  tid,
} from '../../fixtures'

beforeEach(() => {
  forgetInstall()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProfileInstall', () => {
  it('opens the native install dialog, also after the banner was dismissed', async () => {
    onDevice('android')
    const event = offerInstall()
    const banner = await mountSuspended(InstallBanner)
    await banner.get(tid('install-banner-dismiss')).trigger('click')

    const entry = await mountSuspended(ProfileInstall)
    await entry.get(tid('profile-install', 'install-open')).trigger('click')

    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it('shows the steps on an iPhone', async () => {
    onDevice('iPhone')

    const entry = await mountSuspended(ProfileInstall)

    expect(entry.find(tid('profile-install', 'install-steps')).exists()).toBe(
      true,
    )
  })

  it('offers the install on a desktop that can install', async () => {
    onDevice('desktop')
    offerInstall()

    const entry = await mountSuspended(ProfileInstall)

    expect(entry.find(tid('profile-install', 'install-open')).exists()).toBe(
      true,
    )
  })

  it.each(['android', 'iPhone'] as const)(
    'is hidden once installed on %s',
    async device => {
      onDevice(device)
      offerInstall()
      runInstalled()

      const entry = await mountSuspended(ProfileInstall)

      expect(entry.find(tid('profile-install')).exists()).toBe(false)
    },
  )

  it('is hidden where nothing can be installed', async () => {
    onDevice('desktop')

    const entry = await mountSuspended(ProfileInstall)

    expect(entry.find(tid('profile-install')).exists()).toBe(false)
  })
})
