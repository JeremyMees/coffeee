import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import NotificationItem from '~/components/molecules/NotificationItem.vue'
import { shelfCoffeePath, shelfPath, useCurrentUser } from '#imports'
import { invite } from '#server/db/schemas'
import { listShelfMembers } from '#server/utils/shelves'
import type { Member } from '#test/support/types'
import { byTestId, click, currentPath } from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

let sarah: Member
let tom: Member
let office: Awaited<ReturnType<typeof scenario.shelf>>

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  office = await scenario.shelf(tom, 'Office')
  await signIn(sarah)
})

async function newest() {
  const [found] = await $fetch<ShelfNotification[]>('/api/me/notifications')

  return found!
}

async function mountNewest() {
  return mountSuspended(NotificationItem, {
    props: { notification: await newest() },
    attachTo: document.body,
  })
}

async function invited() {
  return scenario.inviteNotice(sarah, office)
}

async function storedInvite(inviteId: string) {
  const db = await database()

  return db
    .select({ id: invite.id })
    .from(invite)
    .where(eq(invite.id, inviteId))
}

describe('NotificationItem', () => {
  it('links to what happened, with no actions', async () => {
    await scenario.joinShelf(tom, sarah.shelf)
    const ayele = await scenario.coffee(sarah.shelf, {}, tom)

    await mountNewest()

    expect(byTestId('notification-text')?.textContent).toContain(
      "Tom added Ayele Fulasa to Sarah's shelf",
    )
    expect(byTestId('notification-link')?.getAttribute('href')).toBe(
      shelfCoffeePath(sarah.shelf, ayele),
    )
    expect(byTestId('notification-actions')).toBeNull()
  })

  it('joins the shelf from an invite and opens it', async () => {
    await invited()
    await mountNewest()

    expect(byTestId('notification-link')?.hasAttribute('href')).toBe(false)
    expect(byTestId('notification-accept')?.textContent).toContain(
      'Join Office',
    )

    await click('notification-accept')

    await vi.waitFor(() => expect(currentPath()).toBe(shelfPath(office)))
    expect(
      (await listShelfMembers(await database(), office.id)).map(
        member => member.name,
      ),
    ).toEqual(['Tom', 'Sarah'])
    expect(useCurrentUser().value?.shelves).toContainEqual({
      id: office.id,
      name: 'Office',
      ownerId: tom.id,
    })
  })

  it('declines an invite', async () => {
    const sent = await invited()
    await mountNewest()

    await click('notification-decline')

    await vi.waitFor(async () =>
      expect(await storedInvite(sent.id)).toEqual([]),
    )
    expect(
      (await listShelfMembers(await database(), office.id)).map(
        member => member.name,
      ),
    ).toEqual(['Tom'])
  })

  it('shows why answering failed', async () => {
    const sent = await invited()
    failRequest('POST', `/api/me/invites/${sent.id}/accept`, {
      status: 404,
      message: 'Invite not found',
    })
    await mountNewest()

    await click('notification-accept')

    await vi.waitFor(() =>
      expect(byTestId('notification-error')?.textContent).toContain(
        'Invite not found',
      ),
    )
    expect(currentPath()).not.toBe(shelfPath(office))
  })

  it('says when an invite was accepted', async () => {
    const sent = await invited()
    await scenario.acceptInvite(sarah, sent.token)

    await mountNewest()

    expect(byTestId('notification-actions')).toBeNull()
    expect(byTestId('notification-answered')?.textContent).toContain(
      'You joined',
    )
  })

  it('says when an invite expired', async () => {
    const sent = await invited()
    await scenario.expireInvite(sent.id)

    await mountNewest()

    expect(byTestId('notification-actions')).toBeNull()
    expect(byTestId('notification-answered')?.textContent).toContain(
      'Invite expired',
    )
  })
})
