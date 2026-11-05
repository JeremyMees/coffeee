import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import NotificationsLink from '~/components/NotificationsLink.vue'
import type { Member } from '#test/support/types'
import { tid } from '../fixtures'
import { scenario, signIn } from '../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await scenario.joinShelf(tom, sarah.shelf)
  await scenario.readNotifications(sarah)
  await signIn(sarah)
})

describe('NotificationsLink', () => {
  it('links to the notifications with the unread count', async () => {
    const ayele = await scenario.coffee(sarah.shelf, {}, tom)
    await scenario.bag(sarah.shelf, ayele.id, {}, tom)

    const link = await mountSuspended(NotificationsLink)

    await vi.waitFor(() =>
      expect(link.find(tid('notifications-unread')).text()).toBe('2'),
    )
    expect(link.get(tid('notifications-link')).attributes()).toMatchObject({
      href: '/notifications',
      'aria-label': 'Notifications, 2 unread',
    })
  })

  it('shows no count when everything is read', async () => {
    const link = await mountSuspended(NotificationsLink, {
      props: { labelled: true },
    })

    await vi.waitFor(() =>
      expect(link.get(tid('notifications-link')).text()).toBe('Notifications'),
    )
    expect(link.find(tid('notifications-unread')).exists()).toBe(false)
  })

  it('caps a big count', async () => {
    const ayele = await scenario.coffee(sarah.shelf, {}, tom)
    for (let bag = 0; bag < 100; bag++) {
      await scenario.bag(sarah.shelf, ayele.id, {}, tom)
    }

    const link = await mountSuspended(NotificationsLink, {
      props: { labelled: true },
    })

    await vi.waitFor(() =>
      expect(link.find(tid('notifications-unread')).text()).toContain('99+'),
    )
  })
})
