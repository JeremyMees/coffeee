import { onlineManager } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { shelfCoffeePath, shelfPath } from '#imports'
import { countUnreadNotifications } from '#server/utils/notifications'
import { listShelfMembers } from '#server/utils/shelves'
import type { Member } from '#test/support/types'
import { currentPath, tid } from '../fixtures'
import { database, failRequest, holdRequest, scenario, signIn } from '../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await signIn(sarah)
})

afterEach(() => onlineManager.setOnline(true))

const listPath = '/api/me/notifications'

function mount() {
  return mountSuspended(App, { route: '/notifications' })
}

async function notifications() {
  const page = await mount()
  await vi.waitFor(() => {
    expect(page.find(tid('notifications-skeleton')).exists()).toBe(false)
    expect(
      page
        .find(`${tid('notification')}, ${tid('notifications-empty')}`)
        .exists(),
    ).toBe(true)
  })

  return page
}

async function tomJoinsAndAddsACoffee() {
  await scenario.joinShelf(tom, sarah.shelf)
  await scenario.readNotifications(sarah)

  return scenario.coffee(sarah.shelf, {}, tom)
}

describe('the notifications page', () => {
  it('lists what happened, newest first, with links and unread ones marked', async () => {
    const ayele = await tomJoinsAndAddsACoffee()

    const page = await notifications()

    const rows = page.findAll(tid('notification'))
    expect(page.get(tid('page-title')).text()).toBe('Notifications')
    expect(rows.map(row => row.get(tid('notification-text')).text())).toEqual([
      "New: Tom added Ayele Fulasa to Sarah's shelf",
      "Tom joined Sarah's shelf",
    ])
    expect(
      rows.map(row => row.get(tid('notification-link')).attributes('href')),
    ).toEqual([
      shelfCoffeePath(sarah.shelf, ayele),
      `${shelfPath(sarah.shelf)}/settings?tab=members`,
    ])
    expect(rows[0]?.attributes('data-unread')).toBe('true')
    expect(rows[1]?.attributes('data-unread')).toBeUndefined()
  })

  it('marks everything read when opened', async () => {
    await tomJoinsAndAddsACoffee()

    const page = await notifications()

    await vi.waitFor(async () =>
      expect(await countUnreadNotifications(await database(), sarah.id)).toBe(
        0,
      ),
    )
    await vi.waitFor(() =>
      expect(page.find(tid('notifications-unread')).exists()).toBe(false),
    )
  })

  it('says when nothing happened yet', async () => {
    const page = await notifications()

    expect(page.get(tid('notifications-empty')).text()).toContain(
      'Nothing yet.',
    )
  })

  it('answers an invite right in the list', async () => {
    const office = await scenario.shelf(tom, 'Office')
    await scenario.inviteNotice(sarah, office)

    const page = await notifications()

    expect(page.get(tid('notification-text')).text()).toContain(
      'Tom invited you to Office',
    )

    await page.get(tid('notification-accept')).trigger('click')

    await vi.waitFor(() => expect(currentPath()).toBe(shelfPath(office)))
    expect(
      (await listShelfMembers(await database(), office.id)).map(
        member => member.id,
      ),
    ).toContain(sarah.id)
  })

  it('shows no invite banner on other pages', async () => {
    const office = await scenario.shelf(tom, 'Office')
    await scenario.inviteNotice(sarah, office)

    const page = await mountSuspended(App, { route: '/profile' })

    expect(page.find('[data-testid^="invite-for-you"]').exists()).toBe(false)
    expect(page.find(tid('notification-accept')).exists()).toBe(false)
  })
  it('shows the page and a skeleton while the notifications load', async () => {
    await tomJoinsAndAddsACoffee()
    const hold = holdRequest('GET', listPath)

    const page = await mount()

    expect(page.get(tid('page-title')).text()).toBe('Notifications')
    expect(page.find(tid('notifications-skeleton')).exists()).toBe(true)
    expect(page.find(tid('notifications')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(page.findAll(tid('notification'))).toHaveLength(2),
    )
    expect(page.find(tid('notifications-skeleton')).exists()).toBe(false)
    await vi.waitFor(async () =>
      expect(await countUnreadNotifications(await database(), sarah.id)).toBe(
        0,
      ),
    )
  })

  it('shows an error with a retry when the notifications fail to load', async () => {
    await tomJoinsAndAddsACoffee()
    const lift = failRequest('GET', listPath, { status: 500, message: 'Nope' })

    const page = await mount()

    await vi.waitFor(() =>
      expect(page.find(tid('notifications-error')).exists()).toBe(true),
    )
    expect(page.find(tid('notifications-skeleton')).exists()).toBe(false)

    lift()
    await page.get(tid('notifications-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(page.findAll(tid('notification'))).toHaveLength(2),
    )
    expect(page.find(tid('notifications-error')).exists()).toBe(false)
  })

  it('says it is offline instead of showing a skeleton forever', async () => {
    onlineManager.setOnline(false)

    const page = await mount()

    expect(page.find(tid('notifications-offline')).exists()).toBe(true)
    expect(page.find(tid('notifications-skeleton')).exists()).toBe(false)

    onlineManager.setOnline(true)
    await page.get(tid('notifications-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(page.find(tid('notifications-empty')).exists()).toBe(true),
    )
  })
})
