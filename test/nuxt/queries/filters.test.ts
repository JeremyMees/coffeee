import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { flushPromises } from '@vue/test-utils'
import { eq } from 'drizzle-orm'
import { ref } from 'vue'
import { useFilterLabels, useFilterOptions } from '~/queries/filters'
import { processList, roaster } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function idOf(table: typeof roaster | typeof processList, name: string) {
  const db = await database()
  const [found] = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.name, name))

  return found!.id
}

describe('useFilterOptions', () => {
  it('waits to be switched on, then pages through the options', async () => {
    const roasters = Array.from(
      { length: 21 },
      (_, index) => `Roaster ${String(index + 1).padStart(2, '0')}`,
    )
    for (const name of roasters) {
      await scenario.coffee(sarah.shelf, { roaster: name })
    }
    const enabled = ref(false)
    const options = await runOn('/', () =>
      useFilterOptions(sarah.shelf.id, 'library', 'roasters', '', enabled),
    )
    await flushPromises()
    expect(options.fetchStatus.value).toBe('idle')
    expect(options.data.value).toBeUndefined()

    enabled.value = true
    await vi.waitFor(() =>
      expect(options.data.value?.pages[0]?.options).toHaveLength(20),
    )
    await options.fetchNextPage()

    expect(
      options.data.value?.pages.flatMap(page =>
        page.options.map(option => option.label),
      ),
    ).toEqual(roasters)
    expect(options.hasNextPage.value).toBe(false)
  })

  it('asks the catalog for catalog options', async () => {
    await scenario.coffee(sarah.shelf, { processes: ['Washed'] })
    await scenario.coffee(sarah.shelf, {
      name: 'Red Brick',
      processes: ['Natural'],
    })
    const options = await runOn('/', () =>
      useFilterOptions(sarah.shelf.id, 'catalog', 'processes', 'wash', true),
    )

    await vi.waitFor(() =>
      expect(options.data.value?.pages[0]?.options).toEqual([
        { value: expect.any(String), label: 'Washed' },
      ]),
    )
    expect(options.data.value?.pages[0]?.options[0]?.value).toBe(
      await idOf(processList, 'Washed'),
    )
  })
})

describe('useFilterLabels', () => {
  it('names the filters in the address', async () => {
    await scenario.coffee(sarah.shelf, { roaster: 'Square Mile' })
    const roasterId = await idOf(roaster, 'Square Mile')
    const labels = await runOn('/', () =>
      useFilterLabels(sarah.shelf.id, { roasterId, originCode: 'ET' }),
    )

    await labels.suspense()

    expect(labels.data.value).toEqual({
      roasterId: 'Square Mile',
      originCode: 'Ethiopia',
    })
  })

  it('asks nothing when no filter needs a name', async () => {
    const { labels, client } = await runOn('/', () => ({
      labels: useFilterLabels(sarah.shelf.id, {}),
      client: useQueryClient(),
    }))

    await labels.suspense()
    await flushPromises()

    expect(labels.data.value).toBeUndefined()
    expect(
      client.getQueryState(queryKeys.filterLabels(sarah.shelf.id, {}))
        ?.fetchStatus,
    ).toBe('idle')
  })

  it('remembers names already known, so coming back asks nothing', async () => {
    const { labels, client } = await runOn('/', () => ({
      labels: useFilterLabels(sarah.shelf.id, {}),
      client: useQueryClient(),
    }))

    labels.remember(
      { q: 'lime', roasterId: 'r1', mine: 'true' },
      { roasterId: 'La Cabra' },
    )

    expect(
      client.getQueryData(
        queryKeys.filterLabels(sarah.shelf.id, { roasterId: 'r1' }),
      ),
    ).toEqual({ roasterId: 'La Cabra' })
  })
})
