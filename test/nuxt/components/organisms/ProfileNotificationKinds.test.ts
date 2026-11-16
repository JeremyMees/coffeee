import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileNotificationKinds from '~/components/organisms/ProfileNotificationKinds.vue'
import { listEmailedKinds, listPushedKinds } from '#server/utils/notifications'
import type { Member } from '#test/support/types'
import { fakePushDevice, forgetPushDevice, tid } from '../../fixtures'
import {
  database,
  failRequest,
  holdRequest,
  scenario,
  signIn,
} from '../../server'

let sarah: Member

const everyKind = [
  'invited',
  'coffeeAdded',
  'purchaseAdded',
  'bagFinished',
  'memberJoined',
  'memberLeft',
] as const

beforeEach(async () => {
  forgetPushDevice()
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

afterEach(() => {
  forgetPushDevice()
})

const emailsPath = '/api/me/notifications/emails'
const pushesPath = '/api/me/notifications/pushes'

function open() {
  return mountSuspended(ProfileNotificationKinds)
}

async function mount() {
  const wrapper = await open()
  await vi.waitFor(() =>
    expect(wrapper.find(tid('notification-push-invited')).exists()).toBe(true),
  )

  return wrapper
}

function checked(
  wrapper: Awaited<ReturnType<typeof mount>>,
  kind: string,
  channel = 'email',
) {
  return (
    wrapper
      .get(tid(`notification-${channel}-${kind}`))
      .attributes('aria-checked') === 'true'
  )
}

async function stored() {
  return (await listEmailedKinds(await database(), sarah.id)).toSorted()
}

async function storedPushes() {
  return (await listPushedKinds(await database(), sarah.id)).toSorted()
}

describe('ProfileNotificationKinds', () => {
  it('has email off for everything but invites to begin with', async () => {
    const wrapper = await mount()

    expect(checked(wrapper, 'invited')).toBe(true)
    for (const kind of [
      'coffeeAdded',
      'purchaseAdded',
      'bagFinished',
      'memberJoined',
      'memberLeft',
    ]) {
      expect(checked(wrapper, kind)).toBe(false)
    }
  })

  it("won't let invites be switched off", async () => {
    const wrapper = await mount()
    const invites = wrapper.get(tid('notification-email-invited'))

    await invites.trigger('click')

    expect(invites.attributes('disabled')).toBeDefined()
    expect(checked(wrapper, 'invited')).toBe(true)
    expect(await stored()).toEqual([])
  })

  it('shows what was switched on before', async () => {
    await scenario.emailed(sarah, ['bagFinished'])

    const wrapper = await mount()

    expect(checked(wrapper, 'bagFinished')).toBe(true)
    expect(checked(wrapper, 'coffeeAdded')).toBe(false)
  })

  it('switches email on for one kind, keeping the others', async () => {
    await scenario.emailed(sarah, ['memberLeft'])
    const wrapper = await mount()

    await wrapper.get(tid('notification-email-coffeeAdded')).trigger('click')

    await vi.waitFor(() => expect(checked(wrapper, 'coffeeAdded')).toBe(true))
    expect(await stored()).toEqual(['coffeeAdded', 'memberLeft'])
  })

  it('switches email off again', async () => {
    await scenario.emailed(sarah, ['coffeeAdded', 'memberLeft'])
    const wrapper = await mount()

    await wrapper.get(tid('notification-email-coffeeAdded')).trigger('click')

    await vi.waitFor(() => expect(checked(wrapper, 'coffeeAdded')).toBe(false))
    expect(await stored()).toEqual(['memberLeft'])
  })

  it('says when the change could not be saved', async () => {
    failRequest('PUT', '/api/me/notifications/emails', {
      status: 500,
      message: 'Your settings are out of reach',
    })
    const wrapper = await mount()

    await wrapper.get(tid('notification-email-bagFinished')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.get(tid('notification-kinds-error')).text()).toBe(
        'Your settings are out of reach',
      ),
    )
    expect(checked(wrapper, 'bagFinished')).toBe(false)
    expect(await stored()).toEqual([])
  })

  it('shows its heading and a skeleton while the settings load', async () => {
    const hold = holdRequest('GET', emailsPath)

    const wrapper = await open()

    expect(wrapper.get('h2').text()).toBe('Email and push')
    expect(
      wrapper.find(tid('profile-notification-kinds-skeleton')).exists(),
    ).toBe(true)
    expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(
        true,
      ),
    )
    expect(
      wrapper.find(tid('profile-notification-kinds-skeleton')).exists(),
    ).toBe(false)
  })

  it('shows an error that can be retried', async () => {
    const lift = failRequest('GET', emailsPath, {
      status: 500,
      message: 'Nope',
    })

    const wrapper = await open()
    await vi.waitFor(() =>
      expect(
        wrapper.find(tid('profile-notification-kinds-error')).exists(),
      ).toBe(true),
    )

    lift()
    await wrapper.get(tid('profile-notification-kinds-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(
        true,
      ),
    )
  })

  it('pushes every kind to begin with', async () => {
    const wrapper = await mount()

    for (const kind of everyKind) {
      expect(checked(wrapper, kind, 'push')).toBe(true)
    }
  })

  it('switches push off for one kind, keeping email as it was', async () => {
    await scenario.emailed(sarah, ['coffeeAdded'])
    const wrapper = await mount()

    await wrapper.get(tid('notification-push-coffeeAdded')).trigger('click')

    await vi.waitFor(() =>
      expect(checked(wrapper, 'coffeeAdded', 'push')).toBe(false),
    )
    expect(checked(wrapper, 'coffeeAdded')).toBe(true)
    expect(await storedPushes()).toEqual(
      everyKind.filter(kind => kind !== 'coffeeAdded').toSorted(),
    )
    expect(await stored()).toEqual(['coffeeAdded'])
  })

  it('lets invites be switched off as a push', async () => {
    const wrapper = await mount()

    await wrapper.get(tid('notification-push-invited')).trigger('click')

    await vi.waitFor(() =>
      expect(checked(wrapper, 'invited', 'push')).toBe(false),
    )
    expect(checked(wrapper, 'invited')).toBe(true)
    expect(await storedPushes()).not.toContain('invited')
  })

  it('shows the kinds switched off before and switches one on again', async () => {
    await scenario.pushed(sarah, ['invited'])
    const wrapper = await mount()

    expect(checked(wrapper, 'invited', 'push')).toBe(true)
    expect(checked(wrapper, 'memberJoined', 'push')).toBe(false)

    await wrapper.get(tid('notification-push-memberJoined')).trigger('click')

    await vi.waitFor(() =>
      expect(checked(wrapper, 'memberJoined', 'push')).toBe(true),
    )
    expect(await storedPushes()).toEqual(['invited', 'memberJoined'])
  })

  it('says when a push choice could not be saved', async () => {
    failRequest('PUT', pushesPath, {
      status: 500,
      message: 'Your settings are out of reach',
    })
    const wrapper = await mount()

    await wrapper.get(tid('notification-push-bagFinished')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.get(tid('notification-kinds-error')).text()).toBe(
        'Your settings are out of reach',
      ),
    )
    expect(checked(wrapper, 'bagFinished', 'push')).toBe(true)
    expect(await storedPushes()).toEqual(everyKind.toSorted())
  })

  it('says when push is not turned on for this device', async () => {
    fakePushDevice({ permission: 'default' })

    const wrapper = await mount()
    await flushPromises()

    expect(wrapper.find(tid('notification-push-device-off')).exists()).toBe(
      true,
    )
  })

  it('turns on push here from the notice', async () => {
    const device = fakePushDevice({ permission: 'default', answer: 'granted' })
    const wrapper = await mount()
    await flushPromises()

    await wrapper.get(tid('notification-push-turn-on')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find(tid('notification-push-device-off')).exists()).toBe(
        false,
      ),
    )
    expect(device.subscribe).toHaveBeenCalledOnce()
  })

  it('says so when push cannot be turned on here', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fakePushDevice({ permission: 'default', answer: 'granted' })
    failRequest('PUT', '/api/me/push/subscription', {
      status: 500,
      message: 'Server error',
    })
    const wrapper = await mount()
    await flushPromises()

    await wrapper.get(tid('notification-push-turn-on')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.get(tid('notification-kinds-error')).text()).toBe(
        "Push couldn't be turned on. Try again.",
      ),
    )
    vi.restoreAllMocks()
  })

  it('offers no button where push is blocked', async () => {
    fakePushDevice({ permission: 'denied' })
    const wrapper = await mount()
    await flushPromises()

    expect(wrapper.find(tid('notification-push-device-off')).exists()).toBe(
      true,
    )
    expect(wrapper.find(tid('notification-push-turn-on')).exists()).toBe(false)
  })

  it('says nothing about the device once push is on here', async () => {
    fakePushDevice({ permission: 'granted', subscribed: true })

    const wrapper = await mount()
    await flushPromises()

    expect(wrapper.find(tid('notification-push-device-off')).exists()).toBe(
      false,
    )
  })

  it('keeps the email switches when the push choices fail to load', async () => {
    const lift = failRequest('GET', pushesPath, {
      status: 500,
      message: 'Nope',
    })
    await scenario.emailed(sarah, ['bagFinished'])

    const wrapper = await open()
    await vi.waitFor(() =>
      expect(
        wrapper.find(tid('profile-notification-pushes-error')).exists(),
      ).toBe(true),
    )

    expect(checked(wrapper, 'bagFinished')).toBe(true)
    expect(wrapper.find(tid('notification-push-bagFinished')).exists()).toBe(
      false,
    )

    await wrapper.get(tid('notification-email-coffeeAdded')).trigger('click')
    await vi.waitFor(() => expect(checked(wrapper, 'coffeeAdded')).toBe(true))
    expect(await stored()).toEqual(['bagFinished', 'coffeeAdded'])

    lift()
    await wrapper.get(tid('profile-notification-pushes-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(checked(wrapper, 'bagFinished', 'push')).toBe(true),
    )
    expect(
      wrapper.find(tid('profile-notification-pushes-error')).exists(),
    ).toBe(false)
  })

  it('shows the email switches while the push choices load', async () => {
    const hold = holdRequest('GET', pushesPath)

    const wrapper = await open()
    await vi.waitFor(() =>
      expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(
        true,
      ),
    )

    expect(
      wrapper.find(tid('notification-push-invited-pending')).exists(),
    ).toBe(true)

    hold.release()

    await vi.waitFor(() =>
      expect(checked(wrapper, 'invited', 'push')).toBe(true),
    )
  })
})
