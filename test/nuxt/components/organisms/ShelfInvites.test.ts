import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfInvites from '~/components/organisms/ShelfInvites.vue'
import { listShelfInvites } from '#server/utils/invites'
import type { Member } from '#test/support/types'
import {
  allByTestId,
  byTestId,
  click,
  inputValue,
  submit,
  type,
} from '../../fixtures'
import {
  database,
  failRequest,
  holdRequest,
  scenario,
  signIn,
} from '../../server'
import { server } from '../../server-state'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

function invitesPath() {
  return `/api/shelves/${sarah.shelf.id}/invites`
}

function openInvites() {
  return mountSuspended(ShelfInvites, {
    props: { shelfId: sarah.shelf.id },
    attachTo: document.body,
  })
}

async function mountInvites() {
  const wrapper = await openInvites()
  await vi.waitFor(() => expect(byTestId('shelf-invites-skeleton')).toBeNull())

  return wrapper
}

function pendingEmails() {
  return allByTestId('shelf-invite').map(row =>
    row.querySelector('.font-semibold')?.textContent?.trim(),
  )
}

async function storedEmails() {
  const invites = await listShelfInvites(await database(), sarah.shelf.id)

  return invites.map(found => found.email)
}

describe('ShelfInvites', () => {
  it('lists pending invites with who sent them', async () => {
    await scenario.shelfInvite(sarah.shelf, 'anna@example.com')

    await mountInvites()

    expect(pendingEmails()).toEqual(['anna@example.com'])
    expect(byTestId('shelf-invite')?.textContent).toContain('From Sarah')
  })

  it('says when nothing is pending', async () => {
    await mountInvites()

    expect(byTestId('shelf-invites-empty')?.textContent).toContain(
      'No pending invites.',
    )
  })

  it('invites an email and shows it pending', async () => {
    await scenario.shelfInvite(sarah.shelf, 'anna@example.com')
    await mountInvites()

    await type('shelf-invite-email', 'Tom@Example.com')
    await submit('shelf-invite-form')

    await vi.waitFor(() =>
      expect(pendingEmails()).toEqual(['tom@example.com', 'anna@example.com']),
    )
    expect(await storedEmails()).toEqual([
      'tom@example.com',
      'anna@example.com',
    ])
    expect(server.outbox.map(email => email.to)).toEqual(['tom@example.com'])
    expect(byTestId('shelf-invite-sent')?.textContent).toContain(
      'Invite sent to tom@example.com.',
    )
    expect(inputValue('shelf-invite-email')).toBe('')
  })

  it('explains an email that is not an email', async () => {
    await mountInvites()

    await type('shelf-invite-email', 'nope')
    await submit('shelf-invite-form')

    await vi.waitFor(() =>
      expect(byTestId('shelf-invite-form')?.textContent).toContain(
        'Enter a valid email',
      ),
    )
    expect(await storedEmails()).toEqual([])
  })

  it('shows why an invite was refused', async () => {
    const tom = await scenario.member('Tom')
    await scenario.joinShelf(tom, sarah.shelf)
    await mountInvites()

    await type('shelf-invite-email', tom.email)
    await submit('shelf-invite-form')

    await vi.waitFor(() =>
      expect(byTestId('shelf-invite-error')?.textContent).toContain(
        'That person is already on this shelf',
      ),
    )
    expect(byTestId('shelf-invite-sent')).toBeNull()
    expect(await storedEmails()).toEqual([])
  })

  it('cancels a pending invite', async () => {
    await scenario.shelfInvite(sarah.shelf, 'anna@example.com')
    await mountInvites()

    await click('shelf-invite-cancel')

    await vi.waitFor(() => expect(pendingEmails()).toEqual([]))
    expect(await storedEmails()).toEqual([])
  })

  it('shows a skeleton while the invites load, with the form ready', async () => {
    await scenario.shelfInvite(sarah.shelf, 'anna@example.com')
    const hold = holdRequest('GET', invitesPath())

    await openInvites()

    expect(byTestId('shelf-invites-skeleton')).not.toBeNull()
    expect(byTestId('shelf-invite-form')).not.toBeNull()
    expect(byTestId('shelf-invite')).toBeNull()

    hold.release()

    await vi.waitFor(() =>
      expect(pendingEmails()).toEqual(['anna@example.com']),
    )
    expect(byTestId('shelf-invites-skeleton')).toBeNull()
  })

  it('shows an error that can be retried', async () => {
    await scenario.shelfInvite(sarah.shelf, 'anna@example.com')
    const lift = failRequest('GET', invitesPath(), {
      status: 500,
      message: 'Nope',
    })

    await openInvites()
    await vi.waitFor(() =>
      expect(byTestId('shelf-invites-error')).not.toBeNull(),
    )

    lift()
    await click('shelf-invites-retry')

    await vi.waitFor(() =>
      expect(pendingEmails()).toEqual(['anna@example.com']),
    )
    expect(byTestId('shelf-invites-error')).toBeNull()
  })
})
