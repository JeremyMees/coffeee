import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileNotificationEmails from '~/components/organisms/ProfileNotificationEmails.vue'
import { listEmailedKinds } from '#server/utils/notifications'
import type { Member } from '#test/support/types'
import { tid } from '../../fixtures'
import {
  database,
  failRequest,
  holdRequest,
  scenario,
  signIn,
} from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

const emailsPath = '/api/me/notifications/emails'

function open() {
  return mountSuspended(ProfileNotificationEmails)
}

async function mount() {
  const wrapper = await open()
  await vi.waitFor(() =>
    expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(true),
  )

  return wrapper
}

function checked(wrapper: Awaited<ReturnType<typeof mount>>, kind: string) {
  return (
    wrapper
      .get(tid(`notification-email-${kind}`))
      .attributes('aria-checked') === 'true'
  )
}

async function stored() {
  return (await listEmailedKinds(await database(), sarah.id)).toSorted()
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
      expect(wrapper.get(tid('notification-email-error')).text()).toBe(
        'Your settings are out of reach',
      ),
    )
    expect(checked(wrapper, 'bagFinished')).toBe(false)
    expect(await stored()).toEqual([])
  })

  it('shows its heading and a skeleton while the settings load', async () => {
    const hold = holdRequest('GET', emailsPath)

    const wrapper = await open()

    expect(wrapper.get('h2').text()).toBe('Email')
    expect(
      wrapper.find(tid('profile-notification-emails-skeleton')).exists(),
    ).toBe(true)
    expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(
        true,
      ),
    )
    expect(
      wrapper.find(tid('profile-notification-emails-skeleton')).exists(),
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
        wrapper.find(tid('profile-notification-emails-error')).exists(),
      ).toBe(true),
    )

    lift()
    await wrapper.get(tid('profile-notification-emails-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find(tid('notification-email-invited')).exists()).toBe(
        true,
      ),
    )
  })
})
