import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AddInviteSheet from '~/components/organisms/AddInviteSheet.vue'
import { findInviteByToken, listPendingInvites } from '#server/utils/invites'
import type { Member } from '#test/support/types'
import { byTestId, click, inputValue, submit, type } from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await signIn(jeremy)
})

async function openSheet() {
  const sheet = await mountSuspended(AddInviteSheet, {
    props: { open: true },
    attachTo: document.body,
  })
  await vi.waitFor(() => expect(byTestId('invite-email')).not.toBeNull())

  return sheet
}

async function invitedEmails() {
  const invites = await listPendingInvites(await database())

  return invites.map(found => found.email)
}

async function inviterOf(link: string) {
  const token = link.split('/invite/')[1]!

  return (await findInviteByToken(await database(), token))?.invitedBy
}

describe('AddInviteSheet', () => {
  it('allows an email and closes', async () => {
    const sheet = await openSheet()

    await type('invite-email', 'tom@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await invitedEmails()).toEqual(['tom@example.com'])
  })

  it('explains an email that is not an email', async () => {
    await openSheet()

    await type('invite-email', 'not an email')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(byTestId('invite-email-form')?.textContent).toContain(
        'Enter a valid email',
      ),
    )
    expect(await invitedEmails()).toEqual([])
  })

  it('shows why an email could not be allowed', async () => {
    await scenario.adminInvite(jeremy, 'sarah@example.com')
    await openSheet()

    await type('invite-email', 'sarah@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(byTestId('invite-email-form')?.textContent).toContain(
        'That email is already invited',
      ),
    )
  })

  it('explains a failure the server gave no reason for', async () => {
    failRequest('POST', '/api/invites', { status: 500, message: '' })
    await openSheet()

    await type('invite-email', 'tom@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(byTestId('invite-email-form')?.textContent).toContain(
        'Something went wrong. Try again.',
      ),
    )
    expect(await invitedEmails()).toEqual([])
  })

  it('shows a new invite link to copy and stays open', async () => {
    const sheet = await openSheet()

    await click('invite-link-create')

    await vi.waitFor(() =>
      expect(inputValue('invite-link')).toMatch(/\/invite\/[\w-]+$/),
    )
    expect(await inviterOf(inputValue('invite-link'))).toBe('Jeremy')
    expect(sheet.emitted('update:open')).toBeUndefined()
  })

  it('copies a new invite link', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await openSheet()
    await click('invite-link-create')
    await vi.waitFor(() => expect(byTestId('invite-link-copy')).not.toBeNull())
    const link = inputValue('invite-link')

    await click('invite-link-copy')

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(link)
      expect(byTestId('invite-link-copy')?.getAttribute('aria-label')).toBe(
        'Copied',
      )
    })
    vi.unstubAllGlobals()
  })
})
