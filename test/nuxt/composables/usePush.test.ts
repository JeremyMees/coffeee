import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pushSubscription } from '#server/db/schemas'
import { usePush } from '#imports'
import {
  deviceEndpoint,
  fakePushDevice,
  forgetInstall,
  forgetPushDevice,
  onDevice,
  runInstalled,
  runOn,
} from '../fixtures'
import { database, scenario, signIn } from '../server'

beforeEach(async () => {
  forgetInstall()
  forgetPushDevice()
  await signIn(await scenario.member('Sarah'))
})

afterEach(() => {
  vi.restoreAllMocks()
  forgetPushDevice()
})

async function subscriptions() {
  const db = await database()

  return db.select().from(pushSubscription)
}

async function push() {
  const found = await runOn('/profile', usePush)
  await vi.waitFor(() => expect(found.state.value).not.toBe('checking'))

  return found
}

describe('usePush', () => {
  it('is off and undecided until asked', async () => {
    fakePushDevice()

    const { state, undecided } = await push()

    expect(state.value).toBe('off')
    expect(undecided.value).toBe(true)
  })

  it('is on where this device already receives push', async () => {
    fakePushDevice({ permission: 'granted', subscribed: true })

    const { state, undecided } = await push()

    expect(state.value).toBe('on')
    expect(undecided.value).toBe(false)
  })

  it('is off without a subscription, even with permission', async () => {
    fakePushDevice({ permission: 'granted' })

    const { state, undecided } = await push()

    expect(state.value).toBe('off')
    expect(undecided.value).toBe(false)
  })

  it('knows push is blocked in the browser', async () => {
    fakePushDevice({ permission: 'denied' })

    const { state } = await push()

    expect(state.value).toBe('blocked')
  })

  it('knows a browser without push', async () => {
    const { state } = await push()

    expect(state.value).toBe('unsupported')
  })

  it('asks an iPhone to add Coffeee to its Home Screen first', async () => {
    onDevice('iPhone')

    const { state } = await push()

    expect(state.value).toBe('needsInstall')
  })

  it('works in Coffeee installed on an iPhone', async () => {
    onDevice('iPhone')
    runInstalled()
    fakePushDevice()

    const { state } = await push()

    expect(state.value).toBe('off')
  })

  it('asks for permission and stores the subscription of this device', async () => {
    const device = fakePushDevice()
    const { state, turnOn } = await push()

    await turnOn()

    expect(device.requestPermission).toHaveBeenCalledOnce()
    expect(device.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    })
    expect(state.value).toBe('on')
    expect(await subscriptions()).toMatchObject([
      {
        endpoint: deviceEndpoint,
        p256dh: 'device-p256dh',
        auth: 'device-auth',
      },
    ])
  })

  it('subscribes nothing when permission is refused', async () => {
    const device = fakePushDevice({ answer: 'denied' })
    const { state, turnOn } = await push()

    await turnOn()

    expect(device.subscribe).not.toHaveBeenCalled()
    expect(state.value).toBe('blocked')
    expect(await subscriptions()).toEqual([])
  })

  it('removes the subscription of this device when turned off', async () => {
    const device = fakePushDevice()
    const { state, turnOn, turnOff } = await push()
    await turnOn()
    const subscription = device.subscription!

    await turnOff()

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(state.value).toBe('off')
    expect(await subscriptions()).toEqual([])
  })
})
