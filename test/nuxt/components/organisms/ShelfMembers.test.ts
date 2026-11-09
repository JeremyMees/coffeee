import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import ShelfMembers from '~/components/organisms/ShelfMembers.vue'
import { useCurrentUser } from '#imports'
import { shelf } from '#server/db/schemas'
import { listShelfMembers } from '#server/utils/shelves'
import type { Member } from '#test/support/types'
import { allByTestId, byTestId, click } from '../../fixtures'
import {
  database,
  failRequest,
  holdRequest,
  scenario,
  signIn,
} from '../../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await scenario.joinShelf(tom, sarah.shelf)
  await signIn(sarah)
})

function membersPath() {
  return `/api/shelves/${sarah.shelf.id}/members`
}

function openMembers() {
  return mountSuspended(ShelfMembers, {
    props: { shelfId: sarah.shelf.id },
    attachTo: document.body,
  })
}

async function mountMembers() {
  const wrapper = await openMembers()
  await vi.waitFor(() => expect(byTestId('shelf-members-skeleton')).toBeNull())

  return wrapper
}

function memberNames() {
  return allByTestId('shelf-member-name').map(name => name.textContent?.trim())
}

async function storedMembers() {
  const members = await listShelfMembers(await database(), sarah.shelf.id)

  return members.map(member => member.name)
}

async function storedOwner() {
  const db = await database()
  const [found] = await db
    .select({ ownerId: shelf.ownerId })
    .from(shelf)
    .where(eq(shelf.id, sarah.shelf.id))

  return found?.ownerId
}

describe('ShelfMembers', () => {
  it('lists the members and marks the shelf owner', async () => {
    await mountMembers()

    expect(memberNames()).toEqual(['Sarah (you)', 'Tom'])
    expect(allByTestId('shelf-member')[0]?.textContent).toContain('Owner')
    expect(allByTestId('shelf-member')[1]?.textContent).toContain(tom.email)
  })

  it('lets the shelf owner remove a member after confirming', async () => {
    await mountMembers()

    await click('shelf-member-remove')

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Remove Tom?',
    )

    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(memberNames()).toEqual(['Sarah (you)']))
    expect(await storedMembers()).toEqual(['Sarah'])
  })

  it('lets the shelf owner hand the shelf to a member', async () => {
    await mountMembers()

    await click('shelf-member-hand-over')

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Hand the shelf to Tom?',
    )

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(useCurrentUser().value?.shelves[0]?.ownerId).toBe(tom.id),
    )
    expect(await storedOwner()).toBe(tom.id)
    expect(byTestId('shelf-member-remove')).toBeNull()
  })

  it('shows why a change was refused', async () => {
    failRequest('DELETE', `/api/shelves/${sarah.shelf.id}/members/${tom.id}`, {
      status: 403,
      message: 'Only the shelf owner can do that',
    })
    await mountMembers()

    await click('shelf-member-remove')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'Only the shelf owner can do that',
      ),
    )
    expect(memberNames()).toEqual(['Sarah (you)', 'Tom'])
    expect(await storedMembers()).toEqual(['Sarah', 'Tom'])
  })

  it('gives other members no way to remove anyone or hand the shelf over', async () => {
    await signIn(tom)

    await mountMembers()

    expect(byTestId('shelf-member-remove')).toBeNull()
    expect(byTestId('shelf-member-hand-over')).toBeNull()
    expect(allByTestId('shelf-member')[0]?.textContent).toContain('Owner')
  })

  it('shows a skeleton while the members load', async () => {
    const hold = holdRequest('GET', membersPath())

    await openMembers()

    expect(byTestId('shelf-members-skeleton')).not.toBeNull()
    expect(byTestId('shelf-member')).toBeNull()

    hold.release()

    await vi.waitFor(() =>
      expect(memberNames()).toEqual(['Sarah (you)', 'Tom']),
    )
    expect(byTestId('shelf-members-skeleton')).toBeNull()
  })

  it('shows an error that can be retried', async () => {
    const lift = failRequest('GET', membersPath(), {
      status: 500,
      message: 'Nope',
    })

    await openMembers()
    await vi.waitFor(() =>
      expect(byTestId('shelf-members-error')).not.toBeNull(),
    )

    lift()
    await click('shelf-members-retry')

    await vi.waitFor(() =>
      expect(memberNames()).toEqual(['Sarah (you)', 'Tom']),
    )
    expect(byTestId('shelf-members-error')).toBeNull()
  })
})
