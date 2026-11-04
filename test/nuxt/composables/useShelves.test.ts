import { beforeEach, describe, expect, it } from 'vitest'
import {
  lastShelfPath,
  shelfIdOf,
  useCurrentShelf,
  useCurrentUser,
  useLastShelfId,
} from '#imports'
import { forgetLastShelf, rememberShelf, runOn } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
})

describe('shelfIdOf', () => {
  it('reads the shelf from a shelf route', () => {
    expect(shelfIdOf({ params: { shelfId: 'work' } })).toBe('work')
  })

  it('is undefined on a route outside a shelf', () => {
    expect(shelfIdOf({ params: {} })).toBeUndefined()
  })
})

describe('useCurrentShelf', () => {
  it('is the shelf in the address', async () => {
    const shelf = await runOn('/shelves/work-work/library', useCurrentShelf)

    expect(shelf.value?.name).toBe('Work')
  })

  it('is the last shelf used on pages outside a shelf', async () => {
    rememberShelf('work')

    const shelf = await runOn('/profile', useCurrentShelf)

    expect(shelf.value?.id).toBe('work')
  })

  it('falls back to the first shelf', async () => {
    rememberShelf('gone')

    const shelf = await runOn('/profile', useCurrentShelf)

    expect(shelf.value?.id).toBe('home')
  })

  it('is nothing for someone without a shelf', async () => {
    useCurrentUser().value = testUser({ shelves: [] })

    const shelf = await runOn('/profile', useCurrentShelf)

    expect(shelf.value).toBeUndefined()
  })
})

describe('useLastShelfId', () => {
  it('reads the shelf remembered in a cookie', () => {
    rememberShelf('work')

    expect(useLastShelfId().value).toBe('work')
  })
})

describe('lastShelfPath', () => {
  it('goes to the last shelf used', () => {
    rememberShelf('work')

    expect(lastShelfPath()).toBe('/shelves/work-work')
  })

  it('goes to the first shelf when the last one is gone', () => {
    rememberShelf('gone')

    expect(lastShelfPath()).toBe('/shelves/sarahs-shelf-home')
  })

  it('asks for a new shelf when there is none', () => {
    useCurrentUser().value = testUser({ shelves: [] })

    expect(lastShelfPath()).toBe('/shelves/new')
  })

  it('asks for a new shelf when nobody is signed in', () => {
    useCurrentUser().value = null

    expect(lastShelfPath()).toBe('/shelves/new')
  })
})
