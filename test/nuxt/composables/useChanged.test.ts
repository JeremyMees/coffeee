import { describe, expect, it } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import type { QueryKey } from '@tanstack/vue-query'
import type { Change } from '~/composables/useChanged'
import { queryKeys, useChanged } from '#imports'
import { runOn } from '../fixtures'

const reads: Record<string, QueryKey> = {
  'home stock': queryKeys.stock('home'),
  'work stock': queryKeys.stock('work'),
  'home members': queryKeys.shelfMembers('home'),
  'home invites': queryKeys.shelfInvites('home'),
  coffee: queryKeys.coffee('ayele'),
  roaster: queryKeys.roaster('square-mile'),
  'list search': queryKeys.listSearch('/api/lists/producers', ''),
  'admin entries': queryKeys.adminEntries('producers', {}),
  'brew methods': queryKeys.brewMethods(),
  'profile stats': queryKeys.profileStats(),
  'owned shelves': queryKeys.ownedShelves(),
  invites: queryKeys.invites(),
  notifications: queryKeys.notifications(),
}

async function staleAfter(change: Change) {
  const { client, changed } = await runOn('/', () => ({
    client: useQueryClient(),
    changed: useChanged(),
  }))
  for (const queryKey of Object.values(reads)) {
    client.setQueryData(queryKey, [])
  }

  await changed(change)

  return Object.entries(reads)
    .filter(([, queryKey]) => client.getQueryState(queryKey)?.isInvalidated)
    .map(([name]) => name)
}

const everyCoffeeRead = [
  'home stock',
  'work stock',
  'home members',
  'home invites',
  'coffee',
  'roaster',
  'list search',
  'admin entries',
  'profile stats',
]

describe('useChanged', () => {
  it('makes every coffee read stale when a coffee changes', async () => {
    expect(await staleAfter({ type: 'coffee' })).toEqual(everyCoffeeRead)
  })

  it('makes every coffee read stale when a roaster changes', async () => {
    expect(await staleAfter({ type: 'roaster' })).toEqual(everyCoffeeRead)
  })

  it('also makes the brew methods stale when an admin entry changes', async () => {
    expect(await staleAfter({ type: 'catalogEntry' })).toEqual([
      ...everyCoffeeRead.slice(0, -1),
      'brew methods',
      'profile stats',
    ])
  })

  it('keeps other shelves fresh when a purchase changes', async () => {
    expect(await staleAfter({ type: 'purchase', shelfId: 'home' })).toEqual([
      'home stock',
      'home members',
      'home invites',
      'coffee',
      'profile stats',
    ])
  })

  it('makes every shelf, coffee and the profile stats stale when a verdict changes', async () => {
    expect(await staleAfter({ type: 'verdict' })).toEqual([
      'home stock',
      'work stock',
      'home members',
      'home invites',
      'coffee',
      'profile stats',
    ])
  })

  it('makes every shelf and coffee stale when a grind setting changes', async () => {
    expect(await staleAfter({ type: 'grindSetting' })).toEqual([
      'home stock',
      'work stock',
      'home members',
      'home invites',
      'coffee',
    ])
  })

  it('makes that shelf and the lists stale when a grinder changes', async () => {
    expect(await staleAfter({ type: 'grinder', shelfId: 'home' })).toEqual([
      'home stock',
      'home members',
      'home invites',
      'list search',
    ])
  })

  it('makes the members and owned shelves stale when members change', async () => {
    expect(await staleAfter({ type: 'members', shelfId: 'home' })).toEqual([
      'home members',
      'owned shelves',
    ])
  })

  it('makes only the shelf invites stale when they change', async () => {
    expect(await staleAfter({ type: 'shelfInvites', shelfId: 'home' })).toEqual(
      ['home invites'],
    )
  })

  it('makes only the invites stale when they change', async () => {
    expect(await staleAfter({ type: 'invites' })).toEqual(['invites'])
  })

  it('makes the notifications stale when an invite to the user is answered', async () => {
    expect(await staleAfter({ type: 'myInvites' })).toEqual(['notifications'])
  })
})
