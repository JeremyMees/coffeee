import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, notifications, resetApi } from '../fake-api'
import { testUser, tid } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

describe('the notifications page', () => {
  it('lists what happened, newest first, with links and unread ones marked', async () => {
    api.notifications = notifications()

    const page = await mountSuspended(App, { route: '/notifications' })

    const rows = page.findAll(tid('notification'))
    expect(page.get(tid('page-title')).text()).toBe('Notifications')
    expect(rows.map(row => row.get(tid('notification-text')).text())).toEqual([
      "New: Tom added Ayele Fulasa to Sarah's shelf",
      "Tom joined Sarah's shelf",
    ])
    expect(rows.map(row => row.attributes('href'))).toEqual([
      '/shelves/home/coffees/c1',
      '/shelves/home/settings',
    ])
    expect(rows[0]?.attributes('data-unread')).toBe('true')
  })

  it('marks everything read when opened', async () => {
    api.notifications = notifications()

    const page = await mountSuspended(App, { route: '/notifications' })

    await vi.waitFor(() => expect(api.notificationCalls).toEqual(['read']))
    await vi.waitFor(() =>
      expect(page.find(tid('notifications-unread')).exists()).toBe(false),
    )
  })

  it('does not mark anything when nothing is unread', async () => {
    const page = await mountSuspended(App, { route: '/notifications' })

    expect(page.get(tid('notifications-empty')).text()).toContain(
      'Nothing yet.',
    )
    expect(api.notificationCalls).toEqual([])
  })
})
