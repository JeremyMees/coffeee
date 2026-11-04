import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useGrinderDisown,
  useGrinderOwn,
  useShelfGrinders,
} from '~/queries/grinders'
import { listShelfGrinders } from '#server/utils/grinders'
import type { Member } from '#test/support/types'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

async function shelfGrinders() {
  return listShelfGrinders(await database(), sarah.shelf.id)
}

describe('useShelfGrinders', () => {
  it('fetches the grinders the shelf owns', async () => {
    const opus = await scenario.grinder(sarah.shelf, {
      brand: '1Zpresso',
      model: 'Opus',
    })
    const { data, suspense } = await runOn('/', () =>
      useShelfGrinders(sarah.shelf.id),
    )

    await suspense()

    expect(data.value).toEqual([opus])
  })
})

describe('useGrinderOwn', () => {
  it('adds a grinder and refreshes the shelf and the lists', async () => {
    const { result, invalidated } = await withClient(useGrinderOwn)

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      grinder: { brand: 'Niche', model: 'Zero' },
    })

    expect(await shelfGrinders()).toEqual([
      expect.objectContaining({ brand: 'Niche', model: 'Zero' }),
    ])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelf(sarah.shelf.id) },
      { queryKey: queryKeys.lists() },
    ])
  })
})

describe('useGrinderDisown', () => {
  it('removes a grinder and refreshes the shelf', async () => {
    const opus = await scenario.grinder(sarah.shelf)
    const { result, invalidated } = await withClient(useGrinderDisown)

    await result.mutateAsync({ shelfId: sarah.shelf.id, grinderId: opus.id })

    expect(await shelfGrinders()).toEqual([])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelf(sarah.shelf.id) },
    ])
  })
})
