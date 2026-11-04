import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { inviteNotification, notifications } from '#test/fixtures/notifications'
import { currentPath, tid } from '../fixtures'
import { testUser } from '#test/fixtures/users'

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
    expect(
      rows.map(row => row.get(tid('notification-link')).attributes('href')),
    ).toEqual([
      '/shelves/home/coffees/c1',
      '/shelves/home/settings?tab=members',
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

  it('answers an invite right in the list', async () => {
    api.notifications = [inviteNotification(), ...notifications()]

    const page = await mountSuspended(App, { route: '/notifications' })

    expect(page.get(tid('notification-text')).text()).toContain(
      'Tom invited you to Office',
    )

    await page.get(tid('notification-accept')).trigger('click')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/office'))
    expect(api.inviteCalls).toEqual([{ accept: 'mi1' }])
  })

  it('shows no invite banner on other pages', async () => {
    api.notifications = [inviteNotification()]

    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.find('[data-testid^="invite-for-you"]').exists()).toBe(false)
    expect(page.find(tid('notification-accept')).exists()).toBe(false)
  })
})
