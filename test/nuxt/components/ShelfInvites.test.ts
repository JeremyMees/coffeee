import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfInvites from '~/components/ShelfInvites.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import {
  allByTestId,
  byTestId,
  click,
  inputValue,
  submit,
  type,
} from '../fixtures'

fakeApi()

beforeEach(resetApi)

function mountInvites() {
  return mountSuspended(ShelfInvites, {
    props: { shelfId: 'home' },
    attachTo: document.body,
  })
}

function pendingEmails() {
  return allByTestId('shelf-invite').map(row =>
    row.querySelector('.font-semibold')?.textContent?.trim(),
  )
}

describe('ShelfInvites', () => {
  it('lists pending invites with who sent them', async () => {
    await mountInvites()

    expect(pendingEmails()).toEqual(['anna@example.com'])
    expect(byTestId('shelf-invite')?.textContent).toContain('From Sarah')
  })

  it('says when nothing is pending', async () => {
    api.shelfInvites = []

    await mountInvites()

    expect(byTestId('shelf-invites-empty')?.textContent).toContain(
      'No pending invites.',
    )
  })

  it('invites an email and shows it pending', async () => {
    await mountInvites()

    await type('shelf-invite-email', 'Tom@Example.com')
    await submit('shelf-invite-form')

    await vi.waitFor(() =>
      expect(pendingEmails()).toEqual(['tom@example.com', 'anna@example.com']),
    )
    expect(api.inviteCalls).toEqual([{ invite: { email: 'tom@example.com' } }])
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
    expect(api.inviteCalls).toEqual([])
  })

  it('shows why an invite was refused', async () => {
    api.inviteFails = 'That person is already on this shelf'
    await mountInvites()

    await type('shelf-invite-email', 'tom@example.com')
    await submit('shelf-invite-form')

    await vi.waitFor(() =>
      expect(byTestId('shelf-invite-error')?.textContent).toContain(
        'That person is already on this shelf',
      ),
    )
    expect(byTestId('shelf-invite-sent')).toBeNull()
  })

  it('cancels a pending invite', async () => {
    await mountInvites()

    await click('shelf-invite-cancel')

    await vi.waitFor(() => expect(pendingEmails()).toEqual([]))
    expect(api.inviteCalls).toEqual([{ cancel: 'i1' }])
  })
})
