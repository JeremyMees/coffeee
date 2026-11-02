import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { readBody } from 'h3'
import { useInviteCreate, useInviteRevoke, useInvites } from '~/queries/invites'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'

const calls = { created: [] as unknown[], revoked: [] as string[] }

registerEndpoint('/api/invites', {
  method: 'GET',
  handler: () => [{ id: 'i1', email: 'tom@example.com' }],
})

registerEndpoint('/api/invites', {
  method: 'POST',
  handler: async event => {
    calls.created.push(await readBody(event))

    return { id: 'i2', url: 'https://coffeee.test/invite/abc' }
  },
})

registerEndpoint('/api/invites/i1', {
  method: 'DELETE',
  handler: () => {
    calls.revoked.push('i1')

    return null
  },
})

beforeEach(() => {
  calls.created = []
  calls.revoked = []
})

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

describe('useInvites', () => {
  it('fetches the pending invites', async () => {
    const { data, suspense } = await runOn('/', useInvites)

    await suspense()

    expect(data.value).toEqual([{ id: 'i1', email: 'tom@example.com' }])
  })
})

describe('useInviteCreate', () => {
  it('creates an invite and refreshes the invites', async () => {
    const { result, invalidated } = await withClient(useInviteCreate)

    const created = await result.mutateAsync({ link: true })

    expect(created).toEqual({
      id: 'i2',
      url: 'https://coffeee.test/invite/abc',
    })
    expect(calls.created).toEqual([{ link: true }])
    expect(invalidated()).toEqual([{ queryKey: queryKeys.invites() }])
  })
})

describe('useInviteRevoke', () => {
  it('revokes an invite and refreshes the invites', async () => {
    const { result, invalidated } = await withClient(useInviteRevoke)

    await result.mutateAsync('i1')

    expect(calls.revoked).toEqual(['i1'])
    expect(invalidated()).toEqual([{ queryKey: queryKeys.invites() }])
  })
})
