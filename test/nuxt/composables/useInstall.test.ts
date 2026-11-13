import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUser, useInstall } from '#imports'
import {
  forgetInstall,
  offerInstall,
  onDevice,
  runOn,
  runInstalled,
} from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetInstall()
  useCurrentUser().value = testUser()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function install() {
  return runOn('/profile', useInstall)
}

describe('useInstall', () => {
  it('offers the native install dialog on an Android phone', async () => {
    onDevice('android')
    offerInstall()

    const { phone, canPrompt, needsSteps, installed, offered } = await install()

    expect(phone.value).toBe(true)
    expect(canPrompt.value).toBe(true)
    expect(needsSteps.value).toBe(false)
    expect(installed.value).toBe(false)
    expect(offered.value).toBe(true)
  })

  it('keeps the browser from showing its own install prompt', () => {
    const event = offerInstall()

    expect(event.defaultPrevented).toBe(true)
  })

  it('opens the native install dialog once', async () => {
    onDevice('android')
    const event = offerInstall()
    const { canPrompt, install: open } = await install()

    await open()

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(canPrompt.value).toBe(false)
  })

  it('asks for the manual steps on an iPhone', async () => {
    onDevice('iPhone')

    const { phone, canPrompt, needsSteps, offered } = await install()

    expect(phone.value).toBe(true)
    expect(canPrompt.value).toBe(false)
    expect(needsSteps.value).toBe(true)
    expect(offered.value).toBe(true)
  })

  it.each(['android', 'iPhone'] as const)(
    'offers nothing once installed on %s',
    async device => {
      onDevice(device)
      offerInstall()
      runInstalled()

      const { installed, canPrompt, needsSteps, offered } = await install()

      expect(installed.value).toBe(true)
      expect(canPrompt.value).toBe(false)
      expect(needsSteps.value).toBe(false)
      expect(offered.value).toBe(false)
    },
  )

  it('knows a desktop is no phone', async () => {
    onDevice('desktop')

    const { phone, offered } = await install()

    expect(phone.value).toBe(false)
    expect(offered.value).toBe(false)
  })

  it('stops offering the dialog once the app is installed', async () => {
    onDevice('android')
    offerInstall()
    const { canPrompt } = await install()

    window.dispatchEvent(new Event('appinstalled'))

    expect(canPrompt.value).toBe(false)
  })
})
