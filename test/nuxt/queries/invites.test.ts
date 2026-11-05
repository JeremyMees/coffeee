import { beforeEach, describe, expect, it } from 'vitest'
import { useInviteCreate, useInviteRevoke, useInvites } from '~/queries/invites'
import { inviteEmail, listPendingInvites } from '#server/utils/invites'
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

async function watching<T>(use: () => T) {
  const { result, invites } = await runOn('/', () => ({
    result: use(),
    invites: useInvites(),
  }))
  await invites.suspense()

  return {
    result,
    shown: () => invites.data.value?.map(invite => invite.email),
  }
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
  it('creates an invite link and shows it with the invites', async () => {
    const { result, shown } = await watching(useInviteCreate)

    const created = await result.mutateAsync({ link: true })

    expect('url' in created && created.url).toMatch(/\/invite\/[\w-]+$/)
    expect(await pendingEmails()).toEqual([null, 'tom@example.com'])
    expect(shown()).toEqual([null, 'tom@example.com'])
  })
})

describe('useInviteRevoke', () => {
  it('revokes an invite and drops it from the invites', async () => {
    const { result, shown } = await watching(useInviteRevoke)

    await result.mutateAsync(invitedId)

    expect(await pendingEmails()).toEqual([])
    expect(shown()).toEqual([])
  })
})
