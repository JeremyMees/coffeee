import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfLeave from '~/components/ShelfLeave.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { byTestId, click, currentPath, forgetLastShelf } from '../fixtures'
import { shelfMembers } from '#test/fixtures/shelves'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

function mountLeave() {
  return mountSuspended(ShelfLeave, {
    props: { shelfId: 'home' },
    attachTo: document.body,
  })
}

function isDisabled(testId: string) {
  return byTestId<HTMLButtonElement>(testId)!.disabled
}

function joinTomsShelf() {
  useCurrentUser().value = testUser({
    shelves: [
      { id: 'mine', name: "Sarah's shelf", ownerId: 'user-1' },
      { id: 'home', name: 'Home', ownerId: 'tom' },
    ],
  })
}

describe('ShelfLeave', () => {
  it('makes the shelf owner hand the shelf over before leaving', async () => {
    await mountLeave()

    expect(isDisabled('shelf-leave-button')).toBe(true)
    expect(byTestId('shelf-leave-hand-over')).not.toBeNull()
    expect(isDisabled('shelf-delete-button')).toBe(false)
  })

  it('lets the shelf owner delete the shelf for everyone', async () => {
    await mountLeave()

    await click('shelf-delete-button')

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      "Delete Sarah's shelf?",
    )
    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      'The other member loses it too.',
    )

    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/work-work'))
    expect(api.shelfCalls).toEqual([{ delete: 'home' }])
    expect(useCurrentUser().value?.shelves.map(shelf => shelf.id)).toEqual([
      'work',
    ])
  })

  it('warns the last member that leaving deletes the shelf', async () => {
    api.shelfMembers = shelfMembers().slice(0, 1)
    await mountLeave()

    await click('shelf-leave-button')

    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      "You're the last member, so leaving deletes the shelf.",
    )
    expect(byTestId('confirm-dialog-confirm')?.textContent).toContain(
      'Leave and delete',
    )
  })

  it('lets a member leave', async () => {
    joinTomsShelf()
    await mountLeave()

    expect(byTestId('shelf-delete-button')).toBeNull()

    await click('shelf-leave-button')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(currentPath()).toBe('/shelves/sarahs-shelf-mine'),
    )
    expect(api.shelfCalls).toEqual([{ leave: 'home' }])
    expect(useCurrentUser().value?.shelves.map(shelf => shelf.id)).toEqual([
      'mine',
    ])
  })

  it('keeps someone on their only shelf', async () => {
    useCurrentUser().value = testUser({
      shelves: [{ id: 'home', name: 'Home', ownerId: 'user-1' }],
    })
    api.shelfMembers = shelfMembers().slice(0, 1)
    await mountLeave()

    expect(byTestId('shelf-leave-only')).not.toBeNull()
    expect(isDisabled('shelf-leave-button')).toBe(true)
    expect(isDisabled('shelf-delete-button')).toBe(true)
  })

  it('shows why leaving was refused', async () => {
    joinTomsShelf()
    api.shelfFails = "This is your only shelf, so you can't leave it"
    await mountLeave()

    await click('shelf-leave-button')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        "This is your only shelf, so you can't leave it",
      ),
    )
    expect(useCurrentUser().value?.shelves).toHaveLength(2)
  })
})
