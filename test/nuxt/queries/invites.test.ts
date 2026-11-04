import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { useInviteCreate, useInviteRevoke, useInvites } from '~/queries/invites'
import { inviteEmail, listPendingInvites } from '#server/utils/invites'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let invitedId: string

beforeEach(async () => {
  const jeremy = await scenario.member('Jeremy', { role: 'admin' })
  const invited = await inviteEmail(await database(), {
    email: 'tom@example.com',
    createdBy: jeremy.id,
  })
  invitedId = invited!.id
  await signIn(jeremy)
})

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

async function pendingEmails() {
  const pending = await listPendingInvites(await database())

  return pending.map(invite => invite.email)
}

describe('useInvites', () => {
  it('fetches the pending invites', async () => {
    const { data, suspense } = await runOn('/', useInvites)

    await suspense()

    expect(data.value?.map(invite => invite.email)).toEqual(['tom@example.com'])
  })
})

describe('useInviteCreate', () => {
  it('creates an invite link and refreshes the invites', async () => {
    const { result, invalidated } = await withClient(useInviteCreate)

    const created = await result.mutateAsync({ link: true })

    expect('url' in created && created.url).toMatch(/\/invite\/[\w-]+$/)
    expect(await pendingEmails()).toEqual([null, 'tom@example.com'])
    expect(invalidated()).toEqual([{ queryKey: queryKeys.invites() }])
  })
})

describe('useInviteRevoke', () => {
  it('revokes an invite and refreshes the invites', async () => {
    const { result, invalidated } = await withClient(useInviteRevoke)

    await result.mutateAsync(invitedId)

    expect(await pendingEmails()).toEqual([])
    expect(invalidated()).toEqual([{ queryKey: queryKeys.invites() }])
  })
})
