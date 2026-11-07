import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileNotificationEmails from '~/components/organisms/ProfileNotificationEmails.vue'
import { listEmailedKinds } from '#server/utils/notifications'
import type { Member } from '#test/support/types'
import { tid } from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

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
})
