import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InstallAction from '~/components/molecules/InstallAction.vue'
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

describe('InstallAction', () => {
  it('opens the native install dialog from its button', async () => {
    onDevice('android')
    const event = offerInstall()
    const action = await mountSuspended(InstallAction)

    expect(action.get(tid('install-open')).text()).toBe('Install Coffeee')
    expect(action.find(tid('install-steps')).exists()).toBe(false)

    await action.get(tid('install-open')).trigger('click')

    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it('shows the steps on an iPhone instead of a button', async () => {
    onDevice('iPhone')

    const action = await mountSuspended(InstallAction)

    expect(action.find(tid('install-open')).exists()).toBe(false)
    expect(
      action.findAll(tid('install-step')).map(step => step.text()),
    ).toEqual([
      '1. Tap Share in the browser toolbar',
      '2. Choose Add to Home Screen',
    ])
  })

  it('shows nothing once installed', async () => {
    onDevice('iPhone')
    runInstalled()

    const action = await mountSuspended(InstallAction)

    expect(action.find(tid('install-open')).exists()).toBe(false)
    expect(action.find(tid('install-steps')).exists()).toBe(false)
  })
})
