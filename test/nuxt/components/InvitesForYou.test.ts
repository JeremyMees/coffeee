import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InvitesForYou from '~/components/InvitesForYou.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, myInvites, resetApi } from '../fake-api'
import { byTestId, click, currentPath, testUser } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  api.myInvites = myInvites()
  useCurrentUser().value = testUser()
})

async function mountInvites() {
  const mounted = await mountSuspended(InvitesForYou, {
    attachTo: document.body,
  })
  await vi.waitFor(() => expect(byTestId('invite-for-you')).not.toBeNull())

  return mounted
}

describe('InvitesForYou', () => {
  it('shows who invited you to which shelf', async () => {
    await mountInvites()

    expect(byTestId('invite-for-you')?.textContent).toContain(
      'Tom invited you to Office',
    )
  })

  it('shows nothing without invites', async () => {
    api.myInvites = []

    await mountSuspended(InvitesForYou, { attachTo: document.body })

    expect(byTestId('invites-for-you')).toBeNull()
  })

  it('joins the shelf and opens it', async () => {
    await mountInvites()

    await click('invite-for-you-accept')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/office'))
    expect(api.inviteCalls).toEqual([{ accept: 'mi1' }])
    expect(useCurrentUser().value?.shelves).toContainEqual({
      id: 'office',
      name: 'Office',
      ownerId: 'tom',
    })
  })

  it('declines and the invite goes away', async () => {
    await mountInvites()

    await click('invite-for-you-decline')

    await vi.waitFor(() => expect(byTestId('invites-for-you')).toBeNull())
    expect(api.inviteCalls).toEqual([{ decline: 'mi1' }])
  })

  it('shows why an answer failed', async () => {
    api.inviteFails = 'Invite not found'
    await mountInvites()

    await click('invite-for-you-accept')

    await vi.waitFor(() =>
      expect(byTestId('invite-for-you-error')?.textContent).toContain(
        'Invite not found',
      ),
    )
  })

  it('shows why declining failed', async () => {
    api.inviteFails = 'Invite not found'
    await mountInvites()

    await click('invite-for-you-decline')

    await vi.waitFor(() =>
      expect(byTestId('invite-for-you-error')?.textContent).toContain(
        'Invite not found',
      ),
    )
  })
})
