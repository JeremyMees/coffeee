import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileNotificationEmails from '~/components/ProfileNotificationEmails.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

beforeEach(resetApi)

function mount() {
  return mountSuspended(ProfileNotificationEmails)
}

function checked(wrapper: Awaited<ReturnType<typeof mount>>, kind: string) {
  return (
    wrapper
      .get(tid(`notification-email-${kind}`))
      .attributes('aria-checked') === 'true'
  )
}

describe('ProfileNotificationEmails', () => {
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
    expect(api.notificationCalls).toEqual([])
  })

  it('shows what was switched on before', async () => {
    api.notificationEmails = ['bagFinished']

    const wrapper = await mount()

    expect(checked(wrapper, 'bagFinished')).toBe(true)
    expect(checked(wrapper, 'coffeeAdded')).toBe(false)
  })

  it('switches email on for one kind, keeping the others', async () => {
    api.notificationEmails = ['memberLeft']
    const wrapper = await mount()

    await wrapper.get(tid('notification-email-coffeeAdded')).trigger('click')

    await vi.waitFor(() => expect(checked(wrapper, 'coffeeAdded')).toBe(true))
    expect(api.notificationCalls).toEqual([
      { emails: { emailed: ['memberLeft', 'coffeeAdded'] } },
    ])
  })

  it('switches email off again', async () => {
    api.notificationEmails = ['coffeeAdded', 'memberLeft']
    const wrapper = await mount()

    await wrapper.get(tid('notification-email-coffeeAdded')).trigger('click')

    await vi.waitFor(() => expect(checked(wrapper, 'coffeeAdded')).toBe(false))
    expect(api.notificationCalls).toEqual([
      { emails: { emailed: ['memberLeft'] } },
    ])
  })

  it('says when the change could not be saved', async () => {
    api.notificationEmailsFail = true
    const wrapper = await mount()

    await wrapper.get(tid('notification-email-bagFinished')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.get(tid('notification-email-error')).text()).toBe(
        'Your settings are out of reach',
      ),
    )
    expect(checked(wrapper, 'bagFinished')).toBe(false)
  })
})
