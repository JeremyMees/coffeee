import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { asc } from 'drizzle-orm'
import {
  useAdminEntries,
  useAdminEntryCreate,
  useAdminEntryDelete,
  useAdminEntryMerge,
  useAdminEntryUpdate,
} from '~/queries/admin'
import { producer } from '#server/db/schemas'
import { addAdminEntry } from '#server/utils/admin-lists'
import type { Member } from '#test/support/types'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await scenario.coffee(jeremy.shelf, { producers: ['Nestor Lasso'] })
  await scenario.coffee(jeremy.shelf, {
    name: 'Red Brick',
    producers: ['Nestor'],
  })
  await signIn(jeremy)
})

async function producers() {
  const db = await database()

  return db
    .select({ id: producer.id, name: producer.name })
    .from(producer)
    .orderBy(asc(producer.nameKey))
}

async function producerId(name: string) {
  return (await producers()).find(found => found.name === name)!.id
}

async function producerNames() {
  return (await producers()).map(found => found.name)
}

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

const everythingChanged = [
  { queryKey: queryKeys.admin() },
  { queryKey: queryKeys.shelves() },
  { queryKey: queryKeys.coffees() },
  { queryKey: queryKeys.roasters() },
  { queryKey: queryKeys.lists() },
  { queryKey: queryKeys.brewMethods() },
]

describe('useAdminEntries', () => {
  it('fetches a page of a shared list', async () => {
    const { data, suspense } = await runOn('/', () =>
      useAdminEntries('producers', { search: 'lasso', page: '0' }),
    )

    await suspense()

    expect(data.value?.entries.map(entry => entry.name)).toEqual([
      'Nestor Lasso',
    ])
  })
})

describe('useAdminEntryCreate', () => {
  it('adds the entry and refreshes everything that shows it', async () => {
    const { result, invalidated } = await withClient(useAdminEntryCreate)

    await result.mutateAsync({
      list: 'producers',
      body: { name: 'Diego Bermudez' },
    })

    expect(await producerNames()).toEqual([
      'Diego Bermudez',
      'Nestor',
      'Nestor Lasso',
    ])
    expect(invalidated()).toEqual(everythingChanged)
  })
})

describe('useAdminEntryUpdate', () => {
  it('updates the entry and refreshes everything that shows it', async () => {
    const { result, invalidated } = await withClient(useAdminEntryUpdate)

    await result.mutateAsync({
      list: 'producers',
      entryId: await producerId('Nestor'),
      body: { name: 'Diego Bermudez' },
    })

    expect(await producerNames()).toEqual(['Diego Bermudez', 'Nestor Lasso'])
    expect(invalidated()).toEqual(everythingChanged)
  })
})

describe('useAdminEntryMerge', () => {
  it('merges the entry and refreshes everything that shows it', async () => {
    const { result, invalidated } = await withClient(useAdminEntryMerge)

    await result.mutateAsync({
      list: 'producers',
      entryId: await producerId('Nestor'),
      intoId: await producerId('Nestor Lasso'),
    })

    expect(await producerNames()).toEqual(['Nestor Lasso'])
    expect(invalidated()).toEqual(everythingChanged)
  })
})

describe('useAdminEntryDelete', () => {
  it('deletes the entry and refreshes everything that shows it', async () => {
    await addAdminEntry(await database(), {
      list: 'producers',
      body: { name: 'Diego Bermudez' },
      createdBy: jeremy.id,
    })
    const { result, invalidated } = await withClient(useAdminEntryDelete)

    await result.mutateAsync({
      list: 'producers',
      entryId: await producerId('Diego Bermudez'),
    })

    expect(await producerNames()).toEqual(['Nestor', 'Nestor Lasso'])
    expect(invalidated()).toEqual(everythingChanged)
  })
})
