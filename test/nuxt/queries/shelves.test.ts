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
import { listShelfMembers } from '#server/utils/shelves'
import type { Member } from '#test/support/types'
import { queryKeys, shelfPath, useCurrentUser } from '#imports'
import { currentPath, forgetLastShelf, runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  forgetLastShelf()
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
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

async function membersOf(shelfId: string) {
  const members = await listShelfMembers(await database(), shelfId)

  return members.map(member => member.name)
}

describe('useShelfMembers', () => {
  it('fetches the members of a shelf', async () => {
    await scenario.joinShelf(tom, sarah.shelf)
    await signIn(sarah)
    const { data, suspense } = await runOn('/', () =>
      useShelfMembers(sarah.shelf.id),
    )

    await suspense()

    expect(data.value?.map(member => member.name)).toEqual(['Sarah', 'Tom'])
  })
})

describe('useShelfRename', () => {
  it('renames the shelf in the shelves of the current user', async () => {
    await signIn(sarah)
    const { result } = await withClient(useShelfRename)

    await result.mutateAsync({ shelfId: sarah.shelf.id, name: 'Flat' })

    expect(shelves()?.[0]).toEqual({
      id: sarah.shelf.id,
      name: 'Flat',
      ownerId: sarah.id,
    })
  })
})

describe('useShelfHandOver', () => {
  it('records the new shelf owner and refreshes the members', async () => {
    await scenario.joinShelf(tom, sarah.shelf)
    await signIn(sarah)
    const { result, invalidated } = await withClient(useShelfHandOver)

    await result.mutateAsync({ shelfId: sarah.shelf.id, ownerId: tom.id })

    expect(shelves()?.[0]?.ownerId).toBe(tom.id)
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelfMembers(sarah.shelf.id) },
    ])
  })
})

describe('useShelfMemberRemove', () => {
  it('removes a member and refreshes the members', async () => {
    await scenario.joinShelf(tom, sarah.shelf)
    await signIn(sarah)
    const { result, invalidated } = await withClient(useShelfMemberRemove)

    await result.mutateAsync({ shelfId: sarah.shelf.id, userId: tom.id })

    expect(await membersOf(sarah.shelf.id)).toEqual(['Sarah'])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelfMembers(sarah.shelf.id) },
    ])
  })
})

describe('useShelfLeave', () => {
  it('drops the shelf and goes to another one', async () => {
    await scenario.joinShelf(sarah, tom.shelf)
    await signIn(sarah)
    const { result } = await withClient(useShelfLeave)

    await result.mutateAsync(tom.shelf.id)

    expect(await membersOf(tom.shelf.id)).toEqual(['Tom'])
    expect(shelves()?.map(shelf => shelf.id)).toEqual([sarah.shelf.id])
    await vi.waitFor(() => expect(currentPath()).toBe(shelfPath(sarah.shelf)))
  })
})

describe('useShelfDelete', () => {
  it('drops the shelf and goes to another one', async () => {
    await scenario.joinShelf(sarah, tom.shelf)
    await signIn(sarah)
    const { result } = await withClient(useShelfDelete)

    await result.mutateAsync(sarah.shelf.id)

    expect(await membersOf(sarah.shelf.id)).toEqual([])
    expect(shelves()?.map(shelf => shelf.id)).toEqual([tom.shelf.id])
    await vi.waitFor(() => expect(currentPath()).toBe(shelfPath(tom.shelf)))
  })

  it('keeps the shelf when deleting fails', async () => {
    await signIn(sarah)
    const { result } = await withClient(useShelfDelete)

    await expect(result.mutateAsync(sarah.shelf.id)).rejects.toThrow(
      "This is your only shelf, so you can't delete it",
    )

    expect(shelves()?.map(shelf => shelf.id)).toEqual([sarah.shelf.id])
  })
})
