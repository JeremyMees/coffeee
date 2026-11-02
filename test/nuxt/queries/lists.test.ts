import { beforeEach, describe, expect, it } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useListSearch } from '~/queries/lists'
import { fakeList } from '../fake-api'
import { runOn } from '../fixtures'

const searches: string[] = []

registerEndpoint('/api/varietals', event => {
  searches.push(new URL(event.path, 'http://test').searchParams.get('search')!)

  return fakeList(() => [
    { id: 'v1', name: 'Gesha' },
    { id: 'v2', name: 'Bourbon' },
  ])(event)
})

beforeEach(() => {
  searches.length = 0
})

describe('useListSearch', () => {
  it('finds the entries for a search', async () => {
    const { data, suspense } = await runOn('/', () =>
      useListSearch('/api/varietals', 'ges'),
    )

    await suspense()

    expect(data.value).toEqual([{ id: 'v1', name: 'Gesha' }])
  })

  it('asks the server once for searches that only differ in case or spacing', async () => {
    const search = ref('Gesha')
    const { suspense } = await runOn('/', () =>
      useListSearch('/api/varietals', search),
    )
    await suspense()

    search.value = '  GESHA '
    await suspense()

    expect(searches).toEqual(['Gesha'])
  })

  it('keeps showing the last entries while a new search loads', async () => {
    const search = ref('ges')
    const { data, suspense } = await runOn('/', () =>
      useListSearch('/api/varietals', search),
    )
    await suspense()

    search.value = 'bour'

    expect(data.value).toEqual([{ id: 'v1', name: 'Gesha' }])
    await suspense()
    expect(data.value).toEqual([{ id: 'v2', name: 'Bourbon' }])
  })
})
