import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { shelfCoffeePath, shelfPath } from '#imports'
import { countUnreadNotifications } from '#server/utils/notifications'
import { listShelfMembers } from '#server/utils/shelves'
import type { Member } from '#test/support/types'
import { currentPath, tid } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await signIn(sarah)
})

async function tomJoinsAndAddsACoffee() {
  await scenario.joinShelf(tom, sarah.shelf)
  await scenario.readNotifications(sarah)

  return scenario.coffee(sarah.shelf, {}, tom)
}

describe('the notifications page', () => {
  it('lists what happened, newest first, with links and unread ones marked', async () => {
    const ayele = await tomJoinsAndAddsACoffee()

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
      shelfCoffeePath(sarah.shelf, ayele),
      `${shelfPath(sarah.shelf)}/settings?tab=members`,
    ])
    expect(rows[0]?.attributes('data-unread')).toBe('true')
    expect(rows[1]?.attributes('data-unread')).toBeUndefined()
  })

  it('marks everything read when opened', async () => {
    await tomJoinsAndAddsACoffee()

    const page = await mountSuspended(App, { route: '/notifications' })

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
    const page = await mountSuspended(App, { route: '/notifications' })

    expect(page.get(tid('notifications-empty')).text()).toContain(
      'Nothing yet.',
    )
  })

  it('answers an invite right in the list', async () => {
    const office = await scenario.shelf(tom, 'Office')
    await scenario.inviteNotice(sarah, office)

    const page = await mountSuspended(App, { route: '/notifications' })

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
})
