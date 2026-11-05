import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import ShelfLeave from '~/components/ShelfLeave.vue'
import { shelfPath, useCurrentUser } from '#imports'
import { shelf } from '#server/db/schemas'
import { listShelves } from '#server/utils/shelves'
import type { Member, ScenarioShelf } from '#test/support/types'
import { byTestId, click, currentPath, forgetLastShelf } from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  forgetLastShelf()
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
})

function mountLeave(on: { id: string; name: string }) {
  return mountSuspended(ShelfLeave, {
    props: { shelfId: on.id },
    route: `${shelfPath(on)}/settings`,
    attachTo: document.body,
  })
}

function isDisabled(testId: string) {
  return byTestId<HTMLButtonElement>(testId)!.disabled
}

async function storedShelves(member: Member) {
  const shelves = await listShelves(await database(), member.id)

  return shelves.map(found => found.id)
}

async function exists(on: ScenarioShelf) {
  const db = await database()
  const found = await db
    .select({ id: shelf.id })
    .from(shelf)
    .where(eq(shelf.id, on.id))

  return found.length > 0
}

async function sarahOwnsHomeWithTom() {
  const home = await scenario.shelf(sarah, 'Home')
  await scenario.joinShelf(tom, home)
  await signIn(sarah)

  return home
}

async function sarahJoinsTomsShelf() {
  await scenario.joinShelf(sarah, tom.shelf)
  await signIn(sarah)
}

describe('ShelfLeave', () => {
  it('makes the shelf owner hand the shelf over before leaving', async () => {
    const home = await sarahOwnsHomeWithTom()

    await mountLeave(home)

    expect(isDisabled('shelf-leave-button')).toBe(true)
    expect(byTestId('shelf-leave-hand-over')).not.toBeNull()
    expect(isDisabled('shelf-delete-button')).toBe(false)
  })

  it('lets the shelf owner delete the shelf for everyone', async () => {
    const home = await sarahOwnsHomeWithTom()
    await mountLeave(home)

    await click('shelf-delete-button')

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Delete Home?',
    )
    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      'The other member loses it too.',
    )

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(useCurrentUser().value?.shelves.map(found => found.id)).toEqual([
        sarah.shelf.id,
      ]),
    )
    expect(currentPath()).toBe(shelfPath(sarah.shelf))
    expect(await exists(home)).toBe(false)
  })

  it('warns the last member that leaving deletes the shelf', async () => {
    const home = await scenario.shelf(sarah, 'Home')
    await signIn(sarah)
    await mountLeave(home)

    await click('shelf-leave-button')

    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      "You're the last member, so leaving deletes the shelf.",
    )
    expect(byTestId('confirm-dialog-confirm')?.textContent).toContain(
      'Leave and delete',
    )
  })

  it('lets a member leave', async () => {
    await sarahJoinsTomsShelf()
    await mountLeave(tom.shelf)

    expect(byTestId('shelf-delete-button')).toBeNull()

    await click('shelf-leave-button')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(useCurrentUser().value?.shelves.map(found => found.id)).toEqual([
        sarah.shelf.id,
      ]),
    )
    expect(currentPath()).toBe(shelfPath(sarah.shelf))
    expect(await storedShelves(sarah)).toEqual([sarah.shelf.id])
  })

  it('keeps someone on their only shelf', async () => {
    await signIn(sarah)
    await mountLeave(sarah.shelf)

    expect(byTestId('shelf-leave-only')).not.toBeNull()
    expect(isDisabled('shelf-leave-button')).toBe(true)
    expect(isDisabled('shelf-delete-button')).toBe(true)
  })

  it('shows why leaving was refused', async () => {
    await sarahJoinsTomsShelf()
    failRequest('POST', `/api/shelves/${tom.shelf.id}/leave`, {
      status: 409,
      message: "This is your only shelf, so you can't leave it",
    })
    await mountLeave(tom.shelf)

    await click('shelf-leave-button')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        "This is your only shelf, so you can't leave it",
      ),
    )
    expect(useCurrentUser().value?.shelves).toHaveLength(2)
    expect(await storedShelves(sarah)).toEqual([sarah.shelf.id, tom.shelf.id])
  })
})
