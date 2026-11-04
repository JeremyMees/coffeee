import { beforeEach, describe, expect, it } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'
import { useListSearch } from '~/queries/lists'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { scenario, signIn } from '../server'

beforeEach(async () => {
  const sarah = await scenario.member('Sarah')
  await scenario.coffee(sarah.shelf, { varietals: ['Gesha', 'Bourbon'] })
  await signIn(sarah)
})

describe('useListSearch', () => {
  it('finds the entries for a search', async () => {
    const { data, suspense } = await runOn('/', () =>
      useListSearch('/api/varietals', 'ges'),
    )

    await suspense()

    expect(data.value?.map(entry => entry.name)).toEqual(['Gesha'])
  })

  it('keeps one answer for searches that only differ in case or spacing', async () => {
    const search = ref('Gesha')
    const { query, client } = await runOn('/', () => ({
      query: useListSearch('/api/varietals', search),
      client: useQueryClient(),
    }))
    await query.suspense()

    search.value = '  GESHA '
    await query.suspense()

    expect(query.fetchStatus.value).toBe('idle')
    expect(
      client.getQueryCache().findAll({ queryKey: queryKeys.lists() }),
    ).toHaveLength(1)
  })

  it('keeps showing the last entries while a new search loads', async () => {
    const search = ref('ges')
    const { data, suspense } = await runOn('/', () =>
      useListSearch('/api/varietals', search),
    )
    await suspense()

    search.value = 'bour'

    expect(data.value?.map(entry => entry.name)).toEqual(['Gesha'])
    await suspense()
    expect(data.value?.map(entry => entry.name)).toEqual(['Bourbon'])
  })
})
