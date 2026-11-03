import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import NotificationsLink from '~/components/NotificationsLink.vue'
import { api, fakeApi, notifications, resetApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

beforeEach(resetApi)

describe('NotificationsLink', () => {
  it('links to the notifications with the unread count', async () => {
    api.notifications = [
      ...notifications(),
      { ...notifications()[0]!, id: 'n3' },
    ]

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
    api.notifications = Array.from({ length: 120 }, (_, index) => ({
      ...notifications()[0]!,
      id: `n${index}`,
    }))

    const link = await mountSuspended(NotificationsLink, {
      props: { labelled: true },
    })

    await vi.waitFor(() =>
      expect(link.find(tid('notifications-unread')).text()).toContain('99+'),
    )
  })
})
