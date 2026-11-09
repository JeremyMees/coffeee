import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { asc, isNull } from 'drizzle-orm'
import App from '~/app.vue'
import { shelfPath, useRouter } from '#imports'
import { invite } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, submit, tid, type } from '../../fixtures'
import {
  database,
  failRequest,
  holdRequest,
  scenario,
  signIn,
} from '../../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await signIn(jeremy)
})

const invitesPath = '/api/invites'

function visitInvites() {
  return mountSuspended(App, { route: '/admin/invites' })
}

async function openInvites() {
  const page = await visitInvites()
  await vi.waitFor(() =>
    expect(page.find(tid('invites-skeleton')).exists()).toBe(false),
  )

  return page
}

async function pendingEmails() {
  const db = await database()
  const pending = await db
    .select({ email: invite.email })
    .from(invite)
    .where(isNull(invite.shelfId))
    .orderBy(asc(invite.createdAt))

  return pending.map(found => found.email)
}

describe('admin invites page', () => {
  it('sends someone who is not an admin back home', async () => {
    const sarah = await scenario.member('Sarah')
    await signIn(sarah)

    await visitInvites()

    expect(useRouter().currentRoute.value.path).toBe(shelfPath(sarah.shelf))
  })

  it('lists pending invites and leads back to the admin page', async () => {
    await scenario.adminInvite(jeremy, 'sarah@example.com')

    const page = await openInvites()

    expect(page.get(tid('page-title')).text()).toBe('Invites')
    expect(page.findAll(tid('invite'))[0]!.text()).toContain(
      'sarah@example.com',
    )
    expect(page.get(tid('admin-back')).attributes('href')).toBe('/admin')
  })

  it('says when nothing is pending', async () => {
    const page = await openInvites()

    expect(page.get(tid('invites-empty')).text()).toBe('No pending invites.')
  })

  it('shows when a link invite expires', async () => {
    const { invite: link } = await scenario.inviteLink(jeremy)
    const expires = link.expiresAt!.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })

    const page = await openInvites()

    expect(page.get(tid('invite')).text()).toMatch(
      new RegExp(`Invite link\\s*· expires ${expires}`),
    )
  })

  it('revokes a pending invite', async () => {
    await scenario.adminInvite(jeremy, 'sarah@example.com')
    const page = await openInvites()

    await page.get(tid('invite-revoke')).trigger('click')

    await vi.waitFor(async () => expect(await pendingEmails()).toEqual([]))
  })

  it('allows an email from the button in the header and lists it as pending', async () => {
    const page = await openInvites()

    expect(page.get(tid('page-add')).text()).toBe('Add invite')
    await page.get(tid('page-add')).trigger('click')
    await vi.waitFor(() => expect(byTestId('invite-email')).not.toBeNull())
    await type('invite-email', 'tom@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(page.get(tid('invites-pending')).text()).toContain(
        'tom@example.com',
      ),
    )
    expect(await pendingEmails()).toEqual(['tom@example.com'])
  })

  it('shows the page and a skeleton while the invites load', async () => {
    await scenario.adminInvite(jeremy, 'sarah@example.com')
    const hold = holdRequest('GET', invitesPath)

    const page = await visitInvites()

    expect(page.get(tid('page-title')).text()).toBe('Invites')
    expect(page.find(tid('invites-skeleton')).exists()).toBe(true)
    expect(page.find(tid('invites-pending')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(page.find(tid('invites-pending')).exists()).toBe(true),
    )
    expect(page.find(tid('invites-skeleton')).exists()).toBe(false)
  })

  it('shows an error with a retry when the invites fail to load', async () => {
    await scenario.adminInvite(jeremy, 'sarah@example.com')
    const lift = failRequest('GET', invitesPath, {
      status: 403,
      message: 'Nope',
    })

    const page = await visitInvites()
    await vi.waitFor(() =>
      expect(page.find(tid('invites-error')).exists()).toBe(true),
    )
    expect(page.get(tid('page-title')).text()).toBe('Invites')

    lift()
    await page.get(tid('invites-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(page.find(tid('invites-pending')).exists()).toBe(true),
    )
    expect(page.find(tid('invites-error')).exists()).toBe(false)
  })
})
