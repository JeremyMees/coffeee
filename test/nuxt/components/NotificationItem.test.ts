import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import NotificationItem from '~/components/NotificationItem.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { inviteNotification, notifications } from '#test/fixtures/notifications'
import { byTestId, click, currentPath } from '../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

function mountItem(notification: ShelfNotification) {
  return mountSuspended(NotificationItem, {
    props: { notification },
    attachTo: document.body,
  })
}

describe('NotificationItem', () => {
  it('links to what happened, with no actions', async () => {
    await mountItem(notifications()[0]!)

    expect(byTestId('notification-text')?.textContent).toContain(
      "Tom added Ayele Fulasa to Sarah's shelf",
    )
    expect(byTestId('notification-link')?.getAttribute('href')).toBe(
      '/shelves/sarahs-shelf-home/coffees/ayele-fulasa-c1',
    )
    expect(byTestId('notification-actions')).toBeNull()
  })

  it('joins the shelf from an invite and opens it', async () => {
    api.notifications = [inviteNotification()]
    await mountItem(inviteNotification())

    expect(byTestId('notification-link')?.hasAttribute('href')).toBe(false)
    expect(byTestId('notification-accept')?.textContent).toContain(
      'Join Office',
    )

    await click('notification-accept')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/office-office'))
    expect(api.inviteCalls).toEqual([{ accept: 'mi1' }])
    expect(useCurrentUser().value?.shelves).toContainEqual({
      id: 'office',
      name: 'Office',
      ownerId: 'tom',
    })
  })

  it('declines an invite', async () => {
    api.notifications = [inviteNotification()]
    await mountItem(inviteNotification())

    await click('notification-decline')

    await vi.waitFor(() =>
      expect(api.inviteCalls).toEqual([{ decline: 'mi1' }]),
    )
    expect(api.notifications).toEqual([])
  })

  it('shows why answering failed', async () => {
    api.inviteFails = 'Invite not found'
    await mountItem(inviteNotification())

    await click('notification-accept')

    await vi.waitFor(() =>
      expect(byTestId('notification-error')?.textContent).toContain(
        'Invite not found',
      ),
    )
  })

  it.each([
    ['accepted', 'You joined'],
    ['expired', 'Invite expired'],
  ] as const)('says when an invite was %s', async (inviteStatus, text) => {
    await mountItem(inviteNotification({ inviteStatus }))

    expect(byTestId('notification-actions')).toBeNull()
    expect(byTestId('notification-answered')?.textContent).toContain(text)
  })
})
