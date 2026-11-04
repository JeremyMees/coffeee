import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useShelfDelete,
  useShelfHandOver,
  useShelfLeave,
  useShelfMemberRemove,
  useShelfMembers,
  useShelfRename,
} from '~/queries/shelves'
import { queryKeys, useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { currentPath, forgetLastShelf, runOn } from '../fixtures'
import { shelfMembers } from '#test/fixtures/shelves'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

function shelves() {
  return useCurrentUser().value?.shelves
}

describe('useShelfMembers', () => {
  it('fetches the members of a shelf', async () => {
    const { data, suspense } = await runOn('/', () => useShelfMembers('home'))

    await suspense()

    expect(data.value).toEqual(shelfMembers())
  })
})

describe('useShelfRename', () => {
  it('renames the shelf in the shelves of the current user', async () => {
    const { result } = await withClient(useShelfRename)

    await result.mutateAsync({ shelfId: 'home', name: 'Flat' })

    expect(api.shelfCalls).toEqual([{ rename: { name: 'Flat' } }])
    expect(shelves()?.[0]).toEqual({
      id: 'home',
      name: 'Flat',
      ownerId: 'user-1',
    })
  })
})

describe('useShelfHandOver', () => {
  it('records the new shelf owner and refreshes the members', async () => {
    const { result, invalidated } = await withClient(useShelfHandOver)

    await result.mutateAsync({ shelfId: 'home', ownerId: 'tom' })

    expect(api.shelfCalls).toEqual([{ handOver: { ownerId: 'tom' } }])
    expect(shelves()?.[0]?.ownerId).toBe('tom')
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelfMembers('home') },
    ])
  })
})

describe('useShelfMemberRemove', () => {
  it('removes a member and refreshes the members', async () => {
    const { result, invalidated } = await withClient(useShelfMemberRemove)

    await result.mutateAsync({ shelfId: 'home', userId: 'tom' })

    expect(api.shelfCalls).toEqual([{ remove: 'tom' }])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelfMembers('home') },
    ])
  })
})

describe('useShelfLeave', () => {
  it('drops the shelf and goes to another one', async () => {
    const { result } = await withClient(useShelfLeave)

    await result.mutateAsync('home')

    expect(api.shelfCalls).toEqual([{ leave: 'home' }])
    expect(shelves()?.map(shelf => shelf.id)).toEqual(['work'])
    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/work'))
  })
})

describe('useShelfDelete', () => {
  it('drops the shelf and goes to another one', async () => {
    const { result } = await withClient(useShelfDelete)

    await result.mutateAsync('home')

    expect(api.shelfCalls).toEqual([{ delete: 'home' }])
    expect(shelves()?.map(shelf => shelf.id)).toEqual(['work'])
    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/work'))
  })

  it('keeps the shelf when deleting fails', async () => {
    api.shelfFails = "This is your only shelf, so you can't delete it"
    const { result } = await withClient(useShelfDelete)

    await expect(result.mutateAsync('home')).rejects.toThrow()

    expect(shelves()?.map(shelf => shelf.id)).toEqual(['home', 'work'])
  })
})
