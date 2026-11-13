import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InstallBanner from '~/components/organisms/InstallBanner.vue'
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

describe('InstallBanner', () => {
  it('offers the install button on an Android phone', async () => {
    onDevice('android')
    const event = offerInstall()
    const banner = await mountSuspended(InstallBanner)

    await banner.get(tid('install-banner', 'install-open')).trigger('click')

    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it('shows the steps on an iPhone', async () => {
    onDevice('iPhone')

    const banner = await mountSuspended(InstallBanner)

    expect(banner.find(tid('install-banner', 'install-steps')).exists()).toBe(
      true,
    )
    expect(banner.find(tid('install-open')).exists()).toBe(false)
  })

  it('stays hidden for good once dismissed', async () => {
    onDevice('iPhone')
    const banner = await mountSuspended(InstallBanner)

    await banner.get(tid('install-banner-dismiss')).trigger('click')

    expect(banner.find(tid('install-banner')).exists()).toBe(false)

    const again = await mountSuspended(InstallBanner)

    expect(again.find(tid('install-banner')).exists()).toBe(false)
  })

  it('stays hidden once installed', async () => {
    onDevice('android')
    offerInstall()
    runInstalled()

    const banner = await mountSuspended(InstallBanner)

    expect(banner.find(tid('install-banner')).exists()).toBe(false)
  })

  it('stays off desktops, even where the browser can install', async () => {
    onDevice('desktop')
    offerInstall()

    const banner = await mountSuspended(InstallBanner)

    expect(banner.find(tid('install-banner')).exists()).toBe(false)
  })

  it('hides when the native dialog was turned down', async () => {
    onDevice('android')
    offerInstall('dismissed')
    const banner = await mountSuspended(InstallBanner)

    await banner.get(tid('install-open')).trigger('click')

    expect(banner.find(tid('install-banner')).exists()).toBe(false)
  })
})
