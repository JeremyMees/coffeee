import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useLibraryPage, useLibraryPages } from '~/queries/library'
import type { Member } from '#test/support/types'
import { runOn } from '../fixtures'
import { scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  for (let number = 1; number <= 30; number++) {
    await scenario.coffee(sarah.shelf, { name: `Coffee ${number}` })
  }
  await signIn(sarah)
})

describe('useLibraryPages', () => {
  it('loads the library a page at a time until all is loaded', async () => {
    const pages = await runOn('/', () =>
      useLibraryPages(sarah.shelf.id, { favourites: 'false' }),
    )
    await pages.suspense()

    expect(pages.data.value?.pages[0]?.coffees).toHaveLength(24)
    expect(pages.hasNextPage.value).toBe(true)

    await pages.fetchNextPage()

    expect(pages.data.value?.pages[1]?.coffees).toHaveLength(6)
    expect(pages.hasNextPage.value).toBe(false)
  })

  it('asks for nothing while switched off', async () => {
    const pages = await runOn('/', () =>
      useLibraryPages(sarah.shelf.id, {}, false),
    )
    await flushPromises()

    expect(pages.fetchStatus.value).toBe('idle')
    expect(pages.data.value).toBeUndefined()
  })
})

describe('useLibraryPage', () => {
  it('loads one page of the library', async () => {
    const page = await runOn('/', () =>
      useLibraryPage(sarah.shelf.id, { sort: 'rating' }, 1),
    )
    await page.suspense()

    expect(page.data.value?.total).toBe(30)
    expect(page.data.value?.coffees).toHaveLength(6)
  })
})
