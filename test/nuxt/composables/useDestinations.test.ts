import { beforeEach, describe, expect, it } from 'vitest'
import { useCurrentUser, useDestinations } from '#imports'
import { forgetLastShelf, runOn } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

function links(destinations: ReturnType<typeof useDestinations>) {
  return destinations.value.map(({ label, to }) => [label, to])
}

describe('useDestinations', () => {
  it('points at the pages of the current shelf', async () => {
    const destinations = await runOn('/shelves/work/discover', useDestinations)

    expect(links(destinations)).toEqual([
      ['Stock', '/shelves/work'],
      ['Library', '/shelves/work/library'],
      ['Discover', '/shelves/work/discover'],
      ['Roasters', '/roasters'],
      ['Profile', '/profile'],
    ])
  })

  it('points at the first shelf from pages outside a shelf', async () => {
    const destinations = await runOn('/profile', useDestinations)

    expect(links(destinations)[0]).toEqual(['Stock', '/shelves/home'])
  })

  it('gives every destination an icon', async () => {
    const destinations = await runOn('/shelves/home', useDestinations)

    expect(destinations.value.every(item => item.icon)).toBe(true)
  })
})
