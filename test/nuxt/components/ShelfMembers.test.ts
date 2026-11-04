import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfMembers from '~/components/ShelfMembers.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { allByTestId, byTestId, click } from '../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

function mountMembers() {
  return mountSuspended(ShelfMembers, {
    props: { shelfId: 'home' },
    attachTo: document.body,
  })
}

function memberNames() {
  return allByTestId('shelf-member-name').map(name => name.textContent?.trim())
}

function joinTomsShelf() {
  useCurrentUser().value = testUser({
    shelves: [{ id: 'home', name: 'Home', ownerId: 'tom' }],
  })
}

describe('ShelfMembers', () => {
  it('lists the members and marks the shelf owner', async () => {
    await mountMembers()

    expect(memberNames()).toEqual(['Sarah (you)', 'Tom'])
    expect(allByTestId('shelf-member')[0]?.textContent).toContain('Owner')
    expect(allByTestId('shelf-member')[1]?.textContent).toContain(
      'tom@example.com',
    )
  })

  it('lets the shelf owner remove a member after confirming', async () => {
    await mountMembers()

    await click('shelf-member-remove')

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Remove Tom?',
    )

    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(memberNames()).toEqual(['Sarah (you)']))
    expect(api.shelfCalls).toEqual([{ remove: 'tom' }])
  })

  it('lets the shelf owner hand the shelf to a member', async () => {
    await mountMembers()

    await click('shelf-member-hand-over')

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Hand the shelf to Tom?',
    )

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(useCurrentUser().value?.shelves[0]?.ownerId).toBe('tom'),
    )
    expect(api.shelfCalls).toEqual([{ handOver: { ownerId: 'tom' } }])
    expect(byTestId('shelf-member-remove')).toBeNull()
  })

  it('shows why a change was refused', async () => {
    api.shelfFails = 'Only the shelf owner can do that'
    await mountMembers()

    await click('shelf-member-remove')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'Only the shelf owner can do that',
      ),
    )
    expect(memberNames()).toEqual(['Sarah (you)', 'Tom'])
  })

  it('gives other members no way to remove anyone or hand the shelf over', async () => {
    joinTomsShelf()

    await mountMembers()

    expect(byTestId('shelf-member-remove')).toBeNull()
    expect(byTestId('shelf-member-hand-over')).toBeNull()
    expect(allByTestId('shelf-member')[1]?.textContent).toContain('Owner')
  })
})
