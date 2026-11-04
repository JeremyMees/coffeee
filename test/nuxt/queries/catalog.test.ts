import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogPages } from '~/queries/catalog'
import type { Member } from '#test/support/types'
import { runOn } from '../fixtures'
import { scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  for (let number = 1; number <= 30; number++) {
    await scenario.coffee(sarah.shelf, { name: `Coffee ${number}` })
  }
  await scenario.coffee(sarah.shelf, { name: 'Red Brick' })
  await signIn(sarah)
})

describe('useCatalogPages', () => {
  it('loads the matching catalog a page at a time until all is loaded', async () => {
    const pages = await runOn('/', () =>
      useCatalogPages(sarah.shelf.id, { search: 'coffee' }),
    )
    await pages.suspense()

    expect(pages.data.value?.pages[0]?.coffees).toHaveLength(24)
    expect(pages.hasNextPage.value).toBe(true)

    await pages.fetchNextPage()

    expect(pages.data.value?.pages[1]?.coffees).toHaveLength(6)
    expect(pages.hasNextPage.value).toBe(false)
    expect(
      new Set(
        pages.data.value?.pages.flatMap(page =>
          page.coffees.map(coffee => coffee.name),
        ),
      ).size,
    ).toBe(30)
  })
})
