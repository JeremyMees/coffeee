import { beforeEach, describe, expect, it } from 'vitest'
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

async function watching<T>(use: () => T) {
  const { result, entries } = await runOn('/', () => ({
    result: use(),
    entries: useAdminEntries('producers', { page: '0' }),
  }))
  await entries.suspense()

  return {
    result,
    shown: () => entries.data.value?.entries.map(entry => entry.name),
  }
}

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
  it('adds the entry and shows it in the list', async () => {
    const { result, shown } = await watching(useAdminEntryCreate)

    await result.mutateAsync({
      list: 'producers',
      body: { name: 'Diego Bermudez' },
    })

    expect(await producerNames()).toEqual([
      'Diego Bermudez',
      'Nestor',
      'Nestor Lasso',
    ])
    expect(shown()).toEqual(['Diego Bermudez', 'Nestor', 'Nestor Lasso'])
  })
})

describe('useAdminEntryUpdate', () => {
  it('updates the entry and shows the new name in the list', async () => {
    const { result, shown } = await watching(useAdminEntryUpdate)

    await result.mutateAsync({
      list: 'producers',
      entryId: await producerId('Nestor'),
      body: { name: 'Diego Bermudez' },
    })

    expect(await producerNames()).toEqual(['Diego Bermudez', 'Nestor Lasso'])
    expect(shown()).toEqual(['Diego Bermudez', 'Nestor Lasso'])
  })
})

describe('useAdminEntryMerge', () => {
  it('merges the entry and drops it from the list', async () => {
    const { result, shown } = await watching(useAdminEntryMerge)

    await result.mutateAsync({
      list: 'producers',
      entryId: await producerId('Nestor'),
      intoId: await producerId('Nestor Lasso'),
    })

    expect(await producerNames()).toEqual(['Nestor Lasso'])
    expect(shown()).toEqual(['Nestor Lasso'])
  })
})

describe('useAdminEntryDelete', () => {
  it('deletes the entry and drops it from the list', async () => {
    await addAdminEntry(await database(), {
      list: 'producers',
      body: { name: 'Diego Bermudez' },
      createdBy: jeremy.id,
    })
    const { result, shown } = await watching(useAdminEntryDelete)

    await result.mutateAsync({
      list: 'producers',
      entryId: await producerId('Diego Bermudez'),
    })

    expect(await producerNames()).toEqual(['Nestor', 'Nestor Lasso'])
    expect(shown()).toEqual(['Nestor', 'Nestor Lasso'])
  })
})
